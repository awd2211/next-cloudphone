# App Service Dockerfile

# ===== 开发环境 =====
FROM node:20-alpine AS development

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install

COPY . .

EXPOSE 3000

CMD ["pnpm", "run", "dev"]

FROM node:18-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package 文件
COPY backend/app-service/package.json backend/app-service/pnpm-lock.yaml* ./

# 安装依赖
RUN pnpm install --no-frozen-lockfile

# 复制源代码
COPY backend/app-service/ ./

# 构建应用
RUN pnpm build

# 生产阶段
FROM node:18-alpine

WORKDIR /app

# 安装 aapt (用于解析 APK)
RUN apk add --no-cache android-tools

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package 文件
COPY backend/app-service/package.json backend/app-service/pnpm-lock.yaml* ./

# 只安装生产依赖
RUN pnpm install --prod --no-frozen-lockfile

# 从构建阶段复制编译后的文件
COPY --from=builder /app/dist ./dist

# 创建上传目录
RUN mkdir -p /tmp/apk-uploads

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /tmp/apk-uploads

USER nestjs

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/main.js"]
