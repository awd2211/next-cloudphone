# ========================================
# Stage 1: Builder
# ========================================
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@8

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# Copy shared package (dependency)
COPY backend/shared ./backend/shared

# Copy service package.json first for better caching
COPY backend/sms-receive-service/package.json ./backend/sms-receive-service/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy service source code
COPY backend/sms-receive-service ./backend/sms-receive-service

# Build shared package first
WORKDIR /app/backend/shared
RUN pnpm build

# Build sms-receive-service
WORKDIR /app/backend/sms-receive-service
RUN pnpm build

# ========================================
# Stage 2: Production Runtime
# ========================================
FROM node:20-alpine AS runtime

# Install pnpm and curl (for health checks)
RUN npm install -g pnpm@8 && \
    apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S sms-service -u 1001

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY --from=builder /app/package.json /app/pnpm-lock.yaml* /app/pnpm-workspace.yaml* ./

# Copy shared package (built)
COPY --from=builder /app/backend/shared ./backend/shared

# Copy service files
COPY --from=builder /app/backend/sms-receive-service/package.json ./backend/sms-receive-service/
COPY --from=builder /app/backend/sms-receive-service/dist ./backend/sms-receive-service/dist
COPY --from=builder /app/backend/sms-receive-service/.env.example ./backend/sms-receive-service/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Change ownership to non-root user
RUN chown -R sms-service:nodejs /app

# Switch to non-root user
USER sms-service

# Set working directory to service
WORKDIR /app/backend/sms-receive-service

# Expose service port
EXPOSE 30008

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:30008/health || exit 1

# Start the service
CMD ["node", "dist/main.js"]
