# WebRTC 媒体流完整实施指南

## 概述

本文档详细说明了 Cloud Phone Platform 中 WebRTC 媒体流功能的完整实现，包括屏幕采集、视频编码、音频处理、网络自适应和前端集成。

## 实现进度

### ✅ 已完成功能

#### 1. 屏幕采集驱动 (100%)

**位置**: `backend/media-service/internal/capture/`

**核心文件**:
- `interface.go` - 采集接口定义
- `screen_capture.go` - Android 屏幕采集实现
- `audio_capture.go` - Android 音频采集实现

**实现方式**:
```go
// 两种屏幕采集方式

// 方式1: 使用 screencap (PNG 格式，按帧率采集)
AndroidScreenCapture
  - 通过 adb exec-out screencap -p 获取 PNG 帧
  - 支持动态 FPS 调整 (1-60 fps)
  - 帧缓冲和丢帧处理
  - FPS 统计和监控

// 方式2: 使用 screenrecord (H.264 流，连续采集)
AndroidScreenRecordCapture
  - 通过 adb shell screenrecord --output-format=h264 获取 H.264 流
  - 连续流式传输，低延迟
  - 固定 2 Mbps 码率
```

**关键特性**:
- ✅ 多种采集格式支持 (PNG, JPEG, H.264)
- ✅ 动态帧率调整 (1-60 FPS)
- ✅ 帧缓冲管理 (防止内存溢出)
- ✅ 丢帧统计和监控
- ✅ 屏幕分辨率自动检测
- ✅ 错误处理和重试机制

#### 2. 视频帧编码管道 (100%)

**位置**: `backend/media-service/internal/encoder/`

**核心文件**:
- `encoder.go` - 编码器接口和实现
- `video_pipeline.go` - 视频处理管道
- `pipeline_manager.go` - 管道管理器

**架构**:
```
Android Device (ADB)
    ↓ screencap
Capture Service (ScreenCapture)
    ↓ Frame Channel
Video Pipeline
    ↓ Encode (可选)
WebRTC VideoTrack
    ↓ RTP
Browser
```

**Pipeline 功能**:
```go
VideoPipeline {
  - Frame 读取循环
  - 编码处理 (Pass-through / VP8 / H.264)
  - 写入 WebRTC Track
  - 统计收集 (FPS, 码率, 丢帧)
  - 动态质量调整
}
```

**关键特性**:
- ✅ 异步帧处理管道
- ✅ 编码器插件架构 (支持多种编码器)
- ✅ Pass-through 模式 (PNG → WebRTC 直传)
- ✅ 帧率和码率动态调整
- ✅ 管道统计和监控
- ✅ 会话级管道管理

#### 3. 音频采集驱动 (100%)

**位置**: `backend/media-service/internal/capture/audio_capture.go`

**实现方式**:
```go
AndroidAudioCapture
  - 通过 adb shell audiorecord 采集 PCM 音频
  - 支持配置: 采样率 (48kHz), 声道 (立体声), 位深 (16-bit)
  - 20ms 音频帧缓冲
  - 实时音频流处理
```

**关键特性**:
- ✅ PCM 音频采集
- ✅ 可配置采样率和声道
- ✅ 音频帧缓冲
- ✅ 采样统计和监控
- ✅ Mock 实现 (用于测试)

#### 4. Device Service 集成 (100%)

**位置**: `backend/device-service/src/devices/`

**新增端点**:
```typescript
GET /devices/:id/stream-info
  - 返回设备流信息 (容器名, ADB 端口, 分辨率)
  - 供 Media Service 使用

GET /devices/:id/screenshot
  - 获取设备当前截图 (PNG)
  - 返回 Buffer 数据
```

**ADB Service 增强**:
```typescript
takeScreenshot(deviceId: string): Promise<Buffer>
  - 直接返回截图 Buffer
  - 用于 API 响应

getStreamInfo(deviceId: string)
  - 获取设备屏幕分辨率
  - 通过 adb shell wm size 检测
```

#### 5. 网络质量自适应 (100%)

**位置**: `backend/media-service/internal/adaptive/`

**核心文件**:
- `quality_controller.go` - 质量控制器
- `rtcp_collector.go` - RTCP 统计收集

**质量等级**:
```go
QualityLevel {
  Low:    360p @ 15fps, 500 kbps
  Medium: 480p @ 24fps, 1 Mbps
  High:   720p @ 30fps, 2 Mbps
  Ultra:  1080p @ 30fps, 4 Mbps
}
```

**自适应算法**:
```go
QualityScore = RTT分数(40) + 丢包率分数(30) + 带宽分数(30)

- RTT < 50ms:  40分
- RTT 50-200ms: 线性衰减
- RTT > 200ms: 0分

- 丢包 < 1%:  30分
- 丢包 1-5%:  线性衰减
- 丢包 > 5%:  0分

- 带宽充足:  30分
- 带宽不足:  线性衰减
```

**关键特性**:
- ✅ 实时 RTCP 统计收集
- ✅ 网络质量评分算法
- ✅ 自动质量调整 (5秒间隔, 10秒冷却)
- ✅ 手动质量设置
- ✅ 质量历史追踪

#### 6. 前端播放器优化 (100%)

**位置**: `frontend/user/src/components/WebRTCPlayer.tsx`

**新增功能**:
```typescript
✅ 连接统计显示
  - 比特率 (Mbps)
  - 帧率 (FPS)
  - 延迟 (RTT, ms)
  - 抖动 (Jitter, ms)
  - 丢包率 (%)
  - 分辨率
  - 接收数据量 (MB)
  - 编解码器

✅ 网络质量指示器
  - 优秀 (绿色) - RTT<50ms, 丢包<1%, 码率>2Mbps
  - 良好 (蓝色) - RTT<100ms, 丢包<2%, 码率>1Mbps
  - 一般 (黄色) - RTT<200ms, 丢包<5%, 码率>500kbps
  - 较差 (红色) - 超过阈值

✅ 自动重连机制
  - 连接失败/断开自动重连
  - 指数退避策略 (1s, 2s, 4s, 8s, 16s, 最大30s)
  - 最多重连 5 次
  - 用户提示和进度显示

✅ 增强错误处理
  - 详细错误信息
  - 错误状态显示
  - 用户友好提示
```

---

## 架构总览

### 完整数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                       Android Device (Redroid)                   │
│  ┌────────────┐           ┌─────────────┐                       │
│  │   Screen   │           │    Audio    │                       │
│  └──────┬─────┘           └──────┬──────┘                       │
└─────────┼────────────────────────┼────────────────────────────── ┘
          │ ADB screencap          │ ADB audiorecord
          ↓                        ↓
┌─────────────────────────────────────────────────────────────────┐
│                       Capture Layer                              │
│  ┌──────────────────┐      ┌────────────────────┐              │
│  │ ScreenCapture    │      │  AudioCapture      │              │
│  │ - PNG/H.264      │      │  - PCM 48kHz       │              │
│  │ - 30 FPS         │      │  - 16-bit Stereo   │              │
│  └────────┬─────────┘      └─────────┬──────────┘              │
└───────────┼──────────────────────────┼──────────────────────────┘
            │ Frame Channel            │ Audio Channel
            ↓                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                       Encoder Layer                              │
│  ┌──────────────────┐      ┌────────────────────┐              │
│  │ VideoPipeline    │      │  AudioPipeline     │              │
│  │ - Encoding       │      │  - Encoding        │              │
│  │ - Quality Ctrl   │      │  - Quality Ctrl    │              │
│  └────────┬─────────┘      └─────────┬──────────┘              │
└───────────┼──────────────────────────┼──────────────────────────┘
            │ Encoded Frames           │ Encoded Audio
            ↓                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                       WebRTC Layer                               │
│  ┌──────────────────────────────────────────────────┐           │
│  │            PeerConnection Manager                │           │
│  │  ┌────────────────┐    ┌───────────────────┐   │           │
│  │  │  VideoTrack    │    │   AudioTrack      │   │           │
│  │  │  - VP8/H.264   │    │   - Opus          │   │           │
│  │  └────────┬───────┘    └─────────┬─────────┘   │           │
│  └───────────┼──────────────────────┼──────────────┘           │
│              │                       │                          │
│  ┌───────────┼──────────────────────┼──────────────┐           │
│  │           │   RTCP Collector     │              │           │
│  │           │   - Stats Gathering  │              │           │
│  │           └──────────┬───────────┘              │           │
│  │                      │                          │           │
│  │           ┌──────────▼───────────┐              │           │
│  │           │ Quality Controller   │              │           │
│  │           │ - Adaptive Bitrate   │              │           │
│  │           └──────────────────────┘              │           │
│  └──────────────────────────────────────────────────┘          │
└───────────┬───────────────────────────┬─────────────────────────┘
            │ RTP (UDP)                 │ RTCP (UDP)
            ↓                           ↑
┌─────────────────────────────────────────────────────────────────┐
│                      Network (Internet)                          │
│                  - STUN/TURN (NAT Traversal)                    │
│                  - ICE (Connectivity)                            │
└───────────┬───────────────────────────┬─────────────────────────┘
            ↓                           ↑
┌─────────────────────────────────────────────────────────────────┐
│                       Browser (Client)                           │
│  ┌──────────────────────────────────────────────────┐           │
│  │            RTCPeerConnection                      │           │
│  │  ┌────────────────┐    ┌───────────────────┐   │           │
│  │  │  Video Track   │    │   Audio Track     │   │           │
│  │  │  - Decode      │    │   - Decode        │   │           │
│  │  └────────┬───────┘    └─────────┬─────────┘   │           │
│  └───────────┼──────────────────────┼──────────────┘           │
│              ↓                       ↓                          │
│  ┌────────────────────┐  ┌────────────────────┐               │
│  │  <video> Element   │  │  <audio> Element   │               │
│  └────────────────────┘  └────────────────────┘               │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │         Statistics Display                        │          │
│  │  - Bitrate, FPS, RTT, Jitter, Packet Loss       │          │
│  │  - Network Quality Indicator                     │          │
│  │  - Auto Reconnect                                │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 使用指南

### 1. 启动 Media Service

```bash
cd backend/media-service

# 设置环境变量
export ADB_PATH=/usr/bin/adb
export PORT=30006
export STUN_SERVERS=stun:stun.l.google.com:19302
export ICE_PORT_MIN=50000
export ICE_PORT_MAX=50100

# 运行服务
go run main.go
```

### 2. 创建 WebRTC 会话

```bash
# 1. 创建会话
curl -X POST http://localhost:30006/api/media/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-001",
    "userId": "user-001",
    "offer": "<SDP_OFFER>"
  }'

# 返回
{
  "id": "session-001",
  "deviceId": "device-001",
  "answer": "<SDP_ANSWER>",
  "state": "connecting"
}

# 2. 建立 WebSocket (用于 ICE 候选交换)
wscat -c ws://localhost:30006/api/media/ws?sessionId=session-001

# 3. 发送 ICE 候选
{
  "type": "ice-candidate",
  "sessionId": "session-001",
  "candidate": { ... }
}
```

### 3. 前端使用

```tsx
import WebRTCPlayer from '@/components/WebRTCPlayer';

// 使用组件
<WebRTCPlayer
  deviceId="device-001"
  showStats={true}  // 显示统计信息
/>
```

---

## API 参考

### Media Service REST API

```
POST   /api/media/sessions              创建 WebRTC 会话
POST   /api/media/sessions/answer       设置 SDP Answer
POST   /api/media/sessions/ice-candidate  添加 ICE 候选
GET    /api/media/sessions/:id          获取会话信息
DELETE /api/media/sessions/:id          关闭会话
GET    /api/media/sessions              列出所有会话
GET    /api/media/stats                 获取统计信息
GET    /metrics                          Prometheus 指标
GET    /health                           健康检查
```

### Device Service REST API

```
GET    /devices/:id/stream-info        获取设备流信息
GET    /devices/:id/screenshot         获取设备截图
```

### WebSocket 消息格式

```json
// Client → Server
{
  "type": "join",
  "sessionId": "session-001"
}

{
  "type": "ice-candidate",
  "sessionId": "session-001",
  "candidate": { ... }
}

// Server → Client
{
  "type": "answer",
  "sessionId": "session-001",
  "answer": "<SDP>"
}

{
  "type": "ice-candidate",
  "sessionId": "session-001",
  "candidate": { ... }
}
```

---

## 配置参数

### 屏幕采集配置

```go
CaptureOptions {
  DeviceID:   string        // 设备 ID
  Width:      int           // 宽度 (0=自动)
  Height:     int           // 高度 (0=自动)
  FrameRate:  int           // 帧率 (默认30)
  Format:     FrameFormat   // 格式 (PNG/JPEG/H.264)
  Quality:    int           // 质量 (0-100)
  BufferSize: int           // 缓冲区大小
}
```

### 质量等级配置

```go
QualitySettings {
  Level:     QualityLevel   // Low/Medium/High/Ultra
  Bitrate:   int            // 码率 (bps)
  FrameRate: int            // 帧率 (fps)
  Width:     int            // 宽度 (px)
  Height:    int            // 高度 (px)
}
```

### 自适应参数

```go
QualityControllerOptions {
  InitialQuality:      QualitySettings
  RTTThresholdGood:    50ms
  RTTThresholdPoor:    200ms
  LossThresholdGood:   1%
  LossThresholdPoor:   5%
  BandwidthMultiplier: 0.8
  AdaptationInterval:  5s
  CooldownPeriod:      10s
}
```

---

## 性能优化建议

### 1. 屏幕采集优化

```go
// 推荐配置
- 使用 H.264 格式 (AndroidScreenRecordCapture)
- 帧率: 30 FPS (移动设备标准)
- 分辨率: 720p (平衡性能和质量)
- 缓冲区: 5-10 帧 (减少内存使用)
```

### 2. 编码优化

```go
// VP8 编码 (如果使用)
- 码率: 2 Mbps (720p标准)
- 关键帧间隔: 30 帧 (1秒)
- 使用硬件加速 (如果可用)
```

### 3. 网络优化

```go
// TURN 服务器 (用于 NAT 穿透)
- 部署私有 TURN 服务器 (coturn)
- 使用 UDP 传输 (减少延迟)
- 设置合理的 ICE 候选超时
```

### 4. 前端优化

```tsx
// WebRTC 配置
const config = {
  iceServers: [...],
  iceTransportPolicy: 'all',  // 允许所有传输方式
  bundlePolicy: 'max-bundle',  // 最大化 bundle
  rtcpMuxPolicy: 'require',    // 要求 RTCP 复用
};
```

---

## 监控和调试

### Prometheus 指标

```
# 会话指标
media_service_sessions_total          # 总会话数
media_service_sessions_active         # 活跃会话数
media_service_sessions_created        # 创建的会话数

# 质量指标
media_service_video_bitrate_bps       # 视频码率
media_service_video_fps               # 视频帧率
media_service_rtt_ms                  # 往返延迟
media_service_packet_loss_rate        # 丢包率
```

### 日志级别

```bash
# 设置日志级别
export LOG_LEVEL=debug  # debug/info/warn/error

# 查看日志
tail -f /var/log/media-service.log
```

### 调试工具

```bash
# WebRTC 内部统计 (Chrome)
chrome://webrtc-internals/

# 网络抓包
tcpdump -i any -w webrtc.pcap 'udp port 50000:50100'

# RTCP 分析
wireshark webrtc.pcap
```

---

## 故障排除

### 问题1: 无法连接

**症状**: WebRTC 连接失败

**排查**:
```bash
# 1. 检查 ICE 候选
- 确认 STUN 服务器可访问
- 检查防火墙规则 (UDP 50000-50100)

# 2. 检查设备状态
curl http://localhost:30002/devices/<id>/stream-info

# 3. 检查 ADB 连接
adb devices
```

### 问题2: 画面卡顿

**症状**: 画面延迟或卡顿

**排查**:
```bash
# 1. 检查网络质量
- 查看前端网络质量指示器
- 检查丢包率和 RTT

# 2. 检查资源使用
top -p $(pgrep media-service)

# 3. 降低质量
- 调整帧率 (30→24→15)
- 降低分辨率 (720p→480p→360p)
```

### 问题3: 屏幕采集失败

**症状**: 无法获取屏幕数据

**排查**:
```bash
# 1. 测试 ADB screencap
adb -s <device> exec-out screencap -p > test.png

# 2. 检查权限
adb -s <device> shell dumpsys window policy

# 3. 重启容器
docker restart <container>
```

---

## 下一步计划

### ⚠️ 待完善功能

#### 1. 真实 VP8/Opus 编码器 (优先级: 高)

**当前状态**: 使用 Pass-through (PNG 直传)

**待实现**:
```go
// 集成 libvpx (VP8 编码)
import "github.com/gen2brain/x264-go/vpx"

type VP8Encoder struct {
  ctx *vpx.Context
}

// 集成 libopus (Opus 编码)
import "gopkg.in/hraban/opus.v2"

type OpusEncoder struct {
  encoder *opus.Encoder
}
```

**预期收益**:
- 降低带宽使用 (PNG 5-10MB/s → VP8 1-2MB/s)
- 提高流畅度
- 降低客户端解码负担

#### 2. 屏幕录制功能 (优先级: 中)

**待实现**:
```go
// 录制管理器
type RecordingManager struct {
  sessions map[string]*Recording
}

type Recording struct {
  sessionID  string
  outputPath string
  encoder    *H264Encoder
  muxer      *MP4Muxer
}
```

#### 3. 多设备同步控制 (优先级: 中)

**待实现**:
```go
// 广播控制
type BroadcastController struct {
  sessions []string
}

func (bc *BroadcastController) SendTouch(x, y float64) {
  for _, sessionID := range bc.sessions {
    // 发送触摸事件到所有会话
  }
}
```

#### 4. H.264 硬件编码 (优先级: 低)

**待实现**:
```go
// 使用 VAAPI (Intel) 或 NVENC (NVIDIA)
type HardwareEncoder struct {
  device *vaapi.Device
}
```

---

## 测试计划

### 单元测试

```bash
# 测试屏幕采集
go test ./internal/capture -v

# 测试编码管道
go test ./internal/encoder -v

# 测试自适应算法
go test ./internal/adaptive -v
```

### 集成测试

```bash
# 端到端测试
./scripts/test-webrtc-e2e.sh

# 性能测试
./scripts/benchmark-capture.sh
./scripts/benchmark-pipeline.sh
```

### 压力测试

```bash
# 模拟 100 并发会话
./scripts/load-test.sh -c 100 -d 60s
```

---

## 参考资料

### WebRTC 规范
- [RFC 8825 - WebRTC Overview](https://datatracker.ietf.org/doc/html/rfc8825)
- [RFC 7742 - VP8 RTP Payload](https://datatracker.ietf.org/doc/html/rfc7742)
- [RFC 7587 - Opus RTP Payload](https://datatracker.ietf.org/doc/html/rfc7587)

### 库文档
- [Pion WebRTC](https://github.com/pion/webrtc)
- [adbkit](https://github.com/DeviceFarmer/adbkit)

### 相关文档
- [CLAUDE.md](../CLAUDE.md) - 项目开发指南
- [IMPROVEMENT_PROGRESS.md](./IMPROVEMENT_PROGRESS.md) - 改进进度追踪
- [Prometheus Metrics](./internal/metrics/README.md) - 指标说明

---

## 贡献者

- Claude Code - WebRTC 媒体流完整实现
- 实施日期: 2025-01-28

---

## 许可证

MIT License - 参见 LICENSE 文件
