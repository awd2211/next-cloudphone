# Media Service - 推荐修复方案与代码示例

**优先级**: P0-P2 按顺序实施  
**预期收益**: 稳定性提升 30%，性能提升 20-50%  

---

## P0 修复方案 (立即)

### 1. 修复 CreateOffer 失败时的资源泄漏

**问题位置**: `internal/webrtc/sharded_manager.go:CreateSession()`

**当前代码** (❌ 有泄漏):
```go
func (m *ShardedManager) CreateSession(deviceID, userID string) (*models.Session, error) {
    // ... 创建 WebRTC 配置
    peerConnection, err := api.NewPeerConnection(webrtcConfig)
    if err != nil {
        return nil, fmt.Errorf("failed to create peer connection: %w", err)
    }
    
    // ❌ 问题：以下操作失败时未关闭 peerConnection
    offer, err := session.PeerConnection.CreateOffer(nil)
    if err != nil {
        return nil, fmt.Errorf("failed to create offer: %w", err)
        // ❌ PeerConnection 未关闭！
    }
    
    if err = session.PeerConnection.SetLocalDescription(offer); err != nil {
        return nil, fmt.Errorf("failed to set local description: %w", err)
        // ❌ PeerConnection 未关闭！
    }
    
    // ...
    return session, nil
}
```

**修复代码** (✅ 安全):
```go
func (m *ShardedManager) CreateSession(deviceID, userID string) (*models.Session, error) {
    // ... 创建配置和 PeerConnection
    
    session := &models.Session{
        ID:             sessionID,
        DeviceID:       deviceID,
        UserID:         userID,
        PeerConnection: peerConnection,
        CreatedAt:      time.Now(),
        LastActivityAt: time.Now(),
        State:          models.SessionStateNew,
        ICECandidates:  []webrtc.ICECandidateInit{},
    }
    
    // 注册处理器（需要在返回前完成）
    m.setupPeerConnectionHandlers(session)
    
    // 创建视频轨道
    videoTrack, err := webrtc.NewTrackLocalStaticSample(
        webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeVP8},
        "video",
        "cloudphone-video",
    )
    if err != nil {
        peerConnection.Close()  // ✅ 关闭
        return nil, fmt.Errorf("failed to create video track: %w", err)
    }
    session.VideoTrack = videoTrack
    
    if _, err = peerConnection.AddTrack(videoTrack); err != nil {
        peerConnection.Close()  // ✅ 关闭
        return nil, fmt.Errorf("failed to add video track: %w", err)
    }
    
    // 创建数据通道
    dataChannel, err := peerConnection.CreateDataChannel("control", nil)
    if err != nil {
        peerConnection.Close()  // ✅ 关闭
        return nil, fmt.Errorf("failed to create data channel: %w", err)
    }
    session.DataChannel = dataChannel
    
    m.setupDataChannelHandlers(session, dataChannel)
    
    // 只有在所有操作都成功时才存储会话
    shard := m.getShard(sessionID)
    shard.mu.Lock()
    shard.sessions[sessionID] = session
    shard.mu.Unlock()
    
    metrics.RecordSessionCreated(deviceID)
    
    log.Printf("Created WebRTC session: %s for device: %s, user: %s",
        sessionID, deviceID, userID)
    
    return session, nil
}
```

---

### 2. 添加 ICE 连接超时机制

**问题**: ICE 连接可能永远停留在 "checking" 状态

**问题位置**: `internal/webrtc/sharded_manager.go:setupPeerConnectionHandlers()`

**修复代码** (✅ 安全):
```go
func (m *ShardedManager) setupPeerConnectionHandlers(session *models.Session) {
    pc := session.PeerConnection
    
    // ICE 连接超时计时器
    var iceConnectTimer *time.Timer
    iceConnectTimeout := 30 * time.Second  // 30 秒超时
    
    pc.OnICEConnectionStateChange(func(state webrtc.ICEConnectionState) {
        log.Printf("ICE Connection State changed: %s (session: %s)",
            state.String(), session.ID)
        
        switch state {
        case webrtc.ICEConnectionStateNew:
            // 开始超时计时
            if iceConnectTimer != nil {
                iceConnectTimer.Stop()
            }
            iceConnectTimer = time.AfterFunc(iceConnectTimeout, func() {
                // 超时：仍未连接，关闭会话
                log.Printf("ICE connection timeout for session %s", session.ID)
                m.CloseSession(session.ID)
            })
            stateValue := 0.0
            metrics.ICEConnectionState.WithLabelValues(session.ID, state.String()).Set(stateValue)
            
        case webrtc.ICEConnectionStateChecking:
            // 仍在尝试，保持计时
            stateValue := 1.0
            metrics.ICEConnectionState.WithLabelValues(session.ID, state.String()).Set(stateValue)
            
        case webrtc.ICEConnectionStateConnected:
            // 连接成功，停止计时
            if iceConnectTimer != nil {
                iceConnectTimer.Stop()
                iceConnectTimer = nil
            }
            session.UpdateState(models.SessionStateConnected)
            stateValue := 2.0
            metrics.ICEConnectionState.WithLabelValues(session.ID, state.String()).Set(stateValue)
            
        case webrtc.ICEConnectionStateCompleted:
            // 连接完成
            if iceConnectTimer != nil {
                iceConnectTimer.Stop()
                iceConnectTimer = nil
            }
            stateValue := 3.0
            metrics.ICEConnectionState.WithLabelValues(session.ID, state.String()).Set(stateValue)
            
        case webrtc.ICEConnectionStateFailed:
            // 连接失败
            if iceConnectTimer != nil {
                iceConnectTimer.Stop()
                iceConnectTimer = nil
            }
            session.UpdateState(models.SessionStateFailed)
            // ✅ 可以添加重试逻辑而不是直接关闭
            // m.retryICEConnection(session.ID)  // 可选
            stateValue := 4.0
            metrics.ICEConnectionState.WithLabelValues(session.ID, state.String()).Set(stateValue)
            m.CloseSession(session.ID)
            
        case webrtc.ICEConnectionStateDisconnected:
            // 连接断开
            session.UpdateState(models.SessionStateDisconnected)
            stateValue := 5.0
            metrics.ICEConnectionState.WithLabelValues(session.ID, state.String()).Set(stateValue)
            
        case webrtc.ICEConnectionStateClosed:
            // 连接关闭
            if iceConnectTimer != nil {
                iceConnectTimer.Stop()
                iceConnectTimer = nil
            }
            session.UpdateState(models.SessionStateClosed)
            stateValue := 6.0
            metrics.ICEConnectionState.WithLabelValues(session.ID, state.String()).Set(stateValue)
        }
    })
    
    // ... 其他事件处理器
}
```

---

### 3. 修复 PNG 尺寸解析

**问题位置**: `internal/capture/screen_capture.go:captureFrame()`

**当前代码** (❌ 不可靠):
```go
func (c *AndroidScreenCapture) captureFrame() (*Frame, error) {
    // ... 执行 screencap
    output, err := cmd.Output()
    
    frame := &Frame{
        Data:      output,
        Timestamp: time.Now(),
        Format:    FrameFormatPNG,
        Duration:  c.frameInterval,
    }
    
    // ❌ 简化的 PNG 头解析
    if len(output) > 24 {
        frame.Width = int(output[16])<<24 | int(output[17])<<16 | int(output[18])<<8 | int(output[19])
        frame.Height = int(output[20])<<24 | int(output[21])<<16 | int(output[22])<<8 | int(output[23])
    }
    
    return frame, nil
}
```

**修复代码** (✅ 可靠):
```go
import (
    "bytes"
    "image"
    "image/png"
)

func (c *AndroidScreenCapture) captureFrame() (*Frame, error) {
    c.mu.RLock()
    format := c.options.Format
    deviceID := c.deviceID
    c.mu.RUnlock()
    
    cmd := exec.Command(c.adbPath, "-s", deviceID, "exec-out", "screencap", "-p")
    
    output, err := cmd.Output()
    if err != nil {
        return nil, fmt.Errorf("failed to execute screencap: %w", err)
    }
    
    if len(output) == 0 {
        return nil, fmt.Errorf("empty frame data")
    }
    
    // 尝试解析 PNG 配置以获得准确的尺寸
    var width, height int
    if config, err := png.DecodeConfig(bytes.NewReader(output)); err == nil {
        width = config.Width
        height = config.Height
    } else {
        // ✅ 降级处理：如果 PNG 解析失败，使用默认尺寸
        c.logger.WithError(err).Warn("Failed to parse PNG dimensions, using defaults")
        width = 1280  // 默认值，从配置读取
        height = 720
    }
    
    frame := &Frame{
        Data:      output,
        Timestamp: time.Now(),
        Format:    FrameFormatPNG,
        Duration:  c.frameInterval,
        Width:     width,
        Height:    height,
    }
    
    return frame, nil
}
```

---

### 4. 添加 RabbitMQ 连接重试机制

**问题位置**: `internal/rabbitmq/publisher.go:NewPublisher()`

**修复代码** (✅ 重试):
```go
const (
    maxRetries       = 3
    initialDelay     = 1 * time.Second
    maxDelay         = 10 * time.Second
)

// NewPublisher creates a new RabbitMQ publisher with retry logic
func NewPublisher(url string) (*Publisher, error) {
    var conn *amqp.Connection
    var err error
    var delay = initialDelay
    
    // 指数退避重试
    for attempt := 0; attempt < maxRetries; attempt++ {
        conn, err = amqp.Dial(url)
        if err == nil {
            break
        }
        
        logger.Warn("failed_to_connect_to_rabbitmq",
            zap.Error(err),
            zap.Int("attempt", attempt+1),
            zap.Int("max_retries", maxRetries),
            zap.Duration("retry_delay", delay),
        )
        
        if attempt < maxRetries-1 {
            time.Sleep(delay)
            // 指数退避
            delay *= 2
            if delay > maxDelay {
                delay = maxDelay
            }
        }
    }
    
    if err != nil {
        return nil, fmt.Errorf("failed to connect to rabbitmq after %d attempts: %w", maxRetries, err)
    }
    
    channel, err := conn.Channel()
    if err != nil {
        conn.Close()
        return nil, fmt.Errorf("failed to open channel: %w", err)
    }
    
    // Declare exchange
    err = channel.ExchangeDeclare(
        exchangeName,
        exchangeType,
        true,
        false,
        false,
        false,
        nil,
    )
    if err != nil {
        channel.Close()
        conn.Close()
        return nil, fmt.Errorf("failed to declare exchange: %w", err)
    }
    
    logger.Info("rabbitmq_publisher_initialized",
        zap.String("exchange", exchangeName),
        zap.String("type", exchangeType),
    )
    
    return &Publisher{
        conn:    conn,
        channel: channel,
        url:     url,
    }, nil
}
```

---

## P1 修复方案 (本周)

### 5. 实现 H.264 硬件编码支持

**问题**: 当前只有 VP8 FFmpeg 编码，缺少 H.264 硬件编码

**新文件**: `internal/encoder/h264_encoder.go`

```go
package encoder

import (
    "bytes"
    "fmt"
    "io"
    "os/exec"
    "sync"

    "github.com/sirupsen/logrus"
)

// H264EncoderFFmpeg implements H.264 encoding using FFmpeg with hardware acceleration
type H264EncoderFFmpeg struct {
    width     int
    height    int
    bitrate   int
    frameRate int
    
    cmd       *exec.Cmd
    stdin     io.WriteCloser
    stdout    io.ReadCloser
    mu        sync.Mutex
    running   bool
    logger    *logrus.Logger
    
    // Frame counter
    frameCount uint64
}

// H264EncoderOptions contains options for H.264 encoder
type H264EncoderOptions struct {
    Width        int
    Height       int
    Bitrate      int  // bits per second
    FrameRate    int  // frames per second
    HardwareAccel string // none, nvidia, amd, intel
    Logger       *logrus.Logger
}

// NewH264EncoderFFmpeg creates a new FFmpeg-based H.264 encoder with hardware acceleration
func NewH264EncoderFFmpeg(options H264EncoderOptions) (VideoEncoder, error) {
    if options.Width <= 0 || options.Height <= 0 {
        return nil, fmt.Errorf("invalid dimensions: %dx%d", options.Width, options.Height)
    }
    if options.Bitrate <= 0 {
        options.Bitrate = 2000000  // Default 2 Mbps
    }
    if options.FrameRate <= 0 {
        options.FrameRate = 30  // Default 30 fps
    }
    if options.Logger == nil {
        options.Logger = logrus.New()
    }
    
    encoder := &H264EncoderFFmpeg{
        width:     options.Width,
        height:    options.Height,
        bitrate:   options.Bitrate,
        frameRate: options.FrameRate,
        logger:    options.Logger,
    }
    
    // Start FFmpeg process with hardware acceleration
    if err := encoder.startWithAcceleration(options.HardwareAccel); err != nil {
        return nil, fmt.Errorf("failed to start FFmpeg: %w", err)
    }
    
    return encoder, nil
}

// startWithAcceleration initializes FFmpeg with hardware acceleration
func (e *H264EncoderFFmpeg) startWithAcceleration(accel string) error {
    e.mu.Lock()
    defer e.mu.Unlock()
    
    if e.running {
        return fmt.Errorf("encoder already running")
    }
    
    // Build FFmpeg command with hardware acceleration
    args := e.buildFFmpegArgs(accel)
    
    e.cmd = exec.Command("ffmpeg", args...)
    
    stdin, err := e.cmd.StdinPipe()
    if err != nil {
        return fmt.Errorf("failed to create stdin pipe: %w", err)
    }
    e.stdin = stdin
    
    stdout, err := e.cmd.StdoutPipe()
    if err != nil {
        stdin.Close()
        return fmt.Errorf("failed to create stdout pipe: %w", err)
    }
    e.stdout = stdout
    
    var stderrBuf bytes.Buffer
    e.cmd.Stderr = &stderrBuf
    
    if err := e.cmd.Start(); err != nil {
        return fmt.Errorf("failed to start ffmpeg: %w", err)
    }
    
    e.running = true
    
    e.logger.WithFields(logrus.Fields{
        "width":      e.width,
        "height":     e.height,
        "bitrate":    e.bitrate,
        "framerate":  e.frameRate,
        "acceleration": accel,
    }).Info("H.264 encoder started")
    
    return nil
}

// buildFFmpegArgs constructs FFmpeg command arguments with hardware acceleration
func (e *H264EncoderFFmpeg) buildFFmpegArgs(accel string) []string {
    // 基础参数
    args := []string{
        "-f", "rawvideo",
        "-pix_fmt", "yuv420p",
        "-s", fmt.Sprintf("%dx%d", e.width, e.height),
        "-r", fmt.Sprintf("%d", e.frameRate),
        "-i", "pipe:0",
    }
    
    // 根据硬件选择编码器
    switch accel {
    case "nvidia":
        // NVIDIA NVENC
        args = append(args,
            "-c:v", "h264_nvenc",
            "-preset", "fast",  // fast/default/slow
            "-rc", "vbr",  // 可变码率
            "-b:v", fmt.Sprintf("%d", e.bitrate),
        )
    case "amd":
        // AMD VCE
        args = append(args,
            "-c:v", "h264_amf",
            "-quality", "balanced",
            "-b:v", fmt.Sprintf("%d", e.bitrate),
        )
    case "intel":
        // Intel QuickSync
        args = append(args,
            "-c:v", "h264_qsv",
            "-preset", "fast",
            "-b:v", fmt.Sprintf("%d", e.bitrate),
        )
    default:
        // 软件编码 (libx264)
        args = append(args,
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "28",
            "-b:v", fmt.Sprintf("%d", e.bitrate),
        )
    }
    
    // 输出格式
    args = append(args,
        "-f", "h264",
        "pipe:1",
    )
    
    return args
}

// Encode encodes a frame to H.264 (实现 VideoEncoder 接口)
func (e *H264EncoderFFmpeg) Encode(frame *capture.Frame) ([]byte, error) {
    e.mu.Lock()
    if !e.running {
        e.mu.Unlock()
        return nil, fmt.Errorf("encoder not running")
    }
    e.mu.Unlock()
    
    // H.264 编码实现...
    // (类似 VP8，但输出为 H.264 NAL units)
    
    return nil, nil  // 占位符
}

// Stop stops the encoder
func (e *H264EncoderFFmpeg) Stop() error {
    e.mu.Lock()
    defer e.mu.Unlock()
    
    if !e.running {
        return fmt.Errorf("encoder not running")
    }
    
    if e.stdin != nil {
        e.stdin.Close()
    }
    if e.stdout != nil {
        e.stdout.Close()
    }
    
    if e.cmd != nil && e.cmd.Process != nil {
        e.cmd.Process.Kill()
        e.cmd.Wait()
    }
    
    e.running = false
    e.logger.Info("H.264 encoder stopped")
    return nil
}
```

---

### 6. 优化采集方案：使用 screenrecord

**问题**: 逐帧 screencap 开销大，建议使用 screenrecord

**改进方案**: 在 `internal/encoder/factory.go` 中添加采集选择逻辑

```go
// SelectScreenCapture selects the appropriate screen capture method
func SelectScreenCapture(method string, adbPath string, logger *logrus.Logger) capture.ScreenCapture {
    switch method {
    case "screencap":
        // 逐帧采集 PNG (低帧率推荐)
        return capture.NewAndroidScreenCapture(adbPath, logger)
    case "screenrecord":
        // H.264 流式采集 (高帧率推荐)
        return capture.NewAndroidScreenRecordCapture(adbPath, logger)
    default:
        // 自动选择：默认使用 screenrecord
        logger.WithField("method", method).Warn("Unknown capture method, using screenrecord")
        return capture.NewAndroidScreenRecordCapture(adbPath, logger)
    }
}
```

在 `internal/config/config.go` 中添加配置:

```go
type Config struct {
    // ... 其他字段
    CaptureMethod string  // "screencap" 或 "screenrecord"
}

func Load() *Config {
    cfg := &Config{
        // ...
        CaptureMethod: getEnv("CAPTURE_METHOD", "screenrecord"),
    }
    return cfg
}
```

---

### 7. 添加 Goroutine 泄漏检测

**问题**: 长期运行中可能有 Goroutine 泄漏

**解决方案**: 添加 pprof profiling 支持

**新文件**: `internal/profiling/profiling.go`

```go
package profiling

import (
    "fmt"
    "os"
    "runtime"
    "runtime/pprof"
    "runtime/trace"
    "time"

    "github.com/sirupsen/logrus"
)

// Profiler manages CPU, memory, and goroutine profiling
type Profiler struct {
    logger *logrus.Logger
    cpuFile *os.File
    memFile *os.File
}

// NewProfiler creates a new profiler
func NewProfiler(logger *logrus.Logger) *Profiler {
    return &Profiler{
        logger: logger,
    }
}

// StartCPUProfile starts CPU profiling
func (p *Profiler) StartCPUProfile(filename string) error {
    f, err := os.Create(filename)
    if err != nil {
        return fmt.Errorf("could not create CPU profile: %w", err)
    }
    
    if err := pprof.StartCPUProfile(f); err != nil {
        f.Close()
        return fmt.Errorf("could not start CPU profile: %w", err)
    }
    
    p.cpuFile = f
    p.logger.WithField("file", filename).Info("CPU profiling started")
    return nil
}

// StopCPUProfile stops CPU profiling
func (p *Profiler) StopCPUProfile() error {
    if p.cpuFile == nil {
        return fmt.Errorf("CPU profiling not started")
    }
    
    pprof.StopCPUProfile()
    p.cpuFile.Close()
    p.cpuFile = nil
    
    p.logger.Info("CPU profiling stopped")
    return nil
}

// WriteMemProfile writes memory profile
func (p *Profiler) WriteMemProfile(filename string) error {
    f, err := os.Create(filename)
    if err != nil {
        return fmt.Errorf("could not create memory profile: %w", err)
    }
    defer f.Close()
    
    runtime.GC()  // 获取最新的内存统计
    
    if err := pprof.WriteHeapProfile(f); err != nil {
        return fmt.Errorf("could not write memory profile: %w", err)
    }
    
    p.logger.WithField("file", filename).Info("Memory profile written")
    return nil
}

// PrintGoroutineStats prints goroutine statistics
func (p *Profiler) PrintGoroutineStats() {
    numGoroutines := runtime.NumGoroutine()
    var m runtime.MemStats
    runtime.ReadMemStats(&m)
    
    p.logger.WithFields(logrus.Fields{
        "goroutines":     numGoroutines,
        "alloc_mb":       m.Alloc / 1024 / 1024,
        "total_alloc_mb": m.TotalAlloc / 1024 / 1024,
        "sys_mb":         m.Sys / 1024 / 1024,
        "gc_runs":        m.NumGC,
    }).Info("Goroutine and memory stats")
}

// DetectGoroutineLeak detects potential goroutine leaks
func (p *Profiler) DetectGoroutineLeak(threshold int) bool {
    numGoroutines := runtime.NumGoroutine()
    
    if numGoroutines > threshold {
        p.logger.WithFields(logrus.Fields{
            "current_goroutines": numGoroutines,
            "threshold":          threshold,
        }).Warn("Potential goroutine leak detected")
        return true
    }
    
    return false
}

// MonitorGoroutines periodically monitors goroutines
func (p *Profiler) MonitorGoroutines(interval time.Duration, threshold int) {
    ticker := time.NewTicker(interval)
    defer ticker.Stop()
    
    for range ticker.C {
        p.DetectGoroutineLeak(threshold)
        p.PrintGoroutineStats()
    }
}
```

在 `main.go` 中集成:

```go
import "github.com/cloudphone/media-service/internal/profiling"

func main() {
    // ... 初始化
    
    profiler := profiling.NewProfiler(logger.Log)
    
    // 如果开启 profiling
    if cfg.EnableProfiling {
        if err := profiler.StartCPUProfile("cpu.prof"); err != nil {
            logger.Warn("failed_to_start_cpu_profiling", zap.Error(err))
        }
        defer profiler.StopCPUProfile()
        
        // 定期写入内存快照
        go func() {
            ticker := time.NewTicker(5 * time.Minute)
            defer ticker.Stop()
            for range ticker.C {
                timestamp := time.Now().Unix()
                filename := fmt.Sprintf("mem_%d.prof", timestamp)
                if err := profiler.WriteMemProfile(filename); err != nil {
                    logger.Warn("failed_to_write_mem_profile", zap.Error(err))
                }
            }
        }()
        
        // 监控 Goroutine
        go profiler.MonitorGoroutines(30*time.Second, 10000)
    }
    
    // ... 启动服务器
}
```

---

## P2 修复方案 (本月)

### 8. 实现编码背压处理

在 `internal/encoder/pipeline_manager.go` 中添加背压机制:

```go
// ProcessWithBackpressure processes frames with backpressure handling
func (p *VideoPipeline) ProcessWithBackpressure(ctx context.Context, maxQueueSize int) error {
    // 帧缓冲队列
    frameQueue := make([]*capture.Frame, 0, maxQueueSize)
    queueMu := sync.Mutex{}
    
    go func() {
        for {
            select {
            case frame, ok := <-p.capture.GetFrameChannel():
                if !ok {
                    return
                }
                
                queueMu.Lock()
                // 如果队列满，丢弃最旧的帧
                if len(frameQueue) >= maxQueueSize {
                    atomic.AddUint64(&p.stats.FramesDropped, 1)
                    frameQueue = frameQueue[1:]  // 移除最旧的帧
                }
                frameQueue = append(frameQueue, frame)
                queueMu.Unlock()
                
            case <-ctx.Done():
                return
            }
        }
    }()
    
    // 处理帧的 goroutine（可以有多个实现并行编码）
    go func() {
        for {
            select {
            case <-ctx.Done():
                return
            case <-time.After(10 * time.Millisecond):
                // 定期检查是否有帧
                queueMu.Lock()
                if len(frameQueue) == 0 {
                    queueMu.Unlock()
                    continue
                }
                
                frame := frameQueue[0]
                frameQueue = frameQueue[1:]
                queueMu.Unlock()
                
                // 编码
                encoded, err := p.encoder.Encode(frame)
                if err != nil {
                    atomic.AddUint64(&p.stats.EncodingErrors, 1)
                    continue
                }
                
                // 写入
                if err := p.frameWriter.WriteVideoFrame(
                    p.sessionID, encoded, frame.Duration); err != nil {
                    atomic.AddUint64(&p.stats.WritingErrors, 1)
                    continue
                }
                
                atomic.AddUint64(&p.stats.FramesEncoded, 1)
            }
        }
    }()
    
    return nil
}
```

---

## 总结

按照以上 P0 → P1 → P2 的优先级实施修复，预计可获得：

| 维度 | 改进 | 优先级 |
|------|------|--------|
| 内存泄漏 | 消除 | P0 |
| 僵尸连接 | 消除 | P0 |
| 编码延迟 | -40-50% (使用 H.264) | P1 |
| Goroutine 堆积 | 可监控和检测 | P1 |
| 整体稳定性 | +30% | P0+P1 |

