package recording

import (
	"encoding/binary"
	"fmt"
	"io"
	"os"
	"sync"
	"time"
)

// WebMWriter 写入 WebM 格式的视频文件
// WebM 是基于 Matroska 容器的开放格式，支持 VP8/VP9 视频和 Opus/Vorbis 音频
type WebMWriter struct {
	file          *os.File
	filePath      string
	width         int
	height        int
	frameRate     int
	codecID       string // V_VP8, V_VP9, V_MPEG4/ISO/AVC (H.264)
	sps           []byte // H.264 SPS NAL unit (不含 start code)
	pps           []byte // H.264 PPS NAL unit (不含 start code)
	startTime     time.Time
	lastTimestamp time.Duration
	clusterStart  int64       // 当前 Cluster 的起始位置
	clusterTime   time.Duration // 当前 Cluster 的时间戳
	framesInCluster int
	totalFrames   uint64
	totalBytes    uint64
	headerWritten bool
	mu            sync.Mutex
	closed        bool
}

// WebMWriterOptions WebM 写入器选项
type WebMWriterOptions struct {
	FilePath  string
	Width     int
	Height    int
	FrameRate int
	CodecID   string // "VP8", "VP9", "H264"
	SPS       []byte // H.264 SPS NAL unit (不含 start code)
	PPS       []byte // H.264 PPS NAL unit (不含 start code)
}

// EBML 和 WebM 常量 ID
const (
	// EBML Header IDs
	ebmlID            = 0x1A45DFA3
	ebmlVersionID     = 0x4286
	ebmlReadVersionID = 0x42F7
	ebmlMaxIDLengthID = 0x42F2
	ebmlMaxSizeLenID  = 0x42F3
	docTypeID         = 0x4282
	docTypeVersionID  = 0x4287
	docTypeReadVerID  = 0x4285

	// Segment IDs
	segmentID      = 0x18538067
	seekHeadID     = 0x114D9B74
	segmentInfoID  = 0x1549A966
	tracksID       = 0x1654AE6B
	clusterID      = 0x1F43B675
	cuesID         = 0x1C53BB6B

	// Segment Info IDs
	timecodeScaleID = 0x2AD7B1
	muxingAppID     = 0x4D80
	writingAppID    = 0x5741
	durationID      = 0x4489

	// Track IDs
	trackEntryID      = 0xAE
	trackNumberID     = 0xD7
	trackUIDID        = 0x73C5
	trackTypeID       = 0x83
	flagEnabledID     = 0xB9
	flagDefaultID     = 0x88
	flagLacingID      = 0x9C
	codecIDElementID  = 0x86
	codecPrivateID    = 0x63A2
	videoID           = 0xE0
	pixelWidthID      = 0xB0
	pixelHeightID     = 0xBA
	frameRateIDElem   = 0x2383E3

	// Cluster IDs
	timecodeID   = 0xE7
	simpleBlockID = 0xA3
	blockGroupID = 0xA0
	blockID      = 0xA1

	// Cues IDs
	cuePointID       = 0xBB
	cueTimeID        = 0xB3
	cueTrackPosID    = 0xB7
	cueTrackID       = 0xF7
	cueClusterPosID  = 0xF1
)

// Track types
const (
	trackTypeVideo = 1
	trackTypeAudio = 2
)

// NewWebMWriter 创建新的 WebM 写入器
func NewWebMWriter(opts WebMWriterOptions) (*WebMWriter, error) {
	if opts.FilePath == "" {
		return nil, fmt.Errorf("file path is required")
	}
	if opts.Width <= 0 || opts.Height <= 0 {
		return nil, fmt.Errorf("invalid video dimensions: %dx%d", opts.Width, opts.Height)
	}
	if opts.FrameRate <= 0 {
		opts.FrameRate = 30
	}

	codecID := "V_VP8"
	switch opts.CodecID {
	case "VP9":
		codecID = "V_VP9"
	case "H264":
		codecID = "V_MPEG4/ISO/AVC"
	case "VP8", "":
		codecID = "V_VP8"
	default:
		return nil, fmt.Errorf("unsupported codec: %s", opts.CodecID)
	}

	file, err := os.Create(opts.FilePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create file: %w", err)
	}

	w := &WebMWriter{
		file:      file,
		filePath:  opts.FilePath,
		width:     opts.Width,
		height:    opts.Height,
		frameRate: opts.FrameRate,
		codecID:   codecID,
		sps:       opts.SPS,
		pps:       opts.PPS,
		startTime: time.Now(),
	}

	return w, nil
}

// WriteHeader 写入 WebM 文件头
func (w *WebMWriter) WriteHeader() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.headerWritten {
		return nil
	}

	// 写入 EBML Header
	if err := w.writeEBMLHeader(); err != nil {
		return fmt.Errorf("failed to write EBML header: %w", err)
	}

	// 写入 Segment 开始 (使用未知大小)
	if err := w.writeSegmentStart(); err != nil {
		return fmt.Errorf("failed to write segment start: %w", err)
	}

	// 写入 SegmentInfo
	if err := w.writeSegmentInfo(); err != nil {
		return fmt.Errorf("failed to write segment info: %w", err)
	}

	// 写入 Tracks
	if err := w.writeTracks(); err != nil {
		return fmt.Errorf("failed to write tracks: %w", err)
	}

	w.headerWritten = true
	return nil
}

// WriteFrame 写入视频帧
func (w *WebMWriter) WriteFrame(frame []byte, timestamp time.Duration, keyframe bool) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.closed {
		return fmt.Errorf("writer is closed")
	}

	if !w.headerWritten {
		if err := w.writeEBMLHeader(); err != nil {
			return err
		}
		if err := w.writeSegmentStart(); err != nil {
			return err
		}
		if err := w.writeSegmentInfo(); err != nil {
			return err
		}
		if err := w.writeTracks(); err != nil {
			return err
		}
		w.headerWritten = true
	}

	// 每 5 秒或每 150 帧开始新的 Cluster，或者是关键帧时
	needNewCluster := w.clusterStart == 0 ||
		timestamp-w.clusterTime > 5*time.Second ||
		w.framesInCluster >= 150 ||
		(keyframe && w.framesInCluster > 0)

	if needNewCluster {
		// 关闭当前 Cluster (如果存在)
		if w.clusterStart > 0 {
			// WebM 使用未知大小的 Cluster，不需要回写大小
		}

		// 开始新的 Cluster
		w.clusterStart, _ = w.file.Seek(0, io.SeekCurrent)
		w.clusterTime = timestamp
		w.framesInCluster = 0

		// 写入 Cluster 头
		if err := w.writeElementID(clusterID); err != nil {
			return err
		}
		// 使用未知大小 (0x01FFFFFFFFFFFFFF)
		if _, err := w.file.Write([]byte{0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF}); err != nil {
			return err
		}

		// 写入 Cluster 时间戳
		timecodeMs := uint64(timestamp.Milliseconds())
		if err := w.writeUintElement(timecodeID, timecodeMs); err != nil {
			return err
		}
	}

	// 对 H.264 数据进行 Annex B → AVCC 格式转换
	frameData := frame
	if w.codecID == "V_MPEG4/ISO/AVC" {
		frameData = w.convertAnnexBToAVCC(frame)
	}

	// 写入 SimpleBlock
	if err := w.writeSimpleBlock(frameData, timestamp-w.clusterTime, keyframe); err != nil {
		return err
	}

	w.framesInCluster++
	w.totalFrames++
	w.totalBytes += uint64(len(frame))
	w.lastTimestamp = timestamp

	return nil
}

// writeSimpleBlock 写入 SimpleBlock 元素
func (w *WebMWriter) writeSimpleBlock(frame []byte, relativeTime time.Duration, keyframe bool) error {
	// SimpleBlock 结构:
	// - Track Number (可变长度整数, 通常 1 字节: 0x81 表示 track 1)
	// - Timecode (相对于 Cluster, 有符号 16 位)
	// - Flags (1 字节: keyframe, invisible, lacing, discardable)
	// - Frame data

	trackNum := []byte{0x81} // Track 1 (EBML 编码)
	timecodeInt16 := int16(relativeTime.Milliseconds())
	timecode := make([]byte, 2)
	binary.BigEndian.PutUint16(timecode, uint16(timecodeInt16))

	flags := byte(0x00)
	if keyframe {
		flags |= 0x80 // Keyframe flag
	}

	blockData := make([]byte, 0, len(trackNum)+2+1+len(frame))
	blockData = append(blockData, trackNum...)
	blockData = append(blockData, timecode...)
	blockData = append(blockData, flags)
	blockData = append(blockData, frame...)

	// 写入 SimpleBlock ID 和大小
	if err := w.writeElementID(simpleBlockID); err != nil {
		return err
	}
	if err := w.writeVINT(uint64(len(blockData))); err != nil {
		return err
	}
	if _, err := w.file.Write(blockData); err != nil {
		return err
	}

	return nil
}

// writeEBMLHeader 写入 EBML 头
func (w *WebMWriter) writeEBMLHeader() error {
	// 构建 EBML Header 内容
	var headerContent []byte

	// EBMLVersion: 1
	headerContent = append(headerContent, w.encodeUintElement(ebmlVersionID, 1)...)
	// EBMLReadVersion: 1
	headerContent = append(headerContent, w.encodeUintElement(ebmlReadVersionID, 1)...)
	// EBMLMaxIDLength: 4
	headerContent = append(headerContent, w.encodeUintElement(ebmlMaxIDLengthID, 4)...)
	// EBMLMaxSizeLength: 8
	headerContent = append(headerContent, w.encodeUintElement(ebmlMaxSizeLenID, 8)...)
	// DocType: "webm"
	headerContent = append(headerContent, w.encodeStringElement(docTypeID, "webm")...)
	// DocTypeVersion: 4
	headerContent = append(headerContent, w.encodeUintElement(docTypeVersionID, 4)...)
	// DocTypeReadVersion: 2
	headerContent = append(headerContent, w.encodeUintElement(docTypeReadVerID, 2)...)

	// 写入 EBML 头
	if err := w.writeElementID(ebmlID); err != nil {
		return err
	}
	if err := w.writeVINT(uint64(len(headerContent))); err != nil {
		return err
	}
	if _, err := w.file.Write(headerContent); err != nil {
		return err
	}

	return nil
}

// writeSegmentStart 写入 Segment 开始标记
func (w *WebMWriter) writeSegmentStart() error {
	if err := w.writeElementID(segmentID); err != nil {
		return err
	}
	// 使用未知大小
	if _, err := w.file.Write([]byte{0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF}); err != nil {
		return err
	}
	return nil
}

// writeSegmentInfo 写入 SegmentInfo
func (w *WebMWriter) writeSegmentInfo() error {
	var infoContent []byte

	// TimecodeScale: 1000000 (nanoseconds per millisecond)
	infoContent = append(infoContent, w.encodeUintElement(timecodeScaleID, 1000000)...)
	// MuxingApp
	infoContent = append(infoContent, w.encodeStringElement(muxingAppID, "CloudPhone Media Service")...)
	// WritingApp
	infoContent = append(infoContent, w.encodeStringElement(writingAppID, "CloudPhone WebM Writer")...)

	// 写入 SegmentInfo
	if err := w.writeElementID(segmentInfoID); err != nil {
		return err
	}
	if err := w.writeVINT(uint64(len(infoContent))); err != nil {
		return err
	}
	if _, err := w.file.Write(infoContent); err != nil {
		return err
	}

	return nil
}

// writeTracks 写入 Tracks
func (w *WebMWriter) writeTracks() error {
	// 构建 Video 元素
	var videoContent []byte
	videoContent = append(videoContent, w.encodeUintElement(pixelWidthID, uint64(w.width))...)
	videoContent = append(videoContent, w.encodeUintElement(pixelHeightID, uint64(w.height))...)

	// 构建 TrackEntry
	var trackContent []byte
	trackContent = append(trackContent, w.encodeUintElement(trackNumberID, 1)...)
	trackContent = append(trackContent, w.encodeUintElement(trackUIDID, 1)...)
	trackContent = append(trackContent, w.encodeUintElement(flagEnabledID, 1)...)
	trackContent = append(trackContent, w.encodeUintElement(flagDefaultID, 1)...)
	trackContent = append(trackContent, w.encodeUintElement(flagLacingID, 0)...)
	trackContent = append(trackContent, w.encodeUintElement(trackTypeID, trackTypeVideo)...)
	trackContent = append(trackContent, w.encodeStringElement(codecIDElementID, w.codecID)...)

	// 如果是 H.264 并且有 SPS/PPS，添加 CodecPrivate (AVCDecoderConfigurationRecord)
	if w.codecID == "V_MPEG4/ISO/AVC" && w.sps != nil && w.pps != nil {
		codecPrivate := w.buildAVCDecoderConfigurationRecord()
		if codecPrivate != nil {
			trackContent = append(trackContent, w.encodeElement(codecPrivateID, codecPrivate)...)
		}
	}

	// 添加 Video 元素
	trackContent = append(trackContent, w.encodeElement(videoID, videoContent)...)

	// 构建 Tracks
	tracksContent := w.encodeElement(trackEntryID, trackContent)

	// 写入 Tracks
	if err := w.writeElementID(tracksID); err != nil {
		return err
	}
	if err := w.writeVINT(uint64(len(tracksContent))); err != nil {
		return err
	}
	if _, err := w.file.Write(tracksContent); err != nil {
		return err
	}

	return nil
}

// buildAVCDecoderConfigurationRecord 构建 H.264 的 CodecPrivate 数据
// 格式参考: ISO/IEC 14496-15 (AVC file format)
// AVCDecoderConfigurationRecord {
//   configurationVersion = 1
//   AVCProfileIndication (from SPS[1])
//   profile_compatibility (from SPS[2])
//   AVCLevelIndication (from SPS[3])
//   lengthSizeMinusOne = 3 (4 bytes NAL length prefix)
//   numOfSequenceParameterSets (lower 5 bits)
//   sequenceParameterSetLength (2 bytes, big-endian)
//   sequenceParameterSetNALUnit (SPS data)
//   numOfPictureParameterSets
//   pictureParameterSetLength (2 bytes, big-endian)
//   pictureParameterSetNALUnit (PPS data)
// }
func (w *WebMWriter) buildAVCDecoderConfigurationRecord() []byte {
	sps := w.stripStartCode(w.sps)
	pps := w.stripStartCode(w.pps)

	if len(sps) < 4 || len(pps) < 1 {
		return nil
	}

	// 计算总长度
	totalLen := 6 + 2 + len(sps) + 1 + 2 + len(pps)
	record := make([]byte, totalLen)

	idx := 0
	// configurationVersion = 1
	record[idx] = 1
	idx++
	// AVCProfileIndication (from SPS byte 1)
	record[idx] = sps[1]
	idx++
	// profile_compatibility (from SPS byte 2)
	record[idx] = sps[2]
	idx++
	// AVCLevelIndication (from SPS byte 3)
	record[idx] = sps[3]
	idx++
	// reserved (6 bits = 111111) + lengthSizeMinusOne (2 bits = 11 for 4 bytes)
	record[idx] = 0xFF
	idx++
	// reserved (3 bits = 111) + numOfSequenceParameterSets (5 bits = 1)
	record[idx] = 0xE1
	idx++
	// sequenceParameterSetLength (big-endian)
	binary.BigEndian.PutUint16(record[idx:], uint16(len(sps)))
	idx += 2
	// sequenceParameterSetNALUnit
	copy(record[idx:], sps)
	idx += len(sps)
	// numOfPictureParameterSets = 1
	record[idx] = 1
	idx++
	// pictureParameterSetLength (big-endian)
	binary.BigEndian.PutUint16(record[idx:], uint16(len(pps)))
	idx += 2
	// pictureParameterSetNALUnit
	copy(record[idx:], pps)

	return record
}

// stripStartCode 移除 NAL unit 的起始码 (0x00 0x00 0x00 0x01 或 0x00 0x00 0x01)
func (w *WebMWriter) stripStartCode(data []byte) []byte {
	if len(data) >= 4 && data[0] == 0 && data[1] == 0 && data[2] == 0 && data[3] == 1 {
		return data[4:]
	}
	if len(data) >= 3 && data[0] == 0 && data[1] == 0 && data[2] == 1 {
		return data[3:]
	}
	return data
}

// convertAnnexBToAVCC 将 H.264 Annex B 格式转换为 AVCC 格式
// Annex B: 使用起始码 (0x00 0x00 0x00 0x01 或 0x00 0x00 0x01) 分隔 NAL 单元
// AVCC: 使用 4 字节大端长度前缀分隔 NAL 单元 (MP4/Matroska/WebM 容器使用)
func (w *WebMWriter) convertAnnexBToAVCC(data []byte) []byte {
	if len(data) < 4 {
		return data
	}

	// 查找所有 NAL 单元的起始位置
	var nalStarts []int
	i := 0
	for i < len(data)-3 {
		// 检查 4 字节起始码
		if data[i] == 0 && data[i+1] == 0 && data[i+2] == 0 && data[i+3] == 1 {
			nalStarts = append(nalStarts, i+4) // NAL 数据从起始码之后开始
			i += 4
			continue
		}
		// 检查 3 字节起始码
		if data[i] == 0 && data[i+1] == 0 && data[i+2] == 1 {
			nalStarts = append(nalStarts, i+3)
			i += 3
			continue
		}
		i++
	}

	// 如果没有找到起始码，假设数据已经是 AVCC 格式或原始 NAL
	if len(nalStarts) == 0 {
		// 添加长度前缀
		result := make([]byte, 4+len(data))
		binary.BigEndian.PutUint32(result[0:4], uint32(len(data)))
		copy(result[4:], data)
		return result
	}

	// 计算输出大小：每个 NAL 需要 4 字节长度前缀
	totalSize := 0
	for idx, start := range nalStarts {
		var end int
		if idx < len(nalStarts)-1 {
			// 下一个 NAL 的起始位置之前的内容（需要回退到起始码开始处）
			nextStart := nalStarts[idx+1]
			// 向前查找起始码的开始位置
			end = nextStart
			for end > start && (data[end-1] == 0 || data[end-1] == 1) {
				end--
			}
			// 跳过末尾的零填充
			for end > start && data[end-1] == 0 {
				end--
			}
		} else {
			end = len(data)
		}
		nalLen := end - start
		if nalLen > 0 {
			totalSize += 4 + nalLen
		}
	}

	// 构建 AVCC 格式输出
	result := make([]byte, 0, totalSize)
	for idx, start := range nalStarts {
		var end int
		if idx < len(nalStarts)-1 {
			nextStart := nalStarts[idx+1]
			end = nextStart
			// 回退找到实际的 NAL 结束位置
			for end > start {
				// 检查是否是起始码的一部分
				checkPos := end - 1
				if checkPos >= 3 && data[checkPos-3] == 0 && data[checkPos-2] == 0 && data[checkPos-1] == 0 && data[checkPos] == 1 {
					end = checkPos - 3
					break
				}
				if checkPos >= 2 && data[checkPos-2] == 0 && data[checkPos-1] == 0 && data[checkPos] == 1 {
					end = checkPos - 2
					break
				}
				break
			}
		} else {
			end = len(data)
		}

		nalData := data[start:end]
		nalLen := len(nalData)

		if nalLen > 0 {
			// 写入 4 字节大端长度
			lenBytes := make([]byte, 4)
			binary.BigEndian.PutUint32(lenBytes, uint32(nalLen))
			result = append(result, lenBytes...)
			result = append(result, nalData...)
		}
	}

	return result
}

// encodeElement 编码一个完整的 EBML 元素
func (w *WebMWriter) encodeElement(id uint32, content []byte) []byte {
	var result []byte
	result = append(result, w.encodeID(id)...)
	result = append(result, w.encodeVINT(uint64(len(content)))...)
	result = append(result, content...)
	return result
}

// encodeUintElement 编码无符号整数元素
func (w *WebMWriter) encodeUintElement(id uint32, value uint64) []byte {
	var result []byte
	result = append(result, w.encodeID(id)...)

	// 计算需要的字节数
	size := 1
	for v := value >> 8; v > 0; v >>= 8 {
		size++
	}
	if size > 8 {
		size = 8
	}

	result = append(result, w.encodeVINT(uint64(size))...)

	// 写入值 (大端序)
	valueBytes := make([]byte, size)
	for i := size - 1; i >= 0; i-- {
		valueBytes[i] = byte(value)
		value >>= 8
	}
	result = append(result, valueBytes...)

	return result
}

// encodeStringElement 编码字符串元素
func (w *WebMWriter) encodeStringElement(id uint32, value string) []byte {
	var result []byte
	result = append(result, w.encodeID(id)...)
	result = append(result, w.encodeVINT(uint64(len(value)))...)
	result = append(result, []byte(value)...)
	return result
}

// encodeID 编码 EBML ID
// EBML ID 的长度由第一个字节的前导 1 位位置决定:
// - 1 字节: 1xxxxxxx (0x80-0xFF, 存储为原值)
// - 2 字节: 01xxxxxx xxxxxxxx (0x4000-0x7FFF, 存储为原值)
// - 3 字节: 001xxxxx xxxxxxxx xxxxxxxx (0x200000-0x3FFFFF)
// - 4 字节: 0001xxxx ... (0x10000000-0x1FFFFFFF)
func (w *WebMWriter) encodeID(id uint32) []byte {
	// 检查 ID 的实际字节大小（根据最高有效字节）
	if id <= 0xFF && (id&0x80) != 0 {
		// 1 字节 ID: 最高位必须是 1
		return []byte{byte(id)}
	} else if id <= 0xFFFF && (id&0xC000) == 0x4000 {
		// 2 字节 ID: 前两位必须是 01
		return []byte{byte(id >> 8), byte(id)}
	} else if id <= 0xFFFFFF && (id&0xE00000) == 0x200000 {
		// 3 字节 ID: 前三位必须是 001
		return []byte{byte(id >> 16), byte(id >> 8), byte(id)}
	} else {
		// 4 字节 ID
		return []byte{byte(id >> 24), byte(id >> 16), byte(id >> 8), byte(id)}
	}
}

// encodeVINT 编码可变长度整数 (VINT)
func (w *WebMWriter) encodeVINT(value uint64) []byte {
	if value < 0x7F {
		return []byte{byte(value) | 0x80}
	} else if value < 0x3FFF {
		return []byte{byte(value>>8) | 0x40, byte(value)}
	} else if value < 0x1FFFFF {
		return []byte{byte(value>>16) | 0x20, byte(value >> 8), byte(value)}
	} else if value < 0x0FFFFFFF {
		return []byte{byte(value>>24) | 0x10, byte(value >> 16), byte(value >> 8), byte(value)}
	} else if value < 0x07FFFFFFFF {
		return []byte{byte(value>>32) | 0x08, byte(value >> 24), byte(value >> 16), byte(value >> 8), byte(value)}
	} else if value < 0x03FFFFFFFFFF {
		return []byte{byte(value>>40) | 0x04, byte(value >> 32), byte(value >> 24), byte(value >> 16), byte(value >> 8), byte(value)}
	} else if value < 0x01FFFFFFFFFFFF {
		return []byte{byte(value>>48) | 0x02, byte(value >> 40), byte(value >> 32), byte(value >> 24), byte(value >> 16), byte(value >> 8), byte(value)}
	} else {
		return []byte{0x01, byte(value >> 48), byte(value >> 40), byte(value >> 32), byte(value >> 24), byte(value >> 16), byte(value >> 8), byte(value)}
	}
}

// writeElementID 写入元素 ID
func (w *WebMWriter) writeElementID(id uint32) error {
	_, err := w.file.Write(w.encodeID(id))
	return err
}

// writeVINT 写入可变长度整数
func (w *WebMWriter) writeVINT(value uint64) error {
	_, err := w.file.Write(w.encodeVINT(value))
	return err
}

// writeUintElement 写入无符号整数元素
func (w *WebMWriter) writeUintElement(id uint32, value uint64) error {
	_, err := w.file.Write(w.encodeUintElement(id, value))
	return err
}

// Close 关闭写入器并完成文件
func (w *WebMWriter) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.closed {
		return nil
	}
	w.closed = true

	// 同步并关闭文件
	if err := w.file.Sync(); err != nil {
		w.file.Close()
		return fmt.Errorf("failed to sync file: %w", err)
	}

	return w.file.Close()
}

// GetStats 获取写入统计
func (w *WebMWriter) GetStats() (frames uint64, bytes uint64, duration time.Duration) {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.totalFrames, w.totalBytes, w.lastTimestamp
}

// GetFilePath 获取文件路径
func (w *WebMWriter) GetFilePath() string {
	return w.filePath
}
