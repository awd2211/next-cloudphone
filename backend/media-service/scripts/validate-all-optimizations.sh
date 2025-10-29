#!/bin/bash

# =============================================================================
# 全栈优化验证脚本 - 验证 P0 + P1 所有优化
# =============================================================================
# 此脚本验证:
# - P0-1: H.264 硬件编码路径
# - P0-2: 资源泄露修复
# - P0-3: 管道阻塞修复
# - P1-1: Worker Pool 并发编码
# - P1-2: H.264 硬件加速编码器
# - P1-3: 监控和性能分析
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 工作目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMP_DIR="/tmp/media-service-validation-$$"

# 测试结果
TEST_RESULTS=()
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 清理函数
cleanup() {
    echo -e "\n${YELLOW}清理测试环境...${NC}"
    rm -rf "$TEMP_DIR"

    # 停止 Media Service (如果启动了)
    if [ ! -z "$MEDIA_PID" ]; then
        echo "停止 Media Service (PID: $MEDIA_PID)..."
        kill $MEDIA_PID 2>/dev/null || true
        wait $MEDIA_PID 2>/dev/null || true
    fi
}

trap cleanup EXIT

# 日志函数
log_test() {
    echo -e "${CYAN}[测试 $TOTAL_TESTS] $1${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
    TEST_RESULTS+=("✓ $1")
    ((PASSED_TESTS++))
}

log_failure() {
    echo -e "${RED}✗ $1${NC}"
    TEST_RESULTS+=("✗ $1")
    ((FAILED_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# 打印标题
print_header() {
    echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}\n"
}

# =============================================================================
# 前置检查
# =============================================================================

check_dependencies() {
    print_header "步骤 1: 检查依赖"

    ((TOTAL_TESTS++))
    log_test "检查 Go 安装"
    if command -v go &> /dev/null; then
        GO_VERSION=$(go version | awk '{print $3}')
        log_success "Go 已安装: $GO_VERSION"
    else
        log_failure "Go 未安装"
        exit 1
    fi

    ((TOTAL_TESTS++))
    log_test "检查 FFmpeg 安装"
    if command -v ffmpeg &> /dev/null; then
        FFMPEG_VERSION=$(ffmpeg -version | head -1)
        log_success "FFmpeg 已安装: $FFMPEG_VERSION"
    else
        log_failure "FFmpeg 未安装"
        exit 1
    fi

    ((TOTAL_TESTS++))
    log_test "检查 ADB 安装"
    if command -v adb &> /dev/null; then
        ADB_VERSION=$(adb version | head -1)
        log_success "ADB 已安装: $ADB_VERSION"
    else
        log_warning "ADB 未安装 (可选,用于真实设备测试)"
    fi

    ((TOTAL_TESTS++))
    log_test "检查 curl 安装"
    if command -v curl &> /dev/null; then
        log_success "curl 已安装"
    else
        log_failure "curl 未安装"
        exit 1
    fi

    ((TOTAL_TESTS++))
    log_test "检查 jq 安装"
    if command -v jq &> /dev/null; then
        log_success "jq 已安装"
    else
        log_warning "jq 未安装 (可选,用于 JSON 解析)"
    fi
}

# =============================================================================
# P0-1: H.264 硬件编码路径验证
# =============================================================================

test_h264_hardware_path() {
    print_header "步骤 2: P0-1 验证 - H.264 硬件编码路径"

    ((TOTAL_TESTS++))
    log_test "检查配置文件中的 CAPTURE_MODE 和 VIDEO_ENCODER_TYPE"

    if [ -f "$PROJECT_ROOT/.env.example" ]; then
        if grep -q "CAPTURE_MODE=screenrecord" "$PROJECT_ROOT/.env.example"; then
            log_success "配置文件包含 CAPTURE_MODE=screenrecord"
        else
            log_failure "配置文件缺少 CAPTURE_MODE=screenrecord"
        fi

        if grep -q "VIDEO_ENCODER_TYPE=passthrough" "$PROJECT_ROOT/.env.example"; then
            log_success "配置文件包含 VIDEO_ENCODER_TYPE=passthrough"
        else
            log_failure "配置文件缺少 VIDEO_ENCODER_TYPE=passthrough"
        fi
    else
        log_warning ".env.example 文件不存在"
    fi

    ((TOTAL_TESTS++))
    log_test "检查 config.go 中的新配置字段"

    CONFIG_FILE="$PROJECT_ROOT/internal/config/config.go"
    if [ -f "$CONFIG_FILE" ]; then
        if grep -q "CaptureMode" "$CONFIG_FILE" && grep -q "VideoEncoderType" "$CONFIG_FILE"; then
            log_success "config.go 包含 CaptureMode 和 VideoEncoderType 字段"
        else
            log_failure "config.go 缺少必要的配置字段"
        fi
    else
        log_failure "config.go 文件不存在"
    fi

    ((TOTAL_TESTS++))
    log_test "检查 WebRTC Manager 中的 H.264 编解码器注册"

    MANAGER_FILE="$PROJECT_ROOT/internal/webrtc/sharded_manager.go"
    if [ -f "$MANAGER_FILE" ]; then
        if grep -q "webrtc.MimeTypeH264" "$MANAGER_FILE"; then
            log_success "WebRTC Manager 注册了 H.264 编解码器"
        else
            log_failure "WebRTC Manager 未注册 H.264 编解码器"
        fi
    else
        log_failure "sharded_manager.go 文件不存在"
    fi

    ((TOTAL_TESTS++))
    log_test "检查 Factory 中的推荐编码器函数"

    FACTORY_FILE="$PROJECT_ROOT/internal/encoder/factory.go"
    if [ -f "$FACTORY_FILE" ]; then
        if grep -q "RecommendedEncoderForCaptureFormat" "$FACTORY_FILE"; then
            log_success "Factory 包含推荐编码器函数"
        else
            log_failure "Factory 缺少推荐编码器函数"
        fi

        if grep -q "EncoderTypeH264" "$FACTORY_FILE"; then
            log_success "Factory 支持 H.264 编码器类型"
        else
            log_failure "Factory 不支持 H.264 编码器类型"
        fi
    else
        log_failure "factory.go 文件不存在"
    fi
}

# =============================================================================
# P0-2: 资源泄露修复验证
# =============================================================================

test_resource_leak_fixes() {
    print_header "步骤 3: P0-2 验证 - 资源泄露修复"

    ((TOTAL_TESTS++))
    log_test "检查 PeerConnection 泄露修复"

    PEER_FILE="$PROJECT_ROOT/internal/webrtc/peer.go"
    if [ -f "$PEER_FILE" ]; then
        # 检查 CreateOffer 错误路径是否调用 DeleteSession
        if grep -A 20 "func.*CreateOffer" "$PEER_FILE" | grep -q "DeleteSession"; then
            log_success "CreateOffer 错误路径包含 DeleteSession 调用"
        else
            log_warning "CreateOffer 可能缺少 DeleteSession 调用"
        fi
    else
        log_failure "peer.go 文件不存在"
    fi

    ((TOTAL_TESTS++))
    log_test "检查 FFmpeg 进程泄露修复"

    VP8_FILE="$PROJECT_ROOT/internal/encoder/vp8_encoder.go"
    if [ -f "$VP8_FILE" ]; then
        # 检查 Close() 方法是否使用超时
        if grep -A 30 "func.*Close" "$VP8_FILE" | grep -q "time.After"; then
            log_success "VP8 编码器 Close() 方法使用超时机制"
        else
            log_failure "VP8 编码器 Close() 方法缺少超时机制"
        fi

        # 检查是否强制杀死进程
        if grep -A 30 "func.*Close" "$VP8_FILE" | grep -q "Kill"; then
            log_success "VP8 编码器支持强制杀死 FFmpeg 进程"
        else
            log_failure "VP8 编码器不支持强制杀死进程"
        fi
    else
        log_failure "vp8_encoder.go 文件不存在"
    fi

    ((TOTAL_TESTS++))
    log_test "检查 PNG 解析修复"

    CAPTURE_FILE="$PROJECT_ROOT/internal/capture/screen_capture.go"
    if [ -f "$CAPTURE_FILE" ]; then
        # 检查是否使用标准库 image/png
        if grep -q '"image/png"' "$CAPTURE_FILE"; then
            log_success "屏幕采集使用标准库解析 PNG"
        else
            log_failure "屏幕采集未使用标准库解析 PNG"
        fi

        # 检查是否使用 png.DecodeConfig
        if grep -q "png.DecodeConfig" "$CAPTURE_FILE"; then
            log_success "使用 png.DecodeConfig 解析 PNG 尺寸"
        else
            log_failure "未使用 png.DecodeConfig"
        fi
    else
        log_failure "screen_capture.go 文件不存在"
    fi
}

# =============================================================================
# P0-3: 管道阻塞修复验证
# =============================================================================

test_pipeline_blocking_fixes() {
    print_header "步骤 4: P0-3 验证 - 管道阻塞修复"

    ((TOTAL_TESTS++))
    log_test "检查编码超时机制"

    PIPELINE_FILE="$PROJECT_ROOT/internal/encoder/video_pipeline.go"
    if [ -f "$PIPELINE_FILE" ]; then
        # 检查编码超时 (200ms)
        if grep -q "200.*time.Millisecond" "$PIPELINE_FILE"; then
            log_success "管道包含 200ms 编码超时"
        else
            log_failure "管道缺少编码超时"
        fi

        # 检查写入超时 (100ms)
        if grep -q "100.*time.Millisecond" "$PIPELINE_FILE"; then
            log_success "管道包含 100ms 写入超时"
        else
            log_failure "管道缺少写入超时"
        fi

        # 检查 EncodingTimeouts 统计字段
        if grep -q "EncodingTimeouts" "$PIPELINE_FILE"; then
            log_success "管道统计包含 EncodingTimeouts 字段"
        else
            log_failure "管道统计缺少 EncodingTimeouts 字段"
        fi
    else
        log_failure "video_pipeline.go 文件不存在"
    fi

    ((TOTAL_TESTS++))
    log_test "检查 goroutine 和 channel 非阻塞模式"

    if [ -f "$PIPELINE_FILE" ]; then
        # 检查是否使用 select 语句
        if grep -A 50 "processFrame" "$PIPELINE_FILE" | grep -q "select {"; then
            log_success "processFrame 使用 select 语句实现非阻塞"
        else
            log_failure "processFrame 可能缺少 select 语句"
        fi
    else
        log_failure "video_pipeline.go 文件不存在"
    fi
}

# =============================================================================
# P1-1: Worker Pool 验证
# =============================================================================

test_worker_pool() {
    print_header "步骤 5: P1-1 验证 - Worker Pool 并发编码"

    ((TOTAL_TESTS++))
    log_test "检查 Worker Pool 文件存在"

    POOL_FILE="$PROJECT_ROOT/internal/encoder/worker_pool.go"
    if [ -f "$POOL_FILE" ]; then
        log_success "worker_pool.go 文件存在"

        # 检查文件大小 (应该 > 10KB)
        FILE_SIZE=$(stat -f%z "$POOL_FILE" 2>/dev/null || stat -c%s "$POOL_FILE" 2>/dev/null)
        if [ "$FILE_SIZE" -gt 10000 ]; then
            log_success "Worker Pool 文件大小合理: $FILE_SIZE bytes"
        else
            log_warning "Worker Pool 文件可能不完整: $FILE_SIZE bytes"
        fi
    else
        log_failure "worker_pool.go 文件不存在"
    fi

    ((TOTAL_TESTS++))
    log_test "检查 Worker Pool 关键结构"

    if [ -f "$POOL_FILE" ]; then
        # 检查 WorkerPool 结构体
        if grep -q "type WorkerPool struct" "$POOL_FILE"; then
            log_success "WorkerPool 结构体存在"
        else
            log_failure "WorkerPool 结构体不存在"
        fi

        # 检查核心方法
        METHODS=("NewWorkerPool" "Start" "Stop" "Submit" "GetOutputChannel" "GetStats")
        for method in "${METHODS[@]}"; do
            if grep -q "func.*$method" "$POOL_FILE"; then
                log_success "Worker Pool 包含方法: $method"
            else
                log_failure "Worker Pool 缺少方法: $method"
            fi
            ((TOTAL_TESTS++))
        done
    fi

    ((TOTAL_TESTS++))
    log_test "检查 Factory 中的 Worker Pool 集成"

    if [ -f "$FACTORY_FILE" ]; then
        if grep -q "WorkerPool" "$FACTORY_FILE"; then
            log_success "Factory 集成了 Worker Pool"
        else
            log_warning "Factory 可能未集成 Worker Pool"
        fi
    fi
}

# =============================================================================
# P1-2: H.264 硬件加速编码器验证
# =============================================================================

test_h264_hardware_encoder() {
    print_header "步骤 6: P1-2 验证 - H.264 硬件加速编码器"

    ((TOTAL_TESTS++))
    log_test "检查 H.264 编码器文件存在"

    H264_FILE="$PROJECT_ROOT/internal/encoder/h264_encoder.go"
    if [ -f "$H264_FILE" ]; then
        log_success "h264_encoder.go 文件存在"

        # 检查文件大小
        FILE_SIZE=$(stat -f%z "$H264_FILE" 2>/dev/null || stat -c%s "$H264_FILE" 2>/dev/null)
        if [ "$FILE_SIZE" -gt 10000 ]; then
            log_success "H.264 编码器文件大小合理: $FILE_SIZE bytes"
        else
            log_warning "H.264 编码器文件可能不完整: $FILE_SIZE bytes"
        fi
    else
        log_failure "h264_encoder.go 文件不存在"
    fi

    ((TOTAL_TESTS++))
    log_test "检查硬件加速器类型支持"

    if [ -f "$H264_FILE" ]; then
        HW_TYPES=("H264EncoderNVENC" "H264EncoderQSV" "H264EncoderVAAPI" "H264EncoderX264" "H264EncoderAuto")
        for hw_type in "${HW_TYPES[@]}"; do
            if grep -q "$hw_type" "$H264_FILE"; then
                log_success "支持硬件加速类型: $hw_type"
            else
                log_failure "不支持硬件加速类型: $hw_type"
            fi
            ((TOTAL_TESTS++))
        done
    fi

    ((TOTAL_TESTS++))
    log_test "检查硬件检测功能"

    if [ -f "$H264_FILE" ]; then
        if grep -q "detectHardwareEncoder" "$H264_FILE"; then
            log_success "包含硬件检测功能"
        else
            log_failure "缺少硬件检测功能"
        fi
    fi

    ((TOTAL_TESTS++))
    log_test "检查系统可用的硬件编码器"

    log_info "正在检测 FFmpeg 支持的编码器..."

    AVAILABLE_ENCODERS=$(ffmpeg -hide_banner -encoders 2>/dev/null | grep -E "h264_nvenc|h264_qsv|h264_vaapi|libx264" || true)

    if echo "$AVAILABLE_ENCODERS" | grep -q "h264_nvenc"; then
        log_success "系统支持 NVIDIA NVENC (硬件加速)"
    else
        log_info "系统不支持 NVIDIA NVENC"
    fi

    if echo "$AVAILABLE_ENCODERS" | grep -q "h264_qsv"; then
        log_success "系统支持 Intel QuickSync (硬件加速)"
    else
        log_info "系统不支持 Intel QuickSync"
    fi

    if echo "$AVAILABLE_ENCODERS" | grep -q "h264_vaapi"; then
        log_success "系统支持 VA-API (硬件加速)"
    else
        log_info "系统不支持 VA-API"
    fi

    if echo "$AVAILABLE_ENCODERS" | grep -q "libx264"; then
        log_success "系统支持 libx264 (软件编码)"
    else
        log_warning "系统不支持 libx264 (这很不寻常)"
    fi
}

# =============================================================================
# P1-3: 监控和性能分析验证
# =============================================================================

test_monitoring() {
    print_header "步骤 7: P1-3 验证 - 监控和性能分析"

    ((TOTAL_TESTS++))
    log_test "检查 pprof 端点集成"

    MAIN_FILE="$PROJECT_ROOT/main.go"
    if [ -f "$MAIN_FILE" ]; then
        # 检查 pprof 导入
        if grep -q '"net/http/pprof"' "$MAIN_FILE"; then
            log_success "main.go 导入了 pprof 包"
        else
            log_failure "main.go 未导入 pprof 包"
        fi

        # 检查 pprof 路由
        if grep -q "/debug/pprof" "$MAIN_FILE"; then
            log_success "main.go 注册了 pprof 路由"
        else
            log_failure "main.go 未注册 pprof 路由"
        fi
    else
        log_failure "main.go 文件不存在"
    fi

    ((TOTAL_TESTS++))
    log_test "检查 Goroutine 监控功能"

    if [ -f "$MAIN_FILE" ]; then
        if grep -q "monitorGoroutines" "$MAIN_FILE"; then
            log_success "main.go 包含 Goroutine 监控功能"
        else
            log_failure "main.go 缺少 Goroutine 监控功能"
        fi

        # 检查监控参数
        if grep -A 30 "monitorGoroutines" "$MAIN_FILE" | grep -q "30.*time.Second"; then
            log_success "Goroutine 监控间隔设置为 30 秒"
        else
            log_warning "Goroutine 监控间隔可能不是 30 秒"
        fi

        if grep -A 30 "monitorGoroutines" "$MAIN_FILE" | grep -q "increase > 20"; then
            log_success "Goroutine 泄露阈值设置为 20%"
        else
            log_warning "Goroutine 泄露阈值可能不是 20%"
        fi
    fi

    ((TOTAL_TESTS++))
    log_test "检查资源监控启动"

    if [ -f "$MAIN_FILE" ]; then
        if grep -q "metrics.StartResourceMonitor" "$MAIN_FILE"; then
            log_success "main.go 启动了资源监控"
        else
            log_warning "main.go 可能未启动资源监控"
        fi
    fi
}

# =============================================================================
# 编译测试
# =============================================================================

test_build() {
    print_header "步骤 8: 编译测试"

    ((TOTAL_TESTS++))
    log_test "编译 Media Service"

    cd "$PROJECT_ROOT"

    if go build -o "$TEMP_DIR/media-service" main.go 2>&1 | tee "$TEMP_DIR/build.log"; then
        log_success "编译成功"

        # 检查可执行文件大小
        if [ -f "$TEMP_DIR/media-service" ]; then
            BIN_SIZE=$(stat -f%z "$TEMP_DIR/media-service" 2>/dev/null || stat -c%s "$TEMP_DIR/media-service" 2>/dev/null)
            BIN_SIZE_MB=$((BIN_SIZE / 1024 / 1024))
            log_info "可执行文件大小: ${BIN_SIZE_MB}MB"
        fi
    else
        log_failure "编译失败,查看日志: $TEMP_DIR/build.log"
        cat "$TEMP_DIR/build.log"
    fi
}

# =============================================================================
# 运行时测试 (可选)
# =============================================================================

test_runtime() {
    print_header "步骤 9: 运行时测试 (可选)"

    log_info "此步骤需要 Redis 和其他依赖服务运行"
    log_info "跳过运行时测试,使用 --runtime 标志启用"

    # 预留给 --runtime 标志
}

# =============================================================================
# 性能基准测试 (可选)
# =============================================================================

test_performance() {
    print_header "步骤 10: 性能基准测试 (可选)"

    log_info "此步骤需要真实设备或 Redroid 容器"
    log_info "跳过性能测试,使用 --performance 标志启用"

    # 预留给 --performance 标志
}

# =============================================================================
# 生成测试报告
# =============================================================================

generate_report() {
    print_header "测试报告"

    echo -e "${CYAN}总计测试: ${NC}$TOTAL_TESTS"
    echo -e "${GREEN}通过: ${NC}$PASSED_TESTS"
    echo -e "${RED}失败: ${NC}$FAILED_TESTS"

    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

    if [ $PASS_RATE -ge 90 ]; then
        echo -e "${GREEN}通过率: ${NC}${PASS_RATE}% ${GREEN}(优秀)${NC}"
    elif [ $PASS_RATE -ge 70 ]; then
        echo -e "${YELLOW}通过率: ${NC}${PASS_RATE}% ${YELLOW}(良好)${NC}"
    else
        echo -e "${RED}通过率: ${NC}${PASS_RATE}% ${RED}(需要改进)${NC}"
    fi

    echo ""
    echo -e "${CYAN}详细结果:${NC}"
    for result in "${TEST_RESULTS[@]}"; do
        echo "  $result"
    done

    # 保存报告
    REPORT_FILE="$TEMP_DIR/validation-report.txt"
    {
        echo "================================================"
        echo "  Media Service 优化验证报告"
        echo "  生成时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "================================================"
        echo ""
        echo "总计测试: $TOTAL_TESTS"
        echo "通过: $PASSED_TESTS"
        echo "失败: $FAILED_TESTS"
        echo "通过率: ${PASS_RATE}%"
        echo ""
        echo "详细结果:"
        for result in "${TEST_RESULTS[@]}"; do
            echo "  $result"
        done
    } > "$REPORT_FILE"

    echo ""
    log_info "完整报告已保存到: $REPORT_FILE"
}

# =============================================================================
# 主函数
# =============================================================================

main() {
    echo -e "${CYAN}"
    echo "═══════════════════════════════════════════════════════════"
    echo "  Media Service 全栈优化验证脚本"
    echo "  验证 P0 + P1 所有优化"
    echo "═══════════════════════════════════════════════════════════"
    echo -e "${NC}"

    # 创建临时目录
    mkdir -p "$TEMP_DIR"

    # 运行测试
    check_dependencies
    test_h264_hardware_path
    test_resource_leak_fixes
    test_pipeline_blocking_fixes
    test_worker_pool
    test_h264_hardware_encoder
    test_monitoring
    test_build

    # 可选测试 (基于标志)
    if [[ " $@ " =~ " --runtime " ]]; then
        test_runtime
    fi

    if [[ " $@ " =~ " --performance " ]]; then
        test_performance
    fi

    # 生成报告
    generate_report

    # 退出码
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}✓ 所有测试通过!${NC}\n"
        exit 0
    else
        echo -e "\n${RED}✗ 部分测试失败,请检查报告${NC}\n"
        exit 1
    fi
}

# 运行主函数
main "$@"
