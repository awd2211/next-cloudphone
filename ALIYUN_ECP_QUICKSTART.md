# ⚡ 阿里云无影云手机 - 5分钟快速开始

## 🎯 前提条件

- ✅ 阿里云账号（已实名认证）
- ✅ 云手机平台已部署运行
- ✅ 有管理员权限

---

## 📝 Step 1: 获取阿里云凭证（2分钟）

### 1.1 登录阿里云控制台

访问: https://ram.console.aliyun.com/

### 1.2 创建 RAM 用户

1. 点击 **用户** → **创建用户**
2. 用户名: `cloudphone-service`
3. 勾选 **编程访问**
4. 点击 **确定**
5. **保存 AccessKey ID 和 Secret**（只显示一次！）

### 1.3 授权

给用户授予 `AliyunECPFullAccess` 权限：
1. 找到创建的用户 `cloudphone-service`
2. 点击 **添加权限**
3. 搜索并选择 `AliyunECPFullAccess`
4. 点击 **确定**

### 1.4 获取网络配置

访问: https://ecp.console.aliyun.com/

1. 进入 **网络管理**
2. 记录 **Office Site ID** (os-xxxxx)
3. 记录 **VSwitch ID** (vsw-xxxxx)

### 1.5 创建密钥对（用于 ADB）

1. 进入 **密钥对管理**
2. 点击 **创建密钥对**
3. 记录 **Key Pair ID** (kp-xxxxx)

### 1.6 获取镜像 ID

1. 进入 **镜像管理**
2. 选择一个 Android 镜像
3. 记录 **Image ID** (img-xxxxx)

---

## ⚙️ Step 2: 配置平台（1分钟）

编辑 `backend/device-service/.env`:

```bash
# 启用新版 SDK（推荐）
ALIYUN_SDK_VERSION=v2

# 阿里云凭证
ALIYUN_ACCESS_KEY_ID=LTAI5tXXXXXXXXXXXXXX
ALIYUN_ACCESS_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxx

# 地域
ALIYUN_REGION=cn-hangzhou

# 网络配置（从控制台获取）
ALIYUN_DEFAULT_OFFICE_SITE_ID=os-xxxxxxxxxxxxx
ALIYUN_DEFAULT_VSWITCH_ID=vsw-xxxxxxxxxxxxx

# 密钥对（从控制台获取）
ALIYUN_DEFAULT_KEY_PAIR_ID=kp-xxxxxxxxxxxxx

# 默认镜像（从控制台获取）
ALIYUN_DEFAULT_IMAGE_ID=img-xxxxxxxxxxxxx
```

---

## 🔄 Step 3: 重启服务（30秒）

```bash
# 重启设备服务
pm2 restart device-service

# 查看日志，确认阿里云 Provider 已加载
pm2 logs device-service --lines 20 | grep -i aliyun
```

**期望输出**:
```
Using AliyunProviderV2 (2023-09-30 API) - Instance Group model
Registered 4 providers: redroid, physical, huawei_cph, aliyun_ecp
```

---

## 📱 Step 4: 下载 Web SDK（1分钟）

### 4.1 下载

访问: https://wuying.aliyun.com/wuyingWebSdk/docs/intro/download

点击 **下载 Web Client SDK**

### 4.2 安装

```bash
# 解压下载的文件
unzip wuying-web-sdk.zip

# 复制 SDK 到项目
cp WuyingWebSDK.js /home/eric/next-cloudphone/frontend/admin/public/

# 验证
ls -lh /home/eric/next-cloudphone/frontend/admin/public/WuyingWebSDK.js
# 文件应该 > 100KB
```

### 4.3 重启前端（如果需要）

```bash
pm2 restart frontend-admin
```

---

## 🎉 Step 5: 创建你的第一台云手机（30秒）

### 方式 A: 通过 API

```bash
# 获取 Token（登录后台获取）
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 创建设备
curl -X POST "http://localhost:30000/devices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "我的第一台阿里云手机",
    "providerType": "aliyun_ecp",
    "providerSpecificConfig": {
      "regionId": "cn-hangzhou",
      "instanceType": "acp.basic.small",
      "chargeType": "PostPaid"
    }
  }'
```

### 方式 B: 通过管理后台

1. 访问: http://localhost:5173
2. 登录账号
3. 进入 **设备管理** → **创建设备**
4. 选择提供商: **阿里云 ECP**
5. 填写配置:
   - 设备名称: `测试手机`
   - 地域: `cn-hangzhou`
   - 规格: `acp.basic.small`
   - 计费: `按量付费`
6. 点击 **创建**

### 等待设备启动（约 2-3 分钟）

```bash
# 查询设备状态
curl -X GET "http://localhost:30000/devices/$DEVICE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.status'

# 状态变化: creating → idle → running
```

---

## 🖥️ Step 6: 连接云手机

### 6.1 进入设备详情页

访问: http://localhost:5173/devices/$DEVICE_ID

### 6.2 等待连接

- 页面会自动检测到阿里云设备
- 加载阿里云播放器组件
- 获取连接票据
- 建立 WebRTC 连接

### 6.3 开始使用

连接成功后，你可以：

- 🖱️ 用鼠标点击和拖拽
- ⌨️ 用键盘输入
- 📋 复制粘贴文本
- 🔊 播放音频（需配置）
- 🎮 使用触摸手势

---

## ✅ 验证清单

完成后，确认以下项目：

- [ ] 阿里云 AccessKey 已配置
- [ ] `.env` 文件已更新
- [ ] device-service 已重启
- [ ] 日志显示 "AliyunProviderV2" 已加载
- [ ] Web SDK 已下载到 `public/WuyingWebSDK.js`
- [ ] 文件大小 > 100KB
- [ ] 设备创建成功
- [ ] 设备状态显示 "running"
- [ ] 播放器连接成功
- [ ] 可以看到云手机画面

---

## 🔧 常见问题

### Q1: 创建设备失败 - "AccessKey 无效"

**解决**:
```bash
# 检查 AccessKey 是否正确
cat backend/device-service/.env | grep ALIYUN_ACCESS_KEY

# 测试 API 连接
curl "https://eds-aic.cn-hangzhou.aliyuncs.com" \
  -H "x-acs-accesskeyid: $ALIYUN_ACCESS_KEY_ID"
```

### Q2: 播放器黑屏

**原因**: SDK 未加载或票据失败

**解决**:
```bash
# 1. 检查 SDK 文件
ls -lh frontend/admin/public/WuyingWebSDK.js

# 2. 打开浏览器控制台（F12）
# 查看是否有错误信息

# 3. 检查设备状态
curl "http://localhost:30000/devices/$DEVICE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.status'
```

### Q3: 创建设备很慢

**正常**: 阿里云创建实例通常需要 2-3 分钟

**加速提示**:
- 使用已有的镜像（不要创建新镜像）
- 选择负载较低的可用区
- 使用按量付费（比包年包月快）

---

## 🎓 下一步学习

完成快速开始后，你可以：

1. **查看完整文档**: [ALIYUN_ECP_USAGE_GUIDE.md](./ALIYUN_ECP_USAGE_GUIDE.md)
2. **了解高级功能**:
   - 应用安装管理
   - 自定义镜像
   - ADB 连接
   - 批量操作
3. **优化成本**:
   - 选择合适的规格
   - 使用自动清理
   - 监控使用情况

---

## 💡 提示

- 🔥 **首次使用**: 建议先创建 1 台设备测试
- 💰 **成本控制**: 按量付费每小时约 ¥0.5-2.0（取决于规格）
- 🚀 **性能优化**: 2核4G 适合大多数应用
- 🔐 **安全**: 使用 RAM 子账号，不要用主账号
- ⏰ **票据有效期**: 30 秒，需要及时使用

---

## 🆘 需要帮助？

- 📖 查看 [完整文档](./ALIYUN_ECP_USAGE_GUIDE.md)
- 🐛 遇到问题？查看 [故障排查](./ALIYUN_ECP_USAGE_GUIDE.md#-故障排查)
- 💬 加入社区讨论
- 📧 联系技术支持

---

**🎉 恭喜！你已成功部署阿里云云手机！**

现在可以开始管理你的云端 Android 设备了！🚀
