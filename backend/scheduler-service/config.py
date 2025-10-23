import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # 应用配置
    ENVIRONMENT: str = "development"
    PORT: int = 3005
    DEBUG: bool = True

    # 数据库配置
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DB_NAME: str = "cloudphone_scheduler"  # 独立的调度服务数据库

    # Redis 配置
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0

    # Celery 配置
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # 调度策略配置
    SCHEDULING_ALGORITHM: str = "weighted_round_robin"  # round_robin | least_connection | weighted_round_robin
    LOAD_BALANCE_ENABLED: bool = True
    MAX_DEVICES_PER_NODE: int = 100

    # 资源监控配置
    RESOURCE_CHECK_INTERVAL: int = 30  # seconds
    CPU_THRESHOLD: int = 80  # percent
    MEMORY_THRESHOLD: int = 85  # percent
    DISK_THRESHOLD: int = 90  # percent

    # 自动扩缩容配置
    AUTO_SCALING_ENABLED: bool = True
    SCALE_UP_THRESHOLD: int = 80  # percent
    SCALE_DOWN_THRESHOLD: int = 30  # percent
    SCALE_COOLDOWN: int = 300  # seconds

    # 健康检查配置
    HEALTH_CHECK_ENABLED: bool = True
    HEALTH_CHECK_INTERVAL: int = 60  # seconds
    UNHEALTHY_THRESHOLD: int = 3  # 连续失败次数

    # 设备服务地址
    DEVICE_SERVICE_URL: str = "http://localhost:3002"

    # RabbitMQ 配置
    RABBITMQ_HOST: str = "localhost"
    RABBITMQ_PORT: int = 5672
    RABBITMQ_USER: str = "admin"
    RABBITMQ_PASSWORD: str = "admin123"
    RABBITMQ_VHOST: str = "cloudphone"
    RABBITMQ_URL: Optional[str] = None

    # Consul 配置
    CONSUL_HOST: str = "localhost"
    CONSUL_PORT: int = 8500
    CONSUL_ENABLED: bool = False
    SERVICE_NAME: str = "scheduler-service"
    SERVICE_HOST: str = "localhost"
    SERVICE_PORT: int = 30004

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # 忽略额外的环境变量

settings = Settings()

# Build RabbitMQ URL if not provided
if not settings.RABBITMQ_URL:
    settings.RABBITMQ_URL = (
        f"amqp://{settings.RABBITMQ_USER}:{settings.RABBITMQ_PASSWORD}@"
        f"{settings.RABBITMQ_HOST}:{settings.RABBITMQ_PORT}/{settings.RABBITMQ_VHOST}"
    )
