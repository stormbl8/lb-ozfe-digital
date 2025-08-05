import json
import os
from typing import Dict, Any

LICENSE_FILE = "/app/data/config/license.json"

def read_license() -> Dict[str, Any]:
    """Reads the license details from the JSON file."""
    if not os.path.exists(LICENSE_FILE):
        # Default license if none is uploaded: 1 user, read-only
        return {"user_limit": 1, "allowed_roles": ["read-only"]}
    try:
        with open(LICENSE_FILE, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return {"user_limit": 1, "allowed_roles": ["read-only"]}

def save_license(license_data: Dict[str, Any]):
    """Saves license details to a JSON file."""
    os.makedirs(os.path.dirname(LICENSE_FILE), exist_ok=True)
    with open(LICENSE_FILE, 'w') as f:
        json.dump(license_data, f, indent=2)