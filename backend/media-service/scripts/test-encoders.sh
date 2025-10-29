#!/bin/bash

# WebRTC 编码器测试脚本
# 测试 VP8 和 Opus 编码器的功能

set -e

echo "════════════════════════════════════════════════════════"
echo "  WebRTC 编码器功能测试"
echo "════════════════════════════════════════════════════════"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查依赖
echo "1. 检查依赖..."

# 检查 FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}✗ FFmpeg 未安装${NC}"
    echo "  请安装 FFmpeg: sudo apt-get install ffmpeg"
    exit 1
fi
echo -e "${GREEN}✓ FFmpeg 已安装${NC}"

# 检查 ADB
if ! command -v adb &> /dev/null; then
    echo -e "${YELLOW}⚠ ADB 未安装 (仅用于实际设备测试)${NC}"
else
    echo -e "${GREEN}✓ ADB 已安装${NC}"
fi

# 检查 Go
if ! command -v go &> /dev/null; then
    echo -e "${RED}✗ Go 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Go 已安装${NC}"

echo ""

# 创建测试目录
TEST_DIR="/tmp/webrtc-encoder-test"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

echo "2. 创建测试图像..."

# 生成测试图像 (1280x720 PNG)
ffmpeg -f lavfi -i "testsrc=duration=1:size=1280x720:rate=1" \
    -frames:v 1 \
    "$TEST_DIR/test_frame.png" \
    -y -loglevel error

if [ -f "$TEST_DIR/test_frame.png" ]; then
    echo -e "${GREEN}✓ 测试图像已创建: $TEST_DIR/test_frame.png${NC}"
    ls -lh "$TEST_DIR/test_frame.png"
else
    echo -e "${RED}✗ 测试图像创建失败${NC}"
    exit 1
fi

echo ""
echo "3. 测试 VP8 编码器..."

# 测试 VP8 编码
ffmpeg -i "$TEST_DIR/test_frame.png" \
    -c:v libvpx \
    -b:v 2000000 \
    -quality realtime \
    -cpu-used 5 \
    -deadline realtime \
    -f webm \
    "$TEST_DIR/test_vp8.webm" \
    -y -loglevel error

if [ -f "$TEST_DIR/test_vp8.webm" ]; then
    echo -e "${GREEN}✓ VP8 编码成功${NC}"
    echo "  输入: $(ls -lh $TEST_DIR/test_frame.png | awk '{print $5}')"
    echo "  输出: $(ls -lh $TEST_DIR/test_vp8.webm | awk '{print $5}')"

    # 计算压缩比
    INPUT_SIZE=$(stat -f%z "$TEST_DIR/test_frame.png" 2>/dev/null || stat -c%s "$TEST_DIR/test_frame.png")
    OUTPUT_SIZE=$(stat -f%z "$TEST_DIR/test_vp8.webm" 2>/dev/null || stat -c%s "$TEST_DIR/test_vp8.webm")
    RATIO=$(echo "scale=2; $INPUT_SIZE / $OUTPUT_SIZE" | bc)
    echo "  压缩比: ${RATIO}x"
else
    echo -e "${RED}✗ VP8 编码失败${NC}"
    exit 1
fi

echo ""
echo "4. 生成测试音频..."

# 生成测试音频 (1秒, 48kHz, 立体声, 16-bit PCM)
ffmpeg -f lavfi -i "sine=frequency=440:duration=1:sample_rate=48000" \
    -ac 2 \
    -f s16le \
    "$TEST_DIR/test_audio.pcm" \
    -y -loglevel error

if [ -f "$TEST_DIR/test_audio.pcm" ]; then
    echo -e "${GREEN}✓ 测试音频已创建: $TEST_DIR/test_audio.pcm${NC}"
    ls -lh "$TEST_DIR/test_audio.pcm"
else
    echo -e "${RED}✗ 测试音频创建失败${NC}"
    exit 1
fi

echo ""
echo "5. 测试 Opus 编码器..."

# 测试 Opus 编码
ffmpeg -f s16le -ar 48000 -ac 2 -i "$TEST_DIR/test_audio.pcm" \
    -c:a libopus \
    -b:a 64000 \
    -vbr on \
    -compression_level 10 \
    -application voip \
    -f opus \
    "$TEST_DIR/test_opus.opus" \
    -y -loglevel error

if [ -f "$TEST_DIR/test_opus.opus" ]; then
    echo -e "${GREEN}✓ Opus 编码成功${NC}"
    echo "  输入: $(ls -lh $TEST_DIR/test_audio.pcm | awk '{print $5}')"
    echo "  输出: $(ls -lh $TEST_DIR/test_opus.opus | awk '{print $5}')"

    # 计算压缩比
    INPUT_SIZE=$(stat -f%z "$TEST_DIR/test_audio.pcm" 2>/dev/null || stat -c%s "$TEST_DIR/test_audio.pcm")
    OUTPUT_SIZE=$(stat -f%z "$TEST_DIR/test_opus.opus" 2>/dev/null || stat -c%s "$TEST_DIR/test_opus.opus")
    RATIO=$(echo "scale=2; $INPUT_SIZE / $OUTPUT_SIZE" | bc)
    echo "  压缩比: ${RATIO}x"
else
    echo -e "${RED}✗ Opus 编码失败${NC}"
    exit 1
fi

echo ""
echo "6. 性能测试 (编码 30 帧)..."

# 生成 30 帧测试视频
ffmpeg -f lavfi -i "testsrc=duration=1:size=1280x720:rate=30" \
    "$TEST_DIR/test_30frames.png" \
    -y -loglevel error 2>&1 | head -1

# 测试编码性能
START_TIME=$(date +%s.%N)

ffmpeg -f lavfi -i "testsrc=duration=1:size=1280x720:rate=30" \
    -c:v libvpx \
    -b:v 2000000 \
    -quality realtime \
    -cpu-used 5 \
    -deadline realtime \
    -f webm \
    "$TEST_DIR/test_30frames.webm" \
    -y -loglevel error

END_TIME=$(date +%s.%N)
ELAPSED=$(echo "$END_TIME - $START_TIME" | bc)
FPS=$(echo "30 / $ELAPSED" | bc -l | xargs printf "%.2f")

echo -e "${GREEN}✓ 性能测试完成${NC}"
echo "  编码 30 帧耗时: ${ELAPSED}s"
echo "  平均编码速度: ${FPS} fps"

if (( $(echo "$FPS >= 30" | bc -l) )); then
    echo -e "${GREEN}  ✓ 编码速度满足实时要求 (>= 30 fps)${NC}"
else
    echo -e "${YELLOW}  ⚠ 编码速度低于实时要求 (< 30 fps)${NC}"
    echo "  提示: 考虑降低分辨率或提高 cpu-used 参数"
fi

echo ""
echo "7. 清理测试文件..."

# 可选：保留测试文件用于检查
# rm -rf "$TEST_DIR"
echo -e "${YELLOW}ℹ 测试文件保留在: $TEST_DIR${NC}"
echo "  可以使用以下命令播放测试:"
echo "  ffplay $TEST_DIR/test_vp8.webm"
echo "  ffplay $TEST_DIR/test_opus.opus"

echo ""
echo "════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ 所有编码器测试通过!${NC}"
echo "════════════════════════════════════════════════════════"
echo ""
echo "下一步:"
echo "  1. 运行完整管道测试: go run examples/complete_pipeline.go -device <DEVICE_ID>"
echo "  2. 启动 Media Service: go run main.go"
echo "  3. 查看实施指南: cat WEBRTC_IMPLEMENTATION_GUIDE.md"
