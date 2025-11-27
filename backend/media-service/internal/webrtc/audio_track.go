package webrtc

import (
	"fmt"
	"io"
	"time"

	"github.com/pion/webrtc/v3"
	"github.com/pion/webrtc/v3/pkg/media"
)

// CreateAudioTrack creates an audio track for a session
func (m *Manager) CreateAudioTrack(sessionID string) error {
	session, err := m.GetSession(sessionID)
	if err != nil {
		return err
	}

	if session.AudioTrack != nil {
		return fmt.Errorf("audio track already exists")
	}

	// Create audio track (Opus)
	audioTrack, err := webrtc.NewTrackLocalStaticSample(
		webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeOpus},
		"audio",
		"cloudphone-audio",
	)
	if err != nil {
		return fmt.Errorf("failed to create audio track: %w", err)
	}

	// Add audio track to PeerConnection
	if _, err = session.PeerConnection.AddTrack(audioTrack); err != nil {
		return fmt.Errorf("failed to add audio track: %w", err)
	}

	// Update session with audio track using shard lock
	shard := m.getShard(sessionID)
	shard.mu.Lock()
	session.AudioTrack = audioTrack
	shard.mu.Unlock()

	return nil
}

// WriteAudioFrame writes an audio frame to the audio track
func (m *Manager) WriteAudioFrame(sessionID string, frame []byte, duration time.Duration) error {
	session, err := m.GetSession(sessionID)
	if err != nil {
		return err
	}

	if session.AudioTrack == nil {
		return fmt.Errorf("audio track not available")
	}

	sample := &media.Sample{
		Data:     frame,
		Duration: duration,
	}

	if err := session.AudioTrack.WriteSample(*sample); err != nil {
		if err != io.ErrClosedPipe {
			return fmt.Errorf("failed to write audio frame: %w", err)
		}
	}

	return nil
}
