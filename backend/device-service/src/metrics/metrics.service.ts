import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as promClient from "prom-client";
import { Device, DeviceStatus } from "../entities/device.entity";
import { DockerService } from "../docker/docker.service";

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);

  // Prometheus Registry
  public readonly register: promClient.Registry;

  // 设备指标
  private deviceTotalGauge: promClient.Gauge;
  private deviceStatusGauge: promClient.Gauge;
  private deviceCpuUsageGauge: promClient.Gauge;
  private deviceMemoryUsageGauge: promClient.Gauge;
  private deviceNetworkRxBytesCounter: promClient.Counter;
  private deviceNetworkTxBytesCounter: promClient.Counter;

  // 操作性能指标
  private operationDurationHistogram: promClient.Histogram;
  private operationErrorsCounter: promClient.Counter;

  // ADB 连接指标
  private adbConnectionsGauge: promClient.Gauge;

  // 批量操作指标
  private batchOperationDurationHistogram: promClient.Histogram;
  private batchOperationSizeHistogram: promClient.Histogram;

  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private dockerService: DockerService,
  ) {
    // 初始化 Registry
    this.register = new promClient.Registry();

    // 添加默认指标（进程、Node.js 运行时指标）
    promClient.collectDefaultMetrics({ register: this.register });

    this.initializeMetrics();
  }

  async onModuleInit() {
    this.logger.log("MetricsService initialized - starting metrics collection");

    // 启动定时采集（每 30 秒更新一次设备指标）
    setInterval(() => this.collectDeviceMetrics(), 30000);
  }

  /**
   * 初始化所有 Prometheus 指标
   */
  private initializeMetrics() {
    // 1. 设备总数指标
    this.deviceTotalGauge = new promClient.Gauge({
      name: "cloudphone_devices_total",
      help: "Total number of cloud phone devices",
      labelNames: ["status", "tenant_id"],
      registers: [this.register],
    });

    // 2. 设备状态指标（按状态分组）
    this.deviceStatusGauge = new promClient.Gauge({
      name: "cloudphone_devices_by_status",
      help: "Number of devices grouped by status",
      labelNames: ["status"],
      registers: [this.register],
    });

    // 3. 设备 CPU 使用率
    this.deviceCpuUsageGauge = new promClient.Gauge({
      name: "cloudphone_device_cpu_usage_percent",
      help: "CPU usage percentage of a device",
      labelNames: ["device_id", "user_id", "tenant_id"],
      registers: [this.register],
    });

    // 4. 设备内存使用量（MB）
    this.deviceMemoryUsageGauge = new promClient.Gauge({
      name: "cloudphone_device_memory_usage_mb",
      help: "Memory usage in MB of a device",
      labelNames: ["device_id", "user_id", "tenant_id"],
      registers: [this.register],
    });

    // 5. 设备网络接收字节数
    this.deviceNetworkRxBytesCounter = new promClient.Counter({
      name: "cloudphone_device_network_rx_bytes_total",
      help: "Total network bytes received by device",
      labelNames: ["device_id", "user_id"],
      registers: [this.register],
    });

    // 6. 设备网络发送字节数
    this.deviceNetworkTxBytesCounter = new promClient.Counter({
      name: "cloudphone_device_network_tx_bytes_total",
      help: "Total network bytes transmitted by device",
      labelNames: ["device_id", "user_id"],
      registers: [this.register],
    });

    // 7. 操作耗时（Histogram）
    this.operationDurationHistogram = new promClient.Histogram({
      name: "cloudphone_operation_duration_seconds",
      help: "Duration of device operations in seconds",
      labelNames: ["operation", "status"],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60], // 操作耗时分桶
      registers: [this.register],
    });

    // 8. 操作错误计数
    this.operationErrorsCounter = new promClient.Counter({
      name: "cloudphone_operation_errors_total",
      help: "Total number of operation errors",
      labelNames: ["operation", "error_type"],
      registers: [this.register],
    });

    // 9. ADB 连接数
    this.adbConnectionsGauge = new promClient.Gauge({
      name: "cloudphone_adb_connections",
      help: "Number of active ADB connections",
      registers: [this.register],
    });

    // 10. 批量操作耗时
    this.batchOperationDurationHistogram = new promClient.Histogram({
      name: "cloudphone_batch_operation_duration_seconds",
      help: "Duration of batch operations in seconds",
      labelNames: ["operation_type"],
      buckets: [1, 5, 10, 30, 60, 120, 300], // 批量操作可能较慢
      registers: [this.register],
    });

    // 11. 批量操作规模
    this.batchOperationSizeHistogram = new promClient.Histogram({
      name: "cloudphone_batch_operation_size",
      help: "Number of devices in batch operation",
      labelNames: ["operation_type"],
      buckets: [1, 5, 10, 20, 50, 100],
      registers: [this.register],
    });

    this.logger.log("All Prometheus metrics initialized");
  }

  /**
   * 定时采集设备指标
   */
  private async collectDeviceMetrics() {
    try {
      // 获取所有设备
      const devices = await this.deviceRepository.find();

      // 重置 Gauge（避免过时数据）
      this.deviceTotalGauge.reset();
      this.deviceStatusGauge.reset();

      // 按状态统计
      const statusCounts: Record<string, number> = {};

      for (const device of devices) {
        // 设备总数（按租户和状态）
        this.deviceTotalGauge.inc({
          status: device.status,
          tenant_id: device.tenantId || "default",
        });

        // 设备状态计数
        statusCounts[device.status] = (statusCounts[device.status] || 0) + 1;

        // 只采集运行中设备的详细指标
        if (device.status === DeviceStatus.RUNNING) {
          await this.collectSingleDeviceMetrics(device);
        }
      }

      // 更新状态统计
      for (const [status, count] of Object.entries(statusCounts)) {
        this.deviceStatusGauge.set({ status }, count);
      }

      this.logger.debug(`Collected metrics for ${devices.length} devices`);
    } catch (error) {
      this.logger.error("Failed to collect device metrics", error.stack);
    }
  }

  /**
   * 采集单个设备的详细指标
   */
  private async collectSingleDeviceMetrics(device: Device) {
    try {
      // 获取容器统计信息
      const containerName = `cloudphone-${device.id}`;
      const stats = await this.dockerService.getContainerStats(containerName);

      if (stats) {
        const labels = {
          device_id: device.id,
          user_id: device.userId || "unknown",
          tenant_id: device.tenantId || "default",
        };

        // CPU 使用率
        if (stats.cpu_percent !== undefined) {
          this.deviceCpuUsageGauge.set(labels, stats.cpu_percent);
        }

        // 内存使用量（MB）
        if (stats.memory_usage_mb !== undefined) {
          this.deviceMemoryUsageGauge.set(labels, stats.memory_usage_mb);
        }

        // 网络流量（累计）
        if (stats.network_rx_bytes !== undefined) {
          this.deviceNetworkRxBytesCounter.inc(
            { device_id: device.id, user_id: device.userId || "unknown" },
            stats.network_rx_bytes,
          );
        }

        if (stats.network_tx_bytes !== undefined) {
          this.deviceNetworkTxBytesCounter.inc(
            { device_id: device.id, user_id: device.userId || "unknown" },
            stats.network_tx_bytes,
          );
        }
      }
    } catch (error) {
      this.logger.debug(
        `Failed to collect metrics for device ${device.id}: ${error.message}`,
      );
    }
  }

  /**
   * 记录操作耗时
   */
  recordOperationDuration(
    operation: string,
    durationSeconds: number,
    status: "success" | "failure" = "success",
  ) {
    this.operationDurationHistogram.observe(
      { operation, status },
      durationSeconds,
    );
  }

  /**
   * 记录操作错误
   */
  recordOperationError(operation: string, errorType: string) {
    this.operationErrorsCounter.inc({ operation, error_type: errorType });
  }

  /**
   * 记录批量操作指标
   */
  recordBatchOperation(
    operationType: string,
    size: number,
    durationSeconds: number,
  ) {
    this.batchOperationSizeHistogram.observe(
      { operation_type: operationType },
      size,
    );
    this.batchOperationDurationHistogram.observe(
      { operation_type: operationType },
      durationSeconds,
    );
  }

  /**
   * 更新 ADB 连接数
   */
  updateAdbConnections(count: number) {
    this.adbConnectionsGauge.set(count);
  }

  /**
   * 获取 Prometheus 格式的指标
   */
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  /**
   * 获取指标的 Content-Type
   */
  getContentType(): string {
    return this.register.contentType;
  }
}
