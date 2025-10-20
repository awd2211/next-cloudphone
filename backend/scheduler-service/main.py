from fastapi import FastAPI, Depends, HTTPException
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

# 初始化数据库
init_db()

app = FastAPI(
    title="云手机平台 - 调度服务",
    description="设备调度、任务编排、负载均衡服务",
    version="1.0.0",
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """启动事件"""
    print(f"🚀 Scheduler Service is starting...")
    print(f"📊 Scheduling Strategy: {settings.SCHEDULING_ALGORITHM}")
    print(f"🔧 Environment: {settings.ENVIRONMENT}")


@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {
        "status": "ok",
        "service": "scheduler-service",
        "timestamp": datetime.now().isoformat(),
        "environment": settings.ENVIRONMENT,
    }


@app.get("/api/scheduler/devices/available")
async def get_available_devices(db: Session = Depends(get_db)):
    """获取可用设备列表"""
    try:
        scheduler = DeviceScheduler(db)
        devices = await scheduler.get_available_devices()

        return {
            "success": True,
            "data": devices,
            "total": len(devices),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/scheduler/devices/allocate", response_model=dict)
async def allocate_device(
    request: AllocationRequest,
    db: Session = Depends(get_db),
):
    """为用户分配设备"""
    try:
        scheduler = DeviceScheduler(db)
        allocation = await scheduler.allocate_device(request)

        return {
            "success": True,
            "data": allocation.dict(),
            "message": "设备分配成功",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/scheduler/devices/release")
async def release_device(
    request: ReleaseRequest,
    db: Session = Depends(get_db),
):
    """释放设备"""
    try:
        scheduler = DeviceScheduler(db)
        result = await scheduler.release_device(request.device_id, request.user_id)

        return {
            "success": True,
            "data": result,
            "message": "设备释放成功",
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/scheduler/stats")
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


@app.get("/api/scheduler/allocations")
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


@app.get("/api/scheduler/config")
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

    port = int(os.getenv("PORT", "3005"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
    )
