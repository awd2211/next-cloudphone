# 后端微服务 TODO 待办事项分析报告

**生成时间**: 2025-10-29
**扫描范围**: 所有后端微服务 (TypeScript, JavaScript, Go, Python)
**总计**: **43 个待办事项**

---

## 📊 总览

| 服务 | TODO 数量 | 优先级分布 |
|------|----------|-----------|
| **device-service** | 38 | P0: 10, P1: 20, P2: 8 |
| **user-service** | 1 | P2: 1 |
| **media-service** | 4 | P1: 4 |
| **合计** | **43** | **P0: 10, P1: 24, P2: 9** |

---

## 🔥 优先级分类

### P0 - 关键功能缺失 (10 项)

这些功能直接影响核心业务逻辑，必须立即实现。

#### 1. **Redroid ADB 控制方法** (10 项)
**文件**: `backend/device-service/src/providers/redroid/redroid.provider.ts`
**影响**: 无法控制 Redroid 虚拟设备，影响用户操作体验

| 行号 | TODO 内容 | 功能 |
|------|----------|------|
| 158 | 等待 ADB 连接可用 | 确保容器启动后 ADB 可用 |
| 280 | 实现 ADB getDeviceProperties | 获取设备属性 |
| 341 | 实现 ADB tap 方法 | 触摸点击 |
| 351 | 实现 ADB swipe 方法 | 滑动手势 |
| 361 | 实现 ADB pressKey 方法 | 按键输入 |
| 371 | 实现 ADB inputText 方法 | 文本输入 |
| 452 | 实现 ADB screenshot 方法 | 截图功能 |
| 462 | 实现 ADB startRecording 方法 | 开始录屏 |
| 472 | 实现 ADB stopRecording 方法 | 停止录屏 |
| 482 | 实现 ADB setLocation 方法 | 模拟 GPS 位置 |

**实现建议**:
```typescript
// Phase 1.4: ADB 集成 (预计 3-5 天)
// 1. 实现 ADB 连接等待逻辑 (使用 adbkit)
async waitForAdb(serial: string, timeout: number): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const client = await this.adb.createClient();
      const device = await client.getDevice(serial);
      await device.shell('echo "ready"'); // 测试连接
      return;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`ADB connection timeout for ${serial}`);
}

// 2. 实现控制方法 (参考 backend/device-service/src/adb/adb.service.ts)
async tap(deviceId: string, x: number, y: number): Promise<void> {
  const connectionInfo = await this.getConnectionInfo(deviceId);
  const command = `input tap ${x} ${y}`;
  await this.adbService.executeShellCommand(connectionInfo.adb.serial, command);
}
```

**依赖**: `adbkit` 已安装，参考 `backend/device-service/src/adb/adb.service.ts`

---

### P1 - 重要功能待实现 (24 项)

#### 2. **云服务商 SDK 集成** (16 项)

##### 2.1 华为云 CPH 集成 (8 项)
**文件**: `backend/device-service/src/providers/huawei/huawei-cph.client.ts`
**当前状态**: Mock 实现，未集成真实 SDK

| 行号 | TODO 内容 | 功能 |
|------|----------|------|
| 21 | 集成真实的华为云 SDK | 整体 SDK 替换 |
| 61 | 创建云手机实例 API | 调用华为云 CreateCloudPhone |
| 125 | 启动云手机 API | 调用华为云 StartCloudPhone |
| 168 | 停止云手机 API | 调用华为云 StopCloudPhone |
| 213 | 重启云手机 API | 调用华为云 RebootCloudPhone |
| 248 | 删除云手机 API | 调用华为云 DeleteCloudPhone |
| 292 | 查询云手机详情 API | 调用华为云 DescribeCloudPhone |
| 342 | 获取 WebRTC ticket API | 调用华为云 GetWebRTCTicket |

**实现步骤**:
1. 安装华为云 SDK: `npm install @huaweicloud/huaweicloud-sdk-cph`
2. 配置 AK/SK 认证
3. 替换 Mock 实现为真实 API 调用

**参考文档**: [华为云 CPH API 文档](https://support.huaweicloud.com/api-cph/cph_02_0001.html)

---

##### 2.2 阿里云 ECP 集成 (8 项)
**文件**: `backend/device-service/src/providers/aliyun/aliyun-ecp.client.ts`
**当前状态**: Mock 实现，未集成真实 SDK

| 行号 | TODO 内容 | 功能 |
|------|----------|------|
| 20 | 替换为真实的阿里云 ECP SDK | 整体 SDK 替换 |
| 73 | 创建云手机实例 API | 调用阿里云 RunInstances |
| 155 | 启动云手机 API | 调用阿里云 StartInstances |
| 202 | 停止云手机 API | 调用阿里云 StopInstances |
| 257 | 重启云手机 API | 调用阿里云 RebootInstances |
| 296 | 删除云手机 API | 调用阿里云 DeleteInstances |
| 334 | 查询云手机详情 API | 调用阿里云 DescribeInstances |
| 384 | 获取控制台 URL API | 调用阿里云 GetInstanceVncUrl |
| 457 | 获取云手机连接信息 API | 调用阿里云 DescribeInstanceStatus |

**实现步骤**:
1. 安装阿里云 SDK: `npm install @alicloud/ecp20220517`
2. 配置 AccessKey/SecretKey
3. 替换 Mock 实现为真实 API 调用

**参考文档**: [阿里云 ECP API 文档](https://help.aliyun.com/document_detail/1010001.html)

---

#### 3. **SCRCPY 事件转发** (3 项)
**文件**: `backend/device-service/src/scrcpy/scrcpy.gateway.ts`
**影响**: WebSocket 接收到用户操作但无法转发到设备

| 行号 | TODO 内容 | 功能 |
|------|----------|------|
| 157 | 转发触控事件到 SCRCPY 进程 | 实现触摸控制 |
| 182 | 转发按键事件到 SCRCPY 进程 | 实现按键控制 |
| 206 | 转发滚动事件到 SCRCPY 进程 | 实现滚动控制 |

**实现建议**:
```typescript
// 使用 SCRCPY 控制协议 (需要编码为二进制消息)
import { ScrcpyControlMessage } from './scrcpy-protocol';

async handleTouchEvent(event: ScrcpyTouchEvent, client: Socket) {
  const deviceId = this.clientSessions.get(client.id);
  const scrcpyProcess = this.scrcpyService.getProcess(deviceId);

  if (!scrcpyProcess?.stdin) {
    throw new Error('SCRCPY process not available');
  }

  // 编码为 SCRCPY 控制消息
  const message = ScrcpyControlMessage.encodeTouch({
    action: event.type === 'down' ? 0 : 1, // 0=down, 1=up, 2=move
    pointerId: 0,
    position: { x: event.x, y: event.y },
    pressure: 1.0,
  });

  // 发送到 SCRCPY stdin
  scrcpyProcess.stdin.write(message);
}
```

**参考**: [SCRCPY 控制协议文档](https://github.com/Genymobile/scrcpy/blob/master/doc/control_messages.md)

---

#### 4. **Media Service 编码器实现** (4 项)
**文件**: `backend/media-service/internal/encoder/encoder.go`, `vp8_encoder.go`
**影响**: 当前使用 Stub 编码器，实际视频流可能无法正常编码

| 文件 | 行号 | TODO 内容 | 功能 |
|------|------|----------|------|
| encoder.go | 113 | 实现 VP8 编码 (libvpx) | 视频编码 |
| encoder.go | 126 | 实现动态比特率调整 | 码率自适应 |
| encoder.go | 133 | 实现动态帧率调整 | 帧率自适应 |
| encoder.go | 161 | 实现 Opus 音频编码 (libopus) | 音频编码 |
| vp8_encoder.go | 164 | 实现图像缩放 | 分辨率自适应 |
| vp8_encoder.go | 201 | 实现编码器重启 | 参数变更时重启 |

**实现建议**:
```go
// 使用 CGO 调用 libvpx
import "C"

// 初始化 VP8 编码器
func (e *VP8Encoder) Initialize(config EncoderConfig) error {
    e.cfg = C.vpx_codec_enc_cfg_t{}
    C.vpx_codec_enc_config_default(C.vpx_codec_vp8_cx(), &e.cfg, 0)

    e.cfg.g_w = C.uint(config.Width)
    e.cfg.g_h = C.uint(config.Height)
    e.cfg.rc_target_bitrate = C.uint(config.Bitrate / 1000)

    // 初始化编码器上下文
    ret := C.vpx_codec_enc_init(&e.ctx, C.vpx_codec_vp8_cx(), &e.cfg, 0)
    if ret != C.VPX_CODEC_OK {
        return fmt.Errorf("failed to init VP8 encoder: %d", ret)
    }

    return nil
}
```

**依赖**: 安装 libvpx-dev, libopus-dev

---

### P2 - 优化改进 (9 项)

#### 5. **RabbitMQ 依赖升级** (1 项)
**文件**: `backend/device-service/src/rabbitmq/rabbitmq.module.ts:15-17`
**影响**: 依赖冲突，但不影响功能

```
TODO:
1. 升级 @golevelup/nestjs-rabbitmq 到支持 NestJS 11 的版本
2. 或者使用原生 amqplib 重写 Consumer
```

**当前问题**: @golevelup/nestjs-rabbitmq v6.0.2 与 @nestjs/core v11 存在 DiscoveryService 依赖冲突

**解决方案**:
- 方案 1: 等待 @golevelup/nestjs-rabbitmq 发布 NestJS 11 兼容版本
- 方案 2: 切换到 nestjs-rabbitmq 或原生 amqplib

---

#### 6. **mDNS 设备发现** (1 项)
**文件**: `backend/device-service/src/providers/physical/device-discovery.service.ts:277`
**影响**: 物理设备自动发现功能缺失

```typescript
// TODO Phase 2B: 实现 mDNS 发现
async discoverDevicesViaMdns(): Promise<PhysicalDeviceInfo[]> {
  // 使用 multicast-dns 扫描局域网内的设备
}
```

**实现建议**: 使用 `multicast-dns` 包实现局域网设备自动发现

---

#### 7. **SCRCPY 连接信息增强** (1 项)
**文件**: `backend/device-service/src/providers/physical/physical.provider.ts:93`

```typescript
// TODO Phase 2A 下一步: 添加 SCRCPY 连接信息
connectionInfo: {
  adb: { ... },
  scrcpy: {
    host: physicalDevice.ip,
    port: 8000, // SCRCPY 默认端口
    maxSize: 1920,
    bitRate: 8000000,
  }
}
```

---

#### 8. **Redis 分片池遍历** (1 项)
**文件**: `backend/device-service/src/providers/physical/sharded-pool.service.ts:498`

```typescript
// TODO: 实现 Redis SCAN 遍历
// 当前使用 KEYS * 可能导致 Redis 阻塞
async getAllKeys(): Promise<string[]> {
  // 使用 SCAN 代替 KEYS
  const keys: string[] = [];
  let cursor = '0';
  do {
    const [newCursor, batch] = await this.redis.scan(cursor, 'MATCH', 'device:*', 'COUNT', 100);
    keys.push(...batch);
    cursor = newCursor;
  } while (cursor !== '0');
  return keys;
}
```

---

#### 9. **用户统计增强** (1 项)
**文件**: `backend/user-service/src/users/users.service.ts:474`

```typescript
// TODO: 计算锁定用户数
const stats = {
  totalUsers: await this.userRepository.count(),
  activeUsers: await this.userRepository.count({ where: { status: 'active' } }),
  lockedUsers: 0, // TODO: 计算锁定用户数
};
```

**修复**:
```typescript
lockedUsers: await this.userRepository.count({ where: { status: 'locked' } }),
```

---

#### 10. **Media Service 编码器优化** (4 项)

已在 P1 部分详述。

---

## 📅 实施计划

### 第一阶段 (Week 4 Day 1-2): P0 关键功能 - Redroid ADB 控制
**工作量**: 2 天
**目标**: 实现 Redroid 设备的完整 ADB 控制

**任务清单**:
- [ ] 实现 `waitForAdb()` 等待 ADB 连接 (4 小时)
- [ ] 实现 `getDeviceProperties()` 获取设备属性 (2 小时)
- [ ] 实现基础控制方法 (8 小时):
  - [ ] `tap()` - 触摸点击
  - [ ] `swipe()` - 滑动手势
  - [ ] `pressKey()` - 按键输入
  - [ ] `inputText()` - 文本输入
- [ ] 实现多媒体方法 (6 小时):
  - [ ] `screenshot()` - 截图
  - [ ] `startRecording()` / `stopRecording()` - 录屏
- [ ] 实现 GPS 模拟 (2 小时):
  - [ ] `setLocation()` - 设置位置
- [ ] 编写单元测试 (4 小时)

**验收标准**:
```bash
# 测试 ADB 控制功能
curl -X POST http://localhost:30002/api/v1/devices/{deviceId}/tap \
  -H "Content-Type: application/json" \
  -d '{"x": 500, "y": 800}'

# 预期: 设备屏幕响应触摸事件
```

---

### 第二阶段 (Week 4 Day 3-4): P1 SCRCPY 事件转发
**工作量**: 2 天
**目标**: 实现 WebSocket 到 SCRCPY 进程的事件转发

**任务清单**:
- [ ] 研究 SCRCPY 控制协议 (4 小时)
- [ ] 实现消息编码器 (6 小时):
  - [ ] `ScrcpyControlMessage.encodeTouch()`
  - [ ] `ScrcpyControlMessage.encodeKey()`
  - [ ] `ScrcpyControlMessage.encodeScroll()`
- [ ] 集成到 WebSocket Gateway (4 小时)
- [ ] 测试端到端控制 (2 小时)

**验收标准**:
```bash
# 通过 WebSocket 控制设备
wscat -c ws://localhost:30002/scrcpy
> {"type": "touch_event", "deviceId": "xxx", "event": {"type": "down", "x": 500, "y": 800}}

# 预期: 设备屏幕响应触摸
```

---

### 第三阶段 (Week 4 Day 5): P1 Media Service 编码器
**工作量**: 1 天
**目标**: 实现 libvpx VP8 和 libopus Opus 编码

**任务清单**:
- [ ] 安装依赖: `sudo apt-get install libvpx-dev libopus-dev` (0.5 小时)
- [ ] 实现 VP8 编码器 (4 小时)
- [ ] 实现 Opus 编码器 (2 小时)
- [ ] 测试编码性能 (1.5 小时)

---

### 第四阶段 (Week 5): P1 云服务商 SDK 集成
**工作量**: 4-5 天
**目标**: 集成华为云 CPH 和阿里云 ECP SDK

#### Week 5 Day 1-2: 华为云 CPH
- [ ] 注册华为云账号并获取 AK/SK (1 小时)
- [ ] 安装 SDK: `npm install @huaweicloud/huaweicloud-sdk-cph` (0.5 小时)
- [ ] 实现 8 个 API 方法 (10 小时)
- [ ] 集成测试 (4 小时)

#### Week 5 Day 3-5: 阿里云 ECP
- [ ] 注册阿里云账号并获取 AccessKey (1 小时)
- [ ] 安装 SDK: `npm install @alicloud/ecp20220517` (0.5 小时)
- [ ] 实现 9 个 API 方法 (12 小时)
- [ ] 集成测试 (6 小时)

**注意**: 云服务商 SDK 集成需要真实账号和云资源，建议在开发环境先用 Mock，生产环境再替换。

---

### 第五阶段 (Week 6): P2 优化改进
**工作量**: 2-3 天
**目标**: 完成优化和技术债务清理

- [ ] 升级 RabbitMQ 依赖或重写 Consumer (4 小时)
- [ ] 实现 mDNS 设备发现 (4 小时)
- [ ] 添加 SCRCPY 连接信息 (1 小时)
- [ ] 优化 Redis SCAN 遍历 (2 小时)
- [ ] 实现锁定用户数统计 (0.5 小时)

---

## 🛠️ 技术栈与工具

| 功能模块 | 所需技术/库 | 安装命令 |
|---------|------------|---------|
| ADB 控制 | adbkit | `npm install adbkit` (已安装) |
| SCRCPY 协议 | 自研编码器 | 无需安装 |
| VP8 编码 | libvpx | `sudo apt-get install libvpx-dev` |
| Opus 编码 | libopus | `sudo apt-get install libopus-dev` |
| 华为云 CPH | @huaweicloud/huaweicloud-sdk-cph | `npm install @huaweicloud/huaweicloud-sdk-cph` |
| 阿里云 ECP | @alicloud/ecp20220517 | `npm install @alicloud/ecp20220517` |
| mDNS 发现 | multicast-dns | `npm install multicast-dns` |

---

## 📈 进度跟踪

### 完成度

| 优先级 | 总数 | 已完成 | 进度 |
|-------|------|-------|------|
| P0 | 10 | 0 | 0% |
| P1 | 24 | 0 | 0% |
| P2 | 9 | 0 | 0% |
| **总计** | **43** | **0** | **0%** |

---

## 💡 实施建议

### 1. 分阶段实施
按照 P0 → P1 → P2 的优先级顺序实施，确保核心功能先完成。

### 2. Mock 优先原则
对于云服务商 SDK，建议先保留 Mock 实现，等有真实账号和测试环境后再替换。

### 3. 测试驱动开发
每个功能实现后立即编写单元测试和集成测试，避免回归问题。

### 4. 文档同步更新
每完成一个功能模块，立即更新对应的技术文档和 API 文档。

### 5. 代码审查
P0 和 P1 级别的功能实现需要经过代码审查再合并到主分支。

---

## 📞 联系与支持

如有任何问题或需要技术支持，请参考:
- [Device Service README](../backend/device-service/README.md)
- [Media Service README](../backend/media-service/README.md)
- [开发者文档](../docs/)

---

**报告生成**: Claude Code
**最后更新**: 2025-10-29
