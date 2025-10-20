import httpx
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import DeviceAllocation, NodeResource
from models import AllocationRequest, AllocationResponse, DeviceInfo, SchedulingStrategy
from config import settings
import uuid
from logger import get_logger

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
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.device_service_url}/devices",
                    params={"status": "running", "limit": 100}
                )

                if response.status_code == 200:
                    data = response.json()
                    devices = data.get('data', [])

                    # 过滤掉已分配的设备
                    allocated_device_ids = self.get_allocated_device_ids()
                    available = [d for d in devices if d['id'] not in allocated_device_ids]

                    logger.debug(
                        "devices_fetched",
                        total_devices=len(devices),
                        allocated_devices=len(allocated_device_ids),
                        available_devices=len(available),
                    )

                    return available
                else:
                    logger.warning(
                        "device_service_error",
                        status_code=response.status_code,
                        url=self.device_service_url,
                    )
                    return []
        except Exception as e:
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

        if self.strategy == SchedulingStrategy.ROUND_ROBIN:
            return self._round_robin(devices)
        elif self.strategy == SchedulingStrategy.LEAST_CONNECTION:
            return self._least_connection(devices)
        elif self.strategy == SchedulingStrategy.WEIGHTED_ROUND_ROBIN:
            return self._weighted_round_robin(devices)
        elif self.strategy == SchedulingStrategy.RESOURCE_BASED:
            return self._resource_based(devices)
        else:
            return devices[0]

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
