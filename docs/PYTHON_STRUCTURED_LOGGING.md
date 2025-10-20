# Python 结构化日志 - Scheduler Service

## 概述

为 Scheduler Service (Python/FastAPI) 实现了完整的结构化日志系统，参考 Winston 配置模式，使用 structlog 库。

## 实现文件

### 1. logger.py (194行)
`backend/scheduler-service/logger.py`

**核心功能**：
- 环境自适应配置（开发/生产环境）
- 结构化日志输出（JSON 格式）
- 上下文信息注入
- 异常堆栈自动捕获
- 文件日志轮转（生产环境）

**技术栈**：
- `structlog`: 结构化日志核心库
- `python-json-logger`: JSON 格式化
- `colorama`: 彩色控制台输出（开发环境）

## 日志配置

### 开发环境
```python
# 彩色易读输出
2025-10-20T18:46:34.820985Z [info] scheduler_service_starting [main] environment=development log_level=DEBUG scheduling_algorithm=weighted_round_robin service=scheduler-service
```

### 生产环境
```json
{
  "timestamp": "2025-10-20T18:46:34.820985Z",
  "level": "info",
  "event": "scheduler_service_starting",
  "logger": "main",
  "environment": "production",
  "log_level": "INFO",
  "scheduling_algorithm": "weighted_round_robin",
  "service": "scheduler-service"
}
```

## 使用方法

### 基本用法

```python
from logger import get_logger

# 创建 logger（带上下文）
logger = get_logger(__name__, service="scheduler-service")

# 记录日志
logger.info("device_allocated", device_id="123", user_id="456")
logger.warning("no_available_devices", user_id="456", tenant_id="789")
logger.error("allocation_failed", error=str(e), exc_info=True)
```

### 在 main.py 中的应用

```python
from logger import get_logger

logger = get_logger(__name__, service="scheduler-service")

@app.on_event("startup")
async def startup_event():
    logger.info(
        "scheduler_service_starting",
        scheduling_algorithm=settings.SCHEDULING_ALGORITHM,
        environment=settings.ENVIRONMENT,
        log_level=os.getenv("LOG_LEVEL", "DEBUG"),
    )

@app.post("/api/scheduler/devices/allocate")
async def allocate_device(request: AllocationRequest, db: Session = Depends(get_db)):
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
        
        return {"success": True, "data": allocation.dict()}
    except ValueError as e:
        logger.warning("device_allocation_failed", user_id=request.user_id, reason=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("device_allocation_error", user_id=request.user_id, error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
```

### 在 scheduler.py 中的应用

```python
from logger import get_logger

logger = get_logger(__name__, component="scheduler")

class DeviceScheduler:
    async def allocate_device(self, request: AllocationRequest) -> AllocationResponse:
        logger.debug(
            "allocate_device_start",
            user_id=request.user_id,
            duration_minutes=request.duration_minutes,
        )
        
        available_devices = await self.get_available_devices()
        
        if not available_devices:
            logger.warning(
                "no_available_devices",
                user_id=request.user_id,
                tenant_id=request.tenant_id,
            )
            raise ValueError("没有可用设备")
        
        logger.info(
            "device_selected",
            device_id=selected_device['id'],
            strategy=self.strategy,
            user_id=request.user_id,
        )
        
        # ... 业务逻辑 ...
        
        logger.info(
            "device_allocation_completed",
            allocation_id=allocation.id,
            device_id=selected_device['id'],
            user_id=request.user_id,
            expires_at=expires_at.isoformat(),
        )
```

## 日志级别

- **DEBUG**: 详细调试信息（仅开发环境）
- **INFO**: 重要事件（设备分配、释放等）
- **WARNING**: 预期内的异常情况（无可用设备等）
- **ERROR**: 错误和异常（含堆栈信息）

## 环境变量配置

```bash
# 日志级别
LOG_LEVEL=DEBUG          # DEBUG, INFO, WARNING, ERROR

# 运行环境
NODE_ENV=development     # development, production

# 文件日志（仅生产环境）
ENABLE_FILE_LOGGING=true
```

## 文件日志（生产环境）

当 `NODE_ENV=production` 且 `ENABLE_FILE_LOGGING=true` 时，会启用文件日志：

```
logs/
├── error.log          # 仅错误日志（5MB 轮转，保留5份）
├── combined.log       # 所有日志（5MB 轮转，保留5份）
```

## 日志事件列表

### 启动和配置
- `scheduler_service_starting`: 服务启动

### 设备管理
- `get_available_devices`: 获取可用设备
- `devices_fetched`: 设备获取成功
- `device_service_error`: 设备服务调用失败
- `fetch_devices_failed`: 获取设备失败

### 设备分配
- `allocate_device_start`: 开始分配设备
- `available_devices_found`: 找到可用设备
- `no_available_devices`: 无可用设备
- `no_suitable_device`: 无合适设备
- `device_selected`: 设备选择成功
- `device_allocation_completed`: 分配完成
- `device_allocated`: 设备已分配（API 层）
- `device_allocation_failed`: 分配失败
- `device_allocation_error`: 分配错误

### 设备释放
- `release_device_start`: 开始释放设备
- `allocation_not_found`: 分配记录未找到
- `device_release_completed`: 释放完成
- `device_released`: 设备已释放（API 层）
- `device_release_failed`: 释放失败
- `device_release_error`: 释放错误

### 调度策略
- `selecting_device`: 选择设备（含策略信息）

## 与 Winston (Node.js) 的对应关系

| Winston 功能 | structlog 实现 |
|-------------|---------------|
| `winston.format.timestamp()` | `structlog.processors.TimeStamper(fmt="iso")` |
| `winston.format.json()` | `structlog.processors.JSONRenderer()` |
| `winston.format.errors({ stack: true })` | `structlog.processors.format_exc_info` |
| `winston.format.printf()` (开发) | `structlog.dev.ConsoleRenderer()` |
| `winston.transports.Console()` | `logging.StreamHandler(sys.stdout)` |
| `winston.transports.File()` | `logging.handlers.RotatingFileHandler()` |
| `logger.child({ context })` | `logger.bind(**context)` |
| `context` 参数 | `**kwargs` 传递上下文信息 |

## 依赖项

```txt
structlog==24.4.0
python-json-logger==3.2.1
colorama==0.4.6
```

## 测试验证

```bash
# 本地测试
cd backend/scheduler-service
source venv/bin/activate
python3 -c "from logger import logger; logger.info('test', param='value')"

# Docker 容器测试
docker logs cloudphone-scheduler-service --tail 50

# API 测试
curl http://localhost:30004/api/scheduler/devices/available
docker logs cloudphone-scheduler-service | grep get_available_devices
```

## 最佳实践

1. **事件命名**：使用 `snake_case`，描述性强
2. **上下文信息**：总是包含 `user_id`、`device_id` 等关键标识
3. **异常处理**：使用 `exc_info=True` 记录完整堆栈
4. **日志级别**：
   - `debug`: 调试信息（函数开始/结束）
   - `info`: 正常业务事件
   - `warning`: 预期的异常情况
   - `error`: 错误和异常

5. **性能考虑**：
   - 开发环境：DEBUG 级别，彩色输出
   - 生产环境：INFO 级别，JSON 输出
   - 避免在循环中记录 DEBUG 日志

## 下一步计划

- [ ] 为 Media Service (Go) 添加 zap 结构化日志
- [ ] 集成 Prometheus metrics
- [ ] 部署 ELK Stack 进行日志聚合
- [ ] 添加分布式追踪（OpenTelemetry）

## 参考资源

- [structlog 官方文档](https://www.structlog.org/)
- [python-json-logger](https://github.com/madzak/python-json-logger)
- [Winston 配置参考](../backend/user-service/src/config/winston.config.ts)
