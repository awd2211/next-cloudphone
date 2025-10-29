package encoder

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/cloudphone/media-service/internal/capture"
	"github.com/sirupsen/logrus"
)

// WorkerPool manages a pool of encoding workers for concurrent frame processing
type WorkerPool struct {
	workers       int
	inputQueue    chan *capture.Frame
	outputQueue   chan *EncodedFrame
	encoderFactory func() (VideoEncoder, error)
	running       atomic.Bool
	cancel        context.CancelFunc
	wg            sync.WaitGroup
	logger        *logrus.Logger
	stats         WorkerPoolStats
	mu            sync.RWMutex
}

// EncodedFrame represents an encoded frame with metadata
type EncodedFrame struct {
	Data      []byte
	Timestamp time.Time
	Duration  time.Duration
	FrameID   uint64
	Error     error
}

// WorkerPoolStats contains statistics about the worker pool
type WorkerPoolStats struct {
	TotalFramesProcessed uint64
	TotalFramesEncoded   uint64
	TotalFramesFailed    uint64
	TotalBytesEncoded    uint64
	AverageEncodingTime  time.Duration
	WorkerUtilization    float64 // Percentage of time workers are busy
}

// WorkerPoolOptions contains configuration for worker pool
type WorkerPoolOptions struct {
	Workers        int                           // Number of worker goroutines
	InputBuffer    int                           // Input queue buffer size
	OutputBuffer   int                           // Output queue buffer size
	EncoderFactory func() (VideoEncoder, error)  // Factory function to create encoders
	Logger         *logrus.Logger
}

// NewWorkerPool creates a new worker pool for concurrent encoding
func NewWorkerPool(options WorkerPoolOptions) (*WorkerPool, error) {
	if options.Workers <= 0 {
		options.Workers = 4 // Default 4 workers
	}
	if options.InputBuffer <= 0 {
		options.InputBuffer = 10
	}
	if options.OutputBuffer <= 0 {
		options.OutputBuffer = 20
	}
	if options.EncoderFactory == nil {
		return nil, fmt.Errorf("encoder factory is required")
	}
	if options.Logger == nil {
		options.Logger = logrus.New()
	}

	return &WorkerPool{
		workers:        options.Workers,
		inputQueue:     make(chan *capture.Frame, options.InputBuffer),
		outputQueue:    make(chan *EncodedFrame, options.OutputBuffer),
		encoderFactory: options.EncoderFactory,
		logger:         options.Logger,
	}, nil
}

// Start starts the worker pool
func (wp *WorkerPool) Start(ctx context.Context) error {
	if wp.running.Load() {
		return fmt.Errorf("worker pool already running")
	}

	poolCtx, cancel := context.WithCancel(ctx)
	wp.cancel = cancel
	wp.running.Store(true)

	// Start worker goroutines
	for i := 0; i < wp.workers; i++ {
		wp.wg.Add(1)
		go wp.worker(poolCtx, i)
	}

	wp.logger.WithField("workers", wp.workers).Info("Worker pool started")

	return nil
}

// Stop stops the worker pool and waits for all workers to finish
func (wp *WorkerPool) Stop() error {
	if !wp.running.Load() {
		return fmt.Errorf("worker pool not running")
	}

	wp.running.Store(false)
	if wp.cancel != nil {
		wp.cancel()
	}

	// Close input queue to signal workers to stop
	close(wp.inputQueue)

	// Wait for all workers to finish
	wp.wg.Wait()

	// Close output queue
	close(wp.outputQueue)

	wp.logger.WithFields(logrus.Fields{
		"frames_processed": wp.stats.TotalFramesProcessed,
		"frames_encoded":   wp.stats.TotalFramesEncoded,
		"frames_failed":    wp.stats.TotalFramesFailed,
	}).Info("Worker pool stopped")

	return nil
}

// SubmitFrame submits a frame for encoding (non-blocking)
func (wp *WorkerPool) SubmitFrame(frame *capture.Frame) error {
	if !wp.running.Load() {
		return fmt.Errorf("worker pool not running")
	}

	select {
	case wp.inputQueue <- frame:
		return nil
	default:
		// Queue full, drop frame
		atomic.AddUint64(&wp.stats.TotalFramesFailed, 1)
		return fmt.Errorf("input queue full, frame dropped")
	}
}

// GetOutputQueue returns the output queue for reading encoded frames
func (wp *WorkerPool) GetOutputQueue() <-chan *EncodedFrame {
	return wp.outputQueue
}

// GetStats returns worker pool statistics
func (wp *WorkerPool) GetStats() WorkerPoolStats {
	wp.mu.RLock()
	defer wp.mu.RUnlock()
	return wp.stats
}

// IsRunning returns true if worker pool is active
func (wp *WorkerPool) IsRunning() bool {
	return wp.running.Load()
}

// worker is the main worker goroutine that processes frames
func (wp *WorkerPool) worker(ctx context.Context, workerID int) {
	defer wp.wg.Done()

	// Create encoder for this worker
	encoder, err := wp.encoderFactory()
	if err != nil {
		wp.logger.WithError(err).WithField("worker_id", workerID).Error("Failed to create encoder")
		return
	}
	defer encoder.Close()

	wp.logger.WithField("worker_id", workerID).Debug("Worker started")

	for {
		select {
		case <-ctx.Done():
			wp.logger.WithField("worker_id", workerID).Debug("Worker stopped by context")
			return

		case frame, ok := <-wp.inputQueue:
			if !ok {
				// Input queue closed
				wp.logger.WithField("worker_id", workerID).Debug("Worker stopped: input queue closed")
				return
			}

			if frame == nil {
				continue
			}

			// Process frame
			encodedFrame := wp.processFrame(frame, encoder, workerID)

			// Send to output queue (non-blocking)
			select {
			case wp.outputQueue <- encodedFrame:
				// Successfully sent
			default:
				// Output queue full, drop frame
				atomic.AddUint64(&wp.stats.TotalFramesFailed, 1)
				wp.logger.WithField("worker_id", workerID).Warn("Output queue full, dropping encoded frame")
			}
		}
	}
}

// processFrame encodes a single frame
func (wp *WorkerPool) processFrame(frame *capture.Frame, encoder VideoEncoder, workerID int) *EncodedFrame {
	atomic.AddUint64(&wp.stats.TotalFramesProcessed, 1)

	startTime := time.Now()

	// Encode frame
	data, err := encoder.Encode(frame)
	encodingTime := time.Since(startTime)

	// Update average encoding time
	wp.mu.Lock()
	if wp.stats.AverageEncodingTime == 0 {
		wp.stats.AverageEncodingTime = encodingTime
	} else {
		// Exponential moving average
		wp.stats.AverageEncodingTime = (wp.stats.AverageEncodingTime*9 + encodingTime) / 10
	}
	wp.mu.Unlock()

	if err != nil {
		atomic.AddUint64(&wp.stats.TotalFramesFailed, 1)
		wp.logger.WithError(err).WithField("worker_id", workerID).Warn("Frame encoding failed")
		return &EncodedFrame{
			Timestamp: frame.Timestamp,
			Duration:  frame.Duration,
			Error:     err,
		}
	}

	atomic.AddUint64(&wp.stats.TotalFramesEncoded, 1)
	atomic.AddUint64(&wp.stats.TotalBytesEncoded, uint64(len(data)))

	return &EncodedFrame{
		Data:      data,
		Timestamp: frame.Timestamp,
		Duration:  frame.Duration,
		FrameID:   wp.stats.TotalFramesEncoded,
		Error:     nil,
	}
}

// SetWorkerCount dynamically adjusts the number of workers (requires restart)
func (wp *WorkerPool) SetWorkerCount(count int) error {
	if count <= 0 || count > 16 {
		return fmt.Errorf("invalid worker count: %d (must be 1-16)", count)
	}

	if wp.running.Load() {
		return fmt.Errorf("cannot change worker count while running")
	}

	wp.workers = count
	return nil
}

// GetWorkerCount returns the current number of workers
func (wp *WorkerPool) GetWorkerCount() int {
	return wp.workers
}
