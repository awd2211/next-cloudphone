"""
Prometheus metrics for Scheduler Service
"""
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry, generate_latest, CONTENT_TYPE_LATEST

# Create custom registry
registry = CollectorRegistry()

# HTTP Request metrics
http_requests_total = Counter(
    'scheduler_http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code'],
    registry=registry
)

http_request_duration_seconds = Histogram(
    'scheduler_http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0],
    registry=registry
)

# Device allocation metrics
device_allocations_total = Counter(
    'scheduler_device_allocations_total',
    'Total device allocations',
    ['status', 'tenant_id'],
    registry=registry
)

device_releases_total = Counter(
    'scheduler_device_releases_total',
    'Total device releases',
    ['status'],
    registry=registry
)

active_allocations = Gauge(
    'scheduler_active_allocations',
    'Number of currently active device allocations',
    registry=registry
)

allocation_duration_seconds = Histogram(
    'scheduler_allocation_duration_seconds',
    'Duration of device allocations in seconds',
    buckets=[60, 300, 600, 1800, 3600, 7200, 14400, 28800],  # 1min to 8 hours
    registry=registry
)

# Scheduling strategy metrics
scheduling_decisions_total = Counter(
    'scheduler_scheduling_decisions_total',
    'Total scheduling decisions made',
    ['strategy', 'result'],
    registry=registry
)

# Device availability metrics
available_devices = Gauge(
    'scheduler_available_devices',
    'Number of available devices',
    registry=registry
)

allocated_devices = Gauge(
    'scheduler_allocated_devices',
    'Number of allocated devices',
    registry=registry
)

# Error metrics
errors_total = Counter(
    'scheduler_errors_total',
    'Total errors',
    ['error_type', 'endpoint'],
    registry=registry
)

# External service call metrics
device_service_calls_total = Counter(
    'scheduler_device_service_calls_total',
    'Total calls to device service',
    ['status'],
    registry=registry
)

device_service_call_duration_seconds = Histogram(
    'scheduler_device_service_call_duration_seconds',
    'Device service call duration in seconds',
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0],
    registry=registry
)


def get_metrics():
    """Get Prometheus metrics in text format"""
    return generate_latest(registry)


def get_content_type():
    """Get Prometheus content type"""
    return CONTENT_TYPE_LATEST
