"""
Pytest configuration and fixtures
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
import os

# Test database URL
TEST_DATABASE_URL = "sqlite:///./test_scheduler.db"


@pytest.fixture(scope="function")
def test_db():
    """Create test database"""
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)

    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        # Clean up test database file
        if os.path.exists("./test_scheduler.db"):
            os.remove("./test_scheduler.db")


@pytest.fixture
def sample_allocation_request():
    """Sample allocation request"""
    from models import AllocationRequest

    return AllocationRequest(
        user_id="user-123",
        tenant_id="tenant-456",
        duration_minutes=60,
        requirements=None,
    )


@pytest.fixture
def sample_device():
    """Sample device data"""
    return {
        "id": "device-789",
        "name": "Test Device",
        "status": "running",
        "cpuUsage": 30,
        "memoryUsage": 40,
        "storageUsage": 50,
        "adbHost": "localhost",
        "adbPort": 5555,
    }
