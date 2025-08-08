import os
import subprocess
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import List, Dict, Any
from OpenSSL import crypto
from datetime import datetime, timedelta, timezone

from core.security import get_current_admin_user
from core import models # NEW IMPORT

class IssueRequest(BaseModel):
    domain: str
    use_staging: bool = False

class CertificateResponse(BaseModel):
    name: str
    expiration_date: datetime
    days_to_expiration: int
    is_expiring: bool

LETSENCRYPT_DIR = "/data/certs/letsencrypt/live"
LETSENCRYPT_BASE_DIR = "/data/certs/letsencrypt"
CLOUDFLARE_CREDS_PATH = "/etc/letsencrypt/credentials/cloudflare.ini"
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/certificates",
    tags=["Certificates"]
)

def run_certbot_issue(domain: str, email: str, api_key: str, use_staging: bool):
    logger.info(f"Starting certificate issuance for {domain} (Staging: {use_staging})")
    creds_content = (f"dns_cloudflare_email = {email}\n" f"dns_cloudflare_api_key = {api_key}")
    try:
        with open(CLOUDFLARE_CREDS_PATH, "w") as f:
            f.write(creds_content)
        os.chmod(CLOUDFLARE_CREDS_PATH, 0o600)
    except Exception as e:
        logger.error(f"Failed to write Cloudflare credentials: {e}")
        return

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
        else:
            logger.error(f"Certbot failed for {domain}. Stderr: {process.stderr}")
    except Exception as e:
        logger.error(f"An exception occurred while running certbot: {e}")
    finally:
        if os.path.exists(CLOUDFLARE_CREDS_PATH):
            os.remove(CLOUDFLARE_CREDS_PATH)
            logger.info("Cleaned up Cloudflare credentials file.")

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

@router.post("/issue")
async def issue_certificate(req: IssueRequest, background_tasks: BackgroundTasks, admin_user: models.User = Depends(get_current_admin_user)):
    email = os.getenv("CLOUDFLARE_EMAIL")
    api_key = os.getenv("CLOUDFLARE_API_KEY")

    if not all([email, api_key]):
        raise HTTPException(status_code=412, detail="CLOUDFLARE_EMAIL and CLOUDFLARE_API_KEY must be set in the .env file.")

    background_tasks.add_task(run_certbot_issue, req.domain, email, api_key, req.use_staging)
    
    return {"message": f"Certificate issuance for {req.domain} has been started. Check backend logs for status."}

@router.get("", response_model=List[CertificateResponse])
async def list_certificates(admin_user: models.User = Depends(get_current_admin_user)):
    valid_certs = []
    if not os.path.exists(LETSENCRYPT_DIR):
        return []
        
    try:
        for name in os.listdir(LETSENCRYPT_DIR):
            cert_dir = os.path.join(LETSENCRYPT_DIR, name)
            if os.path.isdir(cert_dir):
                fullchain_path = os.path.join(cert_dir, "fullchain.pem")
                privkey_path = os.path.join(cert_dir, "privkey.pem")
                if (os.path.exists(fullchain_path) and os.path.getsize(fullchain_path) > 0 and
                    os.path.exists(privkey_path) and os.path.getsize(privkey_path) > 0):
                    try:
                        cert_info = get_cert_info(fullchain_path)
                        valid_certs.append({
                            "name": name,
                            "expiration_date": cert_info["expiration_date"],
                            "days_to_expiration": cert_info["days_to_expiration"],
                            "is_expiring": cert_info["is_expiring"]
                        })
                    except Exception as e:
                        logger.error(f"Failed to parse certificate {name}: {e}")
        return sorted(valid_certs, key=lambda c: c['expiration_date'])
    except Exception as e:
        logger.error(f"Error while listing/validating certificates: {e}")
        return []