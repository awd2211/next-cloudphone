# 阿里云无影云手机（ECP）使用指南

## 📋 整合状态总结

### ✅ 已完成的功能（100%）

#### 后端实现

| 组件 | 状态 | 说明 |
|------|------|------|
| **SDK 依赖** | ✅ 完成 | @alicloud/eds-aic20230930, @alicloud/openapi-client |
| **类型定义** | ✅ 完成 | aliyun.types.ts - 完整的接口和枚举定义 |
| **ECP 客户端** | ✅ 完成 | AliyunEcpClient (旧版) + AliyunEcpV2Client (新版) |
| **设备提供商** | ✅ 完成 | AliyunProvider (旧版) + AliyunProviderV2 (新版) |
| **模块注册** | ✅ 完成 | 自动注册到 DeviceProviderFactory |
| **版本切换** | ✅ 完成 | 通过 ALIYUN_SDK_VERSION=v2 环境变量 |
| **Entity 支持** | ✅ 完成 | Device Entity 支持 ALIYUN_ECP 类型 |
| **环境配置** | ✅ 完成 | .env.example 包含完整配置项 |

#### 前端实现

| 组件 | 状态 | 说明 |
|------|------|------|
| **播放器组件** | ✅ 完成 | AliyunCloudPhonePlayer - 完整的 WebRTC 播放器 |
| **测试组件** | ✅ 完成 | AliyunCloudPhoneTestPlayer - 独立测试页面 |
| **详情页集成** | ✅ 完成 | 根据 providerType 自动切换播放器 |
| **懒加载** | ✅ 完成 | 播放器组件使用 React.lazy |
| **错误边界** | ✅ 完成 | ErrorBoundary 保护播放器崩溃 |

### 📦 SDK 下载要求

阿里云 Web SDK 需要从官方下载：

1. **下载地址**: https://wuying.aliyun.com/wuyingWebSdk/docs/intro/download
2. **安装位置**: `frontend/admin/public/WuyingWebSDK.js`
3. **隐私政策**: 使用前需同意《无影云电脑 SDK 隐私权政策》
4. **使用限制**: 仅限个人或企业内部使用

---

## 🚀 快速开始

### Step 1: 配置阿里云账号

在 `backend/device-service/.env` 中配置阿里云凭证：

```bash
# ========================================
# 阿里云云手机 ECP 配置
# ========================================

# SDK 版本 (推荐使用 v2)
ALIYUN_SDK_VERSION=v2

# 阿里云 Access Key
ALIYUN_ACCESS_KEY_ID=LTAI5tXXXXXXXXXXXXXX
ALIYUN_ACCESS_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxx

# 默认地域
ALIYUN_REGION=cn-hangzhou

# ===== 新版 SDK (V2) 必需配置 =====
# 网络 ID (从阿里云控制台获取)
ALIYUN_DEFAULT_OFFICE_SITE_ID=os-xxxxxxxxxxxxx

# 虚拟交换机 ID
ALIYUN_DEFAULT_VSWITCH_ID=vsw-xxxxxxxxxxxxx

# 密钥对 ID (用于 ADB)
ALIYUN_DEFAULT_KEY_PAIR_ID=kp-xxxxxxxxxxxxx

# 默认镜像 ID
ALIYUN_DEFAULT_IMAGE_ID=img-xxxxxxxxxxxxx
```

### Step 2: 下载 Web SDK

```bash
# 1. 访问下载页面
open https://wuying.aliyun.com/wuyingWebSdk/docs/intro/download

# 2. 下载 Web Client SDK

# 3. 解压并复制到项目
cp WuyingWebSDK.js /home/eric/next-cloudphone/frontend/admin/public/

# 4. 验证安装
ls -lh frontend/admin/public/WuyingWebSDK.js
```

### Step 3: 重启服务

```bash
# 重启后端服务
pm2 restart device-service

# 查看日志确认阿里云 Provider 已注册
pm2 logs device-service --lines 50 | grep -i aliyun
# 应该看到: "Using AliyunProviderV2 (2023-09-30 API) - Instance Group model"

# 重启前端（如果需要）
pm2 restart frontend-admin
```

---

## 🎯 创建阿里云设备

### 方式 1: 通过 API

```bash
# 获取 JWT Token
TOKEN="your-jwt-token"

# 创建阿里云云手机
curl -X POST "http://localhost:30000/devices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "我的阿里云手机",
    "providerType": "aliyun_ecp",
    "providerSpecificConfig": {
      "regionId": "cn-hangzhou",
      "instanceType": "acp.basic.small",
      "imageId": "img-xxxxxxxxxxxxx",
      "chargeType": "PostPaid"
    }
  }'
```

### 方式 2: 通过管理后台

1. 访问管理后台: http://localhost:5173
2. 登录账号
3. 进入 **设备管理** → **创建设备**
4. 选择提供商: **阿里云 ECP**
5. 填写配置:
   - 设备名称
   - 地域（如 cn-hangzhou）
   - 规格（如 acp.basic.small）
   - 镜像 ID
   - 计费类型（按量付费/包年包月）
6. 点击 **创建**

---

## 📺 使用云手机

### 查看设备列表

```bash
# API 查询
curl -X GET "http://localhost:30000/devices?providerType=aliyun_ecp" \
  -H "Authorization: Bearer $TOKEN"
```

### 连接云手机

1. 进入设备详情页
2. 等待设备状态变为 **运行中**
3. 播放器会自动加载：
   - ✅ 检测到 `providerType` 为 `aliyun_ecp`
   - ✅ 自动使用 `AliyunCloudPhonePlayer` 组件
   - ✅ 获取 Connection Ticket
   - ✅ 建立 WebRTC 连接
4. 连接成功后可以：
   - 🖱️ 鼠标点击和拖拽
   - ⌨️ 键盘输入
   - 📋 剪贴板同步
   - 🔊 音频播放（需配置）
   - 🎮 触摸和手势

### 设备操作

```bash
# 启动设备
curl -X POST "http://localhost:30000/devices/$DEVICE_ID/start" \
  -H "Authorization: Bearer $TOKEN"

# 停止设备
curl -X POST "http://localhost:30000/devices/$DEVICE_ID/stop" \
  -H "Authorization: Bearer $TOKEN"

# 重启设备
curl -X POST "http://localhost:30000/devices/$DEVICE_ID/reboot" \
  -H "Authorization: Bearer $TOKEN"

# 删除设备
curl -X DELETE "http://localhost:30000/devices/$DEVICE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎨 前端播放器功能

### AliyunCloudPhonePlayer 组件

**位置**: `frontend/admin/src/components/AliyunCloudPhonePlayer.tsx`

**功能特性**:
- ✅ WebRTC 实时投屏
- ✅ 触摸和键盘输入
- ✅ 剪贴板同步
- ✅ 麦克风支持
- ✅ 全屏模式
- ✅ 旋转控制
- ✅ 工具栏自定义
- ✅ 自动重连
- ✅ 错误处理

**使用示例**:

```tsx
import { AliyunCloudPhonePlayer } from '@/components/AliyunCloudPhonePlayer';

<AliyunCloudPhonePlayer
  deviceId="device-uuid"
  instanceId="ai-xxxxxxxxxxxxx"
  regionId="cn-hangzhou"
  onConnected={() => console.log('Connected')}
  onDisconnected={() => console.log('Disconnected')}
  onError={(error) => console.error('Error:', error)}
/>
```

### 测试播放器

**位置**: `frontend/admin/src/components/AliyunCloudPhoneTestPlayer.tsx`

访问独立测试页面（需要实例 ID）：
```
http://localhost:5173/test/aliyun-player?instanceId=ai-xxxxxxxxxxxxx
```

---

## 🔧 API 参考

### 设备管理 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/devices` | POST | 创建设备（支持阿里云） |
| `/devices` | GET | 查询设备列表 |
| `/devices/:id` | GET | 获取设备详情 |
| `/devices/:id` | PUT | 更新设备信息 |
| `/devices/:id` | DELETE | 删除设备 |
| `/devices/:id/start` | POST | 启动设备 |
| `/devices/:id/stop` | POST | 停止设备 |
| `/devices/:id/reboot` | POST | 重启设备 |

### 阿里云专用 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/devices/:id/aliyun/ticket` | GET | 获取连接票据 |
| `/devices/:id/aliyun/refresh-ticket` | POST | 刷新票据 |

---

## 🏗️ 技术架构

### 后端架构

```
DeviceService
    ↓
DeviceProviderFactory.getProvider('aliyun_ecp')
    ↓
AliyunProviderV2 (推荐) 或 AliyunProvider (兼容)
    ↓
AliyunEcpV2Client (2023-09-30 API)
    ↓
阿里云 OpenAPI
```

### 前端架构

```
DeviceDetail 页面
    ↓
判断 providerType === 'aliyun_ecp'
    ↓ Yes
AliyunCloudPhonePlayer 组件
    ↓
加载 WuyingWebSDK.js
    ↓
调用后端获取 Ticket
    ↓
Wuying.WebSDK.createSession()
    ↓
WebRTC 连接到阿里云实例
```

### 版本对比

| 特性 | V1 (2020 API) | V2 (2023 API) ⭐ |
|------|--------------|-----------------|
| 实例模式 | 单实例 | 实例组 |
| ADB 支持 | 基础 | 完整（StartInstanceAdb） |
| 监控指标 | 有限 | 丰富（DescribeMetricLast） |
| 密钥管理 | - | ✅ CreateKeyPair |
| 截图功能 | - | ✅ CreateScreenshot |
| 流协同 | - | ✅ GenerateCoordinationCode |
| 推荐度 | ⚠️ 兼容 | ✅ 推荐 |

---

## 🛠️ 故障排查

### 问题 1: SDK 加载失败

**症状**: 前端控制台显示 "Failed to load Aliyun Web SDK"

**解决方案**:
```bash
# 检查 SDK 文件是否存在
ls -lh frontend/admin/public/WuyingWebSDK.js

# 文件应该大于 100KB，如果只有几百字节则是错误文件
# 重新从官方下载: https://wuying.aliyun.com/wuyingWebSdk/docs/intro/download
```

### 问题 2: 无法创建设备

**症状**: 创建设备时返回错误

**检查步骤**:
```bash
# 1. 检查环境变量
cat backend/device-service/.env | grep ALIYUN

# 2. 检查 Provider 是否注册
pm2 logs device-service | grep -i "registered.*provider"

# 3. 测试阿里云 API 连接
curl "https://eds-aic.cn-hangzhou.aliyuncs.com" \
  -H "Authorization: Bearer $ALIYUN_ACCESS_KEY_ID"
```

### 问题 3: 连接票据失败

**症状**: "获取连接凭证失败"

**原因**:
- Ticket 有效期只有 30 秒
- 阿里云实例未运行
- 网络 ID 或 VSwitch 配置错误

**解决方案**:
```bash
# 检查实例状态
curl -X GET "http://localhost:30000/devices/$DEVICE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.status'

# 应该返回: "running"
```

### 问题 4: 播放器黑屏

**可能原因**:
1. WebRTC 连接失败（检查 HTTPS）
2. 票据已过期（自动刷新失败）
3. 实例停止或异常

**调试步骤**:
```javascript
// 打开浏览器控制台，查看错误信息
// F12 → Console

// 查看 WebRTC 连接状态
// F12 → Network → WS (WebSocket)

// 应该看到连接到: wss://ecp-stream.cn-hangzhou.aliyuncs.com/...
```

---

## 📊 监控和日志

### 后端日志

```bash
# 查看设备服务日志
pm2 logs device-service --lines 100

# 过滤阿里云相关日志
pm2 logs device-service | grep -i aliyun

# 查看错误日志
pm2 logs device-service --err
```

### 前端日志

打开浏览器控制台（F12），查看：
- 网络请求（Network 标签）
- WebSocket 连接（WS 过滤）
- 控制台输出（Console 标签）

### Prometheus 指标

阿里云设备的指标会自动上报到 Prometheus：

```bash
# 查询阿里云设备数量
curl "http://localhost:30002/metrics" | grep 'device_count.*aliyun_ecp'

# 查询设备状态分布
curl "http://localhost:30002/metrics" | grep 'device_status.*aliyun_ecp'
```

---

## 🔐 安全建议

### 1. AccessKey 管理

- ✅ 使用 RAM 子账号（最小权限原则）
- ✅ 定期轮换 AccessKey
- ✅ 加密存储在环境变量中
- ❌ 不要将 AccessKey 提交到代码仓库

### 2. 网络安全

- ✅ 使用 VPC 网络隔离不同租户
- ✅ 配置安全组规则
- ✅ ADB 端口仅在需要时开放
- ✅ 使用 HTTPS 访问管理后台

### 3. Ticket 安全

- ✅ Ticket 有效期设置为短期（推荐 5-15 分钟）
- ✅ 使用后立即失效
- ✅ 不要在 URL 中传递 Ticket
- ✅ 通过 HTTPS 传输

---

## 💰 成本优化

### 选择合适的计费模式

| 场景 | 推荐计费 | 原因 |
|------|---------|------|
| 开发测试 | 按量付费 | 灵活，用多少付多少 |
| 生产环境（7×24） | 包年包月 | 成本更低 |
| 峰值业务 | 混合模式 | 基础用包年，峰值用按量 |

### 选择合适的规格

| 用途 | 推荐规格 | CPU | 内存 |
|------|---------|-----|------|
| 轻度使用 | acp.basic.small | 2核 | 4GB |
| 中度使用 | acp.standard.medium | 4核 | 8GB |
| 重度使用 | acp.performance.large | 8核 | 16GB |

### 自动化成本控制

```bash
# 设置自动停止空闲设备（在后端配置）
LIFECYCLE_IDLE_THRESHOLD_HOURS=2
LIFECYCLE_CLEANUP_ENABLED=true

# 设置最大设备数限制
AUTOSCALING_MAX_DEVICES=50
```

---

## 📚 参考文档

### 官方文档

- [阿里云无影云手机产品页](https://www.aliyun.com/product/cloud-phone)
- [API 参考文档](https://help.aliyun.com/zh/ecp/api-eds-aic-2023-09-30-overview)
- [Web SDK 文档](https://help.aliyun.com/zh/ecp/web-sdk-of-cloudphone)
- [管理 SDK 文档](https://help.aliyun.com/zh/ecp/cloud-phone-management-sdk)

### 项目文档

- [整合方案](./backend/device-service/ALIYUN_ECP_INTEGRATION_PLAN.md)
- [SDK 下载说明](./frontend/admin/public/README_WUYING_SDK.md)
- [设备服务文档](./backend/device-service/README.md)

### 源代码

**后端**:
- `backend/device-service/src/providers/aliyun/`
  - `aliyun.module.ts` - 模块定义
  - `aliyun.types.ts` - 类型定义
  - `aliyun-ecp-v2.client.ts` - ECP 客户端（推荐）
  - `aliyun-v2.provider.ts` - 设备提供商（推荐）

**前端**:
- `frontend/admin/src/components/AliyunCloudPhonePlayer.tsx` - 播放器组件
- `frontend/admin/src/pages/Device/Detail.tsx` - 设备详情页

---

## 🎉 总结

阿里云无影云手机（ECP）已完全集成到云手机管理平台中！

### ✅ 已实现功能

- ✅ 完整的后端 SDK 封装
- ✅ 两个版本的 Provider 实现
- ✅ 自动版本切换机制
- ✅ 前端 WebRTC 播放器
- ✅ 设备生命周期管理
- ✅ 错误处理和重连
- ✅ 监控和日志

### 🚀 下一步

1. **下载 Web SDK**: 从官方获取并安装
2. **配置账号**: 填写阿里云 AccessKey 和网络配置
3. **创建设备**: 通过 API 或管理后台
4. **开始使用**: 连接云手机，享受云端 Android！

---

**Created**: 2025-11-24
**Version**: 1.0.0
**Maintainer**: Cloud Phone Platform Team

有问题？查看 [故障排查](#-故障排查) 或提交 Issue！
