# 提供商配置管理 - 使用指南

## 概述

提供商配置管理系统允许您通过 Web 界面管理多个云手机提供商账号（阿里云、华为云等），无需修改环境变量或重启服务。

## 支持的提供商类型

### 1. Redroid (Docker 容器)
本地 Docker 容器方案，使用 Redroid 镜像

**配置字段**:
- `dockerHost`: Docker Host 地址 (默认: `unix:///var/run/docker.sock`)
- `imageRegistry`: 镜像仓库地址
- `defaultImage`: 默认使用的镜像
- `adbPortStart`: ADB 起始端口
- `adbPortEnd`: ADB 结束端口

### 2. 物理设备 (Physical)
通过 ADB 连接物理 Android 设备

**配置字段**:
- `adbHost`: ADB Host 地址
- `adbPort`: ADB 端口
- `scrcpyEnabled`: 是否启用 scrcpy
- `autoDiscovery`: 是否自动发现设备

### 3. 华为云手机 (Huawei CPH)
华为云云手机服务

**配置字段**:
- `region`: 区域代码 (例如: `cn-north-4`)
- `accessKeyId`: 华为云 Access Key ID ⚠️ 敏感信息
- `accessKeySecret`: 华为云 Access Key Secret ⚠️ 敏感信息
- `apiEndpoint`: API 端点地址
- `projectId`: 项目 ID
- `serverId`: 服务器 ID
- `imageId`: 镜像 ID

### 4. 阿里云弹性云手机 (Aliyun ECP)
阿里云弹性云手机服务

**配置字段**:
- `region`: 区域代码 (例如: `cn-hangzhou`)
- `accessKeyId`: 阿里云 Access Key ID ⚠️ 敏感信息
- `accessKeySecret`: 阿里云 Access Key Secret ⚠️ 敏感信息
- `apiEndpoint`: API 端点地址
- `officeSiteId`: Office Site ID
- `vSwitchId`: VSwitch ID
- `keyPairId`: 密钥对 ID
- `imageId`: 镜像 ID

---

## 使用场景

### 场景 1: 添加阿里云账号
**步骤**:
1. 访问 `/admin/system/config/providers`
2. 点击"新建配置"按钮
3. 填写表单:
   - 配置名称: `阿里云-生产账号`
   - 提供商类型: `阿里云弹性云手机`
   - 区域: `cn-hangzhou`
   - Access Key ID: (从阿里云控制台获取)
   - Access Key Secret: (从阿里云控制台获取)
   - Office Site ID: `os-xxxxx`
4. 设置:
   - 启用: ✅
   - 设为默认: ✅ (如果是该类型的首选配置)
   - 优先级: `1` (数字越小优先级越高)
   - 最大设备数: `1000`
5. 点击"创建配置"
6. 点击"测试连接"验证配置

### 场景 2: 多账号管理
如果您有多个阿里云账号（例如：生产环境、测试环境、备用账号）:

**生产账号配置**:
- 名称: `阿里云-生产账号`
- 优先级: `1`
- 最大设备数: `1000`
- 设为默认: ✅

**测试账号配置**:
- 名称: `阿里云-测试账号`
- 优先级: `2`
- 最大设备数: `100`
- 设为默认: ❌

**备用账号配置**:
- 名称: `阿里云-备用账号`
- 优先级: `3`
- 最大设备数: `500`
- 设为默认: ❌
- 启用: ❌ (仅在需要时启用)

### 场景 3: 混合部署
同时使用多种提供商:

1. **本地开发**: Redroid (优先级 1)
2. **云端扩展**: 阿里云 ECP (优先级 2)
3. **容灾备份**: 华为云 CPH (优先级 3)

---

## 配置属性说明

### 基本信息

#### 配置名称 (name)
- 类型: 字符串
- 必填: ✅
- 说明: 配置的友好名称，用于识别不同的账号或环境
- 示例: `阿里云-生产账号`, `华为云-测试账号`

#### 提供商类型 (providerType)
- 类型: 枚举
- 必填: ✅
- 说明: 云手机提供商类型
- 可选值:
  - `redroid` - Redroid (Docker 容器)
  - `physical` - 物理设备
  - `huawei_cph` - 华为云手机
  - `aliyun_ecp` - 阿里云弹性云手机
- ⚠️ **注意**: 创建后不可修改

#### 租户 ID (tenantId)
- 类型: 字符串
- 必填: ❌ (可选)
- 说明: 多租户模式下的租户标识，留空为全局配置
- 用途: 用于 SaaS 平台区分不同客户的配置

#### 描述 (description)
- 类型: 文本
- 必填: ❌ (可选)
- 说明: 配置的详细描述
- 示例: `用于生产环境的阿里云账号，配额 1000 台`

### 运行状态

#### 启用 (enabled)
- 类型: 布尔值
- 默认值: `true`
- 说明: 是否启用此配置
- 用途:
  - `true`: 配置可用，系统会使用此账号创建设备
  - `false`: 配置禁用，不会使用（但保留在数据库中）

#### 设为默认 (isDefault)
- 类型: 布尔值
- 默认值: `false`
- 说明: 是否为该提供商类型的默认配置
- 规则:
  - 每个提供商类型只能有一个默认配置
  - 设置新的默认配置会自动取消其他配置的默认状态
  - 默认配置在前端显示 ⭐ 标记

#### 优先级 (priority)
- 类型: 整数
- 范围: 0-100
- 默认值: `1`
- 说明: 数字越小优先级越高
- 用途: 当有多个启用的配置时，系统按优先级选择使用

#### 最大设备数 (maxDevices)
- 类型: 整数
- 必填: ✅
- 默认值: `100`
- 说明: 此配置可创建的最大设备数量
- 用途: 配额控制，防止超出云服务商限制

### 提供商配置 (config)
- 类型: JSON 对象
- 说明: 提供商特定的配置参数
- 内容: 根据不同的提供商类型，包含不同的字段（见"支持的提供商类型"）

### 测试状态 (只读)

#### 最后测试时间 (lastTestedAt)
- 类型: 时间戳
- 说明: 最近一次连接测试的时间
- 更新时机: 每次点击"测试连接"后更新

#### 测试状态 (testStatus)
- 类型: 枚举
- 可选值:
  - `success`: 连接成功 ✅
  - `failed`: 连接失败 ❌
  - `unknown`: 未知/未测试 ❔
- 说明: 最近一次测试的结果状态

#### 测试消息 (testMessage)
- 类型: 文本
- 说明: 测试失败时的详细错误信息
- 用途: 排查连接问题的依据

---

## API 端点

### 1. 列出所有配置
```http
GET /admin/providers/configs
```

**查询参数**:
- `page` (可选): 页码，默认 1
- `pageSize` (可选): 每页数量，默认 10
- `providerType` (可选): 按提供商类型筛选
- `tenantId` (可选): 按租户ID筛选
- `enabled` (可选): 按启用状态筛选

**响应示例**:
```json
{
  "success": true,
  "data": {
    "data": [...],
    "total": 3,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

### 2. 获取配置详情
```http
GET /admin/providers/configs/:id
```

### 3. 创建新配置
```http
POST /admin/providers/configs
Content-Type: application/json

{
  "name": "阿里云-生产账号",
  "providerType": "aliyun_ecp",
  "enabled": true,
  "priority": 1,
  "maxDevices": 1000,
  "description": "生产环境配置",
  "isDefault": true,
  "config": {
    "region": "cn-hangzhou",
    "accessKeyId": "YOUR_ACCESS_KEY",
    "accessKeySecret": "YOUR_ACCESS_SECRET",
    "officeSiteId": "os-xxxxx"
  }
}
```

### 4. 更新配置
```http
PUT /admin/providers/configs/:id
Content-Type: application/json

{
  "name": "阿里云-生产账号-已更新",
  "enabled": false,
  "priority": 2,
  ...
}
```

### 5. 删除配置
```http
DELETE /admin/providers/configs/:id
```

⚠️ **注意**: 无法删除默认配置（如果有设备正在使用）

### 6. 测试连接
```http
POST /admin/providers/configs/:id/test
```

**响应示例**:
```json
{
  "success": true,
  "configId": "...",
  "configName": "阿里云-生产账号",
  "provider": "aliyun_ecp",
  "message": "Connection successful",
  "details": {
    "latency": 45,
    "timestamp": "2025-11-24T15:00:00.000Z",
    "region": "cn-hangzhou"
  }
}
```

### 7. 设置为默认
```http
POST /admin/providers/configs/:id/set-default
```

---

## 安全最佳实践

### 1. 敏感信息保护
- ✅ Access Key ID 和 Secret 存储在数据库的 `config` JSONB 字段中
- ✅ 前端使用 `Input.Password` 组件，输入时隐藏内容
- ⚠️ 建议: 使用 KMS 或 Vault 加密存储敏感信息（未来增强）

### 2. 权限控制
- ✅ 所有端点都需要 JWT 身份验证
- ✅ 路由使用 `AdminRoute` 包装，仅管理员可访问
- 建议: 为不同管理员设置细粒度权限

### 3. 配额管理
- 为每个配置设置合理的 `maxDevices` 限制
- 定期检查实际使用情况
- 避免超出云服务商的配额限制

### 4. 测试连接
- 创建配置后立即测试连接
- 定期重新测试以确保凭证有效
- 关注测试状态，及时处理失败配置

---

## 故障排查

### 问题 1: 连接测试失败
**症状**: `testStatus` 显示 `failed`

**排查步骤**:
1. 检查 `testMessage` 中的详细错误信息
2. 验证 Access Key ID 和 Secret 是否正确
3. 确认 API Endpoint 地址可访问
4. 检查网络连接和防火墙规则
5. 验证云服务商账号是否正常（未欠费、未被封禁）

**常见错误**:
- `ENOTFOUND`: DNS 解析失败，检查 API Endpoint
- `ETIMEDOUT`: 连接超时，检查网络和防火墙
- `403 Forbidden`: 凭证无效，检查 Access Key
- `401 Unauthorized`: 认证失败，检查 Access Key

### 问题 2: 无法删除配置
**症状**: 删除时返回 400 错误

**原因**: 配置被标记为默认且有设备正在使用

**解决方案**:
1. 先创建/设置另一个配置为默认
2. 删除或迁移使用此配置的设备
3. 再尝试删除原配置

### 问题 3: 设备创建时未使用预期配置
**症状**: 系统使用了非预期的提供商配置

**排查步骤**:
1. 检查目标配置是否 `enabled = true`
2. 确认 `isDefault = true`（如果希望优先使用）
3. 比较 `priority` 值（数字越小优先级越高）
4. 检查 `maxDevices` 是否已达到上限

---

## 常见问题 (FAQ)

### Q1: 可以为同一提供商类型添加多个配置吗？
**A**: 可以！这正是多账号支持的核心功能。您可以为阿里云添加多个不同的账号配置。

### Q2: 修改配置会影响已创建的设备吗？
**A**: 不会。配置修改仅影响新创建的设备。已有设备继续使用创建时的配置。

### Q3: 默认配置和优先级有什么区别？
**A**:
- **默认配置** (`isDefault`): 标记为默认的配置，在前端有 ⭐ 标识
- **优先级** (`priority`): 当有多个启用的配置时，系统按优先级（数字越小越高）选择

建议: 将最常用、最稳定的配置设为默认，并给予最高优先级。

### Q4: 如何切换生产/测试环境？
**A**: 有两种方式:
1. **方式一**: 禁用生产配置，启用测试配置
2. **方式二**: 调整优先级，让测试配置优先级更高

### Q5: 可以导出/导入配置吗？
**A**: 目前不支持，这是计划中的未来增强功能。临时方案：
1. 通过 API 获取配置 JSON
2. 手动保存到文件
3. 需要时通过 API 重新创建

### Q6: 如何备份配置？
**A**: 配置存储在 PostgreSQL 数据库中，通过数据库备份即可：
```bash
pg_dump -U postgres -d cloudphone_device -t provider_configs > provider_configs_backup.sql
```

---

## 性能建议

### 1. 连接池配置
如果使用云服务商 API，建议:
- 配置合理的连接超时时间
- 启用 HTTP Keep-Alive
- 使用连接池复用连接

### 2. 配额监控
- 定期检查每个配置的设备数量
- 设置告警阈值（例如: 达到 80% 时告警）
- 提前规划扩容方案

### 3. 缓存策略
- 系统会缓存配置信息以提高性能
- 修改配置后会自动刷新缓存
- 如遇问题可手动重启 device-service

---

## 相关文档

- [测试报告](./PROVIDER_CONFIG_TEST_REPORT.md)
- [API 文档](../../docs/API.md)
- [架构文档](../../docs/ARCHITECTURE.md)
- [开发指南](../../CLAUDE.md)

---

## 技术支持

如遇问题，请联系:
- 开发团队
- 提交 Issue 到项目仓库
- 查看服务日志: `pm2 logs device-service`
