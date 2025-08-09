import logging
from sqlalchemy.ext.asyncio import AsyncSession
from . import crud, models
from .security import get_password_hash
from .license_manager import read_license

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_first_user(db: AsyncSession, admin_user: str, admin_email: str, admin_pass: str):
    """
    Creates the first admin user from environment variables if no users exist.
    """
    users = await crud.get_users(db)
    if not users:
        license_data = read_license()
        if license_data.get("user_limit", 1) > 1:
            logger.info("No users found. Creating default admin user...")
            admin_data = models.AdminUserCreate(
                username=admin_user,
                email=admin_email,
                password=admin_pass,
                role="admin"
            )
            await crud.create_user(db, admin_data)
            logger.info(f"Default admin user '{admin_user}' created.")
        else:
            logger.warning("No valid license found. Skipping default user creation.")
    else:
        logger.info("Users already exist. Skipping default user creation.")