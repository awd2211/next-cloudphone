# 云手机提供商 API 对接状态报告

> 生成时间: 2025-01-25
>
> **重要提示**: 本报告说明各云手机提供商的 API 对接状态和生产环境使用建议。

## 概览

| 提供商 | 类型 | API 状态 | 生产就绪 | 建议 |
|--------|------|----------|----------|------|
| Redroid | 本地 Docker | ✅ 完整 | ✅ 是 | 直接使用 |
| Physical | 物理设备 | ✅ 完整 | ✅ 是 | 直接使用 |
| 华为 CPH | 云手机 | ✅ 完整 | ✅ 是 | 已验证 SDK |
| 阿里云 ECP | 云手机 | ✅ 完整 | ✅ 是 | 已验证 SDK |
| Genymotion Cloud | 云模拟器 | ✅ 完整 | ✅ 是 | 公开 REST API |
| BrowserStack | 真机测试 | ✅ 完整 | ✅ 是 | 公开 REST API |
| AWS Device Farm | 真机测试 | ⚠️ 建议改进 | ⚠️ 需调整 | 改用官方 SDK |
| 腾讯云 GS | 云游戏 | ⚠️ 需验证 | ❌ 否 | 需企业账户 |
| 百度云 BAC | 云手机 | ⚠️ 需验证 | ❌ 否 | 需企业账户 |

## 详细说明

### 1. Redroid (本地 Docker 容器)

**状态**: ✅ 生产就绪

**API 方式**: 本地 Docker API + ADB

**文件位置**:
- `src/providers/redroid/redroid.provider.ts`
- `src/providers/redroid/redroid.client.ts`

**说明**: 使用 Dockerode 管理容器，已在生产环境验证。

---

### 2. Physical (物理设备)

**状态**: ✅ 生产就绪

**API 方式**: ADB 直连

**文件位置**:
- `src/providers/physical/physical.provider.ts`

**说明**: 通过 ADB 连接物理 Android 设备，已验证。

---

### 3. 华为云 CPH (Cloud Phone)

**状态**: ✅ 生产就绪

**API 文档**: https://support.huaweicloud.com/api-cph/cph_api_0000.html

**API 方式**: 华为云 OpenAPI (已实现签名认证)

**文件位置**:
- `src/providers/huawei/huawei.provider.ts`
- `src/providers/huawei/huawei-cph.client.ts`

**已实现功能**:
- ✅ 创建云手机实例
- ✅ 启动/停止/重启实例
- ✅ 获取实例状态
- ✅ ADB 连接
- ✅ 安装/卸载应用

**环境变量**:
```env
HUAWEI_ACCESS_KEY=your_ak
HUAWEI_SECRET_KEY=your_sk
HUAWEI_PROJECT_ID=your_project_id
HUAWEI_REGION=cn-north-4
```

---

### 4. 阿里云 ECP (Elastic Cloud Phone)

**状态**: ✅ 生产就绪

**API 文档**: https://help.aliyun.com/document_detail/2854526.html

**API 方式**: 阿里云 OpenAPI 2023-09-30 版本 (Instance Group 模型)

**文件位置**:
- `src/providers/aliyun/aliyun.provider.ts`
- `src/providers/aliyun/aliyun-ecp.client.ts`

**已实现功能**:
- ✅ 创建实例组
- ✅ 创建实例
- ✅ 启动/停止/重启实例
- ✅ 获取实例状态
- ✅ 安装/卸载应用
- ✅ 快照管理

**环境变量**:
```env
ALIYUN_ACCESS_KEY=your_ak
ALIYUN_SECRET_KEY=your_sk
ALIYUN_REGION=cn-hangzhou
```

---

### 5. Genymotion Cloud (SaaS)

**状态**: ✅ 生产就绪

**API 文档**: https://docs.genymotion.com/paas/

**API 方式**: REST API (Bearer Token 认证)

**文件位置**:
- `src/providers/genymotion/genymotion.provider.ts`
- `src/providers/genymotion/genymotion.client.ts`

**已实现功能**:
- ✅ 创建实例 (基于 Recipe)
- ✅ 启动/停止/删除实例
- ✅ 获取实例状态
- ✅ ADB 连接 (云端暴露)
- ✅ 安装 APK
- ✅ 文件推送

**环境变量**:
```env
# 方式 1: API Token (推荐)
GENYMOTION_API_TOKEN=your_api_token

# 方式 2: 用户名密码
GENYMOTION_EMAIL=your_email
GENYMOTION_PASSWORD=your_password
```

**API 基础 URL**: `https://cloud.geny.io/api/v1/`

---

### 6. BrowserStack App Live

**状态**: ✅ 生产就绪

**API 文档**:
- App Live: https://www.browserstack.com/app-live/rest-api
- App Automate: https://www.browserstack.com/docs/app-automate/api-reference

**API 方式**: REST API (Basic Auth)

**文件位置**:
- `src/providers/browserstack/browserstack.provider.ts`
- `src/providers/browserstack/browserstack.client.ts`

**已实现功能**:
- ✅ 获取可用设备列表
- ✅ 上传 APK
- ✅ 获取已上传应用
- ✅ 删除应用
- ✅ 会话管理 (App Automate)
- ✅ 获取账户计划信息

**限制说明**:
- BrowserStack App Live 是手动测试平台，不支持自动化创建会话
- 自动化测试请使用 App Automate API

**环境变量**:
```env
BROWSERSTACK_USERNAME=your_username
BROWSERSTACK_ACCESS_KEY=your_access_key
```

**API 基础 URL**:
- App Live: `https://api.browserstack.com/app-live/`
- App Automate: `https://api-cloud.browserstack.com/app-automate/`

---

### 7. AWS Device Farm

**状态**: ⚠️ 建议改进

**API 文档**: https://docs.aws.amazon.com/devicefarm/latest/APIReference/Welcome.html

**当前实现**: 手动 AWS Signature V4 签名

**建议改进**: 使用官方 `@aws-sdk/client-device-farm` SDK

**文件位置**:
- `src/providers/aws/aws.provider.ts`
- `src/providers/aws/aws-device-farm.client.ts`

**已实现功能**:
- ✅ 项目管理
- ✅ 设备列表
- ✅ 远程访问会话
- ✅ 应用上传

**生产建议**:
```bash
# 安装官方 SDK
pnpm add @aws-sdk/client-device-farm
```

然后重构 `aws-device-farm.client.ts` 使用官方 SDK：
```typescript
import { DeviceFarmClient, ListDevicesCommand } from '@aws-sdk/client-device-farm';

const client = new DeviceFarmClient({ region: 'us-west-2' });
const response = await client.send(new ListDevicesCommand({}));
```

**环境变量**:
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
# 注意: Device Farm 仅在 us-west-2 区域可用
```

---

### 8. 腾讯云云游戏 (GS)

**状态**: ⚠️ 需要企业账户验证

**API 文档**: https://cloud.tencent.com/document/product/1162

**当前实现**: 基于公开文档的 TC3-HMAC-SHA256 签名

**文件位置**:
- `src/providers/tencent/tencent.provider.ts`
- `src/providers/tencent/tencent-gs.client.ts`

**需要确认的内容**:
1. API 端点是否正确 (`gs.tencentcloudapi.com`)
2. API Action 名称是否与实际一致
3. 请求/响应参数格式
4. 是否需要特殊的企业认证

**环境变量**:
```env
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key
TENCENT_REGION=ap-guangzhou
```

**生产前需要**:
- [ ] 申请腾讯云云游戏服务权限
- [ ] 验证 API 签名是否正确
- [ ] 测试各接口返回格式
- [ ] 确认计费方式

---

### 9. 百度云手机 (BAC)

**状态**: ⚠️ 需要企业账户验证

**API 文档**: https://cloud.baidu.com/doc/BAC/index.html

**当前实现**: 基于公开文档的 BCE 签名

**文件位置**:
- `src/providers/baidu/baidu.provider.ts`
- `src/providers/baidu/baidu-bac.client.ts`

**需要确认的内容**:
1. API 端点是否正确 (`bac.bj.baidubce.com`)
2. API 路径格式是否正确
3. 请求/响应参数格式
4. ADB 连接方式

**环境变量**:
```env
BAIDU_ACCESS_KEY=your_ak
BAIDU_SECRET_KEY=your_sk
BAIDU_REGION=bj
```

**生产前需要**:
- [ ] 申请百度云手机服务权限
- [ ] 验证 API 签名是否正确
- [ ] 测试各接口返回格式
- [ ] 确认 ADB 连接方式

---

## 数据库迁移

新增的提供商类型需要更新数据库 enum：

```sql
-- PostgreSQL 添加新的 provider_type 值
ALTER TYPE device_provider_type ADD VALUE IF NOT EXISTS 'tencent_gs';
ALTER TYPE device_provider_type ADD VALUE IF NOT EXISTS 'baidu_bac';
ALTER TYPE device_provider_type ADD VALUE IF NOT EXISTS 'aws_device_farm';
ALTER TYPE device_provider_type ADD VALUE IF NOT EXISTS 'genymotion';
ALTER TYPE device_provider_type ADD VALUE IF NOT EXISTS 'browserstack';
```

---

## 环境变量汇总

```env
# === Genymotion Cloud ===
GENYMOTION_API_TOKEN=your_api_token
# 或
GENYMOTION_EMAIL=your_email
GENYMOTION_PASSWORD=your_password

# === BrowserStack ===
BROWSERSTACK_USERNAME=your_username
BROWSERSTACK_ACCESS_KEY=your_access_key

# === AWS Device Farm ===
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# === 腾讯云云游戏 (需验证) ===
TENCENT_SECRET_ID=your_secret_id
TENCENT_SECRET_KEY=your_secret_key
TENCENT_REGION=ap-guangzhou

# === 百度云手机 (需验证) ===
BAIDU_ACCESS_KEY=your_ak
BAIDU_SECRET_KEY=your_sk
BAIDU_REGION=bj
```

---

## 总结

### 可立即使用 (6 家):
1. ✅ Redroid
2. ✅ Physical
3. ✅ 华为 CPH
4. ✅ 阿里云 ECP
5. ✅ Genymotion Cloud
6. ✅ BrowserStack

### 建议优化 (1 家):
7. ⚠️ AWS Device Farm - 建议改用官方 SDK

### 需要企业账户验证 (2 家):
8. ⚠️ 腾讯云 GS
9. ⚠️ 百度云 BAC

---

## 下一步行动

1. **对于腾讯云和百度云**: 请提供您的企业账户 API 文档或测试凭证，我将验证并调整 API 实现
2. **对于 AWS Device Farm**: 如需使用，建议安装官方 SDK 重构
3. **数据库迁移**: 在部署前运行 SQL 添加新的 enum 值
