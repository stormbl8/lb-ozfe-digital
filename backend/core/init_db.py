import logging
from .db_manager import read_users_db, write_users_db
from .models import UserInDB
from .security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_first_user(admin_user: str, admin_email: str, admin_pass: str):
    """
    Creates the first admin user from environment variables if no users exist.
    """
    users = await read_users_db()
    if not users:
        logger.info("No users found. Creating default admin user...")
        hashed_password = get_password_hash(admin_pass)
        default_admin = UserInDB(
            username=admin_user,
            email=admin_email,
            full_name="Admin User",
            disabled=False,
            hashed_password=hashed_password,
            role="admin"
        )
        await write_users_db([default_admin])
        logger.info(f"Default admin user '{admin_user}' created with the specified password.")
    else:
        logger.info("Users already exist. Skipping default user creation.")