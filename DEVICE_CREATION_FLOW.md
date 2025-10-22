# 安卓虚拟化设备创建流程

## 🏗️ 整体架构

基于 **Redroid** (Remote Android) 技术，通过 Docker 容器化运行 Android 系统。

## 📋 创建流程详解

### 1️⃣ **用户发起创建请求**

**前端表单提交：**
```typescript
{
  name: "我的云手机",           // 设备名称
  cpuCores: 2,                  // CPU 核心数
  memoryMB: 4096,               // 内存 (MB)
  storageMB: 32768,             // 存储 (MB)
  resolution: "1080x2340",      // 分辨率
  dpi: 420,                     // 像素密度
  androidVersion: "13",         // Android 版本
  userId: "xxx"                 // 用户 ID
}
```

**API 请求：**
```
POST /api/devices
→ API Gateway (30000)
→ Device Service (30002)
```

---

### 2️⃣ **端口分配** (Port Manager)

**分配两个端口：**
- **ADB 端口** - Android Debug Bridge (5555-5655 范围)
- **WebRTC 端口** - 远程控制/屏幕共享

```typescript
const ports = await portManager.allocatePorts();
// 返回: { adbPort: 5555, webrtcPort: 8443 }
```

**端口管理策略：**
- 内存缓存管理
- 防止冲突
- 自动释放

---

### 3️⃣ **创建设备记录** (Database)

**保存到数据库：**
```typescript
Device {
  id: "uuid",
  name: "我的云手机",
  status: "creating",        // 初始状态
  adbPort: 5555,
  adbHost: "localhost",
  containerId: null,         // 待创建
  containerName: null,
  ...用户配置
}
```

**状态枚举：**
- `CREATING` - 创建中
- `RUNNING` - 运行中
- `STOPPED` - 已停止
- `ERROR` - 错误
- `DELETING` - 删除中

---

### 4️⃣ **创建 Redroid 容器** (Docker Service)

**异步创建容器（不阻塞 API 响应）：**

#### 4.1 构建容器配置

```typescript
{
  name: "cloudphone-{deviceId}",
  Image: "redroid/redroid:13.0.0-latest",
  
  // 环境变量
  Env: [
    "WIDTH=1080",
    "HEIGHT=2340", 
    "DPI=420",
    "REDROID_GPU_MODE=auto"
  ],
  
  // 资源限制
  HostConfig: {
    Privileged: true,          // Redroid 需要特权模式
    Memory: 4GB,               // 内存限制
    NanoCpus: 2000000000,      // CPU 限制
    
    // 端口映射
    PortBindings: {
      "5555/tcp": [{ HostPort: "5555" }]  // ADB 端口
    },
    
    // GPU 支持（如果启用）
    Devices: [
      { PathOnHost: "/dev/dri", PathInContainer: "/dev/dri" }
    ],
    
    // 安全配置
    SecurityOpt: ["apparmor=docker-default"],
    CapAdd: ["SYS_ADMIN"],     // Redroid 需要
    
    // 重启策略
    RestartPolicy: {
      Name: "unless-stopped",
      MaximumRetryCount: 3
    }
  },
  
  // 健康检查
  Healthcheck: {
    Test: ["CMD-SHELL", "getprop sys.boot_completed | grep -q 1"],
    Interval: 10s,
    Timeout: 5s,
    Retries: 3,
    StartPeriod: 60s
  }
}
```

#### 4.2 拉取 Redroid 镜像

```typescript
await docker.pull(`redroid/redroid:${androidVersion}.0.0-latest`);
```

**支持的 Android 版本：**
- Android 11 - `redroid/redroid:11.0.0-latest`
- Android 12 - `redroid/redroid:12.0.0-latest`
- Android 13 - `redroid/redroid:13.0.0-latest` (默认)
- Android 14 - `redroid/redroid:14.0.0-latest`

#### 4.3 创建并启动容器

```typescript
const container = await docker.createContainer(containerConfig);
await container.start();
```

---

### 5️⃣ **等待容器就绪** (健康检查)

**最多等待 120 秒：**

```typescript
await waitForContainerReady(containerId, 120);
```

**检查项：**
- 容器状态为 `running`
- 健康检查通过
- 端口可访问

---

### 6️⃣ **建立 ADB 连接** (ADB Service)

```typescript
await adbService.connectToDevice(deviceId, "localhost", adbPort);
```

**ADB 连接步骤：**
1. 连接到 ADB 端口
2. 验证设备可访问
3. 获取设备序列号
4. 建立调试会话

---

### 7️⃣ **等待 Android 系统启动** (Boot Check)

**最多等待 60 秒：**

```typescript
await waitForAndroidBoot(deviceId, 60);
```

**检查 Android 启动完成：**
```bash
adb shell getprop sys.boot_completed
# 返回 "1" 表示启动完成
```

---

### 8️⃣ **初始化设备** (Device Init)

```typescript
await initializeDevice(deviceId);
```

**初始化任务：**
- 设置系统语言（中文）
- 配置时区
- 禁用自动更新
- 设置屏幕常亮
- 安装基础应用（如果有）
- 配置网络代理（如果需要）

---

### 9️⃣ **更新设备状态**

```typescript
device.status = DeviceStatus.RUNNING;
device.lastActiveAt = new Date();
await deviceRepository.save(device);
```

---

### 🔟 **发布事件** (Event Bus)

```typescript
await eventBus.publishDeviceEvent('created', {
  deviceId: device.id,
  userId: device.userId,
  deviceName: device.name,
  status: device.status,
  tenantId: device.tenantId
});
```

**事件订阅者：**
- 计费服务 - 开始计费
- 通知服务 - 发送通知
- 监控服务 - 开始监控

---

## 🔄 完整流程图

```
用户提交创建请求
  ↓
API Gateway (认证/鉴权)
  ↓
Device Service
  ├─ 1. 分配端口 (ADB + WebRTC)
  ├─ 2. 创建设备记录 (DB)
  ├─ 3. 返回设备信息给用户 ✅
  └─ 4. 异步创建容器 ⏰
      ├─ 4.1 构建容器配置
      ├─ 4.2 拉取 Redroid 镜像
      ├─ 4.3 创建容器
      ├─ 4.4 启动容器
      ├─ 5. 等待容器就绪 (120s)
      ├─ 6. 建立 ADB 连接
      ├─ 7. 等待 Android 启动 (60s)
      ├─ 8. 初始化设备设置
      ├─ 9. 更新状态 → RUNNING
      └─ 10. 发布事件 (计费/通知)
```

---

## 🛠️ 核心技术栈

### Redroid (Remote Android)
- **官网**: https://github.com/remote-android/redroid-doc
- **原理**: 在 Docker 容器中运行 Android 系统
- **优势**:
  - 轻量级（相比完整虚拟机）
  - 隔离性好
  - 易于管理和扩展
  - 支持 GPU 加速

### Docker
- **容器化**: 每个 Android 设备独立容器
- **资源隔离**: CPU、内存、存储限制
- **网络隔离**: 独立端口映射
- **快照支持**: 容器镜像

### ADB (Android Debug Bridge)
- **连接方式**: TCP/IP (adb connect)
- **功能**: 应用安装、文件传输、shell 命令
- **端口**: 5555-5655 范围

---

## 📊 资源配置说明

### 最小配置（基础设备）
```
CPU: 2 核
内存: 2GB (2048MB)
存储: 16GB (16384MB)
分辨率: 720x1280
DPI: 320
Android: 11
```

### 推荐配置（标准设备）
```
CPU: 4 核
内存: 4GB (4096MB)
存储: 32GB (32768MB)
分辨率: 1080x2340
DPI: 420
Android: 13
```

### 高性能配置（平板/游戏）
```
CPU: 8 核
内存: 8GB (8192MB)
存储: 64GB (65536MB)
分辨率: 1600x2560
DPI: 320
Android: 13
GPU: 启用
```

---

## 🚀 创建方式

### 方式 1：直接创建
```
POST /api/devices
```
提供完整配置参数

### 方式 2：从模板创建
```
POST /api/templates/{templateId}/create-device
```
使用预配置的模板，快速创建

### 方式 3：批量创建
```
POST /api/templates/{templateId}/batch-create
```
一次创建多个相同配置的设备

### 方式 4：从快照恢复
```
POST /api/snapshots/{snapshotId}/restore
```
从已有设备的快照恢复（包含应用和数据）

---

## ⚡ 性能优化

### 异步创建
- API 立即返回设备信息
- 容器创建在后台进行
- 通过 WebSocket 推送状态更新

### 快照加速
- 预创建模板快照
- 复用基础镜像
- 减少启动时间

### 资源池
- 预创建待机设备
- 用户分配时直接使用
- 极速响应（秒级）

---

## 🔒 安全措施

### 容器隔离
- 网络隔离
- 文件系统隔离
- 资源限制

### 权限控制
- 用户只能管理自己的设备
- 管理员可管理租户内所有设备
- 超级管理员跨租户管理

### 审计日志
- 记录所有设备操作
- 追踪设备生命周期
- 监控异常行为

---

## 📈 监控指标

### 设备级监控
- CPU 使用率
- 内存使用
- 磁盘 I/O
- 网络流量

### 系统级监控
- 设备总数
- 各状态设备数量
- 资源使用率
- 端口池状态

---

## 🐛 错误处理

### 创建失败场景
1. **端口分配失败** → 释放资源，返回错误
2. **Docker 镜像拉取失败** → 重试或使用缓存镜像
3. **容器启动失败** → 清理资源，标记设备为 ERROR
4. **Android 启动超时** → 重启容器或标记错误
5. **ADB 连接失败** → 重试连接

### 自动恢复
- 容器崩溃 → 自动重启（最多3次）
- 网络断开 → 自动重连
- 健康检查失败 → 触发告警

---

## 💡 扩展功能

### 已实现
- ✅ 基础设备创建
- ✅ 模板系统
- ✅ 快照/恢复
- ✅ 批量操作
- ✅ ADB 集成
- ✅ 资源监控

### 规划中
- 🔄 WebRTC 屏幕共享
- 🔄 GPU 加速优化
- 🔄 设备集群管理
- 🔄 自动伸缩
- 🔄 跨节点调度

---

## 🔧 配置参数

### 环境变量

```bash
# Docker 配置
DOCKER_HOST=unix:///var/run/docker.sock
DOCKER_REGISTRY=docker.io

# Redroid 配置
REDROID_ENABLE_GPU=false          # 是否启用 GPU
REDROID_ENABLE_AUDIO=false        # 是否启用音频
REDROID_IMAGE_PREFIX=redroid/redroid

# 端口范围
ADB_PORT_START=5555
ADB_PORT_END=5655
WEBRTC_PORT_START=8443
WEBRTC_PORT_END=8543

# 超时配置
CONTAINER_START_TIMEOUT=120       # 容器启动超时(秒)
ANDROID_BOOT_TIMEOUT=60          # Android 启动超时(秒)
```

---

## 📝 使用示例

### 示例 1: 创建标准手机

```bash
curl -X POST http://localhost:30000/api/devices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试手机",
    "cpuCores": 4,
    "memoryMB": 4096,
    "storageMB": 32768,
    "resolution": "1080x2340",
    "dpi": 420,
    "androidVersion": "13"
  }'
```

### 示例 2: 从模板创建

```bash
curl -X POST http://localhost:30000/api/templates/{templateId}/create-device \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceName": "从模板创建的设备",
    "cpuCores": 4,
    "memoryMB": 8192
  }'
```

### 示例 3: 批量创建

```bash
curl -X POST http://localhost:30000/api/templates/{templateId}/batch-create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "count": 10,
    "namePrefix": "批量设备"
  }'
```

---

## 🎯 最佳实践

### 1. 资源规划
- 根据宿主机资源合理分配
- 预留系统资源（20-30%）
- 监控资源使用趋势

### 2. 模板使用
- 为常见场景创建模板
- 预安装常用应用
- 定期更新模板镜像

### 3. 快照策略
- 重要状态及时快照
- 定期清理过期快照
- 压缩快照节省空间

### 4. 监控告警
- 设置资源告警阈值
- 监控设备健康状态
- 及时处理异常设备

---

## 🔍 调试信息

### 查看设备日志
```bash
pm2 logs device-service

# 或直接查看容器日志
docker logs cloudphone-{deviceId}
```

### ADB 调试
```bash
# 连接设备
adb connect localhost:5555

# 查看设备状态
adb devices

# 进入设备 shell
adb shell
```

### Docker 调试
```bash
# 查看所有云手机容器
docker ps | grep cloudphone

# 进入容器
docker exec -it cloudphone-{deviceId} sh

# 查看容器资源使用
docker stats cloudphone-{deviceId}
```

---

## 📚 相关文档

- [Redroid 官方文档](https://github.com/remote-android/redroid-doc)
- [Docker API 文档](https://docs.docker.com/engine/api/)
- [ADB 使用指南](https://developer.android.com/studio/command-line/adb)

