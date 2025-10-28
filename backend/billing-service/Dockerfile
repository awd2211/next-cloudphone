# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 pnpm workspace 配置
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./

# 复制 shared 包
COPY backend/shared ./backend/shared

# 复制 billing-service package.json
COPY backend/billing-service/package.json ./backend/billing-service/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY backend/billing-service ./backend/billing-service

# 构建应用
WORKDIR /app/backend/billing-service
RUN pnpm run build

# 运行阶段
FROM node:18-alpine

# 安装 dumb-init 用于正确处理信号
RUN apk add --no-cache dumb-init

# 创建非 root 用户和组
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制构建产物和依赖
COPY --from=builder --chown=nestjs:nodejs /app/backend/billing-service/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/backend/billing-service/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules_root
COPY --from=builder --chown=nestjs:nodejs /app/backend/billing-service/package.json ./

# 切换到非 root 用户
USER nestjs

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || '30005') + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 暴露端口（通过环境变量配置）
ENV PORT=30005 \
    NODE_ENV=production
EXPOSE ${PORT}

# 使用 dumb-init 启动应用（正确处理信号）
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]

