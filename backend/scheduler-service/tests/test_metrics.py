"""
Tests for metrics module
"""
import pytest
from metrics import (
    http_requests_total,
    device_allocations_total,
    active_allocations,
    available_devices,
    get_metrics,
)


@pytest.mark.unit
class TestMetrics:
    """Test Prometheus metrics"""

    def test_get_metrics_returns_string(self):
        """Test that get_metrics returns a string"""
        metrics = get_metrics()

        assert isinstance(metrics, bytes)
        assert len(metrics) > 0

    def test_http_requests_counter(self):
        """Test HTTP requests counter"""
        initial_value = http_requests_total.labels(
            method="GET", endpoint="/test", status_code="200"
        )._value._value

        http_requests_total.labels(
            method="GET", endpoint="/test", status_code="200"
        ).inc()

        new_value = http_requests_total.labels(
            method="GET", endpoint="/test", status_code="200"
        )._value._value

        assert new_value > initial_value

    def test_device_allocations_counter(self):
        """Test device allocations counter"""
        device_allocations_total.labels(status="success", tenant_id="test-tenant").inc()

        metrics = get_metrics().decode()
        assert "scheduler_device_allocations_total" in metrics

    def test_active_allocations_gauge(self):
        """Test active allocations gauge"""
        active_allocations.set(5)

        metrics = get_metrics().decode()
        assert "scheduler_active_allocations" in metrics

    def test_available_devices_gauge(self):
        """Test available devices gauge"""
        available_devices.set(10)

        metrics = get_metrics().decode()
        assert "scheduler_available_devices" in metrics
