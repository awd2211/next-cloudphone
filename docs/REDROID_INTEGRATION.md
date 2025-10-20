# Redroid 集成设计文档

**文档版本**: 1.0
**更新时间**: 2025-10-20
**状态**: 设计完成，实施中

---

## 📋 概述

本文档描述了云手机平台与 Redroid 的集成方案，包括架构设计、配置优化、部署策略等。

### 什么是 Redroid？

Redroid (Remote Android) 是一个开源项目，允许在 Docker 容器中运行完整的 Android 系统。它基于 AOSP (Android Open Source Project)，支持 x86_64 和 ARM64 架构。

**官方仓库**: https://github.com/remote-android/redroid-doc

---

## 🏗️ 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼────────┐          ┌──────▼────────┐
│ Device Service │          │ Media Service │
│  (NestJS)      │          │  (Go/WebRTC)  │
└───────┬────────┘          └───────────────┘
        │
        ├──────────┬──────────┬───────────┐
        │          │          │           │
┌───────▼───┐  ┌──▼───┐  ┌──▼───┐   ┌───▼────┐
│ DockerAPI │  │ ADB  │  │ Port │   │ Health │
│  Client   │  │ Pool │  │Mgmt  │   │ Check  │
└─────┬─────┘  └──┬───┘  └──┬───┘   └────┬───┘
      │           │         │            │
      └───────────┴─────────┴────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    ┌───▼──────┐            ┌────▼──────┐
    │ Redroid  │            │ Redroid   │
    │Container1│  ...       │Container N│
    └──────────┘            └───────────┘
```

### 核心组件

1. **DockerService**: Docker API 封装，负责容器生命周期管理
2. **AdbService**: ADB 连接池管理，负责设备通信
3. **PortManager**: 端口分配和管理
4. **HealthChecker**: 设备健康检查和自动恢复

---

## 🔧 Redroid 配置优化

### 1. 基础配置

```yaml
# docker-compose.yml 示例
services:
  redroid-device-1:
    image: redroid/redroid:11.0.0-latest
    container_name: cloudphone-device-1
    privileged: true
    ports:
      - "5555:5555"  # ADB
      - "8080:8080"  # WebRTC
    environment:
      - DISPLAY=:0
      - WIDTH=1080
      - HEIGHT=1920
      - DPI=320
    volumes:
      - redroid-data-1:/data
    restart: unless-stopped
```

### 2. GPU 加速配置

```yaml
# 使用 virgl GPU 加速
environment:
  - REDROID_GPU_MODE=guest
  - REDROID_GPU_GUEST_DRIVER=virgl
devices:
  - /dev/dri:/dev/dri
```

### 3. 资源限制

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 4G
    reservations:
      cpus: '1'
      memory: 2G
```

### 4. 网络配置

```yaml
# 桥接模式，每个容器独立 IP
networks:
  cloudphone_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.25.0.0/16
```

---

## 📊 端口分配策略

### 端口范围规划

| 服务类型 | 端口范围 | 数量 | 说明 |
|---------|---------|-----|------|
| ADB | 5555-6554 | 1000 | 每个设备1个 ADB 端口 |
| WebRTC | 8080-9079 | 1000 | 每个设备1个 WebRTC 端口 |
| SCRCPY | 27183-28182 | 1000 | 备用屏幕共享端口 |

### 端口管理服务

```typescript
// port-manager.service.ts
export class PortManagerService {
  private usedPorts: Set<number> = new Set();
  private readonly ADB_PORT_START = 5555;
  private readonly ADB_PORT_END = 6554;

  allocateAdbPort(): number {
    for (let port = this.ADB_PORT_START; port <= this.ADB_PORT_END; port++) {
      if (!this.usedPorts.has(port)) {
        this.usedPorts.add(port);
        return port;
      }
    }
    throw new Error('No available ADB ports');
  }

  releasePort(port: number): void {
    this.usedPorts.delete(port);
  }
}
```

---

## 🚀 设备创建流程

### 完整流程图

```
用户请求创建设备
    ↓
验证资源配额
    ↓
分配端口 (ADB + WebRTC)
    ↓
创建数据库记录 (status: CREATING)
    ↓
拉取 Redroid 镜像
    ↓
创建 Docker 容器
    ├─ 设置资源限制
    ├─ 配置网络
    ├─ 挂载存储卷
    └─ 启动容器
    ↓
等待容器就绪 (健康检查)
    ↓
建立 ADB 连接
    ↓
初始化设备 (设置 prop)
    ↓
更新数据库 (status: RUNNING)
    ↓
返回设备信息
```

### 代码实现 (优化版)

```typescript
async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
  // 1. 验证资源配额
  await this.validateQuota(createDeviceDto.userId);

  // 2. 分配端口
  const adbPort = await this.portManager.allocateAdbPort();
  const webrtcPort = await this.portManager.allocateWebRtcPort();

  // 3. 创建数据库记录
  const device = this.devicesRepository.create({
    ...createDeviceDto,
    status: DeviceStatus.CREATING,
    adbPort,
    webrtcPort,
  });

  const savedDevice = await this.devicesRepository.save(device);

  // 4. 异步创建容器
  this.createRedroidContainer(savedDevice).catch(async (error) => {
    this.logger.error(`Failed to create container for device ${savedDevice.id}`, error);
    await this.handleCreationFailure(savedDevice, adbPort, webrtcPort);
  });

  return savedDevice;
}
```

---

## 🔍 健康检查机制

### 三层健康检查

#### 1. Docker 容器级别

```typescript
// 检查容器状态
async checkContainerHealth(containerId: string): Promise<boolean> {
  const info = await this.docker.getContainer(containerId).inspect();
  return info.State.Running && info.State.Health?.Status === 'healthy';
}
```

#### 2. ADB 连接级别

```typescript
// 检查 ADB 连接
async checkAdbConnection(deviceId: string): Promise<boolean> {
  try {
    const devices = await this.adbClient.listDevices();
    const connection = this.connections.get(deviceId);
    return devices.some(d => d.id === connection.address);
  } catch {
    return false;
  }
}
```

#### 3. Android 系统级别

```typescript
// 检查 Android 系统启动状态
async checkAndroidBoot(deviceId: string): Promise<boolean> {
  try {
    const output = await this.executeShellCommand(
      deviceId,
      'getprop sys.boot_completed'
    );
    return output.trim() === '1';
  } catch {
    return false;
  }
}
```

### 自动恢复策略

```typescript
// 健康检查调度器
@Cron('*/30 * * * * *') // 每30秒检查一次
async performHealthCheck() {
  const runningDevices = await this.devicesRepository.find({
    where: { status: DeviceStatus.RUNNING }
  });

  for (const device of runningDevices) {
    const isHealthy = await this.checkDeviceHealth(device);

    if (!isHealthy) {
      await this.handleUnhealthyDevice(device);
    }
  }
}

private async handleUnhealthyDevice(device: Device) {
  this.logger.warn(`Device ${device.id} is unhealthy, attempting recovery`);

  try {
    // 尝试重启容器
    await this.dockerService.restartContainer(device.containerId);

    // 重新建立 ADB 连接
    await this.adbService.connectToDevice(
      device.id,
      device.adbHost,
      device.adbPort
    );

    this.logger.log(`Device ${device.id} recovered successfully`);
  } catch (error) {
    // 标记为错误状态
    await this.updateDeviceStatus(device.id, DeviceStatus.ERROR);
    this.logger.error(`Failed to recover device ${device.id}`, error);
  }
}
```

---

## 📦 数据持久化

### 存储卷管理

```yaml
volumes:
  redroid-data-1:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/cloudphone/devices/device-1
```

### 数据备份策略

1. **快照备份**: 定期创建容器快照
2. **增量备份**: 仅备份 /data 目录变化
3. **用户数据隔离**: 每个用户独立存储卷

---

## 🔐 安全策略

### 1. 容器隔离

```yaml
security_opt:
  - no-new-privileges:true
  - apparmor=docker-default
cap_drop:
  - ALL
cap_add:
  - CHOWN
  - DAC_OVERRIDE
  - FOWNER
  - SETGID
  - SETUID
  - NET_BIND_SERVICE
```

### 2. 网络隔离

- 每个容器独立 IP
- 禁止容器间直接通信
- 仅通过 API Gateway 访问

### 3. 资源限制

```typescript
HostConfig: {
  Memory: config.memoryMB * 1024 * 1024,
  MemorySwap: config.memoryMB * 1024 * 1024, // 禁用 swap
  NanoCpus: config.cpuCores * 1e9,
  CpuShares: 1024,
  PidsLimit: 1000, // 限制进程数
}
```

---

## 📈 性能优化

### 1. 容器启动优化

- **预热镜像**: 提前拉取常用镜像
- **写时复制**: 使用 overlay2 存储驱动
- **并行创建**: 批量创建时并行处理

### 2. ADB 连接优化

```typescript
// 连接池配置
private readonly MAX_CONNECTIONS = 100;
private readonly CONNECTION_TIMEOUT = 5000;
private readonly RETRY_ATTEMPTS = 3;
```

### 3. 资源调度优化

- **CPU 亲和性**: 绑定特定 CPU 核心
- **NUMA 感知**: 优先使用同一 NUMA 节点
- **内存预分配**: 避免运行时内存扩展

---

## 🧪 测试计划

### 1. 单元测试

- Docker API 调用
- ADB 连接管理
- 端口分配逻辑
- 健康检查机制

### 2. 集成测试

- 设备创建流程
- 设备生命周期管理
- ADB 命令执行
- 应用安装/卸载

### 3. 压力测试

- 并发创建 100 个设备
- 长时间运行稳定性测试
- 故障恢复测试

---

## 📚 环境变量配置

```bash
# Redroid 配置
REDROID_IMAGE=redroid/redroid:11.0.0-latest
REDROID_BASE_PORT=5555
REDROID_MAX_INSTANCES=1000

# Docker 配置
DOCKER_HOST=/var/run/docker.sock
DOCKER_STORAGE_DRIVER=overlay2
DOCKER_DATA_ROOT=/data/cloudphone/docker

# ADB 配置
ADB_HOST=localhost
ADB_PORT=5037
ADB_CONNECTION_TIMEOUT=5000

# 资源限制
DEFAULT_CPU_CORES=2
DEFAULT_MEMORY_MB=4096
DEFAULT_STORAGE_MB=10240

# 网络配置
DEVICE_NETWORK_SUBNET=172.25.0.0/16
DEVICE_NETWORK_GATEWAY=172.25.0.1
```

---

## 🔄 部署检查清单

### 前置条件

- [ ] Docker Engine 20.10+ 已安装
- [ ] ADB Server 已启动 (`adb start-server`)
- [ ] 内核支持 binder/ashmem (Ubuntu 20.04+)
- [ ] 足够的存储空间 (每设备 10GB)
- [ ] 端口范围未被占用 (5555-6554)

### 部署步骤

- [ ] 拉取 Redroid 镜像
- [ ] 配置环境变量
- [ ] 创建存储目录
- [ ] 启动 Device Service
- [ ] 验证 Docker 连接
- [ ] 验证 ADB Server
- [ ] 创建测试设备
- [ ] 验证设备功能

---

## 📖 参考资源

- [Redroid 官方文档](https://github.com/remote-android/redroid-doc)
- [Docker SDK for Node.js](https://github.com/apocas/dockerode)
- [ADB Kit](https://github.com/DeviceFarmer/adbkit)
- [WebRTC Native Code](https://webrtc.googlesource.com/src/)

---

**文档维护者**: Claude Code Assistant
**最后更新**: 2025-10-20
