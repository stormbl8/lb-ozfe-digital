import os
import json
from jose import jwt
from datetime import datetime, timedelta, timezone

# Read environment variables set by the shell script
SECRET_KEY = os.environ.get("SECRET_KEY")
username = os.environ.get("LICENSE_USER")
role = os.environ.get("LICENSE_ROLE")
admin_limit = int(os.environ.get("ADMIN_LIMIT", "0"))
read_only_limit = int(os.environ.get("READ_ONLY_LIMIT", "0"))
allowed_roles_str = os.environ.get("ALLOWED_ROLES", "read-only")
output_dir = os.environ.get("OUTPUT_DIR")

if not all([SECRET_KEY, username, role, output_dir]):
    print("Error: Missing required environment variables.")
    exit(1)

# Create the JWT payload
payload = {
    "sub": username,
    "role": role,
    "exp": datetime.now(timezone.utc) + timedelta(days=36500),  # License valid for 100 years
    "user_limit": admin_limit + read_only_limit,
    "admin_limit": admin_limit,
    "read_only_limit": read_only_limit,
    "allowed_roles": [r.strip() for r in allowed_roles_str.split(',')]
}

# Encode the JWT
license_token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

# Save the token to the mounted file
output_file = os.path.join(output_dir, f"license_{username}.jwt")
with open(output_file, "w") as f:
    f.write(license_token)

print(f"\nSuccess! License file created for user '{username}' with role '{role}' at: {output_file}")
print("You can now upload this file via the UI to grant the user this role.")