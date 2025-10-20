from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class SchedulingStrategy(str, Enum):
    ROUND_ROBIN = "round_robin"
    LEAST_CONNECTION = "least_connection"
    WEIGHTED_ROUND_ROBIN = "weighted_round_robin"
    RESOURCE_BASED = "resource_based"


class DeviceStatus(str, Enum):
    AVAILABLE = "available"
    ALLOCATED = "allocated"
    BUSY = "busy"
    MAINTENANCE = "maintenance"
    OFFLINE = "offline"


class AllocationRequest(BaseModel):
    user_id: str = Field(..., description="用户 ID")
    tenant_id: Optional[str] = Field(None, description="租户 ID")
    preferred_specs: Optional[dict] = Field(None, description="设备规格偏好")
    duration_minutes: Optional[int] = Field(60, description="分配时长（分钟）")


class AllocationResponse(BaseModel):
    device_id: str
    status: str
    user_id: str
    tenant_id: Optional[str]
    allocated_at: datetime
    expires_at: Optional[datetime]
    adb_host: Optional[str]
    adb_port: Optional[int]


class ReleaseRequest(BaseModel):
    device_id: str = Field(..., description="设备 ID")
    user_id: Optional[str] = Field(None, description="用户 ID")


class DeviceInfo(BaseModel):
    device_id: str
    name: str
    status: DeviceStatus
    cpu_usage: float
    memory_usage: float
    storage_usage: float
    user_id: Optional[str]
    allocated_at: Optional[datetime]


class NodeInfo(BaseModel):
    node_name: str
    ip_address: str
    total_devices: int
    available_devices: int
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    is_healthy: bool
    last_heartbeat: datetime


class SchedulingStats(BaseModel):
    total_devices: int
    available_devices: int
    allocated_devices: int
    busy_devices: int
    offline_devices: int
    allocation_rate: float
    average_cpu_usage: float
    average_memory_usage: float
