import asyncio
import os
import subprocess
import logging
import httpx
import zipfile
from io import BytesIO
from datetime import datetime, timezone, timedelta
from OpenSSL import crypto
from typing import Dict, Any

from .database import AsyncSessionLocal
from . import crud
from .nginx_manager import regenerate_configs_for_datacenter
from core.security import create_access_token
from .settings_manager import load_settings

logger = logging.getLogger(__name__)

RENEWAL_THRESHOLD_DAYS = 30
SYNC_INTERVAL_SECONDS = 60 * 60 # Run once every hour
LETSENCRYPT_DIR = "/data/certs/letsencrypt/live"
CLOUDFLARE_CREDS_PATH = "/etc/letsencrypt/credentials/cloudflare.ini"
LETSENCRYPT_BASE_DIR = "/data/certs/letsencrypt"
CERTBOT_RENEW_INTERVAL_SECONDS = 24 * 60 * 60 # Run once every 24 hours

def get_cert_info(cert_path: str) -> Dict[str, Any]:
    """Helper function to parse a certificate file and get its expiration date."""
    with open(cert_path, 'r') as f:
        cert_data = f.read()
    cert = crypto.load_certificate(crypto.FILETYPE_PEM, cert_data)
    expiration_date_bytes = cert.get_notAfter()
    expiration_date = datetime.strptime(expiration_date_bytes.decode('ascii'), '%Y%m%d%H%M%SZ').replace(tzinfo=timezone.utc)
    days_to_expiration = (expiration_date - datetime.now(timezone.utc)).days
    is_expiring = days_to_expiration < 30
    return {
        "expiration_date": expiration_date,
        "days_to_expiration": days_to_expiration,
        "is_expiring": is_expiring
    }

def run_certbot_issue(domain: str, use_staging: bool) -> bool:
    """
    Synchronous function to run certbot issuance.
    """
    settings = load_settings()
    email = settings.cloudflare_email
    api_key = settings.cloudflare_api_key

    logger.info(f"Starting certificate issuance for {domain} (Staging: {use_staging})")
    creds_content = (f"dns_cloudflare_email = {email}\n" f"dns_cloudflare_api_key = {api_key}")
    try:
        with open(CLOUDFLARE_CREDS_PATH, "w") as f:
            f.write(creds_content)
        os.chmod(CLOUDFLARE_CREDS_PATH, 0o600)
    except Exception as e:
        logger.error(f"Failed to write Cloudflare credentials: {e}")
        return False

    command = [
        "certbot", "certonly", "--dns-cloudflare", "--dns-cloudflare-credentials", CLOUDFLARE_CREDS_PATH,
        "--non-interactive", "--agree-tos", "--email", email, "-d", domain,
        "--config-dir", LETSENCRYPT_BASE_DIR, "--work-dir", "/data/certs/work", "--logs-dir", "/data/certs/logs"
    ]
    if use_staging:
        command.append("--staging")
    
    try:
        process = subprocess.run(command, capture_output=True, text=True, check=False)
        if process.returncode == 0:
            logger.info(f"Certbot succeeded for {domain}. Stdout: {process.stdout}")
            chmod_command = ["chmod", "-R", "a+rX", LETSENCRYPT_BASE_DIR]
            subprocess.run(chmod_command, check=True)
            logger.info("Successfully updated certificate file permissions.")
            return True
        else:
            logger.error(f"Certbot failed for {domain}. Stderr: {process.stderr}")
            return False
    except Exception as e:
        logger.error(f"An exception occurred while running certbot: {e}")
        return False
    finally:
        if os.path.exists(CLOUDFLARE_CREDS_PATH):
            os.remove(CLOUDFLARE_CREDS_PATH)
            logger.info("Cleaned up Cloudflare credentials file.")


async def cert_renewal_task():
    """A background task that runs periodically to renew certificates."""
    logger.info("Certificate renewal task started.")
    is_central = os.getenv("IS_CENTRAL_LB", "false").lower() == "true"
    
    while True:
        await asyncio.sleep(CERTBOT_RENEW_INTERVAL_SECONDS)
        logger.info("Starting automated certificate renewal check.")
        
        db = AsyncSessionLocal()
        try:
            settings = load_settings()
            email = settings.cloudflare_email
            api_key = settings.cloudflare_api_key

            if not all([email, api_key]):
                logger.error("Cloudflare email and API key not set in settings. Automated renewal is disabled.")
                continue

            services = await crud.get_services(db)
            certs_to_check = set()
            for service in services:
                if service.certificate_name != 'dummy':
                    certs_to_check.add(service.certificate_name)
            
            for cert_name in certs_to_check:
                fullchain_path = os.path.join(LETSENCRYPT_DIR, cert_name, "fullchain.pem")
                if os.path.exists(fullchain_path):
                    try:
                        cert_info = get_cert_info(fullchain_path)
                        days_to_expiration = cert_info["days_to_expiration"]

                        if days_to_expiration <= RENEWAL_THRESHOLD_DAYS:
                            logger.warning(f"Certificate for {cert_name} is expiring in {days_to_expiration} days. Attempting renewal.")
                            
                            renewal_success = await asyncio.to_thread(run_certbot_issue, cert_name, False)
                            
                            if renewal_success:
                                logger.info(f"Certificate for {cert_name} renewed successfully.")
                                # If this is the central LB, it will get pushed to other datacenters
                                if is_central:
                                    logger.info(f"Central LB renewed certificate for {cert_name}. Triggering sync to other datacenters.")
                                    # PUSH renewed certificate to other datacenters
                                    pass # This will be implemented in a future step
                                
                    except Exception as e:
                        logger.error(f"Failed to process certificate {cert_name}: {e}")
            
        except Exception as e:
            logger.error(f"Error in certificate renewal task: {e}")
        finally:
            await db.close()

async def cert_sync_task():
    """A background task for regional backends to sync certificates from the central server."""
    logger.info("Certificate synchronization task started.")
    is_central = os.getenv("IS_CENTRAL_LB", "false").lower() == "true"
    if is_central:
        logger.info("This is the central LB instance. Synchronization task is disabled.")
        return
        
    while True:
        await asyncio.sleep(SYNC_INTERVAL_SECONDS)
        logger.info("Starting automated certificate synchronization check.")

        db = AsyncSessionLocal()
        try:
            # Find the central LB from the database
            datacenters = await crud.get_datacenters(db)
            central_lb = next((dc for dc in datacenters if dc.name == "Central"), None)
            
            if not central_lb:
                logger.warning("No central LB datacenter found. Skipping synchronization.")
                continue

            async with httpx.AsyncClient() as client:
                # Create a temporary admin token for synchronization
                token = create_access_token(data={"sub": "cert-sync", "role": "admin"})
                headers = {"Authorization": f"Bearer {token}"}
                
                response = await client.get(f"{central_lb.api_url}/api/certificates", headers=headers, timeout=30.0)
                response.raise_for_status()
                
                central_certs = response.json()
                local_certs = []
                if os.path.exists(LETSENCRYPT_DIR):
                    local_certs = os.listdir(LETSENCRYPT_DIR)
                
                for cert_info in central_certs:
                    cert_name = cert_info['name']
                    if cert_name not in local_certs:
                        logger.info(f"Found new certificate '{cert_name}' on central LB. Downloading...")
                        # Download the certificate from the central LB
                        download_response = await client.get(f"{central_lb.api_url}/api/certificates/{cert_name}/download", headers=headers, timeout=30.0)
                        download_response.raise_for_status()
                        
                        # Save and extract the zip file
                        zip_buffer = BytesIO(download_response.content)
                        with zipfile.ZipFile(zip_buffer) as zf:
                            cert_dir = os.path.join(LETSENCRYPT_DIR, cert_name)
                            os.makedirs(cert_dir, exist_ok=True)
                            zf.extractall(cert_dir)
                            logger.info(f"Certificate '{cert_name}' downloaded and saved.")
                            
                        # Trigger local NGINX reload
                        await regenerate_configs_for_datacenter(db, os.getenv("LOCAL_DATACENTER_ID", 1))

        except Exception as e:
            logger.error(f"Error during certificate synchronization: {e}")
        finally:
            await db.close()