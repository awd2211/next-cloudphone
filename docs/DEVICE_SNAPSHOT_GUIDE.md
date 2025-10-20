# 📸 设备快照使用指南

**版本**: 1.0.0
**更新时间**: 2025-10-20
**适用环境**: Device Service (NestJS)

---

## 📑 目录

1. [概述](#概述)
2. [快速开始](#快速开始)
3. [核心概念](#核心概念)
4. [快照管理](#快照管理)
5. [快照恢复](#快照恢复)
6. [高级功能](#高级功能)
7. [最佳实践](#最佳实践)
8. [故障排查](#故障排查)

---

## 概述

### 什么是设备快照？

设备快照是设备在特定时刻的完整状态镜像，包含：
- 系统状态
- 已安装应用
- 应用数据
- 系统设置
- 游戏进度

通过快照系统，您可以：

- 💾 **状态保存**: 保存设备在任意时刻的完整状态
- ⚡ **快速恢复**: 10-15秒内将设备恢复到指定状态
- 🔄 **批量复制**: 从一个快照创建多个相同状态的设备
- 🛡️ **故障恢复**: 设备出现问题时快速回滚
- 📦 **版本管理**: 保存设备的多个版本状态

### 技术原理

基于 Docker 的容器快照技术：

```
┌──────────────┐
│  运行设备    │  docker commit
│  (Container) │ ────────────────> ┌──────────────┐
│              │                   │  快照镜像    │
└──────────────┘                   │  (Image)     │
                                   └──────────────┘
                                          │
                                          │ docker run
                                          ▼
                                   ┌──────────────┐
                                   │  新设备      │
                                   │  (Container) │
                                   └──────────────┘
```

---

## 快速开始

### 1. 创建设备快照

```bash
curl -X POST http://localhost:30002/snapshots/device/{deviceId} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "游戏进度-第10关",
    "description": "王者荣耀完成第10关后的状态",
    "tags": ["王者荣耀", "进度保存", "第10关"]
  }'
```

**响应示例**:
```json
{
  "id": "snapshot-uuid-xxx",
  "name": "游戏进度-第10关",
  "deviceId": "device-id-xxx",
  "status": "creating",
  "metadata": {
    "deviceName": "wzry-device-001",
    "cpuCores": 4,
    "memoryMB": 8192
  },
  "createdAt": "2025-10-20T10:00:00Z"
}
```

**注意**: 快照创建是异步的，创建完成后状态会变为 `ready`。

### 2. 从快照恢复设备（创建新设备）

```bash
curl -X POST http://localhost:30002/snapshots/{snapshotId}/restore \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "deviceName": "restored-device-001",
    "groupName": "test-group"
  }'
```

**响应示例**:
```json
{
  "id": "new-device-id",
  "name": "restored-device-001",
  "status": "running",
  "adbPort": 5556,
  "groupName": "test-group"
}
```

### 3. 替换原设备

如果想要将原设备恢复到快照状态（而不是创建新设备）：

```bash
curl -X POST http://localhost:30002/snapshots/{snapshotId}/restore \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "replaceOriginal": true
  }'
```

---

## 核心概念

### 快照状态

| 状态 | 描述 | 可操作 |
|------|------|--------|
| `creating` | 正在创建快照 | 否 |
| `ready` | 快照就绪，可用于恢复 | 是 |
| `restoring` | 正在从快照恢复设备 | 否 |
| `failed` | 快照创建失败 | 删除 |

### 快照结构

```typescript
{
  id: string;                    // 快照 ID
  name: string;                  // 快照名称
  description: string;           // 快照描述
  deviceId: string;              // 源设备 ID
  status: SnapshotStatus;        // 快照状态

  // Docker 镜像信息
  imageId: string;               // Docker 镜像 ID
  imageName: string;             // 镜像名称
  imageSize: number;             // 镜像大小（字节）

  // 元数据
  metadata: {
    deviceName: string;          // 设备名称
    cpuCores: number;            // CPU 核心数
    memoryMB: number;            // 内存大小
    resolution: string;          // 分辨率
    androidVersion: string;      // Android 版本
    // ... 其他自定义数据
  };

  // 版本信息
  version: number;               // 快照版本号
  parentSnapshotId: string;      // 父快照 ID（增量快照）

  // 压缩信息
  isCompressed: boolean;         // 是否已压缩
  compressedPath: string;        // 压缩文件路径
  compressedSize: number;        // 压缩后大小

  // 标签和统计
  tags: string[];                // 标签
  restoreCount: number;          // 恢复次数
  lastRestoredAt: Date;          // 最后恢复时间

  createdBy: string;             // 创建者
  createdAt: Date;               // 创建时间
}
```

---

## 快照管理

### 创建快照

**API**: `POST /snapshots/device/:deviceId`

**请求体**:
```json
{
  "name": "快照名称",
  "description": "快照描述（可选）",
  "tags": ["标签1", "标签2"],
  "metadata": {
    "customKey": "自定义元数据"
  }
}
```

**要求**:
- 设备必须处于 `running` 状态
- 设备容器必须存在且可访问

**创建过程**:
1. 验证设备状态
2. 创建快照记录（状态：creating）
3. 异步执行 Docker commit
4. 获取镜像信息
5. 更新快照状态为 ready

**性能**:
- 小型设备（2G）：~10秒
- 中型设备（4G）：~20秒
- 大型设备（8G+）：~40秒

### 查询快照

#### 获取单个快照

**API**: `GET /snapshots/:id`

**响应**:
```json
{
  "id": "snapshot-id",
  "name": "游戏进度-第10关",
  "status": "ready",
  "imageSize": 2147483648,
  "metadata": {...},
  "restoreCount": 5,
  "lastRestoredAt": "2025-10-20T14:30:00Z"
}
```

#### 获取设备的所有快照

**API**: `GET /snapshots/device/:deviceId`

**响应**: 快照列表，按创建时间倒序

#### 获取当前用户的所有快照

**API**: `GET /snapshots`

**响应**: 当前用户创建的所有快照

#### 获取快照统计

**API**: `GET /snapshots/stats/summary`

**响应**:
```json
{
  "total": 25,
  "byStatus": [
    { "status": "ready", "count": 20 },
    { "status": "creating", "count": 3 },
    { "status": "failed", "count": 2 }
  ],
  "totalSize": 53687091200,
  "compressedSize": 16106127360
}
```

### 删除快照

**API**: `DELETE /snapshots/:id`

**操作**:
1. 删除 Docker 镜像
2. 删除压缩文件（如果存在）
3. 删除数据库记录

**注意**: 只能删除自己创建的快照

---

## 快照恢复

### 恢复模式

#### 模式 1: 创建新设备（推荐）

```bash
POST /snapshots/:id/restore
{
  "deviceName": "new-device-name",
  "groupName": "group-name"
}
```

**特点**:
- ✅ 保留原设备
- ✅ 创建独立的新设备
- ✅ 可指定设备名称和分组
- ✅ 适合批量复制场景

**流程**:
```
┌────────────┐     ┌──────────┐     ┌────────────┐
│ 原设备     │     │ 快照镜像 │────>│ 新设备     │
│ (运行中)   │     │          │     │ (新容器)   │
└────────────┘     └──────────┘     └────────────┘
```

#### 模式 2: 替换原设备

```bash
POST /snapshots/:id/restore
{
  "replaceOriginal": true
}
```

**特点**:
- ⚠️ 停止并删除原设备容器
- ⚠️ 使用快照创建新容器替换
- ✅ 保持设备 ID 和端口不变
- ✅ 适合快速回滚场景

**流程**:
```
┌────────────┐
│ 原设备     │ ─(停止)─> ─(删除)─>
│ (运行中)   │
└────────────┘
                            ↓
                    ┌──────────┐
                    │ 快照镜像 │
                    └──────────┘
                            ↓
                    ┌────────────┐
                    │ 新容器     │ (相同设备ID)
                    │ (快照状态) │
                    └────────────┘
```

### 恢复性能

| 快照大小 | 恢复时间 | 说明 |
|---------|---------|------|
| 1-2 GB | 10-15秒 | 快速恢复 |
| 3-4 GB | 15-25秒 | 标准恢复 |
| 5-8 GB | 25-40秒 | 较慢恢复 |
| 8+ GB | 40-60秒 | 大型设备 |

**优化建议**:
- 使用 SSD 存储
- 压缩不常用快照
- 定期清理旧快照

---

## 高级功能

### 快照压缩

**为什么要压缩？**
- 节省存储空间（50-70% 压缩率）
- 便于传输和备份
- 降低存储成本

**API**: `POST /snapshots/:id/compress`

**流程**:
```bash
# 1. 导出 Docker 镜像
docker save {imageId} > snapshot.tar

# 2. Gzip 压缩
gzip snapshot.tar

# 3. 保存压缩文件
mv snapshot.tar.gz /data/snapshots/{snapshotId}.tar.gz
```

**压缩效果**:
```
原始镜像: 4.2 GB
压缩后:   1.3 GB (压缩率 69%)
```

**注意**:
- 压缩是一次性操作
- 压缩后不影响快照使用
- 删除快照时会自动删除压缩文件

### 快照元数据

可以在快照中存储自定义元数据：

```bash
POST /snapshots/device/:deviceId
{
  "name": "游戏进度快照",
  "metadata": {
    "gameLevel": 10,
    "gold": 5000,
    "diamond": 100,
    "characters": ["hero1", "hero2"],
    "achievements": [...]
  }
}
```

**用途**:
- 游戏进度信息
- 测试环境配置
- 应用版本信息
- 自定义标记

### 快照版本管理

每个设备可以有多个快照，形成版本链：

```
Device-001
├── v1: 初始状态 (2025-10-20 10:00)
├── v2: 完成新手教程 (2025-10-20 11:00)
├── v3: 达到10级 (2025-10-20 14:00)
└── v4: 完成主线任务 (2025-10-20 16:00)
```

**查询设备的所有版本**:
```bash
GET /snapshots/device/:deviceId
```

**从指定版本恢复**:
```bash
POST /snapshots/{v2-snapshot-id}/restore
```

---

## 最佳实践

### 1. 快照命名规范

建议使用描述性名称：

```
<类型>-<描述>-<版本/时间>
```

**示例**:
- `游戏进度-第10关-2025-10-20`
- `测试环境-初始化完成-v1`
- `应用商店-已安装5个应用-20251020`
- `开发环境-配置完成-stable`

### 2. 快照标签使用

为快照添加有意义的标签：

```json
{
  "tags": [
    "王者荣耀",      // 应用名
    "第10关",        // 进度标记
    "满血满蓝",      // 状态描述
    "2025-10-20"    // 日期标记
  ]
}
```

### 3. 快照管理策略

#### 短期快照（开发/测试）
```
保留时间: 7-14天
压缩策略: 不压缩
用途: 快速恢复测试环境
清理策略: 定期自动清理
```

#### 长期快照（重要里程碑）
```
保留时间: 长期保存
压缩策略: 立即压缩
用途: 重要状态备份
清理策略: 手动清理
```

### 4. 游戏多开场景

**场景**: 50台设备同时玩王者荣耀

**策略**:
1. 创建标准设备（安装游戏，完成登录）
2. 创建基础快照 `wzry-base`
3. 从快照批量创建50台设备
4. 每天游戏结束后创建进度快照
5. 次日从进度快照批量恢复

```bash
# 1. 创建基础快照
curl -X POST /snapshots/device/master-device \
  -d '{"name": "wzry-base", "tags": ["王者荣耀", "基础配置"]}'

# 2. 批量创建50台设备
for i in {1..50}; do
  curl -X POST /snapshots/{snapshot-id}/restore \
    -d "{\"deviceName\": \"wzry-device-$i\", \"groupName\": \"wzry-farm\"}"
done

# 3. 游戏结束后保存进度（选择一台设备）
curl -X POST /snapshots/device/wzry-device-1 \
  -d '{"name": "wzry-progress-day1", "tags": ["进度", "第一天"]}'
```

### 5. 应用测试场景

**场景**: 测试应用在不同状态下的行为

**策略**:
1. 创建干净设备快照 `clean-state`
2. 安装应用，创建快照 `app-installed`
3. 执行测试用例
4. 从 `clean-state` 恢复，重新测试
5. 循环执行不同测试场景

```bash
# 1. 创建干净状态快照
curl -X POST /snapshots/device/test-device \
  -d '{"name": "clean-state"}'

# 2. 安装应用后创建快照
curl -X POST /snapshots/device/test-device \
  -d '{"name": "app-installed"}'

# 3. 测试后恢复到干净状态
curl -X POST /snapshots/{clean-snapshot-id}/restore \
  -d '{"replaceOriginal": true}'
```

### 6. 存储空间优化

**定期清理策略**:

```typescript
// 清理30天前的快照
async cleanOldSnapshots() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const oldSnapshots = await snapshotRepository.find({
    where: {
      createdAt: LessThan(thirtyDaysAgo),
      restoreCount: 0  // 未使用过的快照
    }
  });

  for (const snapshot of oldSnapshots) {
    await snapshotsService.deleteSnapshot(snapshot.id, snapshot.createdBy);
  }
}
```

**压缩策略**:

```typescript
// 压缩7天前的快照
async compressOldSnapshots() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const snapshots = await snapshotRepository.find({
    where: {
      createdAt: LessThan(sevenDaysAgo),
      isCompressed: false
    }
  });

  for (const snapshot of snapshots) {
    await snapshotsService.compressSnapshot(snapshot.id);
  }
}
```

---

## 使用场景详解

### 场景 1: 游戏进度保存

**需求**: 多台设备玩游戏，每天保存进度，第二天继续

**实现**:

```bash
# 第一天游戏结束
curl -X POST /snapshots/device/wzry-001 \
  -d '{
    "name": "wzry-progress-day1",
    "description": "王者荣耀第一天进度",
    "tags": ["王者荣耀", "day1", "等级10"],
    "metadata": {
      "level": 10,
      "gold": 5000,
      "matches": 8
    }
  }'

# 第二天开始游戏前恢复
curl -X POST /snapshots/{snapshot-id}/restore \
  -d '{"replaceOriginal": true}'
```

### 场景 2: A/B 测试

**需求**: 测试应用的两个不同版本

**实现**:

```bash
# 1. 创建基础快照
curl -X POST /snapshots/device/test-device \
  -d '{"name": "base-state"}'

# 2. 测试版本 A
curl -X POST /devices/test-device/install \
  -d '{"apkPath": "/data/app-v1.0.apk"}'

# 运行测试...

# 3. 恢复基础状态
curl -X POST /snapshots/{base-snapshot-id}/restore \
  -d '{"replaceOriginal": true}'

# 4. 测试版本 B
curl -X POST /devices/test-device/install \
  -d '{"apkPath": "/data/app-v2.0.apk"}'

# 运行测试...
```

### 场景 3: 快速故障恢复

**需求**: 设备出现问题，快速恢复到正常状态

**实现**:

```bash
# 定期创建健康状态快照
curl -X POST /snapshots/device/prod-device \
  -d '{"name": "healthy-state", "tags": ["production", "stable"]}'

# 发现设备异常时恢复
curl -X POST /snapshots/{healthy-snapshot-id}/restore \
  -d '{"replaceOriginal": true}'
```

---

## 故障排查

### 问题 1: 快照创建失败

**症状**: 快照状态为 `failed`

**可能原因**:
1. Docker 磁盘空间不足
2. 设备容器不存在或已停止
3. Docker daemon 无响应
4. 权限不足

**解决方案**:

```bash
# 1. 检查磁盘空间
df -h /var/lib/docker

# 2. 清理无用镜像
docker image prune -a

# 3. 检查设备状态
curl http://localhost:30002/devices/{deviceId}

# 4. 检查 Docker daemon
docker ps
docker info

# 5. 重试创建快照
curl -X POST /snapshots/device/{deviceId} -d '{...}'
```

### 问题 2: 快照恢复超时

**症状**: 恢复操作长时间未完成

**可能原因**:
1. 镜像过大，拉取时间长
2. 端口冲突
3. 系统资源不足

**解决方案**:

```bash
# 1. 检查快照大小
curl http://localhost:30002/snapshots/{snapshotId}

# 2. 检查系统资源
free -h
docker stats

# 3. 检查端口占用
netstat -tlnp | grep 5555

# 4. 手动恢复测试
docker run cloudphone-snapshot:{snapshotId}
```

### 问题 3: 压缩失败

**症状**: 压缩操作返回错误

**可能原因**:
1. 磁盘空间不足（压缩需要临时空间）
2. 权限不足
3. 镜像不存在

**解决方案**:

```bash
# 1. 检查磁盘空间
df -h /data/snapshots

# 2. 检查快照目录权限
ls -la /data/snapshots

# 3. 手动压缩测试
docker save {imageId} | gzip > /tmp/test.tar.gz

# 4. 清理临时文件
rm -rf /tmp/docker-*
```

### 问题 4: 快照元数据丢失

**症状**: 快照可用，但元数据为空

**可能原因**:
1. 数据库连接失败
2. 创建时未提供元数据
3. 数据库记录损坏

**解决方案**:

```bash
# 1. 检查数据库连接
curl http://localhost:30002/health

# 2. 查询快照详情
curl http://localhost:30002/snapshots/{snapshotId}

# 3. 重新创建快照（如果可能）
curl -X POST /snapshots/device/{deviceId} \
  -d '{"name": "...", "metadata": {...}}'
```

---

## API 参考

### 快照管理 API

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /snapshots/device/:deviceId | 创建设备快照 |
| GET | /snapshots/:id | 获取快照详情 |
| GET | /snapshots | 获取当前用户的所有快照 |
| GET | /snapshots/device/:deviceId | 获取设备的所有快照 |
| GET | /snapshots/stats/summary | 获取快照统计 |
| DELETE | /snapshots/:id | 删除快照 |

### 快照操作 API

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /snapshots/:id/restore | 从快照恢复设备 |
| POST | /snapshots/:id/compress | 压缩快照 |

---

## 性能指标

### 快照创建性能

| 设备大小 | 创建时间 | 镜像大小 | 备注 |
|---------|---------|---------|------|
| 2 GB | ~10秒 | ~2.1 GB | 基础设备 |
| 4 GB | ~20秒 | ~4.2 GB | 标准设备 |
| 6 GB | ~30秒 | ~6.3 GB | 高配设备 |
| 8+ GB | ~40秒 | ~8.4 GB | 大型设备 |

### 快照恢复性能

| 操作模式 | 耗时 | 说明 |
|---------|------|------|
| 创建新设备 | 10-15秒 | 推荐 |
| 替换原设备 | 15-20秒 | 包含停止和删除 |

### 压缩性能

| 镜像大小 | 压缩时间 | 压缩率 | 压缩后大小 |
|---------|---------|--------|-----------|
| 2 GB | ~1分钟 | 65-70% | ~0.7 GB |
| 4 GB | ~2分钟 | 65-70% | ~1.4 GB |
| 8 GB | ~4分钟 | 65-70% | ~2.8 GB |

---

## 总结

设备快照系统提供了强大的状态管理和恢复能力：

✅ **快速保存**: 10-40秒创建完整设备快照
✅ **快速恢复**: 10-15秒恢复到任意状态
✅ **灵活操作**: 支持创建新设备或替换原设备
✅ **空间优化**: 压缩可节省50-70%存储空间
✅ **版本管理**: 支持多版本快照，随时回滚

**推荐使用场景**:
- 游戏进度保存和恢复（日常运营）
- 应用测试环境快速重置（CI/CD）
- 设备故障快速恢复（生产环境）
- 批量部署相同状态设备（大规模部署）

---

**文档版本**: 1.0.0
**最后更新**: 2025-10-20
**维护者**: Device Service Team
