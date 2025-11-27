// Test program for ScrcpyCapture adapter
package main

import (
	"context"
	"flag"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/cloudphone/media-service/internal/capture"
	"github.com/sirupsen/logrus"
)

func main() {
	// Flags
	deviceID := flag.String("device", "192.168.102.113:5555", "ADB device ID")
	adbPath := flag.String("adb", "adb", "Path to ADB executable")
	scrcpyServer := flag.String("scrcpy", "/home/eric/next-cloudphone/backend/media-service/bin/scrcpy-server", "Path to scrcpy-server.jar")
	duration := flag.Int("duration", 5, "Test duration in seconds")
	flag.Parse()

	// Setup logger
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp:   true,
		TimestampFormat: "15:04:05.000",
	})

	logger.Info("=== scrcpy 捕获器测试 ===")
	logger.Infof("设备: %s", *deviceID)
	logger.Infof("ADB: %s", *adbPath)
	logger.Infof("scrcpy-server: %s", *scrcpyServer)
	logger.Infof("测试时长: %d 秒", *duration)

	// Check scrcpy-server exists
	if _, err := os.Stat(*scrcpyServer); os.IsNotExist(err) {
		logger.Fatalf("scrcpy-server 不存在: %s", *scrcpyServer)
	}

	// Create capture
	cap := capture.NewScrcpyCapture(*adbPath, *scrcpyServer, logger)

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

	// Configure capture options
	options := capture.CaptureOptions{
		DeviceID:   *deviceID,
		Width:      720,  // Will be adjusted by scrcpy
		Height:     0,    // Auto
		FrameRate:  30,
		Quality:    80,
		Format:     capture.FrameFormatH264,
	}

	// Start capture
	logger.Info("启动 scrcpy 捕获...")
	if err := cap.Start(ctx, options); err != nil {
		logger.Fatalf("启动失败: %v", err)
	}

	// Get frame channel
	frameCh := cap.GetFrameChannel()

	// Statistics
	var totalFrames int64
	var totalBytes int64
	var keyFrames int64
	var configFrames int64
	startTime := time.Now()
	lastReport := time.Now()

	// Timeout for test
	testDone := time.After(time.Duration(*duration) * time.Second)

	logger.Info("开始接收 H.264 帧...")

	for {
		select {
		case <-ctx.Done():
			goto done

		case <-testDone:
			logger.Info("测试时间到")
			goto done

		case frame, ok := <-frameCh:
			if !ok {
				logger.Warn("帧通道已关闭")
				goto done
			}

			totalFrames++
			totalBytes += int64(len(frame.Data))

			// Check frame type from H.264 NAL
			if len(frame.Data) > 4 {
				nalType := frame.Data[4] & 0x1F
				switch nalType {
				case 5: // IDR
					keyFrames++
				case 7, 8: // SPS, PPS
					configFrames++
				}
			}

			// Report every 2 seconds
			if time.Since(lastReport) >= 2*time.Second {
				elapsed := time.Since(startTime).Seconds()
				fps := float64(totalFrames) / elapsed
				bitrate := float64(totalBytes) * 8 / elapsed / 1000 // kbps

				logger.Infof("📊 统计: %d 帧 (%.1f FPS), %d 关键帧, %d 配置帧, %.1f kbps",
					totalFrames, fps, keyFrames, configFrames, bitrate)
				lastReport = time.Now()
			}
		}
	}

done:
	// Stop capture
	logger.Info("停止捕获...")
	cap.Stop()

	// Final statistics
	elapsed := time.Since(startTime).Seconds()
	if elapsed > 0 {
		fps := float64(totalFrames) / elapsed
		bitrate := float64(totalBytes) * 8 / elapsed / 1000

		logger.Info("=== 最终统计 ===")
		logger.Infof("总帧数: %d", totalFrames)
		logger.Infof("关键帧: %d", keyFrames)
		logger.Infof("配置帧: %d", configFrames)
		logger.Infof("总数据: %.2f KB", float64(totalBytes)/1024)
		logger.Infof("平均帧率: %.1f FPS", fps)
		logger.Infof("平均码率: %.1f kbps", bitrate)
		logger.Infof("测试时长: %.1f 秒", elapsed)

		// Get SPS/PPS
		if scrcpyCap, ok := cap.(*capture.ScrcpyCapture); ok {
			sps, pps := scrcpyCap.GetSPSPPS()
			logger.Infof("SPS: %d bytes, PPS: %d bytes", len(sps), len(pps))
		}
	}

	// Get capture stats
	stats := cap.GetStats()
	logger.Infof("捕获统计: 帧数=%d, 错误=%d, 丢帧=%d",
		stats.FramesCaptured, stats.Errors, stats.FramesDropped)

	logger.Info("测试完成!")
}
