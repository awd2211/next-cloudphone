# REST API 实现指南 - 云手机高级功能

**日期**: 2025-11-01
**状态**: 🚧 实施中
**前置工作**: Provider 层集成已完成

---

## 📋 概述

本文档指导如何在 Device Service 层添加 REST API 端点,暴露 Provider 层实现的高级功能。

---

## ✅ 已完成的端点

以下端点已在 `devices.controller.ts` 中实现:

| 端点 | 方法 | 功能 | 权限 |
|-----|------|------|------|
| `/devices/:id/shell` | POST | 执行 Shell 命令 | device.control |
| `/devices/:id/install` | POST | 安装应用 | device.control |
| `/devices/:id/uninstall` | POST | 卸载应用 | device.control |
| `/devices/:id/packages` | GET | 获取已安装应用 | device.read |
| `/devices/:id/push` | POST | 推送文件 (multipart) | device.control |
| `/devices/:id/pull` | POST | 拉取文件 | device.control |
| `/devices/:id/screenshot` | POST | 截图 | device.control |

---

## 🔜 需要添加的端点 (阿里云专属)

### 1. 应用操作端点

#### 启动应用
```
POST /devices/:id/apps/:packageName/start
```

**权限**: `device.app.operate`
**DTO**: `StartAppDto` (已创建)
**Service 方法**: 需要实现 `startApp(deviceId, packageName)`

#### 停止应用
```
POST /devices/:id/apps/:packageName/stop
```

**权限**: `device.app.operate`
**DTO**: `StopAppDto` (已创建)
**Service 方法**: 需要实现 `stopApp(deviceId, packageName)`

#### 清除应用数据
```
DELETE /devices/:id/apps/:packageName/data
```

**权限**: `device.app.operate`
**DTO**: `ClearAppDataDto` (已创建)
**Service 方法**: 需要实现 `clearAppData(deviceId, packageName)`

### 2. 快照管理端点

#### 创建快照
```
POST /devices/:id/snapshots
```

**权限**: `device.snapshot.create`
**DTO**: `CreateSnapshotDto` (已创建)
**Request Body**:
```json
{
  "name": "backup-before-upgrade",
  "description": "2025-11-01 升级前备份"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "snapshotId": "snapshot-123456"
  },
  "message": "快照创建成功"
}
```

**Service 方法**: 需要实现 `createSnapshot(deviceId, name, description)`

#### 恢复快照
```
POST /devices/:id/snapshots/:snapshotId/restore
```

**权限**: `device.snapshot.restore`
**DTO**: `RestoreSnapshotDto` (已创建)
**Response**:
```json
{
  "success": true,
  "message": "快照恢复成功，设备将重启"
}
```

**Service 方法**: 需要实现 `restoreSnapshot(deviceId, snapshotId)`

---

## 📝 实现步骤

### 步骤 1: 在 `devices.service.ts` 添加方法

在文件末尾 (第 1882 行之后) 添加以下方法:

```typescript
  // ============================================================
  // 应用操作 (阿里云专属)
  // ============================================================

  /**
   * 启动应用
   *
   * 仅阿里云 ECP 支持
   *
   * @param deviceId 设备 ID
   * @param packageName 应用包名
   */
  async startApp(deviceId: string, packageName: string): Promise<void> {
    const device = await this.findOne(deviceId);

    if (device.status !== DeviceStatus.RUNNING) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        `设备未运行: ${deviceId}`,
        HttpStatus.BAD_REQUEST
      );
    }

    // 获取 provider
    const provider = this.providerFactory.getProvider(device.providerType);

    // 检查能力
    const capabilities = provider.getCapabilities();
    if (!capabilities.supportsAppOperation) {
      throw new BusinessException(
        BusinessErrorCode.OPERATION_NOT_SUPPORTED,
        `设备 Provider ${device.providerType} 不支持应用操作`,
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      // 调用 provider 方法
      await provider.startApp(device.providerId, packageName);

      this.logger.log(`App ${packageName} started on device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to start app ${packageName} on device ${deviceId}: ${error.message}`);
      throw BusinessErrors.operationFailed(`启动应用失败: ${error.message}`, {
        deviceId,
        packageName,
      });
    }
  }

  /**
   * 停止应用
   *
   * 仅阿里云 ECP 支持
   *
   * @param deviceId 设备 ID
   * @param packageName 应用包名
   */
  async stopApp(deviceId: string, packageName: string): Promise<void> {
    const device = await this.findOne(deviceId);

    if (device.status !== DeviceStatus.RUNNING) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        `设备未运行: ${deviceId}`,
        HttpStatus.BAD_REQUEST
      );
    }

    const provider = this.providerFactory.getProvider(device.providerType);

    const capabilities = provider.getCapabilities();
    if (!capabilities.supportsAppOperation) {
      throw new BusinessException(
        BusinessErrorCode.OPERATION_NOT_SUPPORTED,
        `设备 Provider ${device.providerType} 不支持应用操作`,
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      await provider.stopApp(device.providerId, packageName);

      this.logger.log(`App ${packageName} stopped on device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to stop app ${packageName} on device ${deviceId}: ${error.message}`);
      throw BusinessErrors.operationFailed(`停止应用失败: ${error.message}`, {
        deviceId,
        packageName,
      });
    }
  }

  /**
   * 清除应用数据
   *
   * 仅阿里云 ECP 支持
   *
   * @param deviceId 设备 ID
   * @param packageName 应用包名
   */
  async clearAppData(deviceId: string, packageName: string): Promise<void> {
    const device = await this.findOne(deviceId);

    if (device.status !== DeviceStatus.RUNNING) {
      throw new BusinessException(
        BusinessErrorCode.DEVICE_NOT_AVAILABLE,
        `设备未运行: ${deviceId}`,
        HttpStatus.BAD_REQUEST
      );
    }

    const provider = this.providerFactory.getProvider(device.providerType);

    const capabilities = provider.getCapabilities();
    if (!capabilities.supportsAppOperation) {
      throw new BusinessException(
        BusinessErrorCode.OPERATION_NOT_SUPPORTED,
        `设备 Provider ${device.providerType} 不支持应用操作`,
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      await provider.clearAppData(device.providerId, packageName);

      this.logger.log(`App data cleared for ${packageName} on device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to clear app data for ${packageName} on device ${deviceId}: ${error.message}`);
      throw BusinessErrors.operationFailed(`清除应用数据失败: ${error.message}`, {
        deviceId,
        packageName,
      });
    }
  }

  // ============================================================
  // 快照管理 (阿里云专属)
  // ============================================================

  /**
   * 创建设备快照
   *
   * 仅阿里云 ECP 支持
   *
   * @param deviceId 设备 ID
   * @param name 快照名称
   * @param description 快照描述
   * @returns 快照 ID
   */
  async createSnapshot(
    deviceId: string,
    name: string,
    description?: string
  ): Promise<string> {
    const device = await this.findOne(deviceId);

    // 快照可以在任何状态下创建
    const provider = this.providerFactory.getProvider(device.providerType);

    // 检查能力
    const capabilities = provider.getCapabilities();
    if (!capabilities.supportsSnapshot) {
      throw new BusinessException(
        BusinessErrorCode.OPERATION_NOT_SUPPORTED,
        `设备 Provider ${device.providerType} 不支持快照功能`,
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      const snapshotId = await provider.createSnapshot(device.providerId, name, description);

      this.logger.log(`Snapshot ${snapshotId} created for device ${deviceId}`);

      return snapshotId;
    } catch (error) {
      this.logger.error(`Failed to create snapshot for device ${deviceId}: ${error.message}`);
      throw BusinessErrors.operationFailed(`创建快照失败: ${error.message}`, {
        deviceId,
        name,
      });
    }
  }

  /**
   * 恢复设备快照
   *
   * 仅阿里云 ECP 支持
   * 注意: 恢复快照会重启设备
   *
   * @param deviceId 设备 ID
   * @param snapshotId 快照 ID
   */
  async restoreSnapshot(deviceId: string, snapshotId: string): Promise<void> {
    const device = await this.findOne(deviceId);

    const provider = this.providerFactory.getProvider(device.providerType);

    const capabilities = provider.getCapabilities();
    if (!capabilities.supportsSnapshot) {
      throw new BusinessException(
        BusinessErrorCode.OPERATION_NOT_SUPPORTED,
        `设备 Provider ${device.providerType} 不支持快照功能`,
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      await provider.restoreSnapshot(device.providerId, snapshotId);

      // 恢复快照后设备会重启,更新状态
      device.status = DeviceStatus.CREATING;
      await this.deviceRepository.save(device);

      this.logger.log(`Snapshot ${snapshotId} restored for device ${deviceId}, device restarting`);

      // 清除缓存
      await this.invalidateDeviceCache(device);
    } catch (error) {
      this.logger.error(`Failed to restore snapshot ${snapshotId} for device ${deviceId}: ${error.message}`);
      throw BusinessErrors.operationFailed(`恢复快照失败: ${error.message}`, {
        deviceId,
        snapshotId,
      });
    }
  }
```

### 步骤 2: 在 `devices.controller.ts` 添加端点

在文件末尾添加以下端点:

```typescript
  // ============================================================
  // 应用操作端点 (阿里云专属)
  // ============================================================

  @Post(':id/apps/:packageName/start')
  @RequirePermission('device.app.operate')
  @ApiOperation({
    summary: '启动应用',
    description: '启动设备上的应用 (仅阿里云 ECP 支持)',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiParam({ name: 'packageName', description: '应用包名', example: 'com.tencent.mm' })
  @ApiResponse({ status: 200, description: '应用启动成功' })
  @ApiResponse({ status: 400, description: '设备未运行或不支持此操作' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async startApp(@Param('id') id: string, @Param('packageName') packageName: string) {
    await this.devicesService.startApp(id, packageName);
    return {
      success: true,
      message: `应用 ${packageName} 启动成功`,
    };
  }

  @Post(':id/apps/:packageName/stop')
  @RequirePermission('device.app.operate')
  @ApiOperation({
    summary: '停止应用',
    description: '停止设备上正在运行的应用 (仅阿里云 ECP 支持)',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiParam({ name: 'packageName', description: '应用包名', example: 'com.tencent.mm' })
  @ApiResponse({ status: 200, description: '应用停止成功' })
  @ApiResponse({ status: 400, description: '设备未运行或不支持此操作' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async stopApp(@Param('id') id: string, @Param('packageName') packageName: string) {
    await this.devicesService.stopApp(id, packageName);
    return {
      success: true,
      message: `应用 ${packageName} 停止成功`,
    };
  }

  @Delete(':id/apps/:packageName/data')
  @RequirePermission('device.app.operate')
  @ApiOperation({
    summary: '清除应用数据',
    description: '清除设备上应用的数据和缓存 (仅阿里云 ECP 支持)',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiParam({ name: 'packageName', description: '应用包名', example: 'com.tencent.mm' })
  @ApiResponse({ status: 200, description: '应用数据清除成功' })
  @ApiResponse({ status: 400, description: '设备未运行或不支持此操作' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async clearAppData(@Param('id') id: string, @Param('packageName') packageName: string) {
    await this.devicesService.clearAppData(id, packageName);
    return {
      success: true,
      message: `应用 ${packageName} 的数据已清除`,
    };
  }

  // ============================================================
  // 快照管理端点 (阿里云专属)
  // ============================================================

  @Post(':id/snapshots')
  @RequirePermission('device.snapshot.create')
  @ApiOperation({
    summary: '创建快照',
    description: '创建设备完整备份快照 (仅阿里云 ECP 支持)',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiBody({ type: CreateSnapshotDto })
  @ApiResponse({
    status: 201,
    description: '快照创建成功',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            snapshotId: { type: 'string', example: 'snapshot-123456' },
          },
        },
        message: { type: 'string', example: '快照创建成功' },
      },
    },
  })
  @ApiResponse({ status: 400, description: '设备不支持快照功能' })
  @ApiResponse({ status: 404, description: '设备不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async createSnapshot(@Param('id') id: string, @Body() dto: CreateSnapshotDto) {
    const snapshotId = await this.devicesService.createSnapshot(id, dto.name, dto.description);
    return {
      success: true,
      data: { snapshotId },
      message: '快照创建成功',
    };
  }

  @Post(':id/snapshots/:snapshotId/restore')
  @RequirePermission('device.snapshot.restore')
  @ApiOperation({
    summary: '恢复快照',
    description: '从快照恢复设备 (仅阿里云 ECP 支持)。注意: 设备将重启',
  })
  @ApiParam({ name: 'id', description: '设备 ID' })
  @ApiParam({ name: 'snapshotId', description: '快照 ID', example: 'snapshot-123456' })
  @ApiResponse({ status: 200, description: '快照恢复成功，设备将重启' })
  @ApiResponse({ status: 400, description: '设备不支持快照功能' })
  @ApiResponse({ status: 404, description: '设备或快照不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async restoreSnapshot(@Param('id') id: string, @Param('snapshotId') snapshotId: string) {
    await this.devicesService.restoreSnapshot(id, snapshotId);
    return {
      success: true,
      message: '快照恢复成功，设备将重启',
    };
  }
```

### 步骤 3: 添加导入语句

在 `devices.controller.ts` 顶部添加:

```typescript
import {
  StartAppDto,
  StopAppDto,
  ClearAppDataDto,
  CreateSnapshotDto,
  RestoreSnapshotDto,
} from './dto/app-operations.dto';
```

### 步骤 4: 添加权限定义

在 user-service 的权限定义中添加:

```typescript
// 应用操作权限
'device.app.operate'
'device.app.start'
'device.app.stop'
'device.app.clear-data'

// 快照权限
'device.snapshot.create'
'device.snapshot.restore'
'device.snapshot.delete'
'device.snapshot.list'
```

---

## 🧪 测试示例

### 启动应用
```bash
curl -X POST http://localhost:30002/devices/device-123/apps/com.tencent.mm/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### 停止应用
```bash
curl -X POST http://localhost:30002/devices/device-123/apps/com.tencent.mm/stop \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### 清除应用数据
```bash
curl -X DELETE http://localhost:30002/devices/device-123/apps/com.tencent.mm/data \
  -H "Authorization: Bearer $TOKEN"
```

### 创建快照
```bash
curl -X POST http://localhost:30002/devices/device-123/snapshots \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "backup-before-upgrade",
    "description": "2025-11-01 升级前备份"
  }'
```

### 恢复快照
```bash
curl -X POST http://localhost:30002/devices/device-123/snapshots/snapshot-123456/restore \
  -H "Authorization: Bearer $TOKEN"
```

---

## ⚠️ 注意事项

1. **平台兼容性**
   - 应用操作和快照功能仅阿里云 ECP 支持
   - 调用前检查 `provider.getCapabilities()` 中的:
     - `supportsAppOperation`
     - `supportsSnapshot`
   - 不支持的平台返回 400 错误

2. **设备状态**
   - 应用操作需要设备处于 RUNNING 状态
   - 快照可以在任何状态下创建
   - 恢复快照会导致设备重启,状态变为 CREATING

3. **错误处理**
   - 所有错误都通过 `BusinessException` 抛出
   - 使用 `BusinessErrors` 工具类创建标准错误
   - Provider 错误会被包装成业务异常

4. **缓存更新**
   - 恢复快照后需要调用 `invalidateDeviceCache()`
   - 确保缓存数据与实际状态一致

5. **日志记录**
   - 所有操作都记录详细日志
   - 包含设备 ID、应用包名、快照 ID 等关键信息

---

## 📊 完成状态

- [x] DTO 创建 (`app-operations.dto.ts`)
- [ ] Service 方法实现 (需要添加)
- [ ] Controller 端点实现 (需要添加)
- [ ] 权限定义更新
- [ ] 单元测试
- [ ] 集成测试
- [ ] API 文档更新

---

## 🚀 下一步

1. 实现 Service 和 Controller 代码
2. 添加权限到 user-service
3. 编写单元测试
4. 创建集成测试脚本
5. 更新 Swagger 文档
6. 前端集成

---

**相关文档**:
- [Provider 集成完成报告](./PROVIDER_INTEGRATION_COMPLETE.md)
- [阿里云高级功能](./ALIYUN_ADVANCED_FEATURES_COMPLETE.md)
- [完整实现总结](./ADVANCED_FEATURES_SUMMARY.md)
