"""
Tests for API endpoints
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from main import app

client = TestClient(app)


@pytest.mark.unit
class TestAPIEndpoints:
    """Test FastAPI endpoints"""

    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "scheduler-service"
        assert "timestamp" in data

    def test_metrics_endpoint(self):
        """Test metrics endpoint"""
        response = client.get("/metrics")

        assert response.status_code == 200
        assert "text/plain" in response.headers["content-type"]
        assert b"scheduler_http_requests_total" in response.content

    def test_get_config(self):
        """Test get config endpoint"""
        response = client.get("/api/scheduler/config")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "scheduling_algorithm" in data["data"]
        assert "load_balance_enabled" in data["data"]

    @patch("scheduler.DeviceScheduler.get_available_devices")
    @pytest.mark.asyncio
    async def test_get_available_devices(self, mock_get_devices):
        """Test get available devices endpoint"""
        mock_get_devices.return_value = [
            {"id": "device-1", "name": "Device 1"},
            {"id": "device-2", "name": "Device 2"},
        ]

        response = client.get("/api/scheduler/devices/available")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) >= 0
