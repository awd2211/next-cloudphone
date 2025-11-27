package adaptive

import (
	"fmt"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

// NetworkQuality represents network quality metrics
type NetworkQuality struct {
	RTT           time.Duration // Round-trip time
	PacketLoss    float64       // Packet loss rate (0-1)
	Jitter        time.Duration // Jitter
	Bandwidth     uint64        // Available bandwidth in bps
	Timestamp     time.Time     // When this was measured
}

// QualityLevel represents the current quality level
type QualityLevel int

const (
	QualityLevelLow QualityLevel = iota
	QualityLevelMedium
	QualityLevelHigh
	QualityLevelUltra
)

func (q QualityLevel) String() string {
	switch q {
	case QualityLevelLow:
		return "Low"
	case QualityLevelMedium:
		return "Medium"
	case QualityLevelHigh:
		return "High"
	case QualityLevelUltra:
		return "Ultra"
	default:
		return "Unknown"
	}
}

// QualitySettings contains encoding parameters for a quality level
type QualitySettings struct {
	Level       QualityLevel
	Bitrate     int // bits per second
	FrameRate   int // frames per second
	Width       int // pixels
	Height      int // pixels
	Description string
}

// Predefined quality levels
var (
	QualityPresetLow = QualitySettings{
		Level:       QualityLevelLow,
		Bitrate:     500000, // 500 kbps
		FrameRate:   15,
		Width:       640,
		Height:      360,
		Description: "Low quality (360p @ 15fps)",
	}

	QualityPresetMedium = QualitySettings{
		Level:       QualityLevelMedium,
		Bitrate:     1000000, // 1 Mbps
		FrameRate:   24,
		Width:       854,
		Height:      480,
		Description: "Medium quality (480p @ 24fps)",
	}

	QualityPresetHigh = QualitySettings{
		Level:       QualityLevelHigh,
		Bitrate:     2000000, // 2 Mbps
		FrameRate:   30,
		Width:       1280,
		Height:      720,
		Description: "High quality (720p @ 30fps)",
	}

	QualityPresetUltra = QualitySettings{
		Level:       QualityLevelUltra,
		Bitrate:     4000000, // 4 Mbps
		FrameRate:   30,
		Width:       1920,
		Height:      1080,
		Description: "Ultra quality (1080p @ 30fps)",
	}
)

// BitrateAdjuster is a callback interface for dynamic bitrate control
// Implementations should apply the bitrate change to the underlying encoder/capture
type BitrateAdjuster interface {
	// SetBitrate adjusts the video bitrate (in bps)
	SetBitrate(bitrate int) error
}

// BitrateAdjusterFunc is a function adapter for BitrateAdjuster
type BitrateAdjusterFunc func(bitrate int) error

func (f BitrateAdjusterFunc) SetBitrate(bitrate int) error {
	return f(bitrate)
}

// QualityController manages adaptive quality adjustment
type QualityController struct {
	sessionID        string
	currentQuality   QualitySettings
	targetQuality    QualitySettings
	networkHistory   []NetworkQuality
	maxHistoryLength int
	mu               sync.RWMutex
	logger           *logrus.Logger

	// Thresholds
	rttThresholdGood    time.Duration
	rttThresholdPoor    time.Duration
	lossThresholdGood   float64
	lossThresholdPoor   float64
	bandwidthMultiplier float64

	// Adaptation parameters
	adaptationInterval time.Duration
	lastAdaptation     time.Time
	cooldownPeriod     time.Duration

	// Bitrate adjustment callback
	bitrateAdjuster BitrateAdjuster

	// Statistics
	adaptationCount  uint64 // Number of quality adaptations
	bitrateUpCount   uint64 // Number of bitrate increases
	bitrateDownCount uint64 // Number of bitrate decreases
}

// QualityControllerOptions contains options for creating a quality controller
type QualityControllerOptions struct {
	SessionID           string
	InitialQuality      QualitySettings
	MaxHistoryLength    int
	RTTThresholdGood    time.Duration
	RTTThresholdPoor    time.Duration
	LossThresholdGood   float64
	LossThresholdPoor   float64
	BandwidthMultiplier float64
	AdaptationInterval  time.Duration
	CooldownPeriod      time.Duration
	Logger              *logrus.Logger
}

// NewQualityController creates a new quality controller
func NewQualityController(options QualityControllerOptions) *QualityController {
	if options.MaxHistoryLength <= 0 {
		options.MaxHistoryLength = 10
	}
	if options.RTTThresholdGood == 0 {
		options.RTTThresholdGood = 50 * time.Millisecond
	}
	if options.RTTThresholdPoor == 0 {
		options.RTTThresholdPoor = 200 * time.Millisecond
	}
	if options.LossThresholdGood == 0 {
		options.LossThresholdGood = 0.01 // 1%
	}
	if options.LossThresholdPoor == 0 {
		options.LossThresholdPoor = 0.05 // 5%
	}
	if options.BandwidthMultiplier == 0 {
		options.BandwidthMultiplier = 0.8 // Use 80% of available bandwidth
	}
	if options.AdaptationInterval == 0 {
		options.AdaptationInterval = 5 * time.Second
	}
	if options.CooldownPeriod == 0 {
		options.CooldownPeriod = 10 * time.Second
	}
	if options.Logger == nil {
		options.Logger = logrus.New()
	}

	// Default to high quality
	if options.InitialQuality.Level == 0 {
		options.InitialQuality = QualityPresetHigh
	}

	return &QualityController{
		sessionID:           options.SessionID,
		currentQuality:      options.InitialQuality,
		targetQuality:       options.InitialQuality,
		networkHistory:      make([]NetworkQuality, 0, options.MaxHistoryLength),
		maxHistoryLength:    options.MaxHistoryLength,
		rttThresholdGood:    options.RTTThresholdGood,
		rttThresholdPoor:    options.RTTThresholdPoor,
		lossThresholdGood:   options.LossThresholdGood,
		lossThresholdPoor:   options.LossThresholdPoor,
		bandwidthMultiplier: options.BandwidthMultiplier,
		adaptationInterval:  options.AdaptationInterval,
		cooldownPeriod:      options.CooldownPeriod,
		lastAdaptation:      time.Now(),
		logger:              options.Logger,
	}
}

// UpdateNetworkQuality updates network quality metrics
func (qc *QualityController) UpdateNetworkQuality(quality NetworkQuality) {
	qc.mu.Lock()
	defer qc.mu.Unlock()

	quality.Timestamp = time.Now()

	// Add to history
	qc.networkHistory = append(qc.networkHistory, quality)

	// Trim history if needed
	if len(qc.networkHistory) > qc.maxHistoryLength {
		qc.networkHistory = qc.networkHistory[1:]
	}

	qc.logger.WithFields(logrus.Fields{
		"session_id":  qc.sessionID,
		"rtt":         quality.RTT,
		"packet_loss": quality.PacketLoss,
		"bandwidth":   quality.Bandwidth,
	}).Debug("Network quality updated")
}

// GetCurrentQuality returns the current quality settings
func (qc *QualityController) GetCurrentQuality() QualitySettings {
	qc.mu.RLock()
	defer qc.mu.RUnlock()
	return qc.currentQuality
}

// GetTargetQuality returns the target quality settings
func (qc *QualityController) GetTargetQuality() QualitySettings {
	qc.mu.RLock()
	defer qc.mu.RUnlock()
	return qc.targetQuality
}

// ShouldAdapt determines if adaptation should occur
func (qc *QualityController) ShouldAdapt() bool {
	qc.mu.RLock()
	defer qc.mu.RUnlock()

	// Check if we're in cooldown period
	if time.Since(qc.lastAdaptation) < qc.cooldownPeriod {
		return false
	}

	// Need at least some history
	if len(qc.networkHistory) < 3 {
		return false
	}

	return true
}

// CalculateOptimalQuality calculates the optimal quality based on network conditions
func (qc *QualityController) CalculateOptimalQuality() QualitySettings {
	qc.mu.RLock()
	defer qc.mu.RUnlock()

	if len(qc.networkHistory) == 0 {
		return qc.currentQuality
	}

	// Calculate average metrics
	var avgRTT time.Duration
	var avgLoss float64
	var avgBandwidth uint64

	for _, nq := range qc.networkHistory {
		avgRTT += nq.RTT
		avgLoss += nq.PacketLoss
		avgBandwidth += nq.Bandwidth
	}

	count := len(qc.networkHistory)
	avgRTT /= time.Duration(count)
	avgLoss /= float64(count)
	avgBandwidth /= uint64(count)

	// Determine quality level based on metrics
	score := qc.calculateQualityScore(avgRTT, avgLoss, avgBandwidth)

	var targetQuality QualitySettings

	switch {
	case score >= 80:
		targetQuality = QualityPresetUltra
	case score >= 60:
		targetQuality = QualityPresetHigh
	case score >= 40:
		targetQuality = QualityPresetMedium
	default:
		targetQuality = QualityPresetLow
	}

	qc.logger.WithFields(logrus.Fields{
		"session_id":    qc.sessionID,
		"avg_rtt":       avgRTT,
		"avg_loss":      avgLoss,
		"avg_bandwidth": avgBandwidth,
		"quality_score": score,
		"target_level":  targetQuality.Level.String(),
	}).Info("Calculated optimal quality")

	return targetQuality
}

// calculateQualityScore calculates a quality score (0-100) based on network metrics
func (qc *QualityController) calculateQualityScore(rtt time.Duration, loss float64, bandwidth uint64) float64 {
	// RTT score (0-40 points)
	rttScore := 40.0
	if rtt > qc.rttThresholdPoor {
		rttScore = 0
	} else if rtt > qc.rttThresholdGood {
		// Linear interpolation
		ratio := float64(rtt-qc.rttThresholdGood) / float64(qc.rttThresholdPoor-qc.rttThresholdGood)
		rttScore = 40.0 * (1.0 - ratio)
	}

	// Packet loss score (0-30 points)
	lossScore := 30.0
	if loss > qc.lossThresholdPoor {
		lossScore = 0
	} else if loss > qc.lossThresholdGood {
		// Linear interpolation
		ratio := (loss - qc.lossThresholdGood) / (qc.lossThresholdPoor - qc.lossThresholdGood)
		lossScore = 30.0 * (1.0 - ratio)
	}

	// Bandwidth score (0-30 points)
	bandwidthScore := 30.0
	requiredBandwidth := uint64(qc.currentQuality.Bitrate) / uint64(qc.bandwidthMultiplier)
	if bandwidth < requiredBandwidth/4 {
		bandwidthScore = 0
	} else if bandwidth < requiredBandwidth {
		// Linear interpolation
		ratio := float64(bandwidth) / float64(requiredBandwidth)
		bandwidthScore = 30.0 * ratio
	}

	return rttScore + lossScore + bandwidthScore
}

// SetBitrateAdjuster sets the callback for dynamic bitrate adjustment
// This allows the quality controller to notify the capture/encoder when bitrate changes
func (qc *QualityController) SetBitrateAdjuster(adjuster BitrateAdjuster) {
	qc.mu.Lock()
	defer qc.mu.Unlock()
	qc.bitrateAdjuster = adjuster
}

// Adapt performs quality adaptation
func (qc *QualityController) Adapt() (changed bool, newQuality QualitySettings) {
	if !qc.ShouldAdapt() {
		return false, qc.GetCurrentQuality()
	}

	qc.mu.Lock()
	defer qc.mu.Unlock()

	// Calculate optimal quality
	optimal := qc.calculateOptimalQualityLocked()

	// Check if we need to change
	if optimal.Level == qc.currentQuality.Level {
		return false, qc.currentQuality
	}

	// Track direction of change for statistics
	oldBitrate := qc.currentQuality.Bitrate

	// Update quality
	qc.currentQuality = optimal
	qc.targetQuality = optimal
	qc.lastAdaptation = time.Now()
	qc.adaptationCount++

	// Update statistics
	if optimal.Bitrate > oldBitrate {
		qc.bitrateUpCount++
	} else {
		qc.bitrateDownCount++
	}

	// Apply bitrate change via callback if available
	if qc.bitrateAdjuster != nil {
		if err := qc.bitrateAdjuster.SetBitrate(optimal.Bitrate); err != nil {
			qc.logger.WithError(err).Warn("Failed to apply bitrate adjustment")
		} else {
			qc.logger.WithFields(logrus.Fields{
				"session_id":  qc.sessionID,
				"old_bitrate": oldBitrate,
				"new_bitrate": optimal.Bitrate,
			}).Debug("Bitrate adjustment applied via callback")
		}
	}

	qc.logger.WithFields(logrus.Fields{
		"session_id": qc.sessionID,
		"new_level":  optimal.Level.String(),
		"bitrate":    optimal.Bitrate,
		"fps":        optimal.FrameRate,
		"resolution": fmt.Sprintf("%dx%d", optimal.Width, optimal.Height),
	}).Info("Quality adapted")

	return true, optimal
}

// calculateOptimalQualityLocked is the locked version
func (qc *QualityController) calculateOptimalQualityLocked() QualitySettings {
	if len(qc.networkHistory) == 0 {
		return qc.currentQuality
	}

	// Calculate average metrics
	var avgRTT time.Duration
	var avgLoss float64
	var avgBandwidth uint64

	for _, nq := range qc.networkHistory {
		avgRTT += nq.RTT
		avgLoss += nq.PacketLoss
		avgBandwidth += nq.Bandwidth
	}

	count := len(qc.networkHistory)
	avgRTT /= time.Duration(count)
	avgLoss /= float64(count)
	avgBandwidth /= uint64(count)

	// Determine quality level based on metrics
	score := qc.calculateQualityScore(avgRTT, avgLoss, avgBandwidth)

	var targetQuality QualitySettings

	switch {
	case score >= 80:
		targetQuality = QualityPresetUltra
	case score >= 60:
		targetQuality = QualityPresetHigh
	case score >= 40:
		targetQuality = QualityPresetMedium
	default:
		targetQuality = QualityPresetLow
	}

	return targetQuality
}

// SetManualQuality manually sets the quality level
func (qc *QualityController) SetManualQuality(quality QualitySettings) {
	qc.mu.Lock()
	defer qc.mu.Unlock()

	qc.currentQuality = quality
	qc.targetQuality = quality
	qc.lastAdaptation = time.Now()

	qc.logger.WithFields(logrus.Fields{
		"session_id": qc.sessionID,
		"level":      quality.Level.String(),
	}).Info("Quality set manually")
}

// GetNetworkHistory returns the network quality history
func (qc *QualityController) GetNetworkHistory() []NetworkQuality {
	qc.mu.RLock()
	defer qc.mu.RUnlock()

	// Return a copy
	history := make([]NetworkQuality, len(qc.networkHistory))
	copy(history, qc.networkHistory)
	return history
}

// QualityControllerStats contains statistics about quality adaptations
type QualityControllerStats struct {
	AdaptationCount  uint64 `json:"adaptation_count"`
	BitrateUpCount   uint64 `json:"bitrate_up_count"`
	BitrateDownCount uint64 `json:"bitrate_down_count"`
	CurrentLevel     string `json:"current_level"`
	CurrentBitrate   int    `json:"current_bitrate"`
}

// GetStats returns quality controller statistics
func (qc *QualityController) GetStats() QualityControllerStats {
	qc.mu.RLock()
	defer qc.mu.RUnlock()

	return QualityControllerStats{
		AdaptationCount:  qc.adaptationCount,
		BitrateUpCount:   qc.bitrateUpCount,
		BitrateDownCount: qc.bitrateDownCount,
		CurrentLevel:     qc.currentQuality.Level.String(),
		CurrentBitrate:   qc.currentQuality.Bitrate,
	}
}

// Reset resets the quality controller to initial state
func (qc *QualityController) Reset() {
	qc.mu.Lock()
	defer qc.mu.Unlock()

	qc.networkHistory = qc.networkHistory[:0]
	qc.adaptationCount = 0
	qc.bitrateUpCount = 0
	qc.bitrateDownCount = 0
	qc.lastAdaptation = time.Now()

	qc.logger.WithField("session_id", qc.sessionID).Info("Quality controller reset")
}
