"""
Tests for RabbitMQ event bus
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from rabbitmq import RabbitMQEventBus


@pytest.mark.unit
class TestRabbitMQEventBus:
    """Test RabbitMQ Event Bus"""

    def test_event_bus_initialization(self):
        """Test event bus can be initialized"""
        event_bus = RabbitMQEventBus("amqp://localhost")

        assert event_bus.rabbitmq_url == "amqp://localhost"
        assert event_bus.connection is None
        assert event_bus.channel is None

    @pytest.mark.asyncio
    async def test_publish_event(self):
        """Test publishing an event"""
        event_bus = RabbitMQEventBus("amqp://localhost")

        # Mock exchange
        mock_exchange = AsyncMock()
        event_bus.exchange = mock_exchange

        await event_bus.publish_event(
            routing_key="test.event",
            event_data={"foo": "bar"},
            event_type="test.event",
        )

        mock_exchange.publish.assert_called_once()

    @pytest.mark.asyncio
    async def test_publish_device_allocated(self):
        """Test publishing device allocated event"""
        event_bus = RabbitMQEventBus("amqp://localhost")

        # Mock exchange
        mock_exchange = AsyncMock()
        event_bus.exchange = mock_exchange

        await event_bus.publish_device_allocated(
            device_id="device-123",
            user_id="user-456",
            tenant_id="tenant-789",
            allocation_id="alloc-999",
            allocated_at="2025-10-23T00:00:00",
            expires_at="2025-10-23T01:00:00",
        )

        mock_exchange.publish.assert_called_once()

    @pytest.mark.asyncio
    async def test_publish_device_released(self):
        """Test publishing device released event"""
        event_bus = RabbitMQEventBus("amqp://localhost")

        # Mock exchange
        mock_exchange = AsyncMock()
        event_bus.exchange = mock_exchange

        await event_bus.publish_device_released(
            device_id="device-123",
            user_id="user-456",
            allocation_id="alloc-999",
            released_at="2025-10-23T01:00:00",
            duration_seconds=3600,
        )

        mock_exchange.publish.assert_called_once()
