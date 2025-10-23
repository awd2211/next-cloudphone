"""
Consul Service Registration for Scheduler Service
"""
import consul
from typing import Optional
from logger import get_logger

logger = get_logger(__name__, component="consul")


class ConsulClient:
    """Consul client for service registration"""

    def __init__(
        self,
        host: str = "localhost",
        port: int = 8500,
        service_name: str = "scheduler-service",
        service_host: str = "localhost",
        service_port: int = 30004,
    ):
        self.host = host
        self.port = port
        self.service_name = service_name
        self.service_host = service_host
        self.service_port = service_port
        self.service_id: Optional[str] = None
        self.consul_client: Optional[consul.Consul] = None

    def connect(self):
        """Connect to Consul"""
        try:
            self.consul_client = consul.Consul(host=self.host, port=self.port)

            # Test connection
            leader = self.consul_client.status.leader()

            logger.info(
                "consul_connected",
                host=self.host,
                port=self.port,
                leader=leader,
            )
        except Exception as e:
            logger.error(
                "consul_connection_failed",
                host=self.host,
                port=self.port,
                error=str(e),
                exc_info=True,
            )
            raise

    def register_service(self):
        """Register service with Consul"""
        if not self.consul_client:
            raise RuntimeError("Consul client not connected")

        self.service_id = f"{self.service_name}-{self.service_host}-{self.service_port}"

        try:
            # Register service
            self.consul_client.agent.service.register(
                name=self.service_name,
                service_id=self.service_id,
                address=self.service_host,
                port=self.service_port,
                tags=["cloudphone", "scheduler", "python", "fastapi"],
                check=consul.Check.http(
                    url=f"http://{self.service_host}:{self.service_port}/health",
                    interval="15s",
                    timeout="10s",
                    deregister="3m",
                ),
                meta={
                    "version": "1.0.0",
                    "language": "python",
                    "framework": "fastapi",
                },
            )

            logger.info(
                "service_registered",
                service_id=self.service_id,
                service_name=self.service_name,
                address=f"{self.service_host}:{self.service_port}",
            )
        except Exception as e:
            logger.error(
                "service_registration_failed",
                service_id=self.service_id,
                error=str(e),
                exc_info=True,
            )
            raise

    def deregister_service(self):
        """Deregister service from Consul"""
        if not self.consul_client or not self.service_id:
            return

        try:
            self.consul_client.agent.service.deregister(self.service_id)

            logger.info(
                "service_deregistered",
                service_id=self.service_id,
            )
        except Exception as e:
            logger.error(
                "service_deregistration_failed",
                service_id=self.service_id,
                error=str(e),
                exc_info=True,
            )

    def get_service(self, service_name: str) -> Optional[dict]:
        """Get service information from Consul"""
        if not self.consul_client:
            return None

        try:
            _, services = self.consul_client.health.service(service_name, passing=True)

            if not services:
                logger.warning(
                    "service_not_found",
                    service_name=service_name,
                )
                return None

            # Return first healthy service
            service = services[0]
            return {
                "name": service["Service"]["Service"],
                "address": service["Service"]["Address"],
                "port": service["Service"]["Port"],
                "tags": service["Service"]["Tags"],
            }
        except Exception as e:
            logger.error(
                "service_lookup_failed",
                service_name=service_name,
                error=str(e),
                exc_info=True,
            )
            return None


# Global Consul client instance
consul_client: Optional[ConsulClient] = None


def init_consul(
    host: str,
    port: int,
    service_name: str,
    service_host: str,
    service_port: int,
) -> ConsulClient:
    """Initialize global Consul client"""
    global consul_client
    consul_client = ConsulClient(
        host=host,
        port=port,
        service_name=service_name,
        service_host=service_host,
        service_port=service_port,
    )
    consul_client.connect()
    consul_client.register_service()
    return consul_client


def get_consul() -> Optional[ConsulClient]:
    """Get global Consul client"""
    return consul_client


def close_consul():
    """Close global Consul client"""
    global consul_client
    if consul_client:
        consul_client.deregister_service()
        consul_client = None
