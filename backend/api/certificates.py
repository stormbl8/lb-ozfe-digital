import os
import subprocess
import logging
import zipfile
from io import BytesIO
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, File, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any
from OpenSSL import crypto
from datetime import datetime, timedelta, timezone

from core.security import get_current_admin_user, get_current_user
from core import models
from core.cert_manager import get_cert_info, run_certbot_issue

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

@router.post("/issue")
async def issue_certificate(req: IssueRequest, background_tasks: BackgroundTasks, admin_user: models.User = Depends(get_current_admin_user)):
    email = os.getenv("CLOUDFLARE_EMAIL")
    api_key = os.getenv("CLOUDFLARE_API_KEY")

    if not all([email, api_key]):
        raise HTTPException(status_code=412, detail="CLOUDFLARE_EMAIL and CLOUDFLARE_API_KEY must be set in the .env file.")

    background_tasks.add_task(run_certbot_issue, req.domain, email, api_key, req.use_staging)
    
    return {"message": f"Certificate issuance for {req.domain} has been started. Check backend logs for status."}

@router.get("", response_model=List[CertificateResponse])
async def list_certificates(current_user: models.User = Depends(get_current_user)):
    """
    Retrieve a list of all discovered certificates.
    Accessible by all authenticated users.
    """
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

@router.get("/{cert_name}/download")
async def download_certificate(cert_name: str, current_user: models.User = Depends(get_current_user)):
    """
    Allows remote backends to download a certificate's key and fullchain.
    Accessible by all authenticated users.
    """
    cert_dir = os.path.join(LETSENCRYPT_DIR, cert_name)
    if not os.path.isdir(cert_dir):
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    try:
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            fullchain_path = os.path.join(cert_dir, "fullchain.pem")
            privkey_path = os.path.join(cert_dir, "privkey.pem")
            
            if os.path.exists(fullchain_path):
                zf.write(fullchain_path, os.path.basename(fullchain_path))
            if os.path.exists(privkey_path):
                zf.write(privkey_path, os.path.basename(privkey_path))
        
        zip_buffer.seek(0)
        return StreamingResponse(zip_buffer, media_type="application/zip", headers={"Content-Disposition": f"attachment;filename={cert_name}.zip"})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_certificate(file: UploadFile, admin_user: models.User = Depends(get_current_admin_user)):
    """
    Allows remote backends to upload a certificate for centralized storage.
    This would typically be called by a regional backend after a successful renewal.
    """
    try:
        zip_buffer = BytesIO(await file.read())
        
        cert_name = file.filename.replace(".zip", "")
        cert_dir = os.path.join(LETSENCRYPT_DIR, cert_name)
        os.makedirs(cert_dir, exist_ok=True)
        
        with zipfile.ZipFile(zip_buffer) as zf:
            zf.extractall(cert_dir)
            
        return {"message": f"Certificate files for {cert_name} uploaded successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload certificate: {e}")