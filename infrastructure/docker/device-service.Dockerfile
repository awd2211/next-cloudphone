# Device Service Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package 文件
COPY backend/device-service/package.json backend/device-service/pnpm-lock.yaml* ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY backend/device-service/ ./

# 构建应用
RUN pnpm build

# 生产阶段
FROM node:18-alpine

WORKDIR /app

# 安装 Docker CLI (用于管理容器)
RUN apk add --no-cache docker-cli

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package 文件
COPY backend/device-service/package.json backend/device-service/pnpm-lock.yaml* ./

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 从构建阶段复制编译后的文件
COPY --from=builder /app/dist ./dist

# 创建非 root 用户 (需要访问 Docker socket)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    addgroup nestjs docker

USER nestjs

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/main.js"]
