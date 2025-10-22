#!/bin/bash

# PM2 高级功能设置脚本

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}  PM2 高级功能配置脚本${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

# ========================================
# 1. 安装 PM2 日志轮转
# ========================================
echo -e "${YELLOW}[1/4] 安装 PM2 日志轮转模块...${NC}"

if pm2 ls | grep -q "pm2-logrotate"; then
  echo -e "${GREEN}✅ pm2-logrotate 已安装${NC}"
else
  echo "安装 pm2-logrotate..."
  pm2 install pm2-logrotate

  # 配置日志轮转
  pm2 set pm2-logrotate:max_size 100M
  pm2 set pm2-logrotate:retain 30
  pm2 set pm2-logrotate:compress true
  pm2 set pm2-logrotate:workerInterval 30

  echo -e "${GREEN}✅ 日志轮转配置完成${NC}"
  echo "   - 最大文件大小: 100MB"
  echo "   - 保留天数: 30天"
  echo "   - 压缩: 启用"
fi

echo ""

# ========================================
# 2. 安装 PM2 服务器监控
# ========================================
echo -e "${YELLOW}[2/4] 安装 PM2 服务器监控模块...${NC}"

if pm2 ls | grep -q "pm2-server-monit"; then
  echo -e "${GREEN}✅ pm2-server-monit 已安装${NC}"
else
  echo "安装 pm2-server-monit..."
  pm2 install pm2-server-monit
  echo -e "${GREEN}✅ 服务器监控安装完成${NC}"
fi

echo ""

# ========================================
# 3. 配置 PM2 开机自启动
# ========================================
echo -e "${YELLOW}[3/4] 配置 PM2 开机自启动...${NC}"

# 保存当前 PM2 进程列表
pm2 save

# 生成启动脚本
if pm2 startup | grep -q "sudo"; then
  echo -e "${YELLOW}⚠️  需要 sudo 权限设置开机自启${NC}"
  echo "请手动运行以下命令："
  pm2 startup | grep "sudo"
else
  pm2 startup
  echo -e "${GREEN}✅ 开机自启动配置完成${NC}"
fi

echo ""

# ========================================
# 4. 验证健康检查端点
# ========================================
echo -e "${YELLOW}[4/4] 验证服务健康检查端点...${NC}"

SERVICES=(
  "api-gateway:30000"
  "user-service:30001"
  "device-service:30002"
  "app-service:30003"
  "billing-service:30005"
)

echo ""
for service in "${SERVICES[@]}"; do
  IFS=':' read -r name port <<< "$service"

  if curl -s -f "http://localhost:$port/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ $name ($port) - 健康检查通过${NC}"
  else
    echo -e "${RED}❌ $name ($port) - 健康检查失败或服务未运行${NC}"
  fi
done

echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}  配置完成摘要${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo -e "${GREEN}✅ PM2 日志轮转${NC} - 已启用"
echo -e "${GREEN}✅ PM2 服务器监控${NC} - 已启用"
echo -e "${GREEN}✅ PM2 开机自启${NC} - 已配置"
echo ""
echo "下一步："
echo "  1. 停止当前服务: pm2 stop all"
echo "  2. 启用高级配置: pm2 start ecosystem.config.advanced.js"
echo "  3. 查看监控界面: pm2 monit"
echo "  4. 查看 Web 界面: pm2 web"
echo ""
echo "高级命令："
echo "  - 零停机重启: pm2 reload all"
echo "  - 扩展实例: pm2 scale api-gateway 8"
echo "  - 查看日志: pm2 logs"
echo "  - 查看指标: pm2 monit"
echo ""
echo -e "${CYAN}================================================${NC}"
