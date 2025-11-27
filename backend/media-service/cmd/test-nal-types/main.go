// Test scrcpy NAL type analysis to understand why no IDR frames
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
	deviceID := flag.String("device", "192.168.102.113:5555", "ADB device ID")
	adbPath := flag.String("adb", "adb", "Path to ADB")
	scrcpyServer := flag.String("scrcpy", "/home/eric/next-cloudphone/backend/media-service/bin/scrcpy-server", "Path to scrcpy-server")
	duration := flag.Int("duration", 10, "Test duration in seconds")
	flag.Parse()

	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp:   true,
		TimestampFormat: "15:04:05.000",
	})

	logger.Infof("=== Scrcpy NAL Type Analysis ===")
	logger.Infof("Device: %s", *deviceID)
	logger.Infof("Duration: %d seconds", *duration)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		cancel()
	}()

	// Create capture
	cap := capture.NewScrcpyCapture(*adbPath, *scrcpyServer, logger)
	
	options := capture.CaptureOptions{
		DeviceID:  *deviceID,
		Width:     720,
		FrameRate: 30,
	}

	if err := cap.Start(ctx, options); err != nil {
		logger.Fatalf("Failed to start capture: %v", err)
	}
	defer cap.Stop()

	frameCh := cap.GetFrameChannel()
	
	// NAL type counters
	nalTypeCounts := make(map[int]int)
	var totalFrames int64
	var keyframeCount int64 // Counter for frames with Keyframe=true
	startTime := time.Now()
	testDone := time.After(time.Duration(*duration) * time.Second)

	logger.Info("Analyzing NAL types...")

frameLoop:
	for {
		select {
		case <-ctx.Done():
			break frameLoop
		case <-testDone:
			break frameLoop
		case frame, ok := <-frameCh:
			if !ok {
				break frameLoop
			}
			totalFrames++

			// Check Frame.Keyframe flag from scrcpy protocol
			if frame.Keyframe {
				keyframeCount++
				if keyframeCount == 1 {
					logger.Infof("✅ First frame with Keyframe=true detected (size: %d bytes)", len(frame.Data))
				}
			}

			// Analyze NAL type
			if len(frame.Data) > 4 {
				nalTypeIdx := 4
				if frame.Data[2] == 1 {
					nalTypeIdx = 3
				}
				if nalTypeIdx < len(frame.Data) {
					nalType := int(frame.Data[nalTypeIdx] & 0x1F)
					nalTypeCounts[nalType]++

					// Log first occurrence of each NAL type
					if nalTypeCounts[nalType] == 1 {
						logger.Infof("First NAL type %d detected (size: %d bytes)", nalType, len(frame.Data))
					}
				}
			}
		}
	}

	elapsed := time.Since(startTime).Seconds()
	logger.Info("")
	logger.Info("=== NAL Type Analysis Results ===")
	logger.Infof("Total frames: %d", totalFrames)
	logger.Infof("Duration: %.1f seconds", elapsed)
	logger.Infof("FPS: %.1f", float64(totalFrames)/elapsed)
	logger.Info("")
	logger.Info("NAL Type Breakdown:")
	
	nalTypeNames := map[int]string{
		1:  "Non-IDR Slice (P/B frame)",
		2:  "Slice Data Partition A",
		3:  "Slice Data Partition B",
		4:  "Slice Data Partition C",
		5:  "IDR Slice (Keyframe) ★",
		6:  "SEI (Supplemental Enhancement Info)",
		7:  "SPS (Sequence Parameter Set)",
		8:  "PPS (Picture Parameter Set)",
		9:  "Access Unit Delimiter",
		10: "End of Sequence",
		11: "End of Stream",
		12: "Filler Data",
	}
	
	for nalType, count := range nalTypeCounts {
		name := nalTypeNames[nalType]
		if name == "" {
			name = "Unknown"
		}
		logger.Infof("  Type %2d: %4d frames - %s", nalType, count, name)
	}

	// Check for keyframe flag from scrcpy protocol
	logger.Info("")
	logger.Info("=== Frame.Keyframe Flag Analysis ===")
	if keyframeCount > 0 {
		logger.Infof("✅ Frames with Keyframe=true: %d (%.1f%%)", keyframeCount, float64(keyframeCount)/float64(totalFrames)*100)
	} else {
		logger.Warn("❌ No frames with Keyframe=true detected!")
	}

	// Check for IDR frames (NAL type)
	logger.Info("")
	logger.Info("=== NAL Type IDR Analysis ===")
	if nalTypeCounts[5] > 0 {
		logger.Infof("✅ IDR frames (NAL type 5): %d (%.1f%%)", nalTypeCounts[5], float64(nalTypeCounts[5])/float64(totalFrames)*100)
	} else {
		logger.Warn("❌ No IDR frames (NAL type 5) detected!")
		logger.Warn("This is the root cause of recording playback issues.")
		logger.Info("")
		logger.Info("Possible solutions:")
		logger.Info("1. Disable raw_stream_mode to get keyframe flags from scrcpy protocol")
		logger.Info("2. Request IDR frame from encoder via scrcpy control")
		logger.Info("3. Force first frame as keyframe in WebM container")
	}

	// Summary
	if keyframeCount > 0 && nalTypeCounts[5] > 0 {
		logger.Info("")
		logger.Info("✅ Recording should work correctly with proper keyframe detection!")
	}
}
