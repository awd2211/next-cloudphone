# Admin Frontend Dockerfile

# ===== 开发环境 =====
FROM node:20-alpine AS development

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install

COPY . .

EXPOSE 5173

CMD ["pnpm", "run", "dev"]

FROM node:18-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package 文件
COPY frontend/admin/package.json frontend/admin/pnpm-lock.yaml* ./

# 安装依赖
RUN pnpm install --no-frozen-lockfile

# 复制源代码
COPY frontend/admin/ ./

# 构建参数
ARG VITE_API_BASE_URL
ARG VITE_WS_URL
ARG VITE_APP_TITLE="云手机平台管理后台"

# 设置环境变量
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_APP_TITLE=$VITE_APP_TITLE

# 构建应用
RUN pnpm build

# 生产阶段 - Nginx
FROM nginx:alpine

# 复制自定义 nginx 配置
COPY infrastructure/docker/nginx-frontend.conf /etc/nginx/conf.d/default.conf

# 从构建阶段复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 创建非 root 用户
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S nginx-user -u 1001 -G nginx-user && \
    chown -R nginx-user:nginx-user /usr/share/nginx/html && \
    chown -R nginx-user:nginx-user /var/cache/nginx && \
    chown -R nginx-user:nginx-user /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx-user:nginx-user /var/run/nginx.pid

USER nginx-user

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
