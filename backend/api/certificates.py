import os
import subprocess
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

class IssueRequest(BaseModel):
    domain: str
    use_staging: bool = False

LETSENCRYPT_DIR = "/data/certs/letsencrypt/live"
LETSENCRYPT_BASE_DIR = "/data/certs/letsencrypt" # For permissions
CLOUDFLARE_CREDS_PATH = "/etc/letsencrypt/credentials/cloudflare.ini"
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/certificates",
    tags=["Certificates"]
)

def run_certbot_issue(domain: str, email: str, api_key: str, use_staging: bool):
    """
    This function runs in the background to avoid tying up the API.
    It securely writes credentials, runs certbot, fixes permissions, and cleans up.
    """
    logger.info(f"Starting certificate issuance for {domain} (Staging: {use_staging})")
    
    creds_content = (
        f"dns_cloudflare_email = {email}\n"
        f"dns_cloudflare_api_key = {api_key}"
    )
    
    try:
        with open(CLOUDFLARE_CREDS_PATH, "w") as f:
            f.write(creds_content)
        os.chmod(CLOUDFLARE_CREDS_PATH, 0o600)
    except Exception as e:
        logger.error(f"Failed to write Cloudflare credentials: {e}")
        return

    command = [
        "certbot", "certonly",
        "--dns-cloudflare",
        "--dns-cloudflare-credentials", CLOUDFLARE_CREDS_PATH,
        "--non-interactive", "--agree-tos",
        "--email", email,
        "-d", domain,
        "--config-dir", "/data/certs/letsencrypt",
        "--work-dir", "/data/certs/work",
        "--logs-dir", "/data/certs/logs"
    ]
    
    if use_staging:
        command.append("--staging")
    
    try:
        process = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=False
        )
        
        if process.returncode == 0:
            logger.info(f"Certbot succeeded for {domain}. Stdout: {process.stdout}")
            # --- THIS IS THE FIX ---
            # After success, fix permissions so NGINX can read the certs.
            # a+rX gives read permission to all files and execute/search permission to all directories.
            logger.info("Updating certificate file permissions for NGINX...")
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


@router.post("/issue")
async def issue_certificate(req: IssueRequest, background_tasks: BackgroundTasks):
    """
    API endpoint to trigger certificate issuance in a background task.
    """
    email = os.getenv("CLOUDFLARE_EMAIL")
    api_key = os.getenv("CLOUDFLARE_API_KEY")

    if not all([email, api_key]):
        raise HTTPException(
            status_code=412,
            detail="CLOUDFLARE_EMAIL and CLOUDFLARE_API_KEY must be set in the .env file."
        )

    background_tasks.add_task(run_certbot_issue, req.domain, email, api_key, req.use_staging)
    
    return {
        "message": f"Certificate issuance for {req.domain} has been started. Check backend logs for status."
    }

@router.get("")
async def list_certificates():
    """Scans the Let's Encrypt directory for available certificate names."""
    try:
        if not os.path.exists(LETSENCRYPT_DIR):
            return []
        certs = [name for name in os.listdir(LETSENCRYPT_DIR) if os.path.isdir(os.path.join(LETSENCRYPT_DIR, name))]
        return sorted(certs)
    except FileNotFoundError:
        return []