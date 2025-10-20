"""
结构化日志配置 - Scheduler Service

参考 Winston 配置模式，使用 structlog 实现类似功能：
- 环境自适应（开发/生产）
- 结构化日志输出（JSON）
- 上下文信息注入
- 异常堆栈跟踪
"""

import logging
import sys
import os
from typing import Any
import structlog
from pythonjsonlogger import jsonlogger


def get_log_level() -> str:
    """获取日志级别"""
    env_level = os.getenv("LOG_LEVEL", "").upper()
    if env_level in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
        return env_level

    # 根据环境设置默认级别
    environment = os.getenv("NODE_ENV", "development")
    return "INFO" if environment == "production" else "DEBUG"


def configure_logging():
    """
    配置结构化日志系统

    类似于 winston.config.ts 的功能：
    - 开发环境：易读的彩色输出
    - 生产环境：JSON 格式的结构化日志
    - 自动捕获异常堆栈
    - 支持上下文信息（类似 winston 的 context）
    """

    environment = os.getenv("NODE_ENV", "development")
    log_level = get_log_level()

    # 配置标准库 logging（作为 structlog 的后端）
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level),
    )

    # 共享的处理器链
    shared_processors = [
        structlog.contextvars.merge_contextvars,  # 合并上下文变量
        structlog.stdlib.add_log_level,            # 添加日志级别
        structlog.stdlib.add_logger_name,          # 添加 logger 名称
        structlog.processors.TimeStamper(fmt="iso"),  # ISO 格式时间戳
        structlog.processors.StackInfoRenderer(),  # 堆栈信息
        structlog.processors.format_exc_info,      # 格式化异常信息
    ]

    # 根据环境选择渲染器
    if environment == "production":
        # 生产环境：纯 JSON 输出（类似 winston 的 prodFormat）
        processors = shared_processors + [
            structlog.processors.dict_tracebacks,  # 异常的字典表示
            structlog.processors.JSONRenderer(),   # JSON 渲染
        ]
    else:
        # 开发环境：彩色易读输出（类似 winston 的 devFormat）
        try:
            from colorama import Fore, Style, init
            init(autoreset=True)
            use_colors = True
        except ImportError:
            use_colors = False

        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=use_colors),  # 控制台渲染
        ]

    # 配置 structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # 配置标准库 logging 的 root logger
    root_logger = logging.getLogger()

    # 移除现有的处理器
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # 添加控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)

    if environment == "production":
        # 生产环境使用 JSON 格式
        json_formatter = jsonlogger.JsonFormatter(
            "%(timestamp)s %(level)s %(name)s %(message)s"
        )
        console_handler.setFormatter(json_formatter)

    root_logger.addHandler(console_handler)

    # 可选：文件日志（类似 winston 的文件 transport）
    if environment == "production" and os.getenv("ENABLE_FILE_LOGGING") == "true":
        _setup_file_logging()


def _setup_file_logging():
    """
    设置文件日志（生产环境）

    类似于 winston 的文件 transport 配置：
    - error.log: 只记录错误
    - combined.log: 所有日志
    """
    import logging.handlers

    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)

    # 错误日志文件
    error_handler = logging.handlers.RotatingFileHandler(
        f"{log_dir}/error.log",
        maxBytes=5 * 1024 * 1024,  # 5MB
        backupCount=5,
    )
    error_handler.setLevel(logging.ERROR)
    error_formatter = jsonlogger.JsonFormatter(
        "%(timestamp)s %(level)s %(name)s %(message)s"
    )
    error_handler.setFormatter(error_formatter)

    # 综合日志文件
    combined_handler = logging.handlers.RotatingFileHandler(
        f"{log_dir}/combined.log",
        maxBytes=5 * 1024 * 1024,  # 5MB
        backupCount=5,
    )
    combined_formatter = jsonlogger.JsonFormatter(
        "%(timestamp)s %(level)s %(name)s %(message)s"
    )
    combined_handler.setFormatter(combined_formatter)

    # 添加到 root logger
    root_logger = logging.getLogger()
    root_logger.addHandler(error_handler)
    root_logger.addHandler(combined_handler)


def get_logger(name: str = None, **context: Any) -> structlog.BoundLogger:
    """
    获取带上下文的 logger 实例

    参数:
        name: logger 名称（通常是模块名）
        **context: 上下文信息（类似 winston 的 context）

    返回:
        配置好的 structlog logger

    示例:
        logger = get_logger(__name__, service="scheduler-service")
        logger.info("device_allocated", device_id="123", user_id="456")
    """
    if name is None:
        name = "scheduler-service"

    logger = structlog.get_logger(name)

    # 绑定上下文信息（类似 winston 的 child logger）
    if context:
        logger = logger.bind(**context)

    return logger


# 初始化日志系统
configure_logging()

# 导出默认 logger
logger = get_logger("scheduler-service")
