# User Service Dockerfile

# ===== 开发环境 =====
# 使用标准镜像而非alpine，以避免bcrypt原生模块问题
FROM node:20-slim AS development

# 安装系统依赖（procps 提供 ps 命令，watch 模式需要）
RUN apt-get update && apt-get install -y procps && rm -rf /var/lib/apt/lists/*

# 安装 pnpm
RUN npm install -g pnpm

WORKDIR /app

# 复制 package 文件
COPY package.json pnpm-lock.yaml* ./

# 安装依赖
RUN pnpm install

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3001

# 开发模式启动
CMD ["pnpm", "run", "dev"]

# ===== 构建阶段 =====
FROM node:20-slim AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package 文件
COPY backend/user-service/package.json backend/user-service/pnpm-lock.yaml* ./

# 安装依赖
RUN pnpm install --no-frozen-lockfile

# 复制源代码
COPY backend/user-service/ ./

# 构建应用
RUN pnpm build

# 生产阶段
# 使用标准镜像而非alpine，以避免bcrypt原生模块问题
FROM node:20-slim

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package 文件
COPY backend/user-service/package.json backend/user-service/pnpm-lock.yaml* ./

# 只安装生产依赖
RUN pnpm install --prod

# 从构建阶段复制编译后的文件
COPY --from=builder /app/dist ./dist

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

USER nestjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/main.js"]
