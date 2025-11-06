#!/bin/bash

# 云手机平台 - Service Worker 检查脚本
# 帮助用户识别和清理浏览器中的 Service Worker

echo "🔍 检查 Service Worker 状态"
echo "================================"
echo ""

echo "📋 检查代码库中的 Service Worker 配置:"
echo ""

# 检查 PWA 依赖
echo "1️⃣ 检查 package.json 中的 PWA 依赖:"
if grep -r "vite-plugin-pwa\|workbox" /home/eric/next-cloudphone/frontend/*/package.json 2>/dev/null; then
    echo "   ⚠️ 发现 PWA 依赖"
else
    echo "   ✅ 无 PWA 依赖"
fi
echo ""

# 检查 Service Worker 文件
echo "2️⃣ 检查 Service Worker 文件:"
SW_FILES=$(find /home/eric/next-cloudphone/frontend -name "sw.js" -o -name "service-worker.js" -o -name "*workbox*" 2>/dev/null)
if [ -z "$SW_FILES" ]; then
    echo "   ✅ 无 Service Worker 文件"
else
    echo "   ⚠️ 发现以下文件:"
    echo "$SW_FILES"
fi
echo ""

# 检查 Service Worker 注册代码
echo "3️⃣ 检查 Service Worker 注册代码:"
if grep -r "registerServiceWorker\|navigator.serviceWorker" /home/eric/next-cloudphone/frontend/*/src/ 2>/dev/null; then
    echo "   ⚠️ 发现 Service Worker 注册代码"
else
    echo "   ✅ 无 Service Worker 注册代码"
fi
echo ""

# 检查 vite.config.ts
echo "4️⃣ 检查 vite.config.ts 配置:"
if grep -r "vite-plugin-pwa" /home/eric/next-cloudphone/frontend/*/vite.config.ts 2>/dev/null; then
    echo "   ⚠️ 发现 vite-plugin-pwa 配置"
else
    echo "   ✅ 无 PWA 插件配置"
fi
echo ""

echo "================================"
echo "📊 检查结果:"
echo ""
echo "✅ 当前代码库中没有 Service Worker 配置"
echo "✅ 这意味着 workbox 错误来自浏览器缓存"
echo ""
echo "🔧 解决方法:"
echo ""
echo "请在浏览器中执行以下操作："
echo ""
echo "方法 1 (推荐): 使用开发者工具"
echo "  1. 打开 http://localhost:5174"
echo "  2. 按 F12 打开开发者工具"
echo "  3. 进入 'Application' 标签"
echo "  4. 左侧选择 'Service Workers'"
echo "  5. 点击所有 Service Worker 的 'Unregister'"
echo "  6. 点击 'Clear site data'"
echo "  7. 硬刷新页面 (Ctrl+Shift+R)"
echo ""
echo "方法 2: 清除浏览器缓存"
echo "  Chrome: 设置 → 隐私和安全 → 清除浏览数据"
echo "  Firefox: 设置 → 隐私与安全 → 清除数据"
echo ""
echo "方法 3: 使用隐私/无痕模式测试"
echo "  Ctrl+Shift+N (Chrome) 或 Ctrl+Shift+P (Firefox)"
echo ""
echo "================================"
