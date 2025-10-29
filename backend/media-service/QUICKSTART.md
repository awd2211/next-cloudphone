# WebRTC Media Service - 快速开始指南

## 5分钟快速部署

本指南帮助你在 5 分钟内启动 WebRTC 媒体流功能。

---

## 前置要求

### 系统要求
```bash
# 操作系统: Linux (Ubuntu 20.04+ 推荐)
# CPU: 4核心+
# RAM: 8GB+
# 存储: 20GB+
```

### 软件依赖

```bash
# 1. Go 1.21+
go version  # 应该显示 go1.21 或更高

# 2. FFmpeg (用于视频/音频编码)
sudo apt-get update
sudo apt-get install -y ffmpeg

# 验证安装
ffmpeg -version

# 3. ADB (Android Debug Bridge)
sudo apt-get install -y android-tools-adb

# 验证安装
adb version

# 4. Docker (用于 Redroid 容器)
docker --version
```

---

## 步骤 1: 安装和构建

```bash
cd /home/eric/next-cloudphone/backend/media-service

# 安装 Go 依赖
go mod download

# 构建服务
go build -o media-service main.go

# 构建示例程序
go build -o pipeline-example examples/complete_pipeline.go
```

---

## 步骤 2: 测试编码器

运行编码器测试以验证 FFmpeg 配置：

```bash
# 运行编码器测试脚本
./scripts/test-encoders.sh
```

**期望输出:**
```
════════════════════════════════════════════════════════
  WebRTC 编码器功能测试
════════════════════════════════════════════════════════

1. 检查依赖...
✓ FFmpeg 已安装
✓ ADB 已安装
✓ Go 已安装

2. 创建测试图像...
✓ 测试图像已创建: /tmp/webrtc-encoder-test/test_frame.png

3. 测试 VP8 编码器...
✓ VP8 编码成功
  输入: 1.2M
  输出: 15K
  压缩比: 80.00x

4. 生成测试音频...
✓ 测试音频已创建

5. 测试 Opus 编码器...
✓ Opus 编码成功
  压缩比: 15.20x

✓ 所有编码器测试通过!
```

---

## 步骤 3: 准备 Android 设备

### 选项 A: 使用真实设备 (USB 连接)

```bash
# 1. 启用 USB 调试 (在设备上)
# 设置 → 关于手机 → 连续点击版本号7次 → 开发者选项 → 启用 USB 调试

# 2. 连接设备到电脑

# 3. 验证连接
adb devices

# 应该显示:
# List of devices attached
# XXXXXXXXXXXXX    device
```

### 选项 B: 使用 Redroid 容器

```bash
# 1. 启动 Redroid 容器
docker run -itd --rm --privileged \
  --name redroid-test \
  -v ~/data:/data \
  -p 5555:5555 \
  redroid/redroid:11.0.0-latest

# 2. 连接到容器
adb connect localhost:5555

# 3. 验证
adb devices
# 应该显示: localhost:5555    device
```

---

## 步骤 4: 测试完整管道

使用示例程序测试完整的采集→编码→写入管道：

```bash
# 获取设备 ID
DEVICE_ID=$(adb devices | grep -v "List" | awk '{print $1}' | head -1)

echo "使用设备: $DEVICE_ID"

# 运行管道示例 (30秒测试)
./pipeline-example \
  -device "$DEVICE_ID" \
  -encoder vp8-simple \
  -width 1280 \
  -height 720 \
  -fps 30 \
  -bitrate 2000000 \
  -duration 30
```

**期望输出:**
```
Starting Complete Media Pipeline Example
Configuration:
  device: localhost:5555
  encoder: vp8-simple
  resolution: 1280x720
  fps: 30
  bitrate: 2000000

Step 1: Creating screen capture service
✓ Screen capture started

Step 2: Creating video encoder
Creating Simple VP8 encoder (FFmpeg one-shot)
✓ Video encoder created

Step 3: Creating video pipeline
✓ Video pipeline started

Step 4: Creating quality controller
✓ Quality controller created

Step 5: Monitoring pipeline
Pipeline will run for 30 seconds. Press Ctrl+C to stop early.

📊 Pipeline Statistics:
  pipeline_fps: 29.8
  pipeline_bitrate: 1.95 Mbps
  frames_processed: 149
  frames_encoded: 149
  frames_dropped: 0
  ...

✓ Pipeline example completed successfully
```

---

## 步骤 5: 启动 Media Service

### 配置环境变量

创建 `.env` 文件：

```bash
cat > .env << 'EOF'
# 服务配置
PORT=30006
GIN_MODE=release
LOG_LEVEL=info

# WebRTC 配置
STUN_SERVERS=stun:stun.l.google.com:19302
ICE_PORT_MIN=50000
ICE_PORT_MAX=50100

# 编码器配置
VIDEO_ENCODER_TYPE=vp8-simple
VIDEO_WIDTH=1280
VIDEO_HEIGHT=720
VIDEO_BITRATE=2000000
VIDEO_FRAMERATE=30

AUDIO_ENCODER_TYPE=opus
AUDIO_SAMPLE_RATE=48000
AUDIO_CHANNELS=2
AUDIO_BITRATE=64000

# ADB 配置
ADB_PATH=/usr/bin/adb

# Consul (可选)
CONSUL_ENABLED=false

# RabbitMQ (可选)
RABBITMQ_ENABLED=false
EOF
```

### 启动服务

```bash
# 加载环境变量
export $(cat .env | xargs)

# 启动 Media Service
./media-service

# 或使用 systemd/PM2 进行进程管理
```

**期望输出:**
```
INFO[0000] Starting Media Service
INFO[0000] Encoder factory initialized
INFO[0000] WebRTC Manager initialized
INFO[0000] HTTP server listening on :30006
INFO[0000] WebSocket hub started
INFO[0000] Media Service started successfully
```

---

## 步骤 6: 测试 API

### 创建 WebRTC 会话

```bash
# 1. 创建会话
curl -X POST http://localhost:30006/api/media/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "localhost:5555",
    "userId": "test-user",
    "offer": "v=0..."
  }'

# 响应:
{
  "id": "session-123",
  "deviceId": "localhost:5555",
  "userId": "test-user",
  "answer": "v=0...",
  "state": "connecting"
}

# 2. 获取会话信息
curl http://localhost:30006/api/media/sessions/session-123

# 3. 获取统计信息
curl http://localhost:30006/api/media/stats

# 4. 检查健康状态
curl http://localhost:30006/health
```

---

## 步骤 7: 前端集成

### 在前端使用 WebRTC 播放器

```tsx
import WebRTCPlayer from '@/components/WebRTCPlayer';

function DevicePage() {
  return (
    <div>
      <h1>云手机画面</h1>
      <WebRTCPlayer
        deviceId="localhost:5555"
        showStats={true}
      />
    </div>
  );
}
```

### 启动前端

```bash
cd /home/eric/next-cloudphone/frontend/user

# 配置环境变量
cat > .env.local << 'EOF'
VITE_API_URL=http://localhost:30000
VITE_MEDIA_URL=http://localhost:30006
VITE_WS_URL=ws://localhost:30006
EOF

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 访问 http://localhost:5174
```

---

## 常见问题排查

### 问题 1: ADB 设备未连接

```bash
# 检查 ADB 服务
adb kill-server
adb start-server

# 重新连接
adb devices

# 如果是 Redroid，确保端口映射正确
docker ps | grep redroid
```

### 问题 2: FFmpeg 编码失败

```bash
# 测试 FFmpeg
ffmpeg -version

# 检查编解码器
ffmpeg -codecs | grep vp8
ffmpeg -codecs | grep opus

# 如果缺少编解码器，重新安装
sudo apt-get install --reinstall ffmpeg libvpx-dev libopus-dev
```

### 问题 3: 端口被占用

```bash
# 检查端口
sudo lsof -i :30006
sudo ss -tlnp | grep 30006

# 杀死占用进程
sudo kill -9 <PID>

# 或更改端口
export PORT=30007
```

### 问题 4: 屏幕采集失败

```bash
# 手动测试屏幕采集
adb -s <device> exec-out screencap -p > test.png

# 检查图像
file test.png  # 应该显示 PNG image data

# 如果失败，检查设备权限
adb shell dumpsys window policy
```

### 问题 5: WebRTC 连接失败

```bash
# 1. 检查 STUN 服务器
nc -zv stun.l.google.com 19302

# 2. 检查防火墙规则 (允许 UDP 50000-50100)
sudo ufw allow 50000:50100/udp

# 3. 检查 NAT 配置
# 如果在 Docker/VM 中运行，确保端口正确映射

# 4. 查看浏览器控制台
# chrome://webrtc-internals/
```

---

## 性能优化建议

### 低端设备配置

```bash
# 降低分辨率和帧率
export VIDEO_WIDTH=854
export VIDEO_HEIGHT=480
export VIDEO_FRAMERATE=24
export VIDEO_BITRATE=1000000  # 1 Mbps

# 使用 pass-through 编码器 (最低延迟)
export VIDEO_ENCODER_TYPE=passthrough
```

### 高端设备配置

```bash
# 提高质量
export VIDEO_WIDTH=1920
export VIDEO_HEIGHT=1080
export VIDEO_FRAMERATE=30
export VIDEO_BITRATE=4000000  # 4 Mbps

# 使用 VP8 编码器
export VIDEO_ENCODER_TYPE=vp8
```

### 生产环境优化

```bash
# 启用日志文件
export ENABLE_FILE_LOGGING=true
export LOG_FILE=/var/log/media-service.log

# 启用 Prometheus 监控
# 访问 http://localhost:30006/metrics

# 使用 PM2 进程管理
pm2 start media-service --name media-service --max-memory-restart 1G

# 配置日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
```

---

## 下一步

恭喜！你已成功部署 WebRTC 媒体流功能。

**继续学习:**

1. 📖 阅读[完整实施指南](./WEBRTC_IMPLEMENTATION_GUIDE.md)
2. 🔧 查看[高级配置选项](./WEBRTC_IMPLEMENTATION_GUIDE.md#配置参数)
3. 📊 设置[监控和指标](./WEBRTC_IMPLEMENTATION_GUIDE.md#监控和调试)
4. 🚀 部署到[生产环境](../../../docs/deployment.md)

**获取帮助:**

- GitHub Issues: https://github.com/your-org/next-cloudphone/issues
- 文档: [CLAUDE.md](../../../CLAUDE.md)
- API 文档: [API Reference](./WEBRTC_IMPLEMENTATION_GUIDE.md#api-参考)

---

## 检查清单

使用此清单确保一切正常运行：

- [ ] FFmpeg 已安装并支持 VP8/Opus
- [ ] ADB 已安装且可以连接设备
- [ ] 编码器测试通过
- [ ] 管道示例运行成功
- [ ] Media Service 启动正常
- [ ] API 端点响应正常
- [ ] WebSocket 连接成功
- [ ] 前端播放器显示画面
- [ ] 统计信息正确显示
- [ ] 网络质量指示器工作正常

如果所有项目都打勾，说明部署成功！🎉
