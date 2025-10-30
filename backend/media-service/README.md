# Media Service - 云手机媒体服务

## 📖 服务简介

Media Service 是云手机平台的**实时音视频传输服务**，基于 **WebRTC** 技术，负责将云端 Android 设备的屏幕、音频实时传输到用户浏览器，并接收用户的控制指令（触摸、按键等）。

### 核心功能

🎥 **实时视频流传输**
- 将 Android 设备屏幕实时编码并传输到浏览器
- 支持 VP8/VP9/H.264 视频编解码
- 支持 1280x720 (720p) 高清分辨率
- 帧率最高 30 FPS

🔊 **实时音频流传输**
- 传输设备音频到浏览器
- 支持 Opus 音频编解码
- 低延迟音频传输

🎮 **实时控制**
- 接收浏览器的触摸事件（点击、滑动、多点触控）
- 接收键盘输入事件
- 通过 WebSocket 实时传输控制指令到设备

📊 **会话管理**
- 管理用户与云手机设备的 WebRTC 会话
- 支持多用户并发连接
- 自动清理非活跃会话

---

## 🏗️ 技术架构

### 技术栈

- **语言**: Go 1.21+
- **Web 框架**: Gin
- **WebRTC**: Pion WebRTC
- **WebSocket**: Gorilla WebSocket
- **日志**: Zap (高性能结构化日志)

### 架构图

```
┌─────────────┐                 ┌──────────────────┐                ┌─────────────┐
│  浏览器     │  ←──WebRTC──→   │  Media Service   │  ←──HTTP──→   │ 云手机设备   │
│ (用户端)    │                 │  (Go + Pion)     │                │ (Android)   │
│             │  ←WebSocket→    │                  │                │             │
│  - 显示屏幕 │  (控制指令)     │  - 视频编码      │                │  - 屏幕录制  │
│  - 触摸操作 │                 │  - 音频编码      │                │  - 音频采集  │
│  - 键盘输入 │                 │  - NAT 穿透      │                │  - 指令执行  │
└─────────────┘                 └──────────────────┘                └─────────────┘
```

### 工作流程

1. **创建会话**
   ```
   用户 → 前端 → Media Service (POST /api/media/sessions)
   ↓
   创建 WebRTC PeerConnection
   ↓
   返回 SDP Offer (包含音视频配置)
   ```

2. **建立连接**
   ```
   浏览器接收 Offer → 生成 Answer → 发送到 Media Service
   ↓
   ICE 候选交换 (STUN/TURN)
   ↓
   NAT 穿透成功 → P2P 连接建立
   ```

3. **媒体传输**
   ```
   云手机设备 → 屏幕采集 → 视频编码 (VP8)
   ↓
   Media Service → RTP 打包 → WebRTC 传输
   ↓
   浏览器 → 解码 → Canvas 渲染
   ```

4. **控制指令**
   ```
   浏览器 → 触摸/键盘事件 → WebSocket
   ↓
   Media Service → DataChannel / HTTP
   ↓
   云手机设备 → ADB 执行指令
   ```

---

## 🚀 核心功能详解

### 1. WebRTC 会话管理

**API 端点**:
- `POST /api/media/sessions` - 创建会话
- `POST /api/media/sessions/answer` - 设置 SDP Answer
- `POST /api/media/sessions/ice-candidate` - 添加 ICE 候选
- `GET /api/media/sessions/:id` - 获取会话信息
- `DELETE /api/media/sessions/:id` - 关闭会话
- `GET /api/media/sessions` - 列出所有会话

**会话生命周期**:
```
New → Connecting → Connected → Disconnected/Failed → Closed
```

**自动清理**:
- 每 5 分钟检查一次
- 清理超过 30 分钟的非活跃会话
- 自动释放资源

### 2. 视频流配置

**默认配置**:
```go
VideoCodec:   "VP8"          // 视频编解码器
VideoWidth:   1280           // 分辨率宽度
VideoHeight:  720            // 分辨率高度
MaxBitrate:   2000000        // 最大码率 2 Mbps
MaxFrameRate: 30             // 最大帧率 30 FPS
```

**支持的编解码器**:
- **VP8** (默认) - 使用 `VP8EncoderFFmpeg` (生产就绪)
- **VP9** - 需要 FFmpeg 支持
- **H.264** - 使用 `H264EncoderFFmpeg` 支持硬件加速 (NVENC/QSV/VAAPI)

⚠️ **编码器实现说明**:
- **生产环境推荐**:
  - 视频: `VP8EncoderFFmpeg` 或 `H264EncoderFFmpeg` (支持硬件加速)
  - 音频: `OpusEncoderFFmpeg`
- **测试/开发用**:
  - `PassThroughEncoder` (无编码，直接透传)
  - `VP8Encoder` / `OpusEncoder` (stub 实现，仅用于接口测试)

详见 `internal/encoder/` 目录中的实现文件。

### 3. 音频流配置

**默认配置**:
```go
AudioCodec: "opus"           // 音频编解码器
```

**特点**:
- 低延迟音频传输
- 自动回声消除
- 噪声抑制

### 4. NAT 穿透

**STUN 服务器** (默认):
```
stun:stun.l.google.com:19302
```

**TURN 服务器** (可选):
```go
TURN_URLS=turn:your-turn-server:3478
TURN_USERNAME=username
TURN_CREDENTIAL=password
```

**ICE 端口范围**:
```
50000-50100 (可配置)
```

### 5. WebSocket 信令

**WebSocket 端点**:
```
GET /api/media/ws
```

**消息类型**:
```typescript
// 1. 信令消息 (SDP/ICE)
{
  "type": "offer" | "answer" | "ice-candidate",
  "sessionId": "sess-123",
  "sdp": { ... },
  "candidate": { ... }
}

// 2. 控制消息 (触摸/按键)
{
  "type": "control",
  "action": "touch" | "key" | "swipe",
  "deviceId": "dev-456",
  "x": 100,
  "y": 200,
  "keyCode": 13
}
```

---

## 📊 API 文档

### 创建会话

**请求**:
```http
POST /api/media/sessions
Content-Type: application/json

{
  "deviceId": "device-001",
  "userId": "user-123"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "sessionId": "sess-abc123",
    "offer": {
      "type": "offer",
      "sdp": "v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\n..."
    }
  }
}
```

### 设置 Answer

**请求**:
```http
POST /api/media/sessions/answer
Content-Type: application/json

{
  "sessionId": "sess-abc123",
  "answer": {
    "type": "answer",
    "sdp": "v=0\r\no=- 789012 2 IN IP4 192.168.1.100\r\n..."
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

### 添加 ICE 候选

**请求**:
```http
POST /api/media/sessions/ice-candidate
Content-Type: application/json

{
  "sessionId": "sess-abc123",
  "candidate": {
    "candidate": "candidate:1 1 UDP 2130706431 192.168.1.100 54321 typ host",
    "sdpMid": "0",
    "sdpMLineIndex": 0
  }
}
```

### 获取统计信息

**请求**:
```http
GET /api/media/stats
```

**响应**:
```json
{
  "success": true,
  "data": {
    "activeSessions": 12,
    "totalSessions": 156,
    "connectedClients": 8,
    "uptime": "3h45m12s"
  }
}
```

---

## ⚙️ 环境变量配置

```bash
# 服务配置
PORT=30006
GIN_MODE=release          # debug | release
LOG_LEVEL=info            # debug | info | warn | error

# WebRTC 配置
STUN_SERVERS=stun:stun.l.google.com:19302
TURN_URLS=turn:your-turn-server:3478
TURN_USERNAME=username
TURN_CREDENTIAL=password

# ICE 配置
ICE_PORT_MIN=50000
ICE_PORT_MAX=50100

# 设备服务 URL
DEVICE_SERVICE_URL=http://localhost:30002

# 视频配置
VIDEO_CODEC=VP8           # VP8 | VP9 | H264
VIDEO_WIDTH=1280
VIDEO_HEIGHT=720
MAX_BITRATE=2000000       # 2 Mbps
MAX_FRAME_RATE=30

# 音频配置
AUDIO_CODEC=opus

# 日志配置
NODE_ENV=production       # development | production
ENABLE_FILE_LOGGING=true
```

---

## 🚀 运行服务

### 开发环境

```bash
# 安装依赖
go mod download

# 运行服务
go run main.go

# 或使用 air 热重载
air
```

### 生产环境

```bash
# 编译
go build -o media-service main.go

# 运行
./media-service
```

### Docker 部署

```bash
# 构建镜像
docker build -t cloudphone-media-service .

# 运行容器
docker run -d \
  --name media-service \
  -p 30006:30006 \
  -p 50000-50100:50000-50100/udp \
  -e PORT=30006 \
  -e GIN_MODE=release \
  cloudphone-media-service
```

**注意**: 需要开放 UDP 端口范围 (50000-50100) 用于 ICE/RTP 传输

---

## 🎬 编码器选择指南

### 视频编码器对比

| 编码器 | 类型 | 性能 | 质量 | 硬件加速 | 适用场景 | 状态 |
|--------|------|------|------|----------|---------|------|
| `H264EncoderFFmpeg` | H.264 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ NVENC/QSV/VAAPI | 生产环境首选 | ✅ 生产就绪 |
| `VP8EncoderFFmpeg` | VP8 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ | 兼容性好，适合 WebRTC | ✅ 生产就绪 |
| `SimpleVP8Encoder` | VP8 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ | 每帧独立编码 | ✅ 可用 |
| `PassThroughEncoder` | 无 | ⭐⭐⭐⭐⭐ | N/A | N/A | 开发测试，无编码 | ⚠️ 测试用 |
| `VP8Encoder` | VP8 | N/A | N/A | N/A | 接口占位符 | ❌ Stub (已废弃) |

### 音频编码器对比

| 编码器 | 类型 | 性能 | 质量 | 适用场景 | 状态 |
|--------|------|------|------|---------|------|
| `OpusEncoderFFmpeg` | Opus | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 生产环境，低延迟音频 | ✅ 生产就绪 |
| `StreamingOpusEncoder` | Opus | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 持续流式编码 | ✅ 生产就绪 |
| `PassThroughAudioEncoder` | 无 | ⭐⭐⭐⭐⭐ | N/A | 开发测试，无编码 | ⚠️ 测试用 |
| `OpusEncoder` | Opus | N/A | N/A | 接口占位符 | ❌ Stub (已废弃) |

### 推荐配置

#### 高性能生产环境 (有 GPU)
```go
// 使用 NVIDIA NVENC 硬件加速
videoEncoder, _ := encoder.NewH264EncoderFFmpeg(encoder.H264EncoderOptions{
    Width:     1920,
    Height:    1080,
    Bitrate:   4000000, // 4 Mbps
    FrameRate: 60,
    HWAccel:   encoder.H264EncoderNVENC, // 硬件加速
    Preset:    "p4",  // NVENC preset
})

audioEncoder, _ := encoder.NewStreamingOpusEncoder(...)
```

#### 标准生产环境 (无 GPU)
```go
// 使用 VP8 软件编码
videoEncoder, _ := encoder.NewVP8EncoderFFmpeg(encoder.VP8EncoderOptions{
    Width:     1280,
    Height:    720,
    Bitrate:   2000000, // 2 Mbps
    FrameRate: 30,
    Quality:   10,
})

audioEncoder, _ := encoder.NewOpusEncoderFFmpeg(...)
```

#### 开发/测试环境
```go
// 使用 PassThrough 编码器，无编码开销
videoEncoder := encoder.NewPassThroughEncoder()
audioEncoder := encoder.NewPassThroughAudioEncoder()
```

### ⚠️ 已废弃的编码器

以下编码器是 **stub 实现**，不执行实际编码，仅用于接口兼容性测试：

- `VP8Encoder` (encoder.go) - 调用 `Encode()` 会返回错误
- `OpusEncoder` (encoder.go) - 调用 `EncodeAudio()` 会返回错误

**请勿在生产环境中使用这些 stub 编码器！**

如果您看到以下错误：
```
VP8 encoding not implemented in stub - use VP8EncoderFFmpeg or SimpleVP8Encoder
Opus encoding not implemented in stub - use OpusEncoderFFmpeg
```

这说明代码中使用了 stub 编码器，请切换到生产实现。

---

## 📈 性能特点

### 并发能力

- **单机支持**: 1,000+ 并发 WebRTC 会话
- **内存占用**: 每会话约 10-20 MB
- **CPU 占用**: 视频编码主要消耗（取决于分辨率和编解码器）

### 延迟

- **端到端延迟**: 100-300ms
- **玻璃到玻璃**: < 500ms (理想网络条件)
- **控制延迟**: < 50ms (触摸到响应)

### 带宽

- **视频流**: 1-2 Mbps (720p @ 30fps)
- **音频流**: 32-128 Kbps
- **总带宽**: 约 1.5-2.5 Mbps / 会话

---

## 🔍 监控和调试

### 健康检查

```bash
curl http://localhost:30006/health
```

### 查看日志

**开发环境** (彩色输出):
```
2025-10-21 10:30:00 [INFO] [HTTP] session_created
2025-10-21 10:30:01 [DEBUG] [WebRTC] ice_candidate_added
```

**生产环境** (JSON):
```json
{"timestamp":"2025-10-21T10:30:00Z","level":"info","message":"session_created","session_id":"sess-123"}
```

### 统计信息

```bash
curl http://localhost:30006/api/media/stats
```

---

## 🛡️ 安全考虑

### ICE 候选过滤

- 只暴露必要的候选地址
- 避免泄露内网拓扑

### TURN 服务器

- 生产环境建议部署自己的 TURN 服务器
- 使用认证凭据保护 TURN 访问

### 会话验证

- 验证 `userId` 和 `deviceId` 的有效性
- 检查用户是否有权限访问设备

---

## 🔧 故障排查

### 连接失败

**问题**: ICE 连接失败
**原因**: NAT 穿透失败
**解决**:
- 检查 STUN/TURN 服务器配置
- 确保 UDP 端口范围开放
- 使用 TURN 服务器中继

### 视频卡顿

**问题**: 视频播放不流畅
**原因**: 带宽不足或编码性能问题
**解决**:
- 降低分辨率或帧率
- 降低码率
- 检查网络质量

### 音频延迟

**问题**: 音频延迟高
**原因**: 缓冲区过大或网络抖动
**解决**:
- 调整 jitter buffer 大小
- 优化网络路由
- 使用更好的网络

---

## 📚 相关文档

- [Pion WebRTC 文档](https://github.com/pion/webrtc)
- [WebRTC 规范](https://www.w3.org/TR/webrtc/)
- [ICE/STUN/TURN 原理](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

---

## 🎯 总结

Media Service 是云手机平台的**核心媒体传输服务**，负责:

1. ✅ **实时视频传输** - 将云手机屏幕传输到浏览器
2. ✅ **实时音频传输** - 传输设备音频
3. ✅ **实时控制** - 接收并转发用户操作
4. ✅ **WebRTC 会话管理** - 管理点对点连接
5. ✅ **NAT 穿透** - 支持各种网络环境

使用 Go 语言开发，性能优异，单机可支持 1,000+ 并发会话！

---

**版本**: v1.0
**作者**: CloudPhone Team
**最后更新**: 2025-10-21
