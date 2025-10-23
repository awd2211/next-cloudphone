"""
RabbitMQ Event Bus for Scheduler Service
"""
import aio_pika
import json
from typing import Optional, Dict, Any
from logger import get_logger

logger = get_logger(__name__, component="rabbitmq")


class RabbitMQEventBus:
    """RabbitMQ Event Bus for publishing events"""

    def __init__(self, rabbitmq_url: str):
        self.rabbitmq_url = rabbitmq_url
        self.connection: Optional[aio_pika.Connection] = None
        self.channel: Optional[aio_pika.Channel] = None
        self.exchange: Optional[aio_pika.Exchange] = None

    async def connect(self):
        """Connect to RabbitMQ"""
        try:
            self.connection = await aio_pika.connect_robust(self.rabbitmq_url)
            self.channel = await self.connection.channel()

            # Declare exchange
            self.exchange = await self.channel.declare_exchange(
                "cloudphone.events",
                aio_pika.ExchangeType.TOPIC,
                durable=True,
            )

            logger.info(
                "rabbitmq_connected",
                url=self.rabbitmq_url.replace(
                    self.rabbitmq_url.split("@")[0].split("//")[1],
                    "***:***"
                ) if "@" in self.rabbitmq_url else self.rabbitmq_url,
            )
        except Exception as e:
            logger.error(
                "rabbitmq_connection_failed",
                error=str(e),
                exc_info=True,
            )
            raise

    async def disconnect(self):
        """Disconnect from RabbitMQ"""
        if self.connection:
            await self.connection.close()
            logger.info("rabbitmq_disconnected")

    async def publish_event(
        self,
        routing_key: str,
        event_data: Dict[str, Any],
        event_type: str = "scheduler.event",
    ):
        """Publish an event to RabbitMQ"""
        if not self.exchange:
            logger.warning("rabbitmq_not_connected", routing_key=routing_key)
            return

        try:
            message_body = json.dumps(event_data)
            message = aio_pika.Message(
                body=message_body.encode(),
                content_type="application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                headers={
                    "event_type": event_type,
                    "service": "scheduler-service",
                },
            )

            await self.exchange.publish(
                message,
                routing_key=routing_key,
            )

            logger.debug(
                "event_published",
                routing_key=routing_key,
                event_type=event_type,
                data_keys=list(event_data.keys()),
            )
        except Exception as e:
            logger.error(
                "event_publish_failed",
                routing_key=routing_key,
                error=str(e),
                exc_info=True,
            )

    async def publish_device_allocated(
        self,
        device_id: str,
        user_id: str,
        tenant_id: Optional[str],
        allocation_id: str,
        allocated_at: str,
        expires_at: str,
    ):
        """Publish device allocated event"""
        await self.publish_event(
            routing_key="scheduler.device.allocated",
            event_data={
                "device_id": device_id,
                "user_id": user_id,
                "tenant_id": tenant_id,
                "allocation_id": allocation_id,
                "allocated_at": allocated_at,
                "expires_at": expires_at,
                "service": "scheduler-service",
            },
            event_type="scheduler.device.allocated",
        )

    async def publish_device_released(
        self,
        device_id: str,
        user_id: str,
        allocation_id: str,
        released_at: str,
        duration_seconds: int,
    ):
        """Publish device released event"""
        await self.publish_event(
            routing_key="scheduler.device.released",
            event_data={
                "device_id": device_id,
                "user_id": user_id,
                "allocation_id": allocation_id,
                "released_at": released_at,
                "duration_seconds": duration_seconds,
                "service": "scheduler-service",
            },
            event_type="scheduler.device.released",
        )

    async def publish_allocation_expired(
        self,
        device_id: str,
        user_id: str,
        allocation_id: str,
        allocated_at: str,
        expired_at: str,
    ):
        """Publish allocation expired event"""
        await self.publish_event(
            routing_key="scheduler.allocation.expired",
            event_data={
                "device_id": device_id,
                "user_id": user_id,
                "allocation_id": allocation_id,
                "allocated_at": allocated_at,
                "expired_at": expired_at,
                "service": "scheduler-service",
            },
            event_type="scheduler.allocation.expired",
        )

    async def publish_scheduling_failed(
        self,
        user_id: str,
        tenant_id: Optional[str],
        reason: str,
        available_devices: int,
    ):
        """Publish scheduling failed event"""
        await self.publish_event(
            routing_key="scheduler.scheduling.failed",
            event_data={
                "user_id": user_id,
                "tenant_id": tenant_id,
                "reason": reason,
                "available_devices": available_devices,
                "service": "scheduler-service",
            },
            event_type="scheduler.scheduling.failed",
        )


# Global event bus instance
event_bus: Optional[RabbitMQEventBus] = None


def get_event_bus() -> Optional[RabbitMQEventBus]:
    """Get global event bus instance"""
    return event_bus


async def init_event_bus(rabbitmq_url: str):
    """Initialize global event bus"""
    global event_bus
    event_bus = RabbitMQEventBus(rabbitmq_url)
    await event_bus.connect()
    return event_bus


async def close_event_bus():
    """Close global event bus"""
    global event_bus
    if event_bus:
        await event_bus.disconnect()
        event_bus = None
