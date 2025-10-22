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

# 复制 notification-service package.json
COPY backend/notification-service/package.json ./backend/notification-service/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY backend/notification-service ./backend/notification-service

# 构建应用
WORKDIR /app/backend/notification-service
RUN pnpm run build

# 运行阶段
FROM node:18-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制构建产物和依赖
COPY --from=builder /app/backend/notification-service/dist ./dist
COPY --from=builder /app/backend/notification-service/node_modules ./node_modules
COPY --from=builder /app/node_modules ./node_modules_root
COPY --from=builder /app/backend/notification-service/package.json ./

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || '30006') + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 暴露端口（通过环境变量配置）
ENV PORT=30006
EXPOSE ${PORT}

# 启动应用
CMD ["node", "dist/main.js"]
