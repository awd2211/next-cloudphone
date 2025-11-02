# SMS Receive Service Dockerfile

# ===== 开发环境 =====
FROM node:20-slim AS development

# 安装系统依赖和 curl (健康检查)
RUN apt-get update && \
    apt-get install -y procps curl && \
    rm -rf /var/lib/apt/lists/*

# 安装 pnpm
RUN npm install -g pnpm@8

WORKDIR /app

# 复制 workspace 配置
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# 复制 shared package
COPY backend/shared ./backend/shared

# 复制 service package 文件
COPY backend/sms-receive-service/package.json ./backend/sms-receive-service/

# 安装依赖
RUN pnpm install

# 复制 service 源代码
COPY backend/sms-receive-service ./backend/sms-receive-service

# 构建 shared package
WORKDIR /app/backend/shared
RUN pnpm build

# 回到 service 目录
WORKDIR /app/backend/sms-receive-service

# 暴露端口
EXPOSE 30008

# 开发模式启动
CMD ["pnpm", "run", "dev"]

# ===== 构建阶段 =====
FROM node:20-slim AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@8

# 复制 workspace 配置
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# 复制 shared package
COPY backend/shared ./backend/shared

# 复制 service package.json
COPY backend/sms-receive-service/package.json ./backend/sms-receive-service/

# 安装依赖
RUN pnpm install

# 复制源代码
COPY backend/shared ./backend/shared
COPY backend/sms-receive-service ./backend/sms-receive-service

# 构建 shared package
WORKDIR /app/backend/shared
RUN pnpm build

# 构建 service
WORKDIR /app/backend/sms-receive-service
RUN pnpm build

# ===== 生产阶段 =====
FROM node:20-slim AS production

# 安装 curl 用于健康检查
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

# 安装 pnpm
RUN npm install -g pnpm@8

WORKDIR /app

# 复制 workspace 配置
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# 复制 shared package (built)
COPY --from=builder /app/backend/shared ./backend/shared

# 复制 service package.json
COPY --from=builder /app/backend/sms-receive-service/package.json ./backend/sms-receive-service/

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 从构建阶段复制编译后的文件
COPY --from=builder /app/backend/sms-receive-service/dist ./backend/sms-receive-service/dist

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S sms-service -u 1001

# 改变所有权
RUN chown -R sms-service:nodejs /app

USER sms-service

WORKDIR /app/backend/sms-receive-service

EXPOSE 30008

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:30008/health || exit 1

CMD ["node", "dist/main.js"]
