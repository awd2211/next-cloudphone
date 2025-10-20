from sqlalchemy import create_engine, Column, String, Integer, DateTime, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from config import settings

# 数据库连接
DATABASE_URL = f"postgresql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"

engine = create_engine(DATABASE_URL, echo=settings.DEBUG)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# 设备分配记录模型
class DeviceAllocation(Base):
    __tablename__ = "device_allocations"

    id = Column(String, primary_key=True)
    device_id = Column(String, nullable=False, index=True)
    user_id = Column(String, nullable=False, index=True)
    tenant_id = Column(String, index=True)
    status = Column(String, default="allocated")  # allocated, released, expired
    allocated_at = Column(DateTime, default=datetime.utcnow)
    released_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, default=0)
    extra_metadata = Column(String, nullable=True)  # JSON string - 避免与 SQLAlchemy 的 metadata 冲突

    def __repr__(self):
        return f"<DeviceAllocation(device_id={self.device_id}, user_id={self.user_id})>"


# 节点资源信息模型
class NodeResource(Base):
    __tablename__ = "node_resources"

    id = Column(String, primary_key=True)
    node_name = Column(String, unique=True, nullable=False)
    ip_address = Column(String)
    total_devices = Column(Integer, default=0)
    available_devices = Column(Integer, default=0)
    cpu_usage = Column(Float, default=0.0)
    memory_usage = Column(Float, default=0.0)
    disk_usage = Column(Float, default=0.0)
    is_healthy = Column(Boolean, default=True)
    last_heartbeat = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<NodeResource(node_name={self.node_name}, available={self.available_devices})>"


# 创建表
def init_db():
    Base.metadata.create_all(bind=engine)


# 获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
