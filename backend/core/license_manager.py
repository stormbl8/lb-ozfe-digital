import json
import os
from typing import Dict, Any, Optional

from .models import LicenseDetails

LICENSE_FILE = "/app/data/config/license.json"
LICENSE_CACHE: Optional[LicenseDetails] = None

def read_license() -> LicenseDetails:
    """Reads the license details from the JSON file."""
    global LICENSE_CACHE
    if LICENSE_CACHE:
        return LICENSE_CACHE

    if not os.path.exists(LICENSE_FILE):
        # Default license if none is uploaded: 1 user, read-only
        LICENSE_CACHE = LicenseDetails()
        return LICENSE_CACHE

    try:
        with open(LICENSE_FILE, 'r') as f:
            data = json.load(f)
            LICENSE_CACHE = LicenseDetails(**data)
            return LICENSE_CACHE
    except (json.JSONDecodeError, FileNotFoundError):
        LICENSE_CACHE = LicenseDetails()
        return LICENSE_CACHE

def save_license(license_data: Dict[str, Any]):
    """Saves license details to a JSON file and updates the cache."""
    global LICENSE_CACHE
    os.makedirs(os.path.dirname(LICENSE_FILE), exist_ok=True)
    with open(LICENSE_FILE, 'w') as f:
        json.dump(license_data, f, indent=2)
    LICENSE_CACHE = LicenseDetails(**license_data)