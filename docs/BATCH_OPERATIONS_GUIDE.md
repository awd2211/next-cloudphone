# 云手机批量操作和群控指南

**版本**: 2.0
**更新时间**: 2025-10-20
**适用场景**: 大规模设备管理（100+台）

---

## 📋 目录

1. [功能概述](#功能概述)
2. [批量创建设备](#批量创建设备)
3. [批量操作设备](#批量操作设备)
4. [设备分组管理](#设备分组管理)
5. [批量命令执行](#批量命令执行)
6. [性能优化](#性能优化)
7. [使用案例](#使用案例)
8. [最佳实践](#最佳实践)

---

## 🎯 功能概述

### 核心能力

✅ **批量创建** - 一次创建 1-100 台设备
✅ **批量操作** - 统一启动/停止/重启/删除
✅ **设备分组** - 按业务场景分组管理
✅ **批量命令** - 同时执行 Shell 命令
✅ **批量安装** - 统一安装/卸载应用
✅ **并发控制** - 可配置最大并发数
✅ **结果收集** - 实时反馈操作结果

### API 端点总览

| 端点 | 方法 | 说明 |
|------|------|------|
| `/devices/batch/create` | POST | 批量创建设备 |
| `/devices/batch/operate` | POST | 通用批量操作 |
| `/devices/batch/start` | POST | 批量启动 |
| `/devices/batch/stop` | POST | 批量停止 |
| `/devices/batch/restart` | POST | 批量重启 |
| `/devices/batch/delete` | POST | 批量删除 |
| `/devices/batch/execute` | POST | 批量执行命令 |
| `/devices/batch/install` | POST | 批量安装应用 |
| `/devices/batch/uninstall` | POST | 批量卸载应用 |
| `/devices/batch/groups/statistics` | GET | 分组统计 |
| `/devices/batch/status` | POST | 批量获取状态 |

---

## 🚀 批量创建设备

### 基础用法

```bash
curl -X POST http://localhost:30002/devices/batch/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "count": 10,
    "namePrefix": "game-device",
    "userId": "user-123",
    "cpuCores": 4,
    "memoryMB": 8192,
    "storageMB": 10240,
    "resolution": "1080x1920",
    "dpi": 320,
    "androidVersion": "11",
    "groupName": "gaming-group",
    "enableGpu": true
  }'
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| count | number | ✅ | 创建数量 (1-100) |
| namePrefix | string | ✅ | 设备名称前缀 |
| userId | string | ❌ | 用户ID |
| cpuCores | number | ✅ | CPU核心数 (1-16) |
| memoryMB | number | ✅ | 内存大小 (1024-32768) |
| storageMB | number | ❌ | 存储大小 |
| resolution | string | ✅ | 分辨率 (如 1080x1920) |
| dpi | number | ✅ | DPI (120-640) |
| androidVersion | string | ❌ | Android版本 (11/12/13) |
| groupName | string | ❌ | 分组名称 |
| enableGpu | boolean | ❌ | 启用GPU |
| enableAudio | boolean | ❌ | 启用音频 |

### 响应示例

```json
{
  "total": 10,
  "success": 10,
  "failed": 0,
  "duration": 45230,
  "results": {
    "game-device-1": {
      "success": true,
      "data": {
        "id": "uuid-1",
        "name": "game-device-1"
      }
    },
    "game-device-2": {
      "success": true,
      "data": {
        "id": "uuid-2",
        "name": "game-device-2"
      }
    }
    // ... 其他设备
  }
}
```

### 使用场景

#### 场景1：游戏多开
```json
{
  "count": 50,
  "namePrefix": "game-phone",
  "cpuCores": 4,
  "memoryMB": 8192,
  "resolution": "1080x2400",
  "dpi": 420,
  "enableGpu": true,
  "groupName": "gaming-cluster"
}
```

#### 场景2：测试设备池
```json
{
  "count": 20,
  "namePrefix": "test-device",
  "cpuCores": 2,
  "memoryMB": 4096,
  "resolution": "720x1280",
  "dpi": 240,
  "groupName": "testing-pool"
}
```

#### 场景3：应用试用
```json
{
  "count": 100,
  "namePrefix": "trial-device",
  "cpuCores": 2,
  "memoryMB": 2048,
  "resolution": "720x1280",
  "dpi": 240,
  "groupName": "trial-users"
}
```

---

## ⚡ 批量操作设备

### 通用批量操作

```bash
curl -X POST http://localhost:30002/devices/batch/operate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "operation": "start",
    "deviceIds": ["uuid-1", "uuid-2", "uuid-3"],
    "maxConcurrency": 10
  }'
```

### 操作类型

| 操作 | 说明 | 额外参数 |
|------|------|---------|
| `start` | 启动设备 | 无 |
| `stop` | 停止设备 | 无 |
| `restart` | 重启设备 | 无 |
| `delete` | 删除设备 | 无 |
| `execute_command` | 执行命令 | `command` |
| `install_app` | 安装应用 | `apkPath` |
| `uninstall_app` | 卸载应用 | `packageName` |

### 选择设备的三种方式

#### 1. 按设备ID列表
```json
{
  "operation": "start",
  "deviceIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

#### 2. 按分组
```json
{
  "operation": "start",
  "groupName": "gaming-group"
}
```

#### 3. 按用户
```json
{
  "operation": "start",
  "userId": "user-123"
}
```

### 快捷操作API

#### 批量启动
```bash
curl -X POST http://localhost:30002/devices/batch/start \
  -H "Content-Type: application/json" \
  -d '{
    "groupName": "gaming-group",
    "maxConcurrency": 20
  }'
```

#### 批量停止
```bash
curl -X POST http://localhost:30002/devices/batch/stop \
  -H "Content-Type: application/json" \
  -d '{
    "deviceIds": ["uuid-1", "uuid-2"]
  }'
```

#### 批量重启
```bash
curl -X POST http://localhost:30002/devices/batch/restart \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123"
  }'
```

#### 批量删除 ⚠️
```bash
curl -X POST http://localhost:30002/devices/batch/delete \
  -H "Content-Type: application/json" \
  -d '{
    "deviceIds": ["uuid-1", "uuid-2"]
  }'
```

---

## 👥 设备分组管理

### 获取分组统计

```bash
curl http://localhost:30002/devices/batch/groups/statistics
```

响应：
```json
{
  "gaming-group": {
    "total": 50,
    "running": 45,
    "stopped": 3,
    "error": 2,
    "devices": [
      { "id": "uuid-1", "name": "game-device-1", "status": "running" }
      // ... 其他设备
    ]
  },
  "testing-pool": {
    "total": 20,
    "running": 15,
    "stopped": 5,
    "error": 0,
    "devices": [...]
  }
}
```

### 获取分组设备列表

```bash
curl http://localhost:30002/devices/batch/groups/gaming-group/devices
```

### 更新设备分组

```bash
curl -X PATCH http://localhost:30002/devices/batch/groups/update \
  -H "Content-Type: application/json" \
  -d '{
    "deviceIds": ["uuid-1", "uuid-2", "uuid-3"],
    "groupName": "new-group"
  }'
```

### 分组使用场景

```javascript
// 按业务场景分组
const groups = {
  "gaming-cluster": "游戏多开专用",
  "testing-pool": "自动化测试设备",
  "trial-users": "应用试用设备",
  "dev-environment": "开发调试环境",
  "production": "生产环境设备"
};
```

---

## 🖥️ 批量命令执行

### 批量执行Shell命令

```bash
curl -X POST http://localhost:30002/devices/batch/execute \
  -H "Content-Type: application/json" \
  -d '{
    "groupName": "gaming-group",
    "command": "pm list packages -3",
    "maxConcurrency": 15
  }'
```

### 批量执行并收集结果

```bash
curl -X POST http://localhost:30002/devices/batch/execute-collect \
  -H "Content-Type: application/json" \
  -d '{
    "deviceIds": ["uuid-1", "uuid-2", "uuid-3"],
    "command": "getprop ro.build.version.release",
    "maxConcurrency": 10
  }'
```

响应：
```json
{
  "uuid-1": "11",
  "uuid-2": "11",
  "uuid-3": "ERROR: Device not connected"
}
```

### 常用命令示例

#### 查看设备信息
```bash
{
  "command": "getprop | grep 'ro.product\\|ro.build'"
}
```

#### 清理缓存
```bash
{
  "command": "pm clear com.example.app && echo 'Cache cleared'"
}
```

#### 修改系统设置
```bash
{
  "command": "settings put system screen_off_timeout 2147483647"
}
```

#### 检查网络
```bash
{
  "command": "ping -c 3 8.8.8.8"
}
```

#### 查看内存使用
```bash
{
  "command": "free -m"
}
```

---

## 📱 批量应用管理

### 批量安装应用

```bash
curl -X POST http://localhost:30002/devices/batch/install \
  -H "Content-Type: application/json" \
  -d '{
    "groupName": "gaming-group",
    "apkPath": "/tmp/game.apk",
    "maxConcurrency": 10
  }'
```

### 批量卸载应用

```bash
curl -X POST http://localhost:30002/devices/batch/uninstall \
  -H "Content-Type: application/json" \
  -d '{
    "deviceIds": ["uuid-1", "uuid-2"],
    "packageName": "com.example.app"
  }'
```

### 使用场景

#### 游戏多开：批量安装游戏
```bash
# 1. 批量安装游戏APK
curl -X POST .../devices/batch/install \
  -d '{
    "groupName": "gaming-cluster",
    "apkPath": "/data/apks/game-v2.0.apk",
    "maxConcurrency": 20
  }'

# 2. 批量启动游戏
curl -X POST .../devices/batch/execute \
  -d '{
    "groupName": "gaming-cluster",
    "command": "am start -n com.game.package/.MainActivity"
  }'
```

---

## ⚙️ 性能优化

### 并发控制

根据服务器性能调整 `maxConcurrency`：

| 服务器配置 | 推荐并发数 | 说明 |
|-----------|----------|------|
| 4核8G | 5-10 | 小规模部署 |
| 8核16G | 10-20 | 中等规模 |
| 16核32G+ | 20-50 | 大规模部署 |

### 批量操作最佳实践

```json
{
  "operation": "start",
  "groupName": "large-group",
  "maxConcurrency": 20  // 根据服务器性能调整
}
```

### 分批次操作

对于超大规模（100+台），建议分批操作：

```javascript
// JavaScript 示例
const allDeviceIds = [...]; // 200 个设备
const batchSize = 50;

for (let i = 0; i < allDeviceIds.length; i += batchSize) {
  const batch = allDeviceIds.slice(i, i + batchSize);

  await fetch('/devices/batch/start', {
    method: 'POST',
    body: JSON.stringify({
      deviceIds: batch,
      maxConcurrency: 20
    })
  });

  // 批次间等待
  await sleep(5000);
}
```

---

## 💡 使用案例

### 案例1：每日游戏挂机

```bash
#!/bin/bash
# daily-gaming.sh

# 1. 早上8点启动所有游戏设备
curl -X POST .../devices/batch/start \
  -d '{"groupName": "gaming-cluster", "maxConcurrency": 30}'

# 2. 启动游戏应用
curl -X POST .../devices/batch/execute \
  -d '{
    "groupName": "gaming-cluster",
    "command": "am start -n com.game/.MainActivity"
  }'

# 3. 晚上12点停止所有设备
# (cron: 0 0 * * * /path/to/daily-gaming.sh stop)
curl -X POST .../devices/batch/stop \
  -d '{"groupName": "gaming-cluster"}'
```

### 案例2：自动化测试

```javascript
// 自动化测试脚本
async function runAutomatedTests() {
  // 1. 创建测试设备
  const createResult = await fetch('/devices/batch/create', {
    method: 'POST',
    body: JSON.stringify({
      count: 10,
      namePrefix: 'test-device',
      groupName: 'auto-test',
      cpuCores: 2,
      memoryMB: 4096
    })
  }).then(r => r.json());

  // 2. 等待设备就绪
  await sleep(90000); // 90秒

  // 3. 安装测试应用
  await fetch('/devices/batch/install', {
    method: 'POST',
    body: JSON.stringify({
      groupName: 'auto-test',
      apkPath: '/tmp/app-debug.apk'
    })
  });

  // 4. 执行测试脚本
  const testResults = await fetch('/devices/batch/execute-collect', {
    method: 'POST',
    body: JSON.stringify({
      groupName: 'auto-test',
      command: 'am instrument -w com.app.test/androidx.test.runner.AndroidJUnitRunner'
    })
  }).then(r => r.json());

  // 5. 清理测试设备
  await fetch('/devices/batch/delete', {
    method: 'POST',
    body: JSON.stringify({
      groupName: 'auto-test'
    })
  });

  return testResults;
}
```

### 案例3：应用商店试用

```bash
# 用户申请试用
# 1. 创建试用设备
curl -X POST .../devices/batch/create \
  -d '{
    "count": 1,
    "namePrefix": "trial-${USER_ID}",
    "userId": "user-456",
    "groupName": "trial-users",
    "cpuCores": 2,
    "memoryMB": 2048
  }'

# 2. 安装试用应用
curl -X POST .../devices/batch/install \
  -d '{
    "userId": "user-456",
    "apkPath": "/apps/trial-app.apk"
  }'

# 3. 30分钟后自动清理
sleep 1800
curl -X POST .../devices/batch/delete \
  -d '{"userId": "user-456"}'
```

---

## ✅ 最佳实践

### 1. 设备命名规范

```
格式: {场景}-{用途}-{序号}
示例:
- game-phone-001
- test-device-001
- trial-user123-001
```

### 2. 分组策略

- **按场景分组**: gaming, testing, trial
- **按性能分组**: high-performance, standard, low-cost
- **按用户分组**: user-{userId}
- **按项目分组**: project-{projectName}

### 3. 监控和告警

```javascript
// 定期检查设备状态
setInterval(async () => {
  const stats = await fetch('/devices/batch/groups/statistics')
    .then(r => r.json());

  for (const [group, data] of Object.entries(stats)) {
    // 错误率超过10%触发告警
    const errorRate = data.error / data.total;
    if (errorRate > 0.1) {
      alert(`Group ${group} has high error rate: ${errorRate * 100}%`);
    }
  }
}, 60000); // 每分钟检查
```

### 4. 资源配额管理

```typescript
// 根据用户等级分配资源配额
const quotas = {
  free: { maxDevices: 1, cpuCores: 2, memoryMB: 2048 },
  basic: { maxDevices: 5, cpuCores: 2, memoryMB: 4096 },
  pro: { maxDevices: 50, cpuCores: 4, memoryMB: 8192 },
  enterprise: { maxDevices: 500, cpuCores: 8, memoryMB: 16384 },
};
```

### 5. 批量操作错误处理

```javascript
const result = await batchOperate({
  operation: 'start',
  groupName: 'gaming-group'
});

// 处理失败的设备
if (result.failed > 0) {
  const failedDevices = Object.entries(result.results)
    .filter(([_, r]) => !r.success)
    .map(([id, _]) => id);

  // 重试失败的设备
  await batchOperate({
    operation: 'start',
    deviceIds: failedDevices,
    maxConcurrency: 5
  });
}
```

---

## 📞 API Swagger 文档

完整的API文档请访问：

```
http://localhost:30002/api/docs#tag/Batch-Operations
```

---

## 🎯 性能基准

### 批量创建性能

| 设备数量 | 并发数 | 平均耗时 |
|---------|--------|---------|
| 10 | 10 | ~15秒 |
| 50 | 20 | ~45秒 |
| 100 | 30 | ~90秒 |

### 批量操作性能

| 操作类型 | 设备数量 | 并发数 | 平均耗时 |
|---------|---------|--------|---------|
| Start | 50 | 20 | ~30秒 |
| Stop | 50 | 20 | ~10秒 |
| Execute | 50 | 20 | ~5秒 |
| Install | 50 | 10 | ~120秒 |

---

## 🔗 相关文档

- [Redroid 集成设计](./REDROID_INTEGRATION.md)
- [Redroid 集成完成报告](./REDROID_INTEGRATION_COMPLETE.md)
- [设备管理 API 文档](./API.md)
- [大规模部署指南](./LARGE_SCALE_DEPLOYMENT.md) _(即将推出)_

---

**文档版本**: 2.0
**最后更新**: 2025-10-20
**维护者**: Claude Code Assistant
**适用版本**: Device Service v1.0+
