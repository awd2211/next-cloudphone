package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/cloudphone/media-service/internal/adaptive"
	"github.com/cloudphone/media-service/internal/capture"
	"github.com/cloudphone/media-service/internal/encoder"
	"github.com/sirupsen/logrus"
)

// This example demonstrates the complete media pipeline:
// Android Device → Screen Capture → Video Encoder → WebRTC Track

func main() {
	// Parse command line flags
	deviceID := flag.String("device", "", "Android device ID (ADB serial)")
	adbPath := flag.String("adb", "/usr/bin/adb", "Path to ADB executable")
	encoderType := flag.String("encoder", "vp8-simple", "Encoder type (passthrough, vp8, vp8-simple)")
	width := flag.Int("width", 1280, "Video width")
	height := flag.Int("height", 720, "Video height")
	fps := flag.Int("fps", 30, "Frame rate")
	bitrate := flag.Int("bitrate", 2000000, "Video bitrate (bps)")
	duration := flag.Int("duration", 60, "Test duration (seconds)")
	flag.Parse()

	if *deviceID == "" {
		log.Fatal("Device ID is required (use -device flag)")
	}

	// Setup logger
	logger := logrus.New()
	logger.SetLevel(logrus.InfoLevel)
	logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})

	logger.Info("Starting Complete Media Pipeline Example")
	logger.WithFields(logrus.Fields{
		"device":       *deviceID,
		"encoder":      *encoderType,
		"resolution":   fmt.Sprintf("%dx%d", *width, *height),
		"fps":          *fps,
		"bitrate":      *bitrate,
		"duration_sec": *duration,
	}).Info("Configuration")

	// Create context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle interrupt signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		logger.Info("Interrupt received, shutting down...")
		cancel()
	}()

	// Step 1: Create Screen Capture Service
	logger.Info("Step 1: Creating screen capture service")
	screenCapture := capture.NewAndroidScreenCapture(*adbPath, logger)

	captureOptions := capture.CaptureOptions{
		DeviceID:   *deviceID,
		FrameRate:  *fps,
		Format:     capture.FrameFormatPNG,
		BufferSize: 10,
	}

	if err := screenCapture.Start(ctx, captureOptions); err != nil {
		log.Fatalf("Failed to start screen capture: %v", err)
	}
	defer screenCapture.Stop()

	logger.Info("✓ Screen capture started")

	// Step 2: Create Encoder
	logger.Info("Step 2: Creating video encoder")
	encoderFactory := encoder.NewEncoderFactory(logger)

	videoEncoderConfig := encoder.VideoEncoderConfig{
		Type:      encoder.EncoderType(*encoderType),
		Width:     *width,
		Height:    *height,
		Bitrate:   *bitrate,
		FrameRate: *fps,
		Quality:   10,
		Logger:    logger,
	}

	if err := encoder.ValidateVideoEncoderConfig(videoEncoderConfig); err != nil {
		log.Fatalf("Invalid encoder config: %v", err)
	}

	videoEncoder, err := encoderFactory.CreateVideoEncoder(videoEncoderConfig)
	if err != nil {
		log.Fatalf("Failed to create encoder: %v", err)
	}
	defer videoEncoder.Close()

	logger.Info("✓ Video encoder created")

	// Step 3: Create Mock Frame Writer (in real app, this would be WebRTC Manager)
	frameWriter := &MockFrameWriter{
		logger: logger,
	}

	// Step 4: Create Video Pipeline
	logger.Info("Step 3: Creating video pipeline")
	pipeline, err := encoder.NewVideoPipeline(encoder.PipelineOptions{
		SessionID:     "example-session",
		DeviceID:      *deviceID,
		Capture:       screenCapture,
		Encoder:       videoEncoder,
		FrameWriter:   frameWriter,
		TargetFPS:     *fps,
		TargetBitrate: *bitrate,
		AdaptiveMode:  true,
		Logger:        logger,
	})
	if err != nil {
		log.Fatalf("Failed to create pipeline: %v", err)
	}

	if err := pipeline.Start(ctx); err != nil {
		log.Fatalf("Failed to start pipeline: %v", err)
	}
	defer pipeline.Stop()

	logger.Info("✓ Video pipeline started")

	// Step 5: Create Quality Controller (optional)
	logger.Info("Step 4: Creating quality controller")
	qualityController := adaptive.NewQualityController(adaptive.QualityControllerOptions{
		SessionID:      "example-session",
		InitialQuality: adaptive.QualityPresetHigh,
		Logger:         logger,
	})

	logger.Info("✓ Quality controller created")

	// Step 6: Monitor pipeline
	logger.Info("Step 5: Monitoring pipeline")
	logger.Infof("Pipeline will run for %d seconds. Press Ctrl+C to stop early.", *duration)

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	timeout := time.After(time.Duration(*duration) * time.Second)

	for {
		select {
		case <-ctx.Done():
			logger.Info("Context cancelled, stopping...")
			goto cleanup

		case <-timeout:
			logger.Info("Duration reached, stopping...")
			goto cleanup

		case <-ticker.C:
			// Print statistics
			stats := pipeline.GetStats()
			captureStats := screenCapture.GetStats()
			currentQuality := qualityController.GetCurrentQuality()

			logger.WithFields(logrus.Fields{
				"pipeline_fps":        fmt.Sprintf("%.1f", stats.AverageFPS),
				"pipeline_bitrate":    fmt.Sprintf("%.2f Mbps", stats.AverageBitrate/1000000),
				"frames_processed":    stats.FramesProcessed,
				"frames_encoded":      stats.FramesEncoded,
				"frames_dropped":      stats.FramesDropped,
				"encoding_errors":     stats.EncodingErrors,
				"capture_fps":         fmt.Sprintf("%.1f", captureStats.AverageFPS),
				"capture_frames":      captureStats.FramesCaptured,
				"capture_dropped":     captureStats.FramesDropped,
				"quality_level":       currentQuality.Level.String(),
				"mock_frames_written": frameWriter.FramesWritten,
			}).Info("📊 Pipeline Statistics")

			// Simulate network quality updates
			mockNetworkQuality := adaptive.NetworkQuality{
				RTT:        50 * time.Millisecond,
				PacketLoss: 0.01,
				Jitter:     10 * time.Millisecond,
				Bandwidth:  3000000, // 3 Mbps
			}
			qualityController.UpdateNetworkQuality(mockNetworkQuality)

			// Check if quality should adapt
			if changed, newQuality := qualityController.Adapt(); changed {
				logger.WithFields(logrus.Fields{
					"new_level":    newQuality.Level.String(),
					"new_bitrate":  newQuality.Bitrate,
					"new_fps":      newQuality.FrameRate,
					"new_res":      fmt.Sprintf("%dx%d", newQuality.Width, newQuality.Height),
				}).Info("🔄 Quality Adapted")

				// Apply new quality settings to pipeline
				if err := pipeline.SetTargetBitrate(newQuality.Bitrate); err != nil {
					logger.WithError(err).Warn("Failed to set bitrate")
				}
				if err := pipeline.SetTargetFPS(newQuality.FrameRate); err != nil {
					logger.WithError(err).Warn("Failed to set FPS")
				}
			}
		}
	}

cleanup:
	logger.Info("Cleaning up...")

	// Final statistics
	finalStats := pipeline.GetStats()
	finalCaptureStats := screenCapture.GetStats()

	logger.Info("═══════════════════════════════════════")
	logger.Info("          FINAL STATISTICS             ")
	logger.Info("═══════════════════════════════════════")
	logger.WithFields(logrus.Fields{
		"total_frames_processed": finalStats.FramesProcessed,
		"total_frames_encoded":   finalStats.FramesEncoded,
		"total_frames_dropped":   finalStats.FramesDropped,
		"average_fps":            fmt.Sprintf("%.2f", finalStats.AverageFPS),
		"average_bitrate":        fmt.Sprintf("%.2f Mbps", finalStats.AverageBitrate/1000000),
		"total_bytes_processed":  fmt.Sprintf("%.2f MB", float64(finalStats.BytesProcessed)/1024/1024),
		"total_bytes_encoded":    fmt.Sprintf("%.2f MB", float64(finalStats.BytesEncoded)/1024/1024),
		"encoding_errors":        finalStats.EncodingErrors,
		"writing_errors":         finalStats.WritingErrors,
		"pipeline_uptime":        finalStats.Uptime,
	}).Info("Pipeline Stats")

	logger.WithFields(logrus.Fields{
		"frames_captured":     finalCaptureStats.FramesCaptured,
		"frames_dropped":      finalCaptureStats.FramesDropped,
		"bytes_captured":      fmt.Sprintf("%.2f MB", float64(finalCaptureStats.BytesCaptured)/1024/1024),
		"average_frame_size":  fmt.Sprintf("%.2f KB", float64(finalCaptureStats.AverageFrameSize)/1024),
		"average_fps":         fmt.Sprintf("%.2f", finalCaptureStats.AverageFPS),
		"capture_uptime":      finalCaptureStats.Uptime,
		"capture_errors":      finalCaptureStats.Errors,
	}).Info("Capture Stats")

	logger.WithFields(logrus.Fields{
		"frames_written": frameWriter.FramesWritten,
		"bytes_written":  fmt.Sprintf("%.2f MB", float64(frameWriter.BytesWritten)/1024/1024),
	}).Info("Writer Stats")

	logger.Info("═══════════════════════════════════════")
	logger.Info("✓ Pipeline example completed successfully")
}

// MockFrameWriter simulates WebRTC frame writing
type MockFrameWriter struct {
	FramesWritten uint64
	BytesWritten  uint64
	logger        *logrus.Logger
}

func (m *MockFrameWriter) WriteVideoFrame(sessionID string, frame []byte, duration time.Duration) error {
	m.FramesWritten++
	m.BytesWritten += uint64(len(frame))

	// Log every 100th frame
	if m.FramesWritten%100 == 0 {
		m.logger.WithFields(logrus.Fields{
			"session_id":     sessionID,
			"frame_size":     len(frame),
			"frames_written": m.FramesWritten,
		}).Debug("Frame written to mock WebRTC track")
	}

	return nil
}
