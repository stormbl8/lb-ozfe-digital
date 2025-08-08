import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from . import models, security

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- User CRUD Operations ---

async def get_user(db: AsyncSession, user_id: int):
    result = await db.execute(select(models.User).filter(models.User.id == user_id))
    return result.scalars().first()

async def get_user_by_username(db: AsyncSession, username: str):
    result = await db.execute(select(models.User).filter(models.User.username == username))
    return result.scalars().first()

async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(select(models.User).filter(models.User.email == email))
    return result.scalars().first()

async def get_users(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(models.User)
        .filter(models.User.username != '')
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

async def create_user(db: AsyncSession, user: models.AdminUserCreate):
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def update_user(db: AsyncSession, db_user: models.User, user_in: models.UserUpdate):
    update_data = user_in.dict(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        hashed_password = security.get_password_hash(update_data["password"])
        db_user.hashed_password = hashed_password
    
    for key, value in update_data.items():
        if key != "password":
            setattr(db_user, key, value)
            
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def delete_user(db: AsyncSession, db_user: models.User):
    await db.delete(db_user)
    await db.commit()

async def create_first_user(db: AsyncSession, admin_user: str, admin_email: str, admin_pass: str):
    users = await get_users(db)
    if not users:
        logger.info("No users found. Creating default admin user...")
        admin_data = models.AdminUserCreate(
            username=admin_user,
            email=admin_email,
            password=admin_pass,
            role="admin"
        )
        await create_user(db, admin_data)
        logger.info(f"Default admin user '{admin_user}' created.")
    else:
        logger.info("Users already exist. Skipping default user creation.")

# --- Monitor CRUD Operations ---

async def get_monitor(db: AsyncSession, monitor_id: int):
    result = await db.execute(select(models.Monitor).filter(models.Monitor.id == monitor_id))
    return result.scalars().first()

async def get_monitors(db: AsyncSession):
    result = await db.execute(select(models.Monitor))
    return result.scalars().all()

async def create_monitor(db: AsyncSession, monitor: models.MonitorCreate):
    db_monitor = models.Monitor(**monitor.dict())
    db.add(db_monitor)
    await db.commit()
    await db.refresh(db_monitor)
    return db_monitor

async def update_monitor(db: AsyncSession, db_monitor: models.Monitor, monitor_in: models.MonitorCreate):
    update_data = monitor_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_monitor, key, value)
    await db.commit()
    await db.refresh(db_monitor)
    return db_monitor

async def delete_monitor(db: AsyncSession, db_monitor: models.Monitor):
    await db.delete(db_monitor)
    await db.commit()

# --- Pool CRUD Operations ---

async def get_pool(db: AsyncSession, pool_id: int):
    result = await db.execute(
        select(models.Pool).options(selectinload(models.Pool.services)).filter(models.Pool.id == pool_id)
    )
    return result.scalars().first()

async def get_pool_by_name(db: AsyncSession, name: str):
    result = await db.execute(select(models.Pool).filter(models.Pool.name == name))
    return result.scalars().first()

async def get_pools(db: AsyncSession):
    result = await db.execute(select(models.Pool))
    return result.scalars().all()

async def create_pool(db: AsyncSession, pool: models.PoolCreate):
    backend_servers_dict = [s.dict() for s in pool.backend_servers]
    db_pool = models.Pool(
        name=pool.name,
        backend_servers=backend_servers_dict,
        load_balancing_algorithm=pool.load_balancing_algorithm,
        monitor_id=pool.monitor_id
    )
    db.add(db_pool)
    await db.commit()
    await db.refresh(db_pool)
    return db_pool

async def update_pool(db: AsyncSession, db_pool: models.Pool, pool_in: models.PoolCreate):
    db_pool.name = pool_in.name
    db_pool.backend_servers = [s.dict() for s in pool_in.backend_servers]
    db_pool.load_balancing_algorithm = pool_in.load_balancing_algorithm
    db_pool.monitor_id = pool_in.monitor_id
    await db.commit()
    await db.refresh(db_pool)
    return db_pool

async def delete_pool(db: AsyncSession, db_pool: models.Pool):
    await db.delete(db_pool)
    await db.commit()

# --- WAFRuleSet CRUD Operations ---
async def get_waf_ruleset(db: AsyncSession, ruleset_id: int):
    result = await db.execute(select(models.WAFRuleSet).filter(models.WAFRuleSet.id == ruleset_id))
    return result.scalars().first()

async def get_waf_rulesets(db: AsyncSession):
    result = await db.execute(select(models.WAFRuleSet))
    return result.scalars().all()

async def create_waf_ruleset(db: AsyncSession, ruleset: models.WAFRuleSetCreate):
    db_ruleset = models.WAFRuleSet(**ruleset.dict())
    db.add(db_ruleset)
    await db.commit()
    await db.refresh(db_ruleset)
    return db_ruleset

async def update_waf_ruleset(db: AsyncSession, db_ruleset: models.WAFRuleSet, ruleset_in: models.WAFRuleSetCreate):
    update_data = ruleset_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_ruleset, key, value)
    await db.commit()
    await db.refresh(db_ruleset)
    return db_ruleset

async def delete_waf_ruleset(db: AsyncSession, db_ruleset: models.WAFRuleSet):
    await db.delete(db_ruleset)
    await db.commit()

# --- Service CRUD Operations ---

async def get_service(db: AsyncSession, service_id: int):
    result = await db.execute(
        select(models.Service)
        .options(
            selectinload(models.Service.pool),
            selectinload(models.Service.gslb_service)
        )
        .filter(models.Service.id == service_id)
    )
    return result.scalars().first()
    
async def get_services(db: AsyncSession):
    result = await db.execute(
        select(models.Service).options(
            selectinload(models.Service.pool),
            selectinload(models.Service.gslb_service)
        )
    )
    return result.scalars().all()

async def get_services_by_datacenter(db: AsyncSession, datacenter_id: int):
    result = await db.execute(
        select(models.Service)
        .options(
            selectinload(models.Service.pool),
            selectinload(models.Service.gslb_service)
        )
        .filter(models.Service.datacenter_id == datacenter_id)
    )
    return result.scalars().all()

async def create_service(db: AsyncSession, service: models.ServiceCreate):
    db_service = models.Service(**service.dict())
    db.add(db_service)
    await db.commit()
    await db.refresh(db_service)
    return db_service

async def update_service(db: AsyncSession, db_service: models.Service, service_in: models.ServiceCreate):
    update_data = service_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_service, key, value)
    await db.commit()
    await db.refresh(db_service)
    return db_service

async def delete_service(db: AsyncSession, db_service: models.Service):
    await db.delete(db_service)
    await db.commit()
    
# --- Datacenter CRUD Operations ---

async def get_datacenter(db: AsyncSession, datacenter_id: int):
    result = await db.execute(select(models.Datacenter).filter(models.Datacenter.id == datacenter_id))
    return result.scalars().first()

async def get_datacenters(db: AsyncSession):
    result = await db.execute(select(models.Datacenter))
    return result.scalars().all()

async def create_datacenter(db: AsyncSession, datacenter: models.DatacenterCreate):
    db_datacenter = models.Datacenter(**datacenter.dict())
    db.add(db_datacenter)
    await db.commit()
    await db.refresh(db_datacenter)
    return db_datacenter

async def update_datacenter(db: AsyncSession, db_datacenter: models.Datacenter, datacenter_in: models.DatacenterCreate):
    update_data = datacenter_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_datacenter, key, value)
    await db.commit()
    await db.refresh(db_datacenter)
    return db_datacenter

async def delete_datacenter(db: AsyncSession, db_datacenter: models.Datacenter):
    await db.delete(db_datacenter)
    await db.commit()

# --- GSLBService CRUD Operations ---

async def get_gslb_service(db: AsyncSession, gslb_service_id: int):
    result = await db.execute(
        select(models.GSLBService)
        .options(selectinload(models.GSLBService.services))
        .filter(models.GSLBService.id == gslb_service_id)
    )
    return result.scalars().first()

async def get_gslb_services(db: AsyncSession):
    result = await db.execute(
        select(models.GSLBService).options(selectinload(models.GSLBService.services))
    )
    return result.scalars().all()

async def create_gslb_service(db: AsyncSession, gslb_service: models.GSLBServiceCreate):
    db_gslb_service = models.GSLBService(**gslb_service.dict())
    db.add(db_gslb_service)
    await db.commit()
    await db.refresh(db_gslb_service)
    return db_gslb_service

async def update_gslb_service(db: AsyncSession, db_gslb_service: models.GSLBService, gslb_service_in: models.GSLBServiceCreate):
    update_data = gslb_service_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_gslb_service, key, value)
    await db.commit()
    await db.refresh(db_gslb_service)
    return db_gslb_service

async def delete_gslb_service(db: AsyncSession, db_gslb_service: models.GSLBService):
    await db.delete(db_gslb_service)
    await db.commit()