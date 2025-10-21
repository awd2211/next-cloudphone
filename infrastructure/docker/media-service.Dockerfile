# Media Service Dockerfile (Go)
# Media Service Dockerfile

# ===== 开发环境 =====
FROM golang:1.21-alpine AS development

WORKDIR /app

# 安装健康检查工具
RUN apk add --no-cache wget

COPY go.mod go.sum ./

RUN go mod download

COPY . .

EXPOSE 30007
EXPOSE 50000-50100/udp

CMD ["go", "run", "main.go"]

FROM golang:1.21-alpine AS builder

WORKDIR /app

# 安装构建依赖
RUN apk add --no-cache git gcc musl-dev

# 复制 go mod 文件
COPY backend/media-service/go.mod backend/media-service/go.sum* ./

# 下载依赖
RUN go mod download

# 复制源代码
COPY backend/media-service/ ./

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -a -installsuffix cgo -ldflags="-w -s" -o media-service .

# 生产阶段
FROM alpine:latest

WORKDIR /app

# 安装运行时依赖（包括健康检查工具）
RUN apk add --no-cache ca-certificates tzdata wget

# 创建非 root 用户
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001 -G appuser

# 从构建阶段复制编译后的二进制文件
COPY --from=builder /app/media-service .

# 设置时区
ENV TZ=Asia/Shanghai

# 切换到非 root 用户
USER appuser

EXPOSE 30007
EXPOSE 50000-50100/udp

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 -O /dev/null http://localhost:30007/health || exit 1

CMD ["./media-service"]
