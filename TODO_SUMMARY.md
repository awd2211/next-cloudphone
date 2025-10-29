# 后端待办事项快速总览

**总计**: **43 个 TODO**

---

## 📊 按服务分类

| 服务 | TODO 数量 | 关键待办 |
|------|----------|---------|
| **device-service** | 38 | Redroid ADB 控制 (10), 云服务商 SDK (16), SCRCPY 转发 (3) |
| **media-service** | 4 | VP8/Opus 编码器实现 |
| **user-service** | 1 | 锁定用户数统计 |

---

## 🔥 优先级分布

| 优先级 | 数量 | 说明 |
|-------|------|------|
| **P0 - 关键** | 10 | Redroid ADB 控制方法 (影响核心功能) |
| **P1 - 重要** | 24 | 云 SDK 集成 (16) + SCRCPY 转发 (3) + 编码器 (4) |
| **P2 - 优化** | 9 | 技术债务和性能优化 |

---

## ⚡ P0 - 立即需要实现 (10 项)

**文件**: `backend/device-service/src/providers/redroid/redroid.provider.ts`

### Redroid ADB 控制方法

| 功能 | 行号 | 状态 |
|------|------|------|
| 1. 等待 ADB 连接可用 | 158 | ❌ 未实现 |
| 2. 获取设备属性 | 280 | ❌ 未实现 |
| 3. 触摸点击 (tap) | 341 | ❌ 未实现 |
| 4. 滑动手势 (swipe) | 351 | ❌ 未实现 |
| 5. 按键输入 (pressKey) | 361 | ❌ 未实现 |
| 6. 文本输入 (inputText) | 371 | ❌ 未实现 |
| 7. 截图 (screenshot) | 452 | ❌ 未实现 |
| 8. 开始录屏 (startRecording) | 462 | ❌ 未实现 |
| 9. 停止录屏 (stopRecording) | 472 | ❌ 未实现 |
| 10. GPS 模拟 (setLocation) | 482 | ❌ 未实现 |

**影响**: 用户无法通过 API 控制 Redroid 虚拟设备

**预计工作量**: 2 天

---

## 📌 P1 - 重要功能 (24 项)

### 1. 云服务商 SDK 集成 (16 项)

#### 华为云 CPH (8 项)
**文件**: `backend/device-service/src/providers/huawei/huawei-cph.client.ts`
**状态**: 全部为 Mock 实现

- 创建/启动/停止/重启/删除云手机 (5 个 API)
- 查询云手机详情
- 获取 WebRTC ticket
- 整体 SDK 集成

**预计工作量**: 2 天

#### 阿里云 ECP (8 项)
**文件**: `backend/device-service/src/providers/aliyun/aliyun-ecp.client.ts`
**状态**: 全部为 Mock 实现

- 创建/启动/停止/重启/删除云手机 (5 个 API)
- 查询云手机详情/状态
- 获取控制台 URL
- 获取连接信息

**预计工作量**: 2-3 天

---

### 2. SCRCPY 事件转发 (3 项)

**文件**: `backend/device-service/src/scrcpy/scrcpy.gateway.ts`

| 行号 | 功能 | 状态 |
|------|------|------|
| 157 | 转发触控事件到 SCRCPY | ❌ 未实现 |
| 182 | 转发按键事件到 SCRCPY | ❌ 未实现 |
| 206 | 转发滚动事件到 SCRCPY | ❌ 未实现 |

**影响**: WebSocket 收到用户操作但无法转发到物理设备

**预计工作量**: 2 天

---

### 3. Media Service 编码器 (4 项)

**文件**: `backend/media-service/internal/encoder/encoder.go`

| 行号 | 功能 | 状态 |
|------|------|------|
| 113 | VP8 视频编码 (libvpx) | ❌ Stub 实现 |
| 126 | 动态比特率调整 | ❌ 未实现 |
| 133 | 动态帧率调整 | ❌ 未实现 |
| 161 | Opus 音频编码 (libopus) | ❌ Stub 实现 |

**影响**: 当前使用 Stub 编码器，实际视频流可能无法正常工作

**预计工作量**: 1 天

---

## 🔧 P2 - 优化改进 (9 项)

| 服务 | 文件 | TODO | 预计工作量 |
|------|------|------|----------|
| device-service | rabbitmq.module.ts:15 | 升级 RabbitMQ 依赖 | 4 小时 |
| device-service | device-discovery.service.ts:277 | 实现 mDNS 发现 | 4 小时 |
| device-service | physical.provider.ts:93 | 添加 SCRCPY 连接信息 | 1 小时 |
| device-service | sharded-pool.service.ts:498 | Redis SCAN 遍历优化 | 2 小时 |
| user-service | users.service.ts:474 | 计算锁定用户数 | 0.5 小时 |
| media-service | vp8_encoder.go:164 | 实现图像缩放 | 2 小时 |
| media-service | vp8_encoder.go:201,213 | 实现编码器重启 (2 处) | 2 小时 |

---

## 📅 推荐实施顺序

### Week 4
- **Day 1-2**: P0 - Redroid ADB 控制 (10 项)
- **Day 3-4**: P1 - SCRCPY 事件转发 (3 项)
- **Day 5**: P1 - Media Service 编码器 (4 项)

### Week 5
- **Day 1-2**: P1 - 华为云 CPH SDK (8 项)
- **Day 3-5**: P1 - 阿里云 ECP SDK (8 项)

### Week 6
- **Day 1-2**: P2 - 优化改进 (9 项)

---

## 💡 关键依赖

```bash
# ADB 控制 (已安装)
npm install adbkit

# 云服务商 SDK
npm install @huaweicloud/huaweicloud-sdk-cph
npm install @alicloud/ecp20220517

# Media Service 编码
sudo apt-get install libvpx-dev libopus-dev

# mDNS 发现
npm install multicast-dns
```

---

## ✅ 验收标准

### P0 完成标准
```bash
# 测试 Redroid ADB 控制
curl -X POST http://localhost:30002/api/v1/devices/{id}/tap \
  -d '{"x": 500, "y": 800}'
# 预期: 设备响应触摸
```

### P1 完成标准
```bash
# 测试 SCRCPY 转发
wscat -c ws://localhost:30002/scrcpy
> {"type": "touch_event", "deviceId": "xxx", ...}
# 预期: 物理设备响应

# 测试云 SDK
curl -X POST http://localhost:30002/api/v1/devices \
  -d '{"provider": "huawei", ...}'
# 预期: 成功创建华为云手机
```

---

**详细分析**: 查看 [BACKEND_TODO_ANALYSIS.md](./BACKEND_TODO_ANALYSIS.md)

**生成时间**: 2025-10-29
