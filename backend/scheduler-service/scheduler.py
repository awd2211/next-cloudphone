import httpx
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import DeviceAllocation, NodeResource
from models import AllocationRequest, AllocationResponse, DeviceInfo, SchedulingStrategy
from config import settings
import uuid
from logger import get_logger
from rabbitmq import get_event_bus
from metrics import (
    device_allocations_total,
    device_releases_total,
    active_allocations,
    allocation_duration_seconds,
    scheduling_decisions_total,
    available_devices as available_devices_gauge,
    allocated_devices as allocated_devices_gauge,
    errors_total,
    device_service_calls_total,
    device_service_call_duration_seconds,
)
import time

# 创建 logger
logger = get_logger(__name__, component="scheduler")


class DeviceScheduler:
    """设备调度器"""

    def __init__(self, db: Session):
        self.db = db
        self.strategy = settings.SCHEDULING_ALGORITHM
        self.device_service_url = settings.DEVICE_SERVICE_URL

    async def allocate_device(self, request: AllocationRequest) -> AllocationResponse:
        """分配设备"""
        logger.debug(
            "allocate_device_start",
            user_id=request.user_id,
            tenant_id=request.tenant_id,
            duration_minutes=request.duration_minutes,
        )

        # 获取可用设备列表
        available_devices = await self.get_available_devices()

        if not available_devices:
            logger.warning(
                "no_available_devices",
                user_id=request.user_id,
                tenant_id=request.tenant_id,
            )

            # 发布调度失败事件
            event_bus = get_event_bus()
            if event_bus:
                try:
                    await event_bus.publish_scheduling_failed(
                        user_id=request.user_id,
                        tenant_id=request.tenant_id,
                        reason="no_available_devices",
                        available_devices=0,
                    )
                except Exception as e:
                    logger.error(
                        "event_publish_failed",
                        error=str(e),
                        event_type="scheduling_failed",
                    )

            raise ValueError("没有可用设备")

        logger.debug(
            "available_devices_found",
            count=len(available_devices),
            user_id=request.user_id,
        )

        # 根据策略选择设备
        selected_device = self.select_device(available_devices, request)

        if not selected_device:
            logger.warning(
                "no_suitable_device",
                available_count=len(available_devices),
                user_id=request.user_id,
                strategy=self.strategy,
            )
            raise ValueError("无法找到合适的设备")

        logger.info(
            "device_selected",
            device_id=selected_device['id'],
            strategy=self.strategy,
            user_id=request.user_id,
        )

        # 创建分配记录
        allocation = DeviceAllocation(
            id=str(uuid.uuid4()),
            device_id=selected_device['id'],
            user_id=request.user_id,
            tenant_id=request.tenant_id,
            status="allocated",
            allocated_at=datetime.utcnow(),
        )

        self.db.add(allocation)
        self.db.commit()

        # 计算过期时间
        expires_at = datetime.utcnow() + timedelta(minutes=request.duration_minutes)

        # 记录指标
        device_allocations_total.labels(
            status="success",
            tenant_id=request.tenant_id or "unknown"
        ).inc()

        # 更新活跃分配数
        active_count = self.db.query(DeviceAllocation).filter(
            DeviceAllocation.status == "allocated"
        ).count()
        active_allocations.set(active_count)

        # 发布事件到 RabbitMQ
        event_bus = get_event_bus()
        if event_bus:
            try:
                await event_bus.publish_device_allocated(
                    device_id=selected_device['id'],
                    user_id=request.user_id,
                    tenant_id=request.tenant_id,
                    allocation_id=allocation.id,
                    allocated_at=allocation.allocated_at.isoformat(),
                    expires_at=expires_at.isoformat(),
                )
            except Exception as e:
                logger.error(
                    "event_publish_failed",
                    error=str(e),
                    event_type="device_allocated",
                )

        logger.info(
            "device_allocation_completed",
            allocation_id=allocation.id,
            device_id=selected_device['id'],
            user_id=request.user_id,
            expires_at=expires_at.isoformat(),
        )

        return AllocationResponse(
            device_id=selected_device['id'],
            status="allocated",
            user_id=request.user_id,
            tenant_id=request.tenant_id,
            allocated_at=allocation.allocated_at,
            expires_at=expires_at,
            adb_host=selected_device.get('adbHost'),
            adb_port=selected_device.get('adbPort'),
        )

    async def release_device(self, device_id: str, user_id: Optional[str] = None) -> dict:
        """释放设备"""
        logger.debug(
            "release_device_start",
            device_id=device_id,
            user_id=user_id,
        )

        # 查找分配记录
        query = self.db.query(DeviceAllocation).filter(
            DeviceAllocation.device_id == device_id,
            DeviceAllocation.status == "allocated"
        )

        if user_id:
            query = query.filter(DeviceAllocation.user_id == user_id)

        allocation = query.first()

        if not allocation:
            logger.warning(
                "allocation_not_found",
                device_id=device_id,
                user_id=user_id,
            )
            raise ValueError("设备未被分配或分配记录不存在")

        # 更新分配记录
        allocation.status = "released"
        allocation.released_at = datetime.utcnow()
        allocation.duration_seconds = int((allocation.released_at - allocation.allocated_at).total_seconds())

        self.db.commit()

        # 记录指标
        device_releases_total.labels(status="success").inc()
        allocation_duration_seconds.observe(allocation.duration_seconds)

        # 更新活跃分配数
        active_count = self.db.query(DeviceAllocation).filter(
            DeviceAllocation.status == "allocated"
        ).count()
        active_allocations.set(active_count)

        # 发布事件到 RabbitMQ
        event_bus = get_event_bus()
        if event_bus:
            try:
                await event_bus.publish_device_released(
                    device_id=device_id,
                    user_id=allocation.user_id,
                    allocation_id=allocation.id,
                    released_at=allocation.released_at.isoformat(),
                    duration_seconds=allocation.duration_seconds,
                )
            except Exception as e:
                logger.error(
                    "event_publish_failed",
                    error=str(e),
                    event_type="device_released",
                )

        logger.info(
            "device_release_completed",
            allocation_id=allocation.id,
            device_id=device_id,
            user_id=allocation.user_id,
            duration_seconds=allocation.duration_seconds,
        )

        return {
            "device_id": device_id,
            "status": "released",
            "duration_seconds": allocation.duration_seconds,
        }

    async def get_available_devices(self) -> List[dict]:
        """获取可用设备列表"""
        start_time = time.time()
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.device_service_url}/devices",
                    params={"status": "running", "limit": 100}
                )

                # 记录调用时长
                duration = time.time() - start_time
                device_service_call_duration_seconds.observe(duration)

                if response.status_code == 200:
                    device_service_calls_total.labels(status="success").inc()
                    data = response.json()
                    devices = data.get('data', [])

                    # 过滤掉已分配的设备
                    allocated_device_ids = self.get_allocated_device_ids()
                    available = [d for d in devices if d['id'] not in allocated_device_ids]

                    # 更新指标
                    available_devices_gauge.set(len(available))
                    allocated_devices_gauge.set(len(allocated_device_ids))

                    logger.debug(
                        "devices_fetched",
                        total_devices=len(devices),
                        allocated_devices=len(allocated_device_ids),
                        available_devices=len(available),
                    )

                    return available
                else:
                    device_service_calls_total.labels(status="error").inc()
                    logger.warning(
                        "device_service_error",
                        status_code=response.status_code,
                        url=self.device_service_url,
                    )
                    return []
        except Exception as e:
            device_service_calls_total.labels(status="exception").inc()
            errors_total.labels(
                error_type=type(e).__name__,
                endpoint="get_available_devices"
            ).inc()
            logger.error(
                "fetch_devices_failed",
                error=str(e),
                url=self.device_service_url,
                exc_info=True,
            )
            return []

    def get_allocated_device_ids(self) -> set:
        """获取已分配设备 ID 集合"""
        allocations = self.db.query(DeviceAllocation).filter(
            DeviceAllocation.status == "allocated"
        ).all()

        return {allocation.device_id for allocation in allocations}

    def select_device(self, devices: List[dict], request: AllocationRequest) -> Optional[dict]:
        """根据策略选择设备"""
        if not devices:
            return None

        logger.debug(
            "selecting_device",
            strategy=self.strategy,
            candidate_count=len(devices),
        )

        result = None

        if self.strategy == SchedulingStrategy.ROUND_ROBIN:
            result = self._round_robin(devices)
        elif self.strategy == SchedulingStrategy.LEAST_CONNECTION:
            result = self._least_connection(devices)
        elif self.strategy == SchedulingStrategy.WEIGHTED_ROUND_ROBIN:
            result = self._weighted_round_robin(devices)
        elif self.strategy == SchedulingStrategy.RESOURCE_BASED:
            result = self._resource_based(devices)
        else:
            result = devices[0]

        # 记录调度决策
        scheduling_decisions_total.labels(
            strategy=self.strategy,
            result="success" if result else "failure"
        ).inc()

        return result

    def _round_robin(self, devices: List[dict]) -> dict:
        """轮询策略"""
        return devices[0]

    def _least_connection(self, devices: List[dict]) -> dict:
        """最少连接策略"""
        # 按 CPU 使用率排序
        devices_sorted = sorted(devices, key=lambda d: d.get('cpuUsage', 0))
        return devices_sorted[0]

    def _weighted_round_robin(self, devices: List[dict]) -> dict:
        """加权轮询策略"""
        # 根据资源使用率计算权重
        for device in devices:
            cpu = device.get('cpuUsage', 0)
            memory = device.get('memoryUsage', 0)
            device['weight'] = 100 - (cpu + memory) / 2

        devices_sorted = sorted(devices, key=lambda d: d.get('weight', 0), reverse=True)
        return devices_sorted[0]

    def _resource_based(self, devices: List[dict]) -> dict:
        """基于资源的策略"""
        # 选择资源最充足的设备
        best_device = None
        best_score = -1

        for device in devices:
            cpu_available = 100 - device.get('cpuUsage', 0)
            memory_available = 100 - device.get('memoryUsage', 0)
            storage_available = 100 - device.get('storageUsage', 0)

            # 计算综合得分
            score = (cpu_available + memory_available + storage_available) / 3

            if score > best_score:
                best_score = score
                best_device = device

        return best_device

    def get_allocation_stats(self) -> dict:
        """获取分配统计"""
        total_allocations = self.db.query(DeviceAllocation).count()
        active_allocations = self.db.query(DeviceAllocation).filter(
            DeviceAllocation.status == "allocated"
        ).count()

        return {
            "total_allocations": total_allocations,
            "active_allocations": active_allocations,
            "strategy": self.strategy,
        }
