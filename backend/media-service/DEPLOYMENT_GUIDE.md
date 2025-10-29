# Media Service 部署指南

本指南帮助你在生产环境中部署经过 P0+P1 优化的 Media Service。

---

## 目录

- [1. 准备工作](#1-准备工作)
- [2. 部署架构](#2-部署架构)
- [3. 安装步骤](#3-安装步骤)
- [4. 配置优化](#4-配置优化)
- [5. 监控和调试](#5-监控和调试)
- [6. 故障排查](#6-故障排查)
- [7. 性能调优](#7-性能调优)
- [8. 生产环境检查清单](#8-生产环境检查清单)

---

## 1. 准备工作

### 1.1 系统要求

**最低要求:**
- OS: Linux (Ubuntu 20.04+ / CentOS 8+ / Debian 11+)
- CPU: 4 核心 (8 核心推荐)
- RAM: 8GB (16GB 推荐)
- 存储: 50GB SSD
- 网络: 100Mbps (1Gbps 推荐)

**推荐配置 (生产环境):**
- OS: Ubuntu 22.04 LTS
- CPU: 16 核心 (支持硬件视频编码)
- RAM: 32GB
- 存储: 200GB NVMe SSD
- 网络: 1Gbps+ 专线

### 1.2 硬件加速支持

**NVIDIA GPU (NVENC):**
```bash
# 检查 NVIDIA GPU
lspci | grep -i nvidia

# 安装 NVIDIA 驱动
sudo apt-get install nvidia-driver-525

# 验证
nvidia-smi
```

**Intel QuickSync (QSV):**
```bash
# 检查 Intel GPU
lspci | grep -i vga

# 安装 Intel Media SDK
sudo apt-get install intel-media-va-driver-non-free
```

**AMD VA-API:**
```bash
# 安装 VA-API 驱动
sudo apt-get install mesa-va-drivers libva-drm2
```

### 1.3 依赖软件

```bash
# 更新系统
sudo apt-get update && sudo apt-get upgrade -y

# 安装编译工具
sudo apt-get install -y build-essential git curl wget

# 安装 Go 1.21+
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# 验证 Go 安装
go version

# 安装 FFmpeg (with hardware acceleration)
sudo apt-get install -y ffmpeg \
    libvpx-dev \
    libopus-dev \
    libx264-dev \
    libx265-dev \
    vainfo \
    intel-media-va-driver-non-free

# 验证 FFmpeg 编解码器
ffmpeg -codecs | grep -E "h264|vp8|opus"
ffmpeg -encoders | grep -E "h264_nvenc|h264_qsv|h264_vaapi"

# 安装 ADB (Android Debug Bridge)
sudo apt-get install -y android-tools-adb android-tools-fastboot

# 验证 ADB
adb version

# 安装 Docker (用于 Redroid)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 验证 Docker
docker --version
```

---

## 2. 部署架构

### 2.1 推荐架构

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer (Nginx)                │
│                 SSL Termination + HTTP/2                │
└──────────────┬──────────────────────────┬───────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────┐      ┌──────────────────────┐
│  Media Service #1    │      │  Media Service #2    │
│  (Primary)           │      │  (Standby)           │
│  - WebRTC Streaming  │      │  - WebRTC Streaming  │
│  - H.264 HW Encoding │      │  - H.264 HW Encoding │
│  - Port: 30006       │      │  - Port: 30007       │
└──────────┬───────────┘      └──────────┬───────────┘
           │                              │
           └──────────────┬───────────────┘
                          │
                          ▼
           ┌─────────────────────────┐
           │   Redroid Containers    │
           │   (Android Devices)     │
           │   Port Range: 5555+     │
           └─────────────────────────┘
                          │
           ┌──────────────┼──────────────┐
           │              │              │
           ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │  Redis   │  │ RabbitMQ │  │  Consul  │
    │  Cache   │  │  Events  │  │ Discovery│
    └──────────┘  └──────────┘  └──────────┘
```

### 2.2 网络拓扑

**端口规划:**
- `30006`: Media Service HTTP/WebSocket API
- `50000-50100`: WebRTC ICE UDP 端口范围
- `5555+`: Redroid 容器 ADB 端口
- `6379`: Redis
- `5672`: RabbitMQ AMQP
- `8500`: Consul HTTP API

**防火墙规则:**
```bash
# 允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 允许 Media Service API
sudo ufw allow 30006/tcp

# 允许 WebRTC UDP 端口
sudo ufw allow 50000:50100/udp

# 启用防火墙
sudo ufw enable
```

---

## 3. 安装步骤

### 3.1 克隆代码

```bash
cd /opt
sudo git clone https://github.com/your-org/next-cloudphone.git
cd next-cloudphone/backend/media-service
```

### 3.2 编译服务

```bash
# 安装 Go 依赖
go mod download

# 编译 (启用优化)
go build -ldflags="-s -w" -o media-service main.go

# 验证编译
./media-service --version

# 可执行文件大小应该在 20-30MB
ls -lh media-service
```

### 3.3 配置环境变量

创建 `/opt/next-cloudphone/backend/media-service/.env`:

```bash
# ============================================
# Media Service 生产环境配置
# ============================================

# 服务配置
PORT=30006
GIN_MODE=release
SERVICE_NAME=media-service
LOG_LEVEL=info
ENABLE_FILE_LOGGING=true
LOG_FILE=/var/log/media-service/app.log

# ============================================
# P0+P1 优化配置 (核心!)
# ============================================

# 采集模式 (H.264 硬件编码路径)
CAPTURE_MODE=screenrecord

# 编码器类型
VIDEO_ENCODER_TYPE=h264

# Worker Pool (并发编码)
USE_WORKER_POOL=true
WORKER_COUNT=4
WORKER_INPUT_BUFFER=10
WORKER_OUTPUT_BUFFER=20

# ============================================
# WebRTC 配置
# ============================================

# STUN 服务器 (公网部署使用 Google STUN,内网可以搭建 coturn)
STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302

# ICE 端口范围
ICE_PORT_MIN=50000
ICE_PORT_MAX=50100

# NAT 1:1 映射 (如果在 NAT 后面,填写公网 IP)
# NAT_1TO1_IPS=<your-public-ip>

# ============================================
# 视频编码配置
# ============================================

# 分辨率 (根据设备调整)
VIDEO_WIDTH=1280
VIDEO_HEIGHT=720

# 帧率 (建议 30fps,高端设备可以 60fps)
VIDEO_FRAMERATE=30

# 码率 (根据网络带宽调整)
VIDEO_BITRATE=2000000  # 2 Mbps

# H.264 编码器参数
H264_PRESET=faster      # ultrafast/superfast/veryfast/faster/fast/medium
H264_HW_ACCEL=auto      # auto/nvenc/qsv/vaapi/libx264

# ============================================
# 音频编码配置
# ============================================

AUDIO_ENCODER_TYPE=opus
AUDIO_SAMPLE_RATE=48000
AUDIO_CHANNELS=2
AUDIO_BITRATE=64000

# ============================================
# ADB 配置
# ============================================

ADB_PATH=/usr/bin/adb
ADB_CONNECT_TIMEOUT=10s
ADB_COMMAND_TIMEOUT=30s

# ============================================
# 基础设施集成
# ============================================

# Redis (可选,用于会话存储)
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# RabbitMQ (可选,用于事件发布)
RABBITMQ_ENABLED=true
RABBITMQ_URL=amqp://admin:admin123@localhost:5672/cloudphone

# Consul (可选,用于服务发现)
CONSUL_ENABLED=true
CONSUL_HOST=localhost
CONSUL_PORT=8500
CONSUL_HEALTH_CHECK_INTERVAL=10s

# ============================================
# 监控和调试
# ============================================

# Prometheus Metrics
ENABLE_METRICS=true

# pprof 性能分析 (生产环境建议关闭,或者限制访问)
ENABLE_PPROF=true

# Goroutine 监控
GOROUTINE_MONITOR_INTERVAL=30s
GOROUTINE_LEAK_THRESHOLD=20

# 资源监控采集间隔
RESOURCE_MONITOR_INTERVAL=10s

# ============================================
# 性能调优
# ============================================

# 会话清理间隔
SESSION_CLEANUP_INTERVAL=5m
SESSION_INACTIVE_TIMEOUT=30m

# FFmpeg 超时配置
FFMPEG_SHUTDOWN_TIMEOUT=5s

# 管道编码超时
PIPELINE_ENCODING_TIMEOUT=200ms
PIPELINE_WRITING_TIMEOUT=100ms
```

### 3.4 创建系统服务

创建 `/etc/systemd/system/media-service.service`:

```ini
[Unit]
Description=Cloud Phone Media Service
Documentation=https://github.com/your-org/next-cloudphone
After=network.target docker.service redis.service rabbitmq-server.service

[Service]
Type=simple
User=cloudphone
Group=cloudphone
WorkingDirectory=/opt/next-cloudphone/backend/media-service
EnvironmentFile=/opt/next-cloudphone/backend/media-service/.env
ExecStart=/opt/next-cloudphone/backend/media-service/media-service
Restart=on-failure
RestartSec=10s

# 资源限制
LimitNOFILE=65536
LimitNPROC=4096

# 日志
StandardOutput=journal
StandardError=journal
SyslogIdentifier=media-service

[Install]
WantedBy=multi-user.target
```

创建用户和目录:

```bash
# 创建服务用户
sudo useradd -r -s /bin/false cloudphone

# 创建日志目录
sudo mkdir -p /var/log/media-service
sudo chown cloudphone:cloudphone /var/log/media-service

# 设置文件权限
sudo chown -R cloudphone:cloudphone /opt/next-cloudphone/backend/media-service
```

启动服务:

```bash
# 重载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start media-service

# 查看状态
sudo systemctl status media-service

# 设置开机启动
sudo systemctl enable media-service

# 查看日志
sudo journalctl -u media-service -f
```

### 3.5 配置 Nginx 反向代理 (可选)

创建 `/etc/nginx/sites-available/media-service`:

```nginx
upstream media_service {
    # 负载均衡
    server 127.0.0.1:30006 max_fails=3 fail_timeout=30s;
    # server 127.0.0.1:30007 backup;  # 备用节点

    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name media.example.com;

    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/media.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/media.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # WebSocket 配置
    location /api/media/ws {
        proxy_pass http://media_service;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 超时
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # HTTP API
    location /api/media/ {
        proxy_pass http://media_service;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时设置
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 健康检查
    location /health {
        proxy_pass http://media_service;
        access_log off;
    }

    # Prometheus Metrics
    location /metrics {
        proxy_pass http://media_service;

        # 限制访问 (只允许监控服务器)
        allow 10.0.0.0/8;
        deny all;
    }

    # pprof (调试用,生产环境应该限制访问)
    location /debug/pprof/ {
        proxy_pass http://media_service;

        # 限制访问
        allow 10.0.0.100;  # 你的调试机器 IP
        deny all;
    }
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name media.example.com;
    return 301 https://$server_name$request_uri;
}
```

启用配置:

```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/media-service /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

---

## 4. 配置优化

### 4.1 H.264 硬件加速优化

**自动检测硬件编码器:**

```bash
# 检测可用编码器
ffmpeg -hide_banner -encoders | grep h264

# 测试 NVENC (NVIDIA)
ffmpeg -f lavfi -i testsrc=duration=1:size=1280x720:rate=30 \
    -c:v h264_nvenc -preset fast -b:v 2M -f null -

# 测试 QuickSync (Intel)
ffmpeg -f lavfi -i testsrc=duration=1:size=1280x720:rate=30 \
    -c:v h264_qsv -preset fast -b:v 2M -f null -

# 测试 VA-API (AMD/Intel)
ffmpeg -f lavfi -i testsrc=duration=1:size=1280x720:rate=30 \
    -vaapi_device /dev/dri/renderD128 \
    -vf 'format=nv12,hwupload' \
    -c:v h264_vaapi -b:v 2M -f null -
```

**根据硬件设置环境变量:**

```bash
# NVIDIA GPU
export H264_HW_ACCEL=nvenc

# Intel QuickSync
export H264_HW_ACCEL=qsv

# AMD VA-API
export H264_HW_ACCEL=vaapi

# 软件编码 (fallback)
export H264_HW_ACCEL=libx264
```

### 4.2 Worker Pool 调优

**CPU 密集型 (硬件编码):**
```bash
# 使用 CPU 核心数
WORKER_COUNT=8  # 8 核心系统
```

**内存受限:**
```bash
# 减少 Worker 数量
WORKER_COUNT=2
WORKER_INPUT_BUFFER=5
WORKER_OUTPUT_BUFFER=10
```

**高并发场景:**
```bash
# 增加 Buffer 大小
WORKER_COUNT=8
WORKER_INPUT_BUFFER=20
WORKER_OUTPUT_BUFFER=40
```

### 4.3 网络优化

**高延迟网络 (>100ms):**
```bash
# 增加 ICE 超时
export ICE_GATHERING_TIMEOUT=10s

# 降低码率
export VIDEO_BITRATE=1000000  # 1 Mbps
```

**低带宽网络 (<5Mbps):**
```bash
# 降低分辨率和码率
export VIDEO_WIDTH=854
export VIDEO_HEIGHT=480
export VIDEO_FRAMERATE=24
export VIDEO_BITRATE=800000  # 800 Kbps
```

**数据中心内网 (低延迟):**
```bash
# 最高质量
export VIDEO_WIDTH=1920
export VIDEO_HEIGHT=1080
export VIDEO_FRAMERATE=60
export VIDEO_BITRATE=4000000  # 4 Mbps
export H264_PRESET=fast
```

### 4.4 系统级优化

**增加文件描述符限制:**

```bash
# 临时设置
ulimit -n 65536

# 永久设置 /etc/security/limits.conf
cloudphone soft nofile 65536
cloudphone hard nofile 65536
```

**调整网络参数:**

```bash
# /etc/sysctl.conf
net.core.rmem_max = 26214400
net.core.rmem_default = 26214400
net.core.wmem_max = 26214400
net.core.wmem_default = 26214400
net.ipv4.udp_mem = 26214400 26214400 26214400

# 应用设置
sudo sysctl -p
```

---

## 5. 监控和调试

### 5.1 健康检查

```bash
# 基础健康检查
curl http://localhost:30006/health

# 详细健康检查 (包含依赖状态)
curl http://localhost:30006/health/detailed
```

**期望输出:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "uptime": "2h30m15s",
  "dependencies": {
    "redis": "healthy",
    "rabbitmq": "healthy",
    "consul": "healthy",
    "docker": "healthy"
  }
}
```

### 5.2 Prometheus Metrics

**抓取 Metrics:**
```bash
curl http://localhost:30006/metrics
```

**关键指标:**
- `media_service_sessions_total` - 总会话数
- `media_service_active_sessions` - 活跃会话数
- `media_service_pipeline_fps` - 管道 FPS
- `media_service_pipeline_bitrate_bytes` - 管道码率
- `media_service_encoding_errors_total` - 编码错误数
- `media_service_goroutines` - Goroutine 数量
- `media_service_memory_bytes` - 内存使用
- `media_service_cpu_percent` - CPU 使用率

**Grafana Dashboard:**

导入 `infrastructure/monitoring/grafana/dashboards/media-service-dashboard.json`

### 5.3 pprof 性能分析

**CPU Profile (30秒采样):**
```bash
go tool pprof http://localhost:30006/debug/pprof/profile?seconds=30
```

**内存 Profile:**
```bash
go tool pprof http://localhost:30006/debug/pprof/heap
```

**Goroutine 泄露检测:**
```bash
# 查看 Goroutine 数量
curl http://localhost:30006/debug/pprof/goroutine?debug=1 | grep "^goroutine" | wc -l

# 查看 Goroutine 堆栈
curl http://localhost:30006/debug/pprof/goroutine?debug=2
```

**可视化分析:**
```bash
# 生成火焰图
go tool pprof -http=:8080 http://localhost:30006/debug/pprof/profile?seconds=30
```

### 5.4 日志分析

**查看实时日志:**
```bash
# systemd 日志
sudo journalctl -u media-service -f

# 文件日志
tail -f /var/log/media-service/app.log
```

**日志轮转 (logrotate):**

创建 `/etc/logrotate.d/media-service`:

```
/var/log/media-service/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 cloudphone cloudphone
    sharedscripts
    postrotate
        systemctl reload media-service > /dev/null 2>&1 || true
    endscript
}
```

---

## 6. 故障排查

### 6.1 服务无法启动

**检查端口占用:**
```bash
sudo lsof -i :30006
sudo ss -tlnp | grep 30006
```

**检查依赖服务:**
```bash
# Redis
redis-cli ping

# RabbitMQ
sudo rabbitmqctl status

# Consul
curl http://localhost:8500/v1/status/leader
```

**查看启动日志:**
```bash
sudo journalctl -u media-service -n 100 --no-pager
```

### 6.2 WebRTC 连接失败

**检查 STUN 服务器:**
```bash
nc -zv stun.l.google.com 19302
```

**检查 ICE 端口:**
```bash
# 确保 UDP 端口开放
sudo ufw status | grep 50000:50100
```

**查看 ICE 候选:**
```bash
# 查看服务日志中的 ICE 候选
sudo journalctl -u media-service | grep "ice_candidate"
```

### 6.3 编码性能问题

**检查硬件加速器:**
```bash
# NVIDIA
nvidia-smi

# Intel QuickSync
vainfo

# FFmpeg 编码器
ffmpeg -encoders | grep h264
```

**测试编码性能:**
```bash
# 运行性能基准测试
cd /opt/next-cloudphone/backend/media-service
./scripts/benchmark-performance.sh --duration 60
```

### 6.4 内存泄露

**检查内存使用:**
```bash
# 进程内存
ps aux | grep media-service

# pprof Heap
go tool pprof http://localhost:30006/debug/pprof/heap
```

**检查 Goroutine 泄露:**
```bash
# 查看 Goroutine 数量趋势
watch -n 5 'curl -s http://localhost:30006/debug/pprof/goroutine?debug=1 | grep "^goroutine" | wc -l'
```

---

## 7. 性能调优

### 7.1 延迟优化 (目标 <50ms)

```bash
# 最低延迟配置
export CAPTURE_MODE=screenrecord
export VIDEO_ENCODER_TYPE=passthrough
export VIDEO_FRAMERATE=60
export H264_PRESET=ultrafast

# 禁用不必要的中间件
export REDIS_ENABLED=false
export RABBITMQ_ENABLED=false
```

### 7.2 吞吐量优化 (目标 100+ sessions)

```bash
# 高并发配置
export WORKER_COUNT=16
export WORKER_INPUT_BUFFER=30
export WORKER_OUTPUT_BUFFER=60
export SESSION_CLEANUP_INTERVAL=10m

# 增加系统资源限制
ulimit -n 100000
```

### 7.3 质量优化 (高清画质)

```bash
# 高质量配置
export VIDEO_WIDTH=1920
export VIDEO_HEIGHT=1080
export VIDEO_FRAMERATE=60
export VIDEO_BITRATE=5000000
export H264_PRESET=slow
export VIDEO_ENCODER_TYPE=h264
export H264_HW_ACCEL=nvenc
```

### 7.4 资源优化 (节省 CPU/内存)

```bash
# 低资源配置
export VIDEO_WIDTH=854
export VIDEO_HEIGHT=480
export VIDEO_FRAMERATE=24
export VIDEO_BITRATE=800000
export WORKER_COUNT=2
export USE_WORKER_POOL=false
```

---

## 8. 生产环境检查清单

### 8.1 部署前检查

- [ ] Go 1.21+ 已安装
- [ ] FFmpeg 已安装并支持 H.264 硬件编码
- [ ] ADB 已安装
- [ ] Docker 已安装 (用于 Redroid)
- [ ] 所有依赖服务已启动 (Redis, RabbitMQ, Consul)
- [ ] 防火墙规则已配置
- [ ] SSL 证书已安装 (生产环境)
- [ ] 日志目录已创建
- [ ] 系统资源限制已调整

### 8.2 配置检查

- [ ] `.env` 文件已配置
- [ ] `CAPTURE_MODE=screenrecord` (P0 优化)
- [ ] `VIDEO_ENCODER_TYPE=h264` 或 `passthrough`
- [ ] `USE_WORKER_POOL=true` (P1 优化)
- [ ] STUN 服务器已配置
- [ ] ICE 端口范围已设置
- [ ] 硬件加速器已选择 (`H264_HW_ACCEL`)
- [ ] 监控和日志已启用

### 8.3 功能测试

- [ ] 服务启动正常: `systemctl status media-service`
- [ ] 健康检查通过: `curl http://localhost:30006/health`
- [ ] 可以创建 WebRTC 会话
- [ ] 视频流正常播放
- [ ] 音频正常工作
- [ ] WebSocket 连接正常
- [ ] Metrics 可以访问: `curl http://localhost:30006/metrics`

### 8.4 性能测试

- [ ] 运行验证脚本: `./scripts/validate-all-optimizations.sh`
- [ ] 运行性能基准: `./scripts/benchmark-performance.sh`
- [ ] FPS 达到 50-60 (P0+P1)
- [ ] 延迟 <50ms (P1)
- [ ] CPU 使用率 <20% (P1)
- [ ] 无 Goroutine 泄露
- [ ] 无内存泄露

### 8.5 监控设置

- [ ] Prometheus 已配置抓取 Metrics
- [ ] Grafana Dashboard 已导入
- [ ] 告警规则已配置
- [ ] 日志轮转已设置
- [ ] pprof 访问已限制 (只允许管理员)

### 8.6 安全检查

- [ ] 服务运行在非 root 用户
- [ ] 文件权限正确设置
- [ ] 敏感端口已限制访问 (pprof, metrics)
- [ ] SSL/TLS 已启用 (生产环境)
- [ ] API 认证已启用
- [ ] CORS 已正确配置

---

## 快速参考

### 常用命令

```bash
# 服务管理
sudo systemctl start media-service
sudo systemctl stop media-service
sudo systemctl restart media-service
sudo systemctl status media-service

# 日志查看
sudo journalctl -u media-service -f
tail -f /var/log/media-service/app.log

# 健康检查
curl http://localhost:30006/health

# 性能分析
go tool pprof http://localhost:30006/debug/pprof/profile?seconds=30

# Goroutine 检查
curl http://localhost:30006/debug/pprof/goroutine?debug=1 | head -20
```

### 性能指标目标

| 指标 | 基准 | P0 优化 | P1 优化 (目标) |
|------|------|---------|----------------|
| 延迟 | 220-570ms | 50-100ms | 30-50ms |
| FPS | 1.7-4.5 | 20-30 | 50-60 |
| CPU | 80-100% | 30-50% | 10-20% |
| 吞吐量 | 12.7 fps | 40-50 fps | 80-100 fps |

### 故障排查流程

```
1. 检查服务状态 → systemctl status media-service
2. 查看日志 → journalctl -u media-service -n 100
3. 检查健康状态 → curl /health/detailed
4. 检查依赖服务 → Redis/RabbitMQ/Consul
5. 检查资源使用 → top, free, df -h
6. 性能分析 → pprof CPU/Memory/Goroutine
7. 网络检查 → STUN/ICE/防火墙
```

---

## 获取帮助

- **文档**: [README.md](./README.md)
- **快速开始**: [QUICKSTART.md](./QUICKSTART.md)
- **实施指南**: [WEBRTC_IMPLEMENTATION_GUIDE.md](./WEBRTC_IMPLEMENTATION_GUIDE.md)
- **优化日志**: [OPTIMIZATION_LOG.md](./OPTIMIZATION_LOG.md)
- **P0 完成报告**: [P0_OPTIMIZATION_COMPLETE.md](./P0_OPTIMIZATION_COMPLETE.md)
- **P1 完成报告**: [P1_OPTIMIZATION_COMPLETE.md](./P1_OPTIMIZATION_COMPLETE.md)

---

**部署成功！** 🎉

你现在已经部署了一个经过 P0+P1 优化的高性能 Media Service,可以支持:
- 30-50ms 超低延迟
- 50-60 FPS 高帧率
- H.264 硬件加速编码
- 并发 Worker Pool 处理
- 完整的监控和调试支持
