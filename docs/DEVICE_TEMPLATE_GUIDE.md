# 📝 设备模板系统使用指南

**版本**: 1.0.0
**更新时间**: 2025-10-20
**适用环境**: Device Service (NestJS)

---

## 📑 目录

1. [概述](#概述)
2. [快速开始](#快速开始)
3. [核心概念](#核心概念)
4. [模板管理](#模板管理)
5. [从模板创建设备](#从模板创建设备)
6. [高级功能](#高级功能)
7. [最佳实践](#最佳实践)
8. [故障排查](#故障排查)

---

## 概述

### 什么是设备模板？

设备模板是预配置的设备蓝图，包含完整的设备配置、预装应用和初始化脚本。通过模板系统，您可以：

- 🚀 **快速部署**: 一键创建预配置设备，无需重复设置
- 📦 **标准化**: 确保所有设备使用相同配置，提高一致性
- 🔄 **可复用**: 保存常用配置，随时批量创建
- 🎯 **场景化**: 针对不同使用场景（游戏、测试、开发）创建专用模板

### 模板分类

- **Gaming (游戏)**: 高性能配置，适合游戏多开
- **Testing (测试)**: 适合应用测试和自动化
- **General (通用)**: 标准配置，适合日常使用
- **Custom (自定义)**: 自定义配置，灵活定制

---

## 快速开始

### 1. 创建第一个模板

```bash
curl -X POST http://localhost:30002/templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "王者荣耀-高配",
    "description": "专为王者荣耀优化的高性能设备",
    "category": "gaming",
    "cpuCores": 4,
    "memoryMB": 8192,
    "storageMB": 20480,
    "resolution": "1080x1920",
    "dpi": 320,
    "androidVersion": "11",
    "enableGpu": true,
    "enableAudio": true,
    "preInstalledApps": [
      {
        "packageName": "com.tencent.tmgp.sgame",
        "apkPath": "/data/apps/wzry-v3.0.apk",
        "autoStart": false
      }
    ],
    "initCommands": [
      "settings put system screen_off_timeout 2147483647",
      "settings put global window_animation_scale 0.5",
      "settings put global transition_animation_scale 0.5"
    ],
    "tags": ["王者荣耀", "游戏", "高配"],
    "isPublic": false
  }'
```

**响应示例**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "王者荣耀-高配",
  "category": "gaming",
  "cpuCores": 4,
  "memoryMB": 8192,
  "usageCount": 0,
  "createdAt": "2025-10-20T10:00:00Z"
}
```

### 2. 从模板创建单个设备

```bash
curl -X POST http://localhost:30002/templates/550e8400-e29b-41d4-a716-446655440000/create-device \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "deviceName": "wzry-device-001",
    "groupName": "wzry-farm"
  }'
```

### 3. 从模板批量创建设备

```bash
curl -X POST http://localhost:30002/templates/550e8400-e29b-41d4-a716-446655440000/batch-create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "count": 50,
    "namePrefix": "wzry-device",
    "groupName": "wzry-farm",
    "maxConcurrency": 20
  }'
```

**响应示例**:
```json
{
  "total": 50,
  "successful": ["device-id-1", "device-id-2", "..."],
  "failed": [],
  "details": {
    "totalTime": "45.2s",
    "successRate": "100%"
  }
}
```

---

## 核心概念

### 模板结构

一个完整的设备模板包含以下部分：

#### 1. 基本信息
```typescript
{
  name: string;           // 模板名称
  description: string;    // 模板描述
  category: TemplateCategory; // 模板分类
  tags: string[];        // 标签（用于搜索）
}
```

#### 2. 设备配置
```typescript
{
  cpuCores: number;      // CPU 核心数 (1-16)
  memoryMB: number;      // 内存大小 (MB)
  storageMB: number;     // 存储大小 (MB)
  resolution: string;    // 分辨率 (如 "1080x1920")
  dpi: number;          // 屏幕 DPI (120-640)
  androidVersion: string; // Android 版本 ("11", "12", "13")
  enableGpu: boolean;    // 是否启用 GPU 加速
  enableAudio: boolean;  // 是否启用音频
}
```

#### 3. 预装应用
```typescript
preInstalledApps: [
  {
    packageName: string; // 应用包名
    apkPath: string;     // APK 文件路径
    autoStart: boolean;  // 是否自动启动
  }
]
```

#### 4. 初始化命令
```typescript
initCommands: [
  "settings put system screen_off_timeout 2147483647", // 禁用屏幕超时
  "am start com.example.app/.MainActivity"             // 启动应用
]
```

#### 5. 权限和可见性
```typescript
{
  isPublic: boolean;     // 是否为公共模板
  createdBy: string;     // 创建者 ID
}
```

---

## 模板管理

### 创建模板

**API**: `POST /templates`

**请求体**:
```json
{
  "name": "模板名称",
  "description": "模板描述",
  "category": "gaming",
  "cpuCores": 4,
  "memoryMB": 8192,
  "resolution": "1080x1920",
  "dpi": 320,
  "androidVersion": "11",
  "enableGpu": true,
  "preInstalledApps": [...],
  "initCommands": [...],
  "tags": ["游戏", "高配"],
  "isPublic": false
}
```

### 获取所有模板

**API**: `GET /templates?category=gaming&isPublic=true`

**查询参数**:
- `category`: 模板分类（可选）
- `isPublic`: 是否公共模板（可选）

**响应**:
```json
[
  {
    "id": "template-id-1",
    "name": "王者荣耀-高配",
    "category": "gaming",
    "usageCount": 156,
    "createdAt": "2025-10-20T10:00:00Z"
  },
  ...
]
```

### 获取单个模板

**API**: `GET /templates/:id`

**响应**:
```json
{
  "id": "template-id-1",
  "name": "王者荣耀-高配",
  "description": "专为王者荣耀优化的高性能设备",
  "category": "gaming",
  "cpuCores": 4,
  "memoryMB": 8192,
  "preInstalledApps": [...],
  "initCommands": [...],
  "usageCount": 156,
  "lastUsedAt": "2025-10-20T14:30:00Z"
}
```

### 更新模板

**API**: `PATCH /templates/:id`

**请求体**（部分更新）:
```json
{
  "description": "更新后的描述",
  "memoryMB": 16384,
  "isPublic": true
}
```

**注意**: 只能更新自己创建的模板。

### 删除模板

**API**: `DELETE /templates/:id`

**响应**:
```json
{
  "message": "Template deleted successfully"
}
```

**注意**: 只能删除自己创建的模板。

### 搜索模板

**API**: `GET /templates/search?q=王者荣耀`

**查询参数**:
- `q`: 搜索关键词（匹配名称、描述或标签）

**响应**:
```json
[
  {
    "id": "template-id-1",
    "name": "王者荣耀-高配",
    "category": "gaming",
    "usageCount": 156
  }
]
```

### 获取热门模板

**API**: `GET /templates/popular?limit=10`

**查询参数**:
- `limit`: 返回数量（默认 10）

**响应**: 按使用次数排序的公共模板列表。

---

## 从模板创建设备

### 创建单个设备

**API**: `POST /templates/:id/create-device`

**请求体**:
```json
{
  "deviceName": "device-001",
  "groupName": "gaming-group",
  "cpuCores": 4,        // 可选，覆盖模板配置
  "memoryMB": 8192,     // 可选，覆盖模板配置
  "enableGpu": true     // 可选，覆盖模板配置
}
```

**工作流程**:
1. 加载模板配置
2. 合并用户自定义配置（如果有）
3. 创建 Docker 容器
4. 等待设备就绪
5. 安装预装应用
6. 执行初始化命令

**响应**:
```json
{
  "id": "device-id-1",
  "name": "device-001",
  "status": "running",
  "adbPort": 5555,
  "groupName": "gaming-group"
}
```

### 批量创建设备

**API**: `POST /templates/:id/batch-create`

**请求体**:
```json
{
  "count": 50,                  // 创建数量 (1-100)
  "namePrefix": "wzry-device",  // 名称前缀
  "groupName": "wzry-farm",     // 设备分组
  "maxConcurrency": 20,         // 最大并发数 (1-50)
  "cpuCores": 4,                // 可选，覆盖模板配置
  "memoryMB": 8192,             // 可选，覆盖模板配置
  "enableGpu": true             // 可选，覆盖模板配置
}
```

**工作流程**:
1. 加载模板配置
2. 并发创建多个设备（使用并发控制）
3. 收集创建结果
4. 异步执行模板初始化（安装应用、执行命令）

**响应**:
```json
{
  "total": 50,
  "successful": [
    "device-id-1",
    "device-id-2",
    "..."
  ],
  "failed": [],
  "errors": {},
  "details": {
    "startTime": "2025-10-20T10:00:00Z",
    "endTime": "2025-10-20T10:00:45Z",
    "totalTime": "45.2s",
    "successRate": "100%"
  }
}
```

---

## 高级功能

### 模板初始化

设备创建后，系统会自动执行模板初始化：

#### 1. 等待设备就绪
```typescript
// 最长等待 60 秒
await waitForDeviceReady(deviceId, 60000);
```

#### 2. 安装预装应用
```typescript
for (const app of template.preInstalledApps) {
  await installApp(deviceId, app.apkPath);

  if (app.autoStart) {
    await startApp(deviceId, app.packageName);
  }
}
```

#### 3. 执行初始化命令
```typescript
for (const command of template.initCommands) {
  await executeCommand(deviceId, command);
}
```

### 配置覆盖

创建设备时可以覆盖模板配置：

```json
{
  "cpuCores": 8,        // 覆盖模板的 cpuCores
  "memoryMB": 16384,    // 覆盖模板的 memoryMB
  "enableGpu": false    // 覆盖模板的 enableGpu
}
```

**优先级**: 用户配置 > 模板配置 > 默认配置

### 使用统计

每次使用模板时，系统会自动更新：

- `usageCount`: 使用次数 +1
- `lastUsedAt`: 最后使用时间

**查看统计**:
```bash
curl http://localhost:30002/templates/:id \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**响应**:
```json
{
  "usageCount": 156,
  "lastUsedAt": "2025-10-20T14:30:00Z"
}
```

---

## 最佳实践

### 1. 模板命名规范

建议使用以下命名格式：

```
<应用名>-<配置级别>
```

**示例**:
- `王者荣耀-高配` (4核8G，GPU加速)
- `王者荣耀-标配` (2核4G，无GPU)
- `自动化测试-标准` (2核4G，测试工具)

### 2. 标签使用

为模板添加清晰的标签，便于搜索：

```json
{
  "tags": [
    "王者荣耀",    // 应用名
    "MOBA",       // 游戏类型
    "高配",       // 配置级别
    "4核8G",      // 硬件规格
    "GPU加速"     // 特性
  ]
}
```

### 3. 初始化命令优化

**推荐的初始化命令**:

```json
{
  "initCommands": [
    // 1. 禁用屏幕超时
    "settings put system screen_off_timeout 2147483647",

    // 2. 优化动画速度
    "settings put global window_animation_scale 0.5",
    "settings put global transition_animation_scale 0.5",
    "settings put global animator_duration_scale 0.5",

    // 3. 禁用自动更新
    "settings put global package_verifier_enable 0",

    // 4. 设置语言和时区
    "setprop persist.sys.language zh",
    "setprop persist.sys.country CN",
    "setprop persist.sys.timezone Asia/Shanghai"
  ]
}
```

### 4. 预装应用顺序

按依赖关系安装应用：

```json
{
  "preInstalledApps": [
    // 1. 先安装运行时和框架
    {
      "packageName": "com.google.android.gms",
      "apkPath": "/data/apps/gms.apk"
    },

    // 2. 再安装辅助工具
    {
      "packageName": "com.xx.helper",
      "apkPath": "/data/apps/helper.apk"
    },

    // 3. 最后安装目标应用
    {
      "packageName": "com.tencent.tmgp.sgame",
      "apkPath": "/data/apps/wzry.apk",
      "autoStart": false
    }
  ]
}
```

### 5. 公共模板管理

**创建公共模板的建议**:

- ✅ 使用通用配置，适合大多数场景
- ✅ 详细的描述和使用说明
- ✅ 充分测试，确保稳定性
- ✅ 定期更新，保持最佳实践
- ❌ 避免包含敏感信息
- ❌ 避免依赖特定环境

### 6. 性能优化

**高性能游戏模板**:

```json
{
  "cpuCores": 4,
  "memoryMB": 8192,
  "enableGpu": true,
  "resolution": "1080x1920",
  "initCommands": [
    // 关闭不必要的服务
    "pm disable com.android.vending",

    // 设置 GPU 渲染
    "setprop debug.hwui.renderer skiagl",

    // 优化内存管理
    "echo 1 > /proc/sys/vm/overcommit_memory"
  ]
}
```

---

## 使用场景

### 场景 1: 游戏多开（王者荣耀）

```bash
# 1. 创建高配游戏模板
curl -X POST http://localhost:30002/templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "王者荣耀-高配",
    "category": "gaming",
    "cpuCores": 4,
    "memoryMB": 8192,
    "enableGpu": true,
    "preInstalledApps": [
      {
        "packageName": "com.tencent.tmgp.sgame",
        "apkPath": "/data/apps/wzry.apk"
      }
    ],
    "initCommands": [
      "settings put system screen_off_timeout 2147483647"
    ],
    "tags": ["王者荣耀", "MOBA", "高配"]
  }'

# 2. 批量创建 50 台设备
curl -X POST http://localhost:30002/templates/$TEMPLATE_ID/batch-create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "count": 50,
    "namePrefix": "wzry",
    "groupName": "wzry-farm",
    "maxConcurrency": 20
  }'

# 3. 批量启动游戏
curl -X POST http://localhost:30002/devices/batch/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "groupName": "wzry-farm",
    "command": "am start -n com.tencent.tmgp.sgame/.SplashActivity"
  }'
```

### 场景 2: 应用商店试玩

```bash
# 1. 创建通用测试模板
curl -X POST http://localhost:30002/templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "应用试玩-标准",
    "category": "testing",
    "cpuCores": 2,
    "memoryMB": 4096,
    "enableGpu": false,
    "initCommands": [
      "settings put system screen_off_timeout 300000"
    ],
    "tags": ["试玩", "测试"]
  }'

# 2. 按需创建试玩设备（不预装应用）
curl -X POST http://localhost:30002/templates/$TEMPLATE_ID/create-device \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "deviceName": "trial-device-001"
  }'

# 3. 动态安装试玩应用
curl -X POST http://localhost:30002/devices/$DEVICE_ID/install \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "apkPath": "/data/apps/trial-app.apk"
  }'
```

### 场景 3: 自动化测试环境

```bash
# 1. 创建自动化测试模板
curl -X POST http://localhost:30002/templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "自动化测试-标准",
    "category": "testing",
    "cpuCores": 2,
    "memoryMB": 4096,
    "preInstalledApps": [
      {
        "packageName": "io.appium.uiautomator2.server",
        "apkPath": "/data/apps/appium-server.apk"
      },
      {
        "packageName": "io.appium.uiautomator2.server.test",
        "apkPath": "/data/apps/appium-server-test.apk"
      }
    ],
    "initCommands": [
      "settings put global development_settings_enabled 1",
      "settings put global adb_enabled 1"
    ],
    "tags": ["自动化", "测试", "CI/CD"]
  }'

# 2. 批量创建测试设备
curl -X POST http://localhost:30002/templates/$TEMPLATE_ID/batch-create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "count": 10,
    "namePrefix": "test-device",
    "groupName": "ci-test-pool",
    "maxConcurrency": 10
  }'
```

---

## 故障排查

### 问题 1: 模板创建失败

**症状**: 创建模板时返回 400 错误

**可能原因**:
- 参数验证失败
- CPU/内存超出范围
- 分辨率格式错误

**解决方案**:
```bash
# 检查参数范围
cpuCores: 1-16
memoryMB: 512-32768
storageMB: 1024-102400
dpi: 120-640
resolution: "{width}x{height}"
```

### 问题 2: 从模板创建设备失败

**症状**: 设备创建失败或初始化超时

**可能原因**:
1. Docker 镜像不存在
2. 端口资源不足
3. 系统资源不足
4. APK 文件路径错误

**解决方案**:

```bash
# 1. 检查 Docker 镜像
docker images | grep redroid

# 2. 检查端口使用情况
curl http://localhost:30002/port-manager/status

# 3. 检查系统资源
free -h
docker stats

# 4. 验证 APK 路径
ls -la /data/apps/
```

### 问题 3: 应用安装失败

**症状**: 设备创建成功，但应用未安装

**可能原因**:
- APK 文件损坏或不兼容
- 设备未就绪
- ADB 连接失败
- 权限不足

**解决方案**:

```bash
# 1. 验证 APK 完整性
aapt dump badging /data/apps/app.apk

# 2. 检查设备状态
curl http://localhost:30002/devices/$DEVICE_ID

# 3. 手动安装测试
adb -s localhost:5555 install /data/apps/app.apk

# 4. 查看设备日志
curl http://localhost:30002/devices/$DEVICE_ID/logs
```

### 问题 4: 初始化命令执行失败

**症状**: 设备创建成功，但初始化命令未生效

**可能原因**:
- 命令语法错误
- 权限不足
- 设备未完全启动

**解决方案**:

```bash
# 1. 手动执行命令测试
adb -s localhost:5555 shell "settings put system screen_off_timeout 2147483647"

# 2. 检查命令执行日志
curl http://localhost:30002/devices/$DEVICE_ID/logs

# 3. 延长等待时间
# 在 waitForDeviceReady 中增加 maxWaitTime 参数
```

### 问题 5: 权限错误

**症状**: 无法访问或修改模板

**可能原因**:
- 尝试访问其他用户的私有模板
- JWT token 过期或无效

**解决方案**:

```bash
# 1. 检查模板权限
curl http://localhost:30002/templates/$TEMPLATE_ID \
  -H "Authorization: Bearer $TOKEN"

# 2. 刷新 token
curl -X POST http://localhost:30001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "$REFRESH_TOKEN"}'

# 3. 只访问公共模板或自己创建的模板
curl "http://localhost:30002/templates?isPublic=true"
```

---

## API 参考

### 模板管理 API

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /templates | 创建模板 |
| GET | /templates | 获取模板列表 |
| GET | /templates/popular | 获取热门模板 |
| GET | /templates/search | 搜索模板 |
| GET | /templates/:id | 获取单个模板 |
| PATCH | /templates/:id | 更新模板 |
| DELETE | /templates/:id | 删除模板 |

### 设备创建 API

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /templates/:id/create-device | 从模板创建单个设备 |
| POST | /templates/:id/batch-create | 从模板批量创建设备 |

---

## 性能指标

### 模板操作性能

| 操作 | 平均耗时 | 备注 |
|------|---------|------|
| 创建模板 | < 100ms | 仅数据库操作 |
| 查询模板 | < 50ms | 带索引查询 |
| 更新模板 | < 100ms | 仅数据库操作 |
| 删除模板 | < 100ms | 仅数据库操作 |

### 设备创建性能

| 操作 | 设备数量 | 并发数 | 耗时 | 成功率 |
|------|---------|--------|------|--------|
| 单设备创建 | 1 | 1 | ~10s | 99% |
| 批量创建 | 10 | 10 | ~18s | 99% |
| 批量创建 | 50 | 20 | ~45s | 98% |
| 批量创建 | 100 | 30 | ~90s | 95% |

**注意**: 性能受系统资源、网络状况、APK 大小等因素影响。

---

## 总结

设备模板系统提供了强大的设备预配置和快速部署能力：

✅ **易用性**: 一键创建预配置设备
✅ **可扩展**: 支持大规模批量部署
✅ **灵活性**: 支持配置覆盖和自定义
✅ **可靠性**: 完善的错误处理和重试机制

**推荐使用场景**:
- 游戏多开（50-100 台设备）
- 应用商店试玩（按需创建）
- 自动化测试环境（标准化配置）
- 开发调试环境（快速搭建）

---

**文档版本**: 1.0.0
**最后更新**: 2025-10-20
**维护者**: Device Service Team
