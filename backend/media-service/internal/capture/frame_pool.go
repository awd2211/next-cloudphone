package capture

import (
	"sync"
	"sync/atomic"
)

// FramePool 帧数据缓冲池，用于减少 GC 压力
// 使用 sync.Pool 复用帧数据的 []byte 切片
//
// 性能提升：
// - 减少频繁的内存分配（每帧都需要 ~10KB-100KB）
// - 降低 GC 暂停时间
// - 适合高帧率场景（30-60 FPS）
type FramePool struct {
	smallPool  sync.Pool // 小帧 (≤64KB)
	mediumPool sync.Pool // 中帧 (≤256KB)
	largePool  sync.Pool // 大帧 (≤1MB)

	// 统计信息
	allocations atomic.Uint64 // 新分配次数
	reuses      atomic.Uint64 // 复用次数
}

// 帧大小阈值
const (
	smallFrameSize  = 64 * 1024  // 64KB
	mediumFrameSize = 256 * 1024 // 256KB
	largeFrameSize  = 1024 * 1024 // 1MB
)

// DefaultFramePool 默认的全局帧缓冲池
var DefaultFramePool = NewFramePool()

// NewFramePool 创建新的帧缓冲池
func NewFramePool() *FramePool {
	fp := &FramePool{}

	// 小帧池 - 64KB 预分配
	fp.smallPool = sync.Pool{
		New: func() interface{} {
			buf := make([]byte, smallFrameSize)
			return &buf
		},
	}

	// 中帧池 - 256KB 预分配
	fp.mediumPool = sync.Pool{
		New: func() interface{} {
			buf := make([]byte, mediumFrameSize)
			return &buf
		},
	}

	// 大帧池 - 1MB 预分配
	fp.largePool = sync.Pool{
		New: func() interface{} {
			buf := make([]byte, largeFrameSize)
			return &buf
		},
	}

	return fp
}

// Get 获取一个至少能容纳 size 字节的缓冲区
// 返回的切片长度为 size，底层容量可能更大
func (fp *FramePool) Get(size int) []byte {
	var buf *[]byte

	switch {
	case size <= smallFrameSize:
		buf = fp.smallPool.Get().(*[]byte)
	case size <= mediumFrameSize:
		buf = fp.mediumPool.Get().(*[]byte)
	case size <= largeFrameSize:
		buf = fp.largePool.Get().(*[]byte)
	default:
		// 超大帧，直接分配
		fp.allocations.Add(1)
		newBuf := make([]byte, size)
		return newBuf
	}

	// 检查容量是否足够
	if cap(*buf) >= size {
		fp.reuses.Add(1)
		return (*buf)[:size]
	}

	// 池中的缓冲区不够大（不应该发生，但作为安全措施）
	fp.allocations.Add(1)
	newBuf := make([]byte, size)
	return newBuf
}

// Put 归还缓冲区到池中
// 注意：归还后不应再使用该缓冲区
func (fp *FramePool) Put(buf []byte) {
	if buf == nil {
		return
	}

	// 根据容量归还到对应的池
	capacity := cap(buf)
	bufPtr := &buf

	switch {
	case capacity <= smallFrameSize:
		// 不归还太小的缓冲区，避免污染池
		if capacity >= smallFrameSize/2 {
			fp.smallPool.Put(bufPtr)
		}
	case capacity <= mediumFrameSize:
		fp.mediumPool.Put(bufPtr)
	case capacity <= largeFrameSize:
		fp.largePool.Put(bufPtr)
	// 超大缓冲区不归还，让 GC 回收
	}
}

// Stats 返回缓冲池统计信息
func (fp *FramePool) Stats() FramePoolStats {
	return FramePoolStats{
		Allocations: fp.allocations.Load(),
		Reuses:      fp.reuses.Load(),
	}
}

// FramePoolStats 帧缓冲池统计信息
type FramePoolStats struct {
	Allocations uint64 `json:"allocations"` // 新分配次数
	Reuses      uint64 `json:"reuses"`      // 复用次数
}

// ReuseRate 返回复用率 (0.0 - 1.0)
func (s FramePoolStats) ReuseRate() float64 {
	total := s.Allocations + s.Reuses
	if total == 0 {
		return 0
	}
	return float64(s.Reuses) / float64(total)
}

// PooledFrame 封装帧数据和归还函数
// 使用完毕后调用 Release() 归还缓冲区
type PooledFrame struct {
	Data []byte
	pool *FramePool
}

// Release 归还帧数据到缓冲池
func (pf *PooledFrame) Release() {
	if pf.pool != nil && pf.Data != nil {
		pf.pool.Put(pf.Data)
		pf.Data = nil
	}
}

// GetPooledFrame 从池中获取帧缓冲
func (fp *FramePool) GetPooledFrame(size int) *PooledFrame {
	return &PooledFrame{
		Data: fp.Get(size),
		pool: fp,
	}
}

// CopyToPooled 复制数据到池化的帧缓冲
func (fp *FramePool) CopyToPooled(data []byte) *PooledFrame {
	pf := fp.GetPooledFrame(len(data))
	copy(pf.Data, data)
	return pf
}
