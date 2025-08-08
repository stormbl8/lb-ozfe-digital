import asyncio
import os
import subprocess
import logging
from datetime import datetime, timezone, timedelta
from OpenSSL import crypto

from .database import AsyncSessionLocal
from . import crud
from .nginx_manager import regenerate_configs_for_datacenter, reload_nginx

logger = logging.getLogger(__name__)

RENEWAL_THRESHOLD_DAYS = 30
LETSENCRYPT_DIR = "/data/certs/letsencrypt/live"
CLOUDFLARE_CREDS_PATH = "/etc/letsencrypt/credentials/cloudflare.ini"
LETSENCRYPT_BASE_DIR = "/data/certs/letsencrypt"
CERTBOT_RENEW_INTERVAL_SECONDS = 24 * 60 * 60 # Run once every 24 hours

async def cert_renewal_task():
    """A background task that runs periodically to renew certificates."""
    logger.info("Certificate renewal task started.")
    while True:
        await asyncio.sleep(CERTBOT_RENEW_INTERVAL_SECONDS)
        logger.info("Starting automated certificate renewal check.")
        
        db = AsyncSessionLocal()
        try:
            services = await crud.get_services(db)
            certs_to_check = set()
            for service in services:
                if service.certificate_name != 'dummy':
                    certs_to_check.add(service.certificate_name)
            
            renewed_certs = []
            for cert_name in certs_to_check:
                fullchain_path = os.path.join(LETSENCRYPT_DIR, cert_name, "fullchain.pem")
                if os.path.exists(fullchain_path):
                    try:
                        with open(fullchain_path, 'r') as f:
                            cert_data = f.read()
                        cert = crypto.load_certificate(crypto.FILETYPE_PEM, cert_data)
                        expiration_date_bytes = cert.get_notAfter()
                        expiration_date = datetime.strptime(expiration_date_bytes.decode('ascii'), '%Y%m%d%H%M%SZ').replace(tzinfo=timezone.utc)
                        days_to_expiration = (expiration_date - datetime.now(timezone.utc)).days

                        if days_to_expiration <= RENEWAL_THRESHOLD_DAYS:
                            logger.warning(f"Certificate for {cert_name} is expiring in {days_to_expiration} days. Attempting renewal.")
                            
                            email = os.getenv("CLOUDFLARE_EMAIL")
                            api_key = os.getenv("CLOUDFLARE_API_KEY")

                            if not all([email, api_key]):
                                logger.error("CLOUDFLARE_EMAIL and CLOUDFLARE_API_KEY must be set to run automated renewal.")
                                continue

                            creds_content = (f"dns_cloudflare_email = {email}\n" f"dns_cloudflare_api_key = {api_key}")
                            try:
                                with open(CLOUDFLARE_CREDS_PATH, "w") as f:
                                    f.write(creds_content)
                                os.chmod(CLOUDFLARE_CREDS_PATH, 0o600)
                            except Exception as e:
                                logger.error(f"Failed to write Cloudflare credentials for renewal: {e}")
                                continue

                            renew_command = [
                                "certbot", "renew",
                                "--dns-cloudflare", "--dns-cloudflare-credentials", CLOUDFLARE_CREDS_PATH,
                                "--non-interactive", "--quiet",
                                "--config-dir", LETSENCRYPT_BASE_DIR, "--work-dir", "/data/certs/work", "--logs-dir", "/data/certs/logs"
                            ]

                            process = subprocess.run(renew_command, capture_output=True, text=True, check=False)
                            if process.returncode == 0:
                                logger.info(f"Certificate for {cert_name} renewed successfully.")
                                renewed_certs.append(cert_name)
                            else:
                                logger.error(f"Certbot renewal failed for {cert_name}. Stderr: {process.stderr}")

                            if os.path.exists(CLOUDFLARE_CREDS_PATH):
                                os.remove(CLOUDFLARE_CREDS_PATH)
                                logger.info("Cleaned up Cloudflare credentials file.")
                            
                    except Exception as e:
                        logger.error(f"Failed to process certificate {cert_name}: {e}")

            if renewed_certs:
                # If any certs were renewed, we need to regenerate and reload NGINX configs for all datacenters.
                datacenters = await crud.get_datacenters(db)
                for dc in datacenters:
                    await regenerate_configs_for_datacenter(db, dc.id)
                
        except Exception as e:
            logger.error(f"Error in certificate renewal task: {e}")
        finally:
            await db.close()