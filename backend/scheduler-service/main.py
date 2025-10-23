from fastapi import FastAPI, Depends, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
import os

from config import settings
from database import get_db, init_db
from models import (
    AllocationRequest,
    AllocationResponse,
    ReleaseRequest,
    SchedulingStats,
)
from scheduler import DeviceScheduler
from logger import get_logger
from middleware import PrometheusMiddleware
from metrics import get_metrics, get_content_type
from rabbitmq import init_event_bus, close_event_bus, get_event_bus
from consul_client import init_consul, close_consul

# 创建 logger
logger = get_logger(__name__, service="scheduler-service")

# 初始化数据库
init_db()

app = FastAPI(
    title="云手机平台 - 调度服务",
    description="设备调度、任务编排、负载均衡服务",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:30001", "http://localhost:30002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加 Prometheus 监控中间件
app.add_middleware(PrometheusMiddleware)


@app.on_event("startup")
async def startup_event():
    """启动事件"""
    logger.info(
        "scheduler_service_starting",
        scheduling_algorithm=settings.SCHEDULING_ALGORITHM,
        environment=settings.ENVIRONMENT,
        log_level=os.getenv("LOG_LEVEL", "DEBUG"),
    )

    # Initialize RabbitMQ event bus
    try:
        await init_event_bus(settings.RABBITMQ_URL)
        logger.info("event_bus_initialized", url_masked="amqp://***:***@***")
    except Exception as e:
        logger.error(
            "event_bus_initialization_failed",
            error=str(e),
            exc_info=True,
        )

    # Register service with Consul
    if settings.CONSUL_ENABLED:
        try:
            init_consul(
                host=settings.CONSUL_HOST,
                port=settings.CONSUL_PORT,
                service_name=settings.SERVICE_NAME,
                service_host=settings.SERVICE_HOST,
                service_port=settings.SERVICE_PORT,
            )
            logger.info(
                "consul_registration_successful",
                service_name=settings.SERVICE_NAME,
            )
        except Exception as e:
            logger.error(
                "consul_registration_failed",
                error=str(e),
                exc_info=True,
            )


@app.on_event("shutdown")
async def shutdown_event():
    """关闭事件"""
    logger.info("scheduler_service_shutting_down")

    # Deregister from Consul
    if settings.CONSUL_ENABLED:
        try:
            close_consul()
            logger.info("consul_deregistration_successful")
        except Exception as e:
            logger.error(
                "consul_deregistration_failed",
                error=str(e),
                exc_info=True,
            )

    # Close RabbitMQ connection
    try:
        await close_event_bus()
        logger.info("event_bus_closed")
    except Exception as e:
        logger.error(
            "event_bus_close_failed",
            error=str(e),
            exc_info=True,
        )


@app.get(
    "/health",
    tags=["health"],
    summary="Health Check",
    description="Check if the service is healthy and running",
    response_description="Service health status",
)
async def health_check():
    """健康检查接口"""
    return {
        "status": "ok",
        "service": "scheduler-service",
        "timestamp": datetime.now().isoformat(),
        "environment": settings.ENVIRONMENT,
    }


@app.get(
    "/metrics",
    tags=["monitoring"],
    summary="Prometheus Metrics",
    description="Get Prometheus metrics for monitoring",
    response_description="Metrics in Prometheus text format",
)
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(content=get_metrics(), media_type=get_content_type())


@app.get(
    "/api/scheduler/devices/available",
    tags=["devices"],
    summary="Get Available Devices",
    description="Get list of available devices for allocation",
    response_description="List of available devices with their status",
)
async def get_available_devices(db: Session = Depends(get_db)):
    """获取可用设备列表"""
    try:
        scheduler = DeviceScheduler(db)
        devices = await scheduler.get_available_devices()

        logger.info(
            "get_available_devices",
            total_devices=len(devices),
        )

        return {
            "success": True,
            "data": devices,
            "total": len(devices),
        }
    except Exception as e:
        logger.error(
            "get_available_devices_failed",
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail=str(e))


@app.post(
    "/api/scheduler/devices/allocate",
    response_model=dict,
    tags=["devices"],
    summary="Allocate Device",
    description="Allocate a device to a user based on scheduling strategy",
    response_description="Allocation details including device info and expiry",
)
async def allocate_device(
    request: AllocationRequest,
    db: Session = Depends(get_db),
):
    """为用户分配设备"""
    try:
        scheduler = DeviceScheduler(db)
        allocation = await scheduler.allocate_device(request)

        logger.info(
            "device_allocated",
            device_id=allocation.device_id,
            user_id=request.user_id,
            tenant_id=request.tenant_id,
            duration_minutes=request.duration_minutes,
        )

        return {
            "success": True,
            "data": allocation.dict(),
            "message": "设备分配成功",
        }
    except ValueError as e:
        logger.warning(
            "device_allocation_failed",
            user_id=request.user_id,
            reason=str(e),
        )
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(
            "device_allocation_error",
            user_id=request.user_id,
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail=str(e))


@app.post(
    "/api/scheduler/devices/release",
    tags=["devices"],
    summary="Release Device",
    description="Release an allocated device and make it available",
    response_description="Release confirmation with duration",
)
async def release_device(
    request: ReleaseRequest,
    db: Session = Depends(get_db),
):
    """释放设备"""
    try:
        scheduler = DeviceScheduler(db)
        result = await scheduler.release_device(request.device_id, request.user_id)

        logger.info(
            "device_released",
            device_id=request.device_id,
            user_id=request.user_id,
            duration_seconds=result.get("duration_seconds"),
        )

        return {
            "success": True,
            "data": result,
            "message": "设备释放成功",
        }
    except ValueError as e:
        logger.warning(
            "device_release_failed",
            device_id=request.device_id,
            user_id=request.user_id,
            reason=str(e),
        )
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(
            "device_release_error",
            device_id=request.device_id,
            user_id=request.user_id,
            error=str(e),
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail=str(e))


@app.get(
    "/api/scheduler/stats",
    tags=["statistics"],
    summary="Get Scheduling Statistics",
    description="Get allocation statistics and metrics",
    response_description="Statistics about allocations and strategy",
)
async def get_stats(db: Session = Depends(get_db)):
    """获取调度统计信息"""
    try:
        scheduler = DeviceScheduler(db)
        stats = scheduler.get_allocation_stats()

        return {
            "success": True,
            "data": stats,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get(
    "/api/scheduler/allocations",
    tags=["allocations"],
    summary="Get Allocation Records",
    description="Get device allocation records with optional filters",
    response_description="List of allocation records",
)
async def get_allocations(
    user_id: str = None,
    status: str = None,
    limit: int = 10,
    db: Session = Depends(get_db),
):
    """获取设备分配记录"""
    from database import DeviceAllocation

    try:
        query = db.query(DeviceAllocation)

        if user_id:
            query = query.filter(DeviceAllocation.user_id == user_id)

        if status:
            query = query.filter(DeviceAllocation.status == status)

        allocations = query.order_by(DeviceAllocation.allocated_at.desc()).limit(limit).all()

        return {
            "success": True,
            "data": [
                {
                    "id": a.id,
                    "device_id": a.device_id,
                    "user_id": a.user_id,
                    "tenant_id": a.tenant_id,
                    "status": a.status,
                    "allocated_at": a.allocated_at.isoformat() if a.allocated_at else None,
                    "released_at": a.released_at.isoformat() if a.released_at else None,
                    "duration_seconds": a.duration_seconds,
                }
                for a in allocations
            ],
            "total": len(allocations),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get(
    "/api/scheduler/config",
    tags=["configuration"],
    summary="Get Scheduler Configuration",
    description="Get current scheduler configuration and settings",
    response_description="Scheduler configuration details",
)
async def get_config():
    """获取调度配置信息"""
    return {
        "success": True,
        "data": {
            "scheduling_algorithm": settings.SCHEDULING_ALGORITHM,
            "load_balance_enabled": settings.LOAD_BALANCE_ENABLED,
            "max_devices_per_node": settings.MAX_DEVICES_PER_NODE,
            "auto_scaling_enabled": settings.AUTO_SCALING_ENABLED,
            "health_check_enabled": settings.HEALTH_CHECK_ENABLED,
            "cpu_threshold": settings.CPU_THRESHOLD,
            "memory_threshold": settings.MEMORY_THRESHOLD,
        },
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "30004"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
    )
