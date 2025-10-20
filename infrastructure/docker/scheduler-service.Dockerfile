# Scheduler Service Dockerfile (Python)
FROM python:3.9-slim AS builder

WORKDIR /app

# 安装构建依赖
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc python3-dev && \
    rm -rf /var/lib/apt/lists/*

# 复制 requirements 文件
COPY backend/scheduler-service/requirements.txt ./

# 安装 Python 依赖
RUN pip install --no-cache-dir --user -r requirements.txt

# 生产阶段
FROM python:3.9-slim

WORKDIR /app

# 安装运行时依赖
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# 从构建阶段复制安装的包
COPY --from=builder /root/.local /root/.local

# 确保脚本在 PATH 中
ENV PATH=/root/.local/bin:$PATH

# 复制应用代码
COPY backend/scheduler-service/ ./

# 创建日志目录
RUN mkdir -p /var/log && \
    chmod 777 /var/log

# 创建非 root 用户
RUN useradd -m -u 1001 appuser && \
    chown -R appuser:appuser /app /var/log

USER appuser

EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3005/health || exit 1

# 启动应用
CMD ["python", "main.py"]
