// Test program for Recording functionality
// Directly tests ScrcpyCapture -> Recording Manager (H.264 passthrough)
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/cloudphone/media-service/internal/capture"
	"github.com/cloudphone/media-service/internal/recording"
	"github.com/sirupsen/logrus"
	"go.uber.org/zap"
)

func main() {
	// Flags
	deviceID := flag.String("device", "192.168.102.113:5555", "ADB device ID")
	adbPath := flag.String("adb", "adb", "Path to ADB executable")
	scrcpyServer := flag.String("scrcpy", "/home/eric/next-cloudphone/backend/media-service/bin/scrcpy-server", "Path to scrcpy-server.jar")
	duration := flag.Int("duration", 10, "Recording duration in seconds")
	outputDir := flag.String("output", "./recordings", "Output directory for recordings")
	fps := flag.Int("fps", 30, "Frame rate")
	maxSize := flag.Int("max-size", 720, "Max video dimension (0 for original)")
	flag.Parse()

	// Setup logrus logger
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp:   true,
		TimestampFormat: "15:04:05.000",
	})

	// Setup zap logger for recording manager
	zapLogger, _ := zap.NewDevelopment()
	defer zapLogger.Sync()

	logger.Info("=== 录像功能测试 (H.264 直录) ===")
	logger.Infof("设备: %s", *deviceID)
	logger.Infof("输出目录: %s", *outputDir)
	logger.Infof("帧率: %d fps", *fps)
	logger.Infof("最大尺寸: %d", *maxSize)
	logger.Infof("测试时长: %d 秒", *duration)

	// Check scrcpy-server exists
	if _, err := os.Stat(*scrcpyServer); os.IsNotExist(err) {
		logger.Fatalf("scrcpy-server 不存在: %s", *scrcpyServer)
	}

	// Create output directory
	if err := os.MkdirAll(*outputDir, 0755); err != nil {
		logger.Fatalf("创建输出目录失败: %v", err)
	}

	// Setup context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle signals
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		logger.Info("收到中断信号，正在停止...")
		cancel()
	}()

	// Step 1: Create and start scrcpy capture
	logger.Info("📱 启动屏幕捕获...")
	cap := capture.NewScrcpyCapture(*adbPath, *scrcpyServer, logger)

	captureOptions := capture.CaptureOptions{
		DeviceID:  *deviceID,
		Width:     *maxSize,
		Height:    0, // Auto height
		FrameRate: *fps,
		Quality:   80,
		Format:    capture.FrameFormatH264,
	}

	if err := cap.Start(ctx, captureOptions); err != nil {
		logger.Fatalf("启动捕获失败: %v", err)
	}
	defer cap.Stop()

	// Wait for first frame to get actual resolution
	frameCh := cap.GetFrameChannel()
	var actualWidth, actualHeight int

	logger.Info("等待第一帧...")
	select {
	case firstFrame := <-frameCh:
		actualWidth = firstFrame.Width
		actualHeight = firstFrame.Height
		if actualWidth == 0 {
			actualWidth = 720
		}
		if actualHeight == 0 {
			actualHeight = 1280
		}
		logger.Infof("分辨率: %dx%d", actualWidth, actualHeight)
	case <-time.After(10 * time.Second):
		logger.Fatal("等待第一帧超时")
	case <-ctx.Done():
		logger.Fatal("上下文取消")
	}

	// Step 2: Create Recording Manager (with H264 support in WebM)
	logger.Info("📹 创建录像管理器...")
	absOutputDir, _ := filepath.Abs(*outputDir)

	// Note: The recording manager uses VP8 by default, but we can test the frame writing path
	// For H.264 recording, we would need to modify WebM writer to use H264 codec
	recordingManager, err := recording.NewManager(
		recording.WithStoragePath(absOutputDir),
		recording.WithLogger(zapLogger),
		recording.WithNumShards(4),
	)
	if err != nil {
		logger.Fatalf("创建录像管理器失败: %v", err)
	}

	// Step 3: Wait for SPS/PPS (needed for H.264 CodecPrivate)
	logger.Info("等待 SPS/PPS...")
	var sps, pps []byte
	waitDeadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(waitDeadline) {
		sps, pps = cap.GetSPSPPS()
		if sps != nil && pps != nil {
			logger.Infof("获取到 SPS (%d bytes) 和 PPS (%d bytes)", len(sps), len(pps))
			break
		}
		// Continue reading frames to get SPS/PPS
		select {
		case <-frameCh:
		case <-time.After(100 * time.Millisecond):
		}
	}
	if sps == nil || pps == nil {
		logger.Warn("未获取到 SPS/PPS，录像可能无法正确播放")
	}

	// Step 4: Start recording with H.264 codec
	logger.Info("🔴 开始录像 (H.264 编解码器)...")
	sessionID := fmt.Sprintf("test-%d", time.Now().Unix())
	rec, err := recordingManager.StartRecording(ctx, recording.StartRecordingRequest{
		SessionID:   sessionID,
		DeviceID:    *deviceID,
		Format:      recording.FormatWebM,
		Codec:       "H264", // 使用 H.264 编解码器，与 scrcpy 输出匹配
		MaxDuration: *duration + 30, // Add buffer
		SPS:         sps, // H.264 SPS NAL unit for CodecPrivate
		PPS:         pps, // H.264 PPS NAL unit for CodecPrivate
	}, actualWidth, actualHeight)
	if err != nil {
		logger.Fatalf("开始录像失败: %v", err)
	}

	logger.Infof("录像 ID: %s", rec.ID)
	logger.Infof("文件路径: %s", rec.FilePath)

	// Step 5: Process frames
	var totalFrames int64
	var totalBytes int64
	var keyFrames int64
	var configFrames int64
	startTime := time.Now()
	lastReport := time.Now()
	testDone := time.After(time.Duration(*duration) * time.Second)

	logger.Info("开始处理帧...")

	frameCount := uint64(0)
frameLoop:
	for {
		select {
		case <-ctx.Done():
			logger.Info("上下文取消")
			break frameLoop

		case <-testDone:
			logger.Info("录像时间到")
			break frameLoop

		case frame, ok := <-frameCh:
			if !ok {
				logger.Warn("帧通道已关闭")
				break frameLoop
			}

			totalFrames++
			totalBytes += int64(len(frame.Data))

			// Analyze H.264 NAL type
			keyframe := false
			if len(frame.Data) > 4 {
				nalType := frame.Data[4] & 0x1F
				switch nalType {
				case 5: // IDR frame
					keyFrames++
					keyframe = true
				case 7, 8: // SPS, PPS
					configFrames++
				}
			}

			// Calculate timestamp
			frameCount++
			timestamp := time.Duration(frameCount) * time.Second / time.Duration(*fps)

			// Write H.264 frame directly to recording
			// Note: This writes H.264 to a VP8 container, which is technically incorrect
			// but tests the frame writing path. For production, we need codec matching.
			if err := recordingManager.WriteFrame(rec.ID, frame.Data, timestamp, keyframe); err != nil {
				logger.Errorf("写入帧失败: %v", err)
			}

			// Report progress every 2 seconds
			if time.Since(lastReport) >= 2*time.Second {
				elapsed := time.Since(startTime).Seconds()
				inputFPS := float64(totalFrames) / elapsed
				inputBitrate := float64(totalBytes) * 8 / elapsed / 1000

				// Get current recording info
				currentRec, _ := recordingManager.GetRecording(rec.ID)
				var framesWritten, bytesWritten uint64
				if currentRec != nil {
					framesWritten = currentRec.FramesWritten
					bytesWritten = currentRec.BytesWritten
				}

				logger.Infof("📊 进度: 输入 %d 帧 (%.1f FPS, %d 关键帧), 写入 %d 帧 (%d KB), %.1f kbps",
					totalFrames, inputFPS, keyFrames, framesWritten, bytesWritten/1024, inputBitrate)
				lastReport = time.Now()
			}
		}
	}

	// Step 6: Stop recording
	logger.Info("⏹️ 停止录像...")
	finalRec, err := recordingManager.StopRecording(rec.ID)
	if err != nil {
		logger.Errorf("停止录像失败: %v", err)
	}

	// Final statistics
	elapsed := time.Since(startTime).Seconds()
	logger.Info("=== 最终统计 ===")
	logger.Infof("输入帧数: %d (关键帧: %d, 配置帧: %d)", totalFrames, keyFrames, configFrames)
	logger.Infof("输入字节: %d KB", totalBytes/1024)
	if finalRec != nil {
		logger.Infof("写入帧数: %d", finalRec.FramesWritten)
		logger.Infof("写入字节: %d KB", finalRec.BytesWritten/1024)
		logger.Infof("文件大小: %d KB", finalRec.FileSize/1024)
		logger.Infof("录像时长: %.2f 秒", finalRec.Duration.Seconds())
		logger.Infof("录像状态: %s", finalRec.State)
		logger.Infof("文件路径: %s", finalRec.FilePath)
	}
	logger.Infof("测试时长: %.1f 秒", elapsed)

	// Verify file exists and has content
	if finalRec != nil {
		if info, err := os.Stat(finalRec.FilePath); err == nil {
			logger.Infof("✅ 录像文件存在: %s (%d bytes)", finalRec.FilePath, info.Size())
			if info.Size() > 1000 {
				logger.Info("✅ 录像测试成功！H.264 帧数据已写入 WebM 文件。")
				logger.Info("   使用 ffprobe 验证: ffprobe -v error -show_streams " + finalRec.FilePath)
				logger.Info("   使用 ffplay 播放: ffplay " + finalRec.FilePath)
			} else {
				logger.Warn("⚠️ 录像文件较小，可能只有头部")
			}
		} else {
			logger.Errorf("❌ 录像文件不存在: %v", err)
		}
	}

	logger.Info("测试完成!")
}
