"""
Tests for scheduler module
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from scheduler import DeviceScheduler
from models import AllocationRequest, SchedulingStrategy


@pytest.mark.unit
class TestDeviceScheduler:
    """Test DeviceScheduler class"""

    def test_scheduler_initialization(self, test_db):
        """Test scheduler can be initialized"""
        scheduler = DeviceScheduler(test_db)

        assert scheduler.db == test_db
        assert scheduler.strategy is not None
        assert scheduler.device_service_url is not None

    @pytest.mark.asyncio
    async def test_get_allocated_device_ids(self, test_db):
        """Test getting allocated device IDs"""
        from database import DeviceAllocation
        from datetime import datetime

        # Create test allocations
        allocation = DeviceAllocation(
            id="alloc-1",
            device_id="device-1",
            user_id="user-1",
            tenant_id="tenant-1",
            status="allocated",
            allocated_at=datetime.utcnow(),
        )
        test_db.add(allocation)
        test_db.commit()

        scheduler = DeviceScheduler(test_db)
        allocated_ids = scheduler.get_allocated_device_ids()

        assert "device-1" in allocated_ids
        assert len(allocated_ids) == 1

    def test_round_robin_selection(self, test_db):
        """Test round robin device selection"""
        scheduler = DeviceScheduler(test_db)
        devices = [
            {"id": "device-1", "name": "Device 1"},
            {"id": "device-2", "name": "Device 2"},
        ]

        selected = scheduler._round_robin(devices)

        assert selected == devices[0]

    def test_least_connection_selection(self, test_db):
        """Test least connection device selection"""
        scheduler = DeviceScheduler(test_db)
        devices = [
            {"id": "device-1", "cpuUsage": 50},
            {"id": "device-2", "cpuUsage": 30},
            {"id": "device-3", "cpuUsage": 70},
        ]

        selected = scheduler._least_connection(devices)

        assert selected["id"] == "device-2"  # Lowest CPU usage

    def test_weighted_round_robin_selection(self, test_db):
        """Test weighted round robin device selection"""
        scheduler = DeviceScheduler(test_db)
        devices = [
            {"id": "device-1", "cpuUsage": 50, "memoryUsage": 40},
            {"id": "device-2", "cpuUsage": 20, "memoryUsage": 30},
            {"id": "device-3", "cpuUsage": 80, "memoryUsage": 70},
        ]

        selected = scheduler._weighted_round_robin(devices)

        assert selected["id"] == "device-2"  # Best weighted score

    def test_resource_based_selection(self, test_db):
        """Test resource-based device selection"""
        scheduler = DeviceScheduler(test_db)
        devices = [
            {"id": "device-1", "cpuUsage": 50, "memoryUsage": 40, "storageUsage": 30},
            {"id": "device-2", "cpuUsage": 20, "memoryUsage": 30, "storageUsage": 25},
            {"id": "device-3", "cpuUsage": 80, "memoryUsage": 70, "storageUsage": 60},
        ]

        selected = scheduler._resource_based(devices)

        assert selected["id"] == "device-2"  # Most available resources

    @pytest.mark.asyncio
    async def test_get_available_devices_empty(self, test_db):
        """Test getting available devices when service returns empty"""
        scheduler = DeviceScheduler(test_db)

        with patch("httpx.AsyncClient") as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"data": []}
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )

            devices = await scheduler.get_available_devices()

            assert devices == []

    @pytest.mark.asyncio
    async def test_allocate_device_no_devices(self, test_db, sample_allocation_request):
        """Test device allocation fails when no devices available"""
        scheduler = DeviceScheduler(test_db)

        with patch.object(scheduler, "get_available_devices", return_value=[]):
            with pytest.raises(ValueError, match="没有可用设备"):
                await scheduler.allocate_device(sample_allocation_request)

    @pytest.mark.asyncio
    async def test_release_device_not_found(self, test_db):
        """Test releasing non-existent device"""
        scheduler = DeviceScheduler(test_db)

        with pytest.raises(ValueError, match="设备未被分配"):
            await scheduler.release_device("non-existent-device", "user-123")

    def test_get_allocation_stats(self, test_db):
        """Test getting allocation statistics"""
        from database import DeviceAllocation
        from datetime import datetime

        # Create test allocations
        allocation1 = DeviceAllocation(
            id="alloc-1",
            device_id="device-1",
            user_id="user-1",
            tenant_id="tenant-1",
            status="allocated",
            allocated_at=datetime.utcnow(),
        )
        allocation2 = DeviceAllocation(
            id="alloc-2",
            device_id="device-2",
            user_id="user-2",
            tenant_id="tenant-1",
            status="released",
            allocated_at=datetime.utcnow(),
        )
        test_db.add(allocation1)
        test_db.add(allocation2)
        test_db.commit()

        scheduler = DeviceScheduler(test_db)
        stats = scheduler.get_allocation_stats()

        assert stats["total_allocations"] == 2
        assert stats["active_allocations"] == 1
        assert "strategy" in stats
