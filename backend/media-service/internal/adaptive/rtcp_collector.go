package adaptive

import (
	"context"
	"sync"
	"time"

	"github.com/pion/interceptor"
	"github.com/pion/rtcp"
	"github.com/pion/webrtc/v3"
	"github.com/sirupsen/logrus"
)

// RTCPCollector collects RTCP statistics for quality adaptation
type RTCPCollector struct {
	sessionID      string
	peerConnection *webrtc.PeerConnection
	qualityController *QualityController
	logger         *logrus.Logger

	// Statistics
	mu               sync.RWMutex
	lastRTT          time.Duration
	lastPacketLoss   float64
	lastJitter       time.Duration
	packetsReceived  uint64
	packetsLost      uint64
	bytesReceived    uint64

	// Context and control
	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
}

// NewRTCPCollector creates a new RTCP statistics collector
func NewRTCPCollector(
	sessionID string,
	peerConnection *webrtc.PeerConnection,
	qualityController *QualityController,
	logger *logrus.Logger,
) *RTCPCollector {
	if logger == nil {
		logger = logrus.New()
	}

	ctx, cancel := context.WithCancel(context.Background())

	return &RTCPCollector{
		sessionID:         sessionID,
		peerConnection:    peerConnection,
		qualityController: qualityController,
		logger:            logger,
		ctx:               ctx,
		cancel:            cancel,
	}
}

// Start begins collecting RTCP statistics
func (rc *RTCPCollector) Start() {
	rc.wg.Add(1)
	go rc.collectLoop()

	rc.logger.WithField("session_id", rc.sessionID).Info("RTCP collector started")
}

// Stop stops collecting RTCP statistics
func (rc *RTCPCollector) Stop() {
	rc.cancel()
	rc.wg.Wait()

	rc.logger.WithField("session_id", rc.sessionID).Info("RTCP collector stopped")
}

// collectLoop periodically collects RTCP statistics
func (rc *RTCPCollector) collectLoop() {
	defer rc.wg.Done()

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-rc.ctx.Done():
			return
		case <-ticker.C:
			rc.collectStats()
		}
	}
}

// collectStats collects current statistics from the peer connection
func (rc *RTCPCollector) collectStats() {
	// Get stats from peer connection
	statsReport := rc.peerConnection.GetStats()

	var (
		rtt          time.Duration
		packetLoss   float64
		jitter       time.Duration
		bandwidth    uint64
	)

	// Parse stats report
	for _, stat := range statsReport {
		switch s := stat.(type) {
		case webrtc.InboundRTPStreamStats:
			// Calculate packet loss
			if s.PacketsReceived > 0 {
				totalPackets := s.PacketsReceived + s.PacketsLost
				if totalPackets > 0 {
					packetLoss = float64(s.PacketsLost) / float64(totalPackets)
				}
			}

			// Get jitter
			jitter = time.Duration(s.Jitter * float64(time.Second))

			// Update counters
			rc.mu.Lock()
			rc.packetsReceived = s.PacketsReceived
			rc.packetsLost = s.PacketsLost
			rc.bytesReceived = s.BytesReceived
			rc.mu.Unlock()

		case webrtc.RemoteInboundRTPStreamStats:
			// Get RTT from remote inbound stats
			if s.RoundTripTime != nil {
				rtt = time.Duration(*s.RoundTripTime * float64(time.Second))
			}
		}
	}

	// Estimate bandwidth based on bytes received
	// This is a simple estimation - in production, use more sophisticated methods
	rc.mu.RLock()
	bytesReceived := rc.bytesReceived
	rc.mu.RUnlock()

	// Estimate as bits per 2 seconds (collection interval)
	bandwidth = bytesReceived * 8 / 2 // bps

	// Update statistics
	rc.mu.Lock()
	rc.lastRTT = rtt
	rc.lastPacketLoss = packetLoss
	rc.lastJitter = jitter
	rc.mu.Unlock()

	// Update quality controller
	if rc.qualityController != nil {
		quality := NetworkQuality{
			RTT:        rtt,
			PacketLoss: packetLoss,
			Jitter:     jitter,
			Bandwidth:  bandwidth,
			Timestamp:  time.Now(),
		}

		rc.qualityController.UpdateNetworkQuality(quality)

		// Check if we should adapt
		if changed, newQuality := rc.qualityController.Adapt(); changed {
			rc.logger.WithFields(logrus.Fields{
				"session_id": rc.sessionID,
				"new_level":  newQuality.Level.String(),
				"bitrate":    newQuality.Bitrate,
				"fps":        newQuality.FrameRate,
			}).Info("Quality adaptation triggered")

			// Note: The actual adaptation (changing encoder settings) should be
			// handled by the caller who has access to the encoder/pipeline
		}
	}

	rc.logger.WithFields(logrus.Fields{
		"session_id":  rc.sessionID,
		"rtt":         rtt,
		"packet_loss": packetLoss,
		"jitter":      jitter,
		"bandwidth":   bandwidth,
	}).Debug("RTCP stats collected")
}

// GetCurrentStats returns the current statistics
func (rc *RTCPCollector) GetCurrentStats() (rtt time.Duration, loss float64, jitter time.Duration) {
	rc.mu.RLock()
	defer rc.mu.RUnlock()

	return rc.lastRTT, rc.lastPacketLoss, rc.lastJitter
}

// GetPacketStats returns packet statistics
func (rc *RTCPCollector) GetPacketStats() (received, lost uint64) {
	rc.mu.RLock()
	defer rc.mu.RUnlock()

	return rc.packetsReceived, rc.packetsLost
}

// GetBytesReceived returns total bytes received
func (rc *RTCPCollector) GetBytesReceived() uint64 {
	rc.mu.RLock()
	defer rc.mu.RUnlock()

	return rc.bytesReceived
}

// RTCPInterceptor is a custom interceptor for RTCP packets
type RTCPInterceptor struct {
	interceptor.NoOp
	collector *RTCPCollector
	logger    *logrus.Logger
}

// NewRTCPInterceptor creates a new RTCP interceptor
func NewRTCPInterceptor(collector *RTCPCollector, logger *logrus.Logger) *RTCPInterceptor {
	if logger == nil {
		logger = logrus.New()
	}

	return &RTCPInterceptor{
		collector: collector,
		logger:    logger,
	}
}

// BindRTCPReader binds an RTCP reader
func (i *RTCPInterceptor) BindRTCPReader(reader interceptor.RTCPReader) interceptor.RTCPReader {
	return interceptor.RTCPReaderFunc(func(b []byte, a interceptor.Attributes) (int, interceptor.Attributes, error) {
		n, attr, err := reader.Read(b, a)
		if err != nil {
			return n, attr, err
		}

		// Parse RTCP packet
		packets, err := rtcp.Unmarshal(b[:n])
		if err != nil {
			return n, attr, err
		}

		// Process packets
		for _, packet := range packets {
			switch p := packet.(type) {
			case *rtcp.ReceiverReport:
				// Process receiver report
				i.logger.WithFields(logrus.Fields{
					"ssrc":   p.SSRC,
					"reports": len(p.Reports),
				}).Debug("Received RTCP Receiver Report")

			case *rtcp.SenderReport:
				// Process sender report
				i.logger.WithFields(logrus.Fields{
					"ssrc":         p.SSRC,
					"ntp_time":     p.NTPTime,
					"rtp_time":     p.RTPTime,
					"packet_count": p.PacketCount,
					"octet_count":  p.OctetCount,
				}).Debug("Received RTCP Sender Report")

			case *rtcp.TransportLayerNack:
				// NACK indicates packet loss
				i.logger.WithFields(logrus.Fields{
					"ssrc":  p.MediaSSRC,
					"nacks": len(p.Nacks),
				}).Debug("Received RTCP NACK")
			}
		}

		return n, attr, nil
	})
}

// BindRTCPWriter binds an RTCP writer
func (i *RTCPInterceptor) BindRTCPWriter(writer interceptor.RTCPWriter) interceptor.RTCPWriter {
	return writer
}
