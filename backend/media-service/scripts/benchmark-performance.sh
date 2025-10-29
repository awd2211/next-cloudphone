#!/bin/bash

# =============================================================================
# Media Service 性能基准测试脚本
# =============================================================================
# 此脚本对比不同配置的性能:
# 1. 基准配置 (screencap + VP8)
# 2. P0 优化 (screenrecord + pass-through)
# 3. P1 优化 (Worker Pool + H.264 hardware)
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RESULTS_DIR="$PROJECT_ROOT/benchmark-results-$(date +%Y%m%d-%H%M%S)"
MEDIA_SERVICE_PORT=30006
TEST_DURATION=30  # 每个测试运行 30 秒

# 日志函数
log_info() { echo -e "${BLUE}ℹ $1${NC}"; }
log_success() { echo -e "${GREEN}✓ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
log_error() { echo -e "${RED}✗ $1${NC}"; }
log_header() {
    echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}\n"
}

# 清理函数
cleanup() {
    log_info "清理环境..."

    # 停止 Media Service
    if [ ! -z "$MEDIA_PID" ]; then
        log_info "停止 Media Service (PID: $MEDIA_PID)"
        kill $MEDIA_PID 2>/dev/null || true
        wait $MEDIA_PID 2>/dev/null || true
    fi
}

trap cleanup EXIT

# =============================================================================
# 前置检查
# =============================================================================

check_prerequisites() {
    log_header "前置检查"

    # 检查设备连接
    log_info "检查 ADB 设备连接..."
    DEVICES=$(adb devices | grep -v "List of devices" | grep "device$" | awk '{print $1}')

    if [ -z "$DEVICES" ]; then
        log_error "未找到已连接的 Android 设备"
        log_info "请确保:"
        log_info "  1. 真实设备已通过 USB 连接并启用 USB 调试"
        log_info "  2. 或者 Redroid 容器已启动: docker run ... redroid/redroid:11.0.0-latest"
        log_info "  3. 或者使用 adb connect <ip>:5555 连接远程设备"
        exit 1
    fi

    DEVICE_ID=$(echo "$DEVICES" | head -1)
    log_success "找到设备: $DEVICE_ID"

    # 检查 screenrecord 支持
    log_info "检查设备是否支持 screenrecord..."
    if adb -s "$DEVICE_ID" shell "command -v screenrecord" &>/dev/null; then
        log_success "设备支持 screenrecord (H.264 硬件编码)"
    else
        log_warning "设备不支持 screenrecord,将只测试 screencap 模式"
        SKIP_H264=true
    fi

    # 检查端口
    log_info "检查端口 $MEDIA_SERVICE_PORT..."
    if lsof -Pi :$MEDIA_SERVICE_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_error "端口 $MEDIA_SERVICE_PORT 已被占用"
        log_info "请停止占用该端口的进程: lsof -i :$MEDIA_SERVICE_PORT"
        exit 1
    fi
    log_success "端口 $MEDIA_SERVICE_PORT 可用"

    # 创建结果目录
    mkdir -p "$RESULTS_DIR"
    log_success "结果将保存到: $RESULTS_DIR"
}

# =============================================================================
# 启动 Media Service
# =============================================================================

start_media_service() {
    local config_name=$1
    local capture_mode=$2
    local encoder_type=$3
    local use_worker_pool=$4

    log_info "启动 Media Service - $config_name"
    log_info "  CAPTURE_MODE=$capture_mode"
    log_info "  VIDEO_ENCODER_TYPE=$encoder_type"
    log_info "  USE_WORKER_POOL=$use_worker_pool"

    # 构建服务 (如果需要)
    if [ ! -f "$PROJECT_ROOT/media-service" ]; then
        log_info "编译 Media Service..."
        cd "$PROJECT_ROOT"
        go build -o media-service main.go || {
            log_error "编译失败"
            exit 1
        }
    fi

    # 设置环境变量并启动
    cd "$PROJECT_ROOT"

    PORT=$MEDIA_SERVICE_PORT \
    GIN_MODE=release \
    LOG_LEVEL=info \
    CAPTURE_MODE=$capture_mode \
    VIDEO_ENCODER_TYPE=$encoder_type \
    USE_WORKER_POOL=$use_worker_pool \
    VIDEO_WIDTH=1280 \
    VIDEO_HEIGHT=720 \
    VIDEO_BITRATE=2000000 \
    VIDEO_FRAMERATE=30 \
    STUN_SERVERS="stun:stun.l.google.com:19302" \
    ICE_PORT_MIN=50000 \
    ICE_PORT_MAX=50100 \
    REDIS_ENABLED=false \
    RABBITMQ_ENABLED=false \
    CONSUL_ENABLED=false \
    ./media-service > "$RESULTS_DIR/${config_name}-service.log" 2>&1 &

    MEDIA_PID=$!

    log_info "Media Service 已启动 (PID: $MEDIA_PID)"

    # 等待服务就绪
    log_info "等待服务就绪..."
    for i in {1..30}; do
        if curl -s "http://localhost:$MEDIA_SERVICE_PORT/health" >/dev/null 2>&1; then
            log_success "服务已就绪"
            return 0
        fi
        sleep 1
    done

    log_error "服务启动超时"
    return 1
}

# 停止 Media Service
stop_media_service() {
    if [ ! -z "$MEDIA_PID" ]; then
        log_info "停止 Media Service (PID: $MEDIA_PID)"
        kill $MEDIA_PID 2>/dev/null || true
        wait $MEDIA_PID 2>/dev/null || true
        MEDIA_PID=""
        sleep 2
    fi
}

# =============================================================================
# 性能测试
# =============================================================================

run_performance_test() {
    local config_name=$1
    local capture_mode=$2
    local encoder_type=$3
    local use_worker_pool=$4

    log_header "测试配置: $config_name"

    # 启动服务
    start_media_service "$config_name" "$capture_mode" "$encoder_type" "$use_worker_pool" || {
        log_error "服务启动失败,跳过此测试"
        return 1
    }

    # 创建 WebRTC 会话
    log_info "创建 WebRTC 会话..."

    # 简化的 SDP offer (仅用于测试)
    OFFER="v=0
o=- 0 0 IN IP4 127.0.0.1
s=-
t=0 0
m=video 9 UDP/TLS/RTP/SAVPF 102
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:test
a=ice-pwd:testpassword
a=fingerprint:sha-256 00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00
a=setup:actpass
a=mid:0
a=sendrecv
a=rtcp-mux
a=rtpmap:102 H264/90000
a=fmtp:102 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f"

    SESSION_ID=$(curl -s -X POST "http://localhost:$MEDIA_SERVICE_PORT/api/media/sessions" \
        -H "Content-Type: application/json" \
        -d "{
            \"deviceId\": \"$DEVICE_ID\",
            \"userId\": \"benchmark-user\",
            \"offer\": \"$(echo "$OFFER" | base64)\"
        }" | jq -r '.id' 2>/dev/null)

    if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "null" ]; then
        log_error "创建会话失败"
        stop_media_service
        return 1
    fi

    log_success "会话已创建: $SESSION_ID"

    # 采集性能指标
    log_info "采集性能指标 ($TEST_DURATION 秒)..."

    local start_time=$(date +%s)
    local end_time=$((start_time + TEST_DURATION))
    local sample_count=0

    # CSV 文件头
    echo "timestamp,fps,bitrate_mbps,cpu_percent,memory_mb,goroutines" > "$RESULTS_DIR/${config_name}-metrics.csv"

    while [ $(date +%s) -lt $end_time ]; do
        # 获取统计信息
        STATS=$(curl -s "http://localhost:$MEDIA_SERVICE_PORT/api/media/stats")

        if [ ! -z "$STATS" ]; then
            # 解析指标
            FPS=$(echo "$STATS" | jq -r '.pipeline_fps // 0' 2>/dev/null)
            BITRATE=$(echo "$STATS" | jq -r '.pipeline_bitrate // 0' 2>/dev/null)

            # 转换为 Mbps
            BITRATE_MBPS=$(echo "scale=2; $BITRATE / 1000000" | bc 2>/dev/null || echo "0")

            # 获取系统资源使用
            if [ "$(uname)" = "Darwin" ]; then
                # macOS
                CPU=$(ps -p $MEDIA_PID -o %cpu | tail -1 | xargs)
                MEM=$(ps -p $MEDIA_PID -o rss | tail -1 | xargs)
                MEM_MB=$(echo "scale=2; $MEM / 1024" | bc)
            else
                # Linux
                CPU=$(ps -p $MEDIA_PID -o %cpu --no-headers | xargs)
                MEM=$(ps -p $MEDIA_PID -o rss --no-headers | xargs)
                MEM_MB=$(echo "scale=2; $MEM / 1024" | bc)
            fi

            # Goroutine 数量 (从 pprof 获取)
            GOROUTINES=$(curl -s "http://localhost:$MEDIA_SERVICE_PORT/debug/pprof/goroutine?debug=1" | grep "^goroutine" | wc -l | xargs)

            # 记录到 CSV
            echo "$(date +%s),$FPS,$BITRATE_MBPS,$CPU,$MEM_MB,$GOROUTINES" >> "$RESULTS_DIR/${config_name}-metrics.csv"

            ((sample_count++))
        fi

        sleep 2
    done

    log_success "采集完成,共 $sample_count 个样本"

    # 关闭会话
    log_info "关闭会话..."
    curl -s -X DELETE "http://localhost:$MEDIA_SERVICE_PORT/api/media/sessions/$SESSION_ID" >/dev/null 2>&1

    # 停止服务
    stop_media_service

    # 计算汇总统计
    calculate_summary "$config_name"
}

# =============================================================================
# 计算汇总统计
# =============================================================================

calculate_summary() {
    local config_name=$1
    local csv_file="$RESULTS_DIR/${config_name}-metrics.csv"

    log_info "计算汇总统计..."

    # 跳过 CSV 头
    tail -n +2 "$csv_file" > "$RESULTS_DIR/${config_name}-data.tmp"

    # 使用 awk 计算平均值和最大值
    awk -F',' '
    BEGIN {
        count=0; sum_fps=0; sum_bitrate=0; sum_cpu=0; sum_mem=0; sum_goroutines=0;
        max_fps=0; max_cpu=0; max_mem=0; max_goroutines=0;
    }
    {
        count++;
        sum_fps += $2;
        sum_bitrate += $3;
        sum_cpu += $4;
        sum_mem += $5;
        sum_goroutines += $6;

        if ($2 > max_fps) max_fps = $2;
        if ($4 > max_cpu) max_cpu = $4;
        if ($5 > max_mem) max_mem = $5;
        if ($6 > max_goroutines) max_goroutines = $6;
    }
    END {
        printf "avg_fps=%.2f\n", sum_fps/count;
        printf "avg_bitrate=%.2f\n", sum_bitrate/count;
        printf "avg_cpu=%.2f\n", sum_cpu/count;
        printf "avg_mem=%.2f\n", sum_mem/count;
        printf "avg_goroutines=%.0f\n", sum_goroutines/count;
        printf "max_fps=%.2f\n", max_fps;
        printf "max_cpu=%.2f\n", max_cpu;
        printf "max_mem=%.2f\n", max_mem;
        printf "max_goroutines=%.0f\n", max_goroutines;
    }
    ' "$RESULTS_DIR/${config_name}-data.tmp" > "$RESULTS_DIR/${config_name}-summary.txt"

    rm "$RESULTS_DIR/${config_name}-data.tmp"

    # 显示汇总
    log_success "汇总统计 ($config_name):"
    cat "$RESULTS_DIR/${config_name}-summary.txt" | while read line; do
        echo "  $line"
    done
}

# =============================================================================
# 生成对比报告
# =============================================================================

generate_comparison_report() {
    log_header "生成对比报告"

    REPORT_FILE="$RESULTS_DIR/performance-comparison.md"

    {
        echo "# Media Service 性能对比报告"
        echo ""
        echo "生成时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "设备: $DEVICE_ID"
        echo "测试时长: ${TEST_DURATION}秒/配置"
        echo ""
        echo "## 测试配置"
        echo ""
        echo "| 配置 | Capture Mode | Encoder Type | Worker Pool |"
        echo "|------|--------------|--------------|-------------|"
        echo "| 基准 | screencap | vp8-simple | 否 |"
        echo "| P0优化 | screenrecord | passthrough | 否 |"
        echo "| P1优化 | screenrecord | h264 | 是 (4 workers) |"
        echo ""
        echo "## 性能指标"
        echo ""
        echo "### 帧率 (FPS)"
        echo ""
        echo "| 配置 | 平均 FPS | 最大 FPS | 提升 |"
        echo "|------|----------|----------|------|"

        # 读取基准数据
        baseline_fps=$(grep "avg_fps" "$RESULTS_DIR/baseline-summary.txt" 2>/dev/null | cut -d'=' -f2 || echo "N/A")

        for config in baseline p0-optimized p1-optimized; do
            if [ -f "$RESULTS_DIR/${config}-summary.txt" ]; then
                avg_fps=$(grep "avg_fps" "$RESULTS_DIR/${config}-summary.txt" | cut -d'=' -f2)
                max_fps=$(grep "max_fps" "$RESULTS_DIR/${config}-summary.txt" | cut -d'=' -f2)

                if [ "$config" = "baseline" ]; then
                    improvement="基准"
                elif [ "$baseline_fps" != "N/A" ]; then
                    improvement=$(echo "scale=0; (($avg_fps - $baseline_fps) / $baseline_fps) * 100" | bc)
                    improvement="+${improvement}%"
                else
                    improvement="N/A"
                fi

                echo "| $config | $avg_fps | $max_fps | $improvement |"
            fi
        done

        echo ""
        echo "### CPU 使用率 (%)"
        echo ""
        echo "| 配置 | 平均 CPU | 最大 CPU | 降低 |"
        echo "|------|----------|----------|------|"

        baseline_cpu=$(grep "avg_cpu" "$RESULTS_DIR/baseline-summary.txt" 2>/dev/null | cut -d'=' -f2 || echo "N/A")

        for config in baseline p0-optimized p1-optimized; do
            if [ -f "$RESULTS_DIR/${config}-summary.txt" ]; then
                avg_cpu=$(grep "avg_cpu" "$RESULTS_DIR/${config}-summary.txt" | cut -d'=' -f2)
                max_cpu=$(grep "max_cpu" "$RESULTS_DIR/${config}-summary.txt" | cut -d'=' -f2)

                if [ "$config" = "baseline" ]; then
                    reduction="基准"
                elif [ "$baseline_cpu" != "N/A" ]; then
                    reduction=$(echo "scale=0; (($baseline_cpu - $avg_cpu) / $baseline_cpu) * 100" | bc)
                    reduction="-${reduction}%"
                else
                    reduction="N/A"
                fi

                echo "| $config | $avg_cpu% | $max_cpu% | $reduction |"
            fi
        done

        echo ""
        echo "### 内存使用 (MB)"
        echo ""
        echo "| 配置 | 平均内存 | 最大内存 |"
        echo "|------|----------|----------|"

        for config in baseline p0-optimized p1-optimized; do
            if [ -f "$RESULTS_DIR/${config}-summary.txt" ]; then
                avg_mem=$(grep "avg_mem" "$RESULTS_DIR/${config}-summary.txt" | cut -d'=' -f2)
                max_mem=$(grep "max_mem" "$RESULTS_DIR/${config}-summary.txt" | cut -d'=' -f2)

                echo "| $config | ${avg_mem}MB | ${max_mem}MB |"
            fi
        done

        echo ""
        echo "### Goroutine 数量"
        echo ""
        echo "| 配置 | 平均 | 最大 |"
        echo "|------|------|------|"

        for config in baseline p0-optimized p1-optimized; do
            if [ -f "$RESULTS_DIR/${config}-summary.txt" ]; then
                avg_goroutines=$(grep "avg_goroutines" "$RESULTS_DIR/${config}-summary.txt" | cut -d'=' -f2)
                max_goroutines=$(grep "max_goroutines" "$RESULTS_DIR/${config}-summary.txt" | cut -d'=' -f2)

                echo "| $config | $avg_goroutines | $max_goroutines |"
            fi
        done

        echo ""
        echo "### 码率 (Mbps)"
        echo ""
        echo "| 配置 | 平均码率 |"
        echo "|------|----------|"

        for config in baseline p0-optimized p1-optimized; do
            if [ -f "$RESULTS_DIR/${config}-summary.txt" ]; then
                avg_bitrate=$(grep "avg_bitrate" "$RESULTS_DIR/${config}-summary.txt" | cut -d'=' -f2)

                echo "| $config | ${avg_bitrate}Mbps |"
            fi
        done

        echo ""
        echo "## 结论"
        echo ""
        echo "详细指标数据请查看:"
        echo "- 基准配置: \`baseline-metrics.csv\`"
        echo "- P0 优化: \`p0-optimized-metrics.csv\`"
        echo "- P1 优化: \`p1-optimized-metrics.csv\`"
        echo ""
        echo "服务日志:"
        echo "- 基准配置: \`baseline-service.log\`"
        echo "- P0 优化: \`p0-optimized-service.log\`"
        echo "- P1 优化: \`p1-optimized-service.log\`"

    } > "$REPORT_FILE"

    log_success "对比报告已生成: $REPORT_FILE"

    # 显示报告
    cat "$REPORT_FILE"
}

# =============================================================================
# 主函数
# =============================================================================

main() {
    echo -e "${CYAN}"
    echo "═══════════════════════════════════════════════════════════"
    echo "  Media Service 性能基准测试"
    echo "  对比不同优化配置的性能表现"
    echo "═══════════════════════════════════════════════════════════"
    echo -e "${NC}"

    # 前置检查
    check_prerequisites

    # 测试 1: 基准配置 (screencap + VP8)
    run_performance_test "baseline" "screencap" "vp8-simple" "false"

    # 测试 2: P0 优化 (screenrecord + pass-through)
    if [ "$SKIP_H264" != "true" ]; then
        run_performance_test "p0-optimized" "screenrecord" "passthrough" "false"
    else
        log_warning "跳过 P0 优化测试 (设备不支持 screenrecord)"
    fi

    # 测试 3: P1 优化 (Worker Pool + H.264 hardware)
    if [ "$SKIP_H264" != "true" ]; then
        run_performance_test "p1-optimized" "screenrecord" "h264" "true"
    else
        log_warning "跳过 P1 优化测试 (设备不支持 screenrecord)"
    fi

    # 生成对比报告
    generate_comparison_report

    log_success "所有测试完成!"
    log_info "结果目录: $RESULTS_DIR"
}

# 检查参数
if [[ "$1" == "--help" ]]; then
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --duration N    设置每个测试的持续时间 (秒,默认 30)"
    echo "  --help          显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                 # 使用默认配置运行"
    echo "  $0 --duration 60   # 每个测试运行 60 秒"
    exit 0
fi

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --duration)
            TEST_DURATION="$2"
            shift 2
            ;;
        *)
            log_error "未知参数: $1"
            exit 1
            ;;
    esac
done

# 运行主函数
main
