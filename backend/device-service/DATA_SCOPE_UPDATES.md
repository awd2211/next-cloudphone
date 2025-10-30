# Device Service 数据范围更新说明

## 需要添加 @DataScope 装饰器的接口

### 查询接口（用户只能查看自己的设备）

```typescript
@Get(":id")
@RequirePermission("device.read")
@DataScope(DataScopeType.SELF) // 添加此行
async findOne(@Param("id") id: string) {
  // Device 实体中 userId 字段会被自动检查
}

@Get(":id/stats")
@RequirePermission("device.read")
@DataScope(DataScopeType.SELF)
async getDeviceStats(@Param("id") id: string) { }

@Get(":id/screenshot")
@RequirePermission("device.read")
@DataScope(DataScopeType.SELF)
async getScreenshot(@Param("id") id: string) { }

@Get(":id/packages")
@RequirePermission("device.read")
@DataScope(DataScopeType.SELF)
async getInstalledPackages(@Param("id") id: string) { }

@Get(":id/logcat")
@RequirePermission("device.read")
@DataScope(DataScopeType.SELF)
async getLogcat(@Param("id") id: string) { }

@Get(":id/properties")
@RequirePermission("device.read")
@DataScope(DataScopeType.SELF)
async getDeviceProperties(@Param("id") id: string) { }

@Get(":id/stream-info")
@RequirePermission("device.read")
@DataScope(DataScopeType.SELF)
async getStreamInfo(@Param("id") id: string) { }
```

### 修改接口（用户只能修改自己的设备）

```typescript
@Patch(":id")
@RequirePermission("device.update")
@DataScope(DataScopeType.SELF)
async update(@Param("id") id: string, @Body() updateDeviceDto: UpdateDeviceDto) { }

@Post(":id/start")
@RequirePermission("device.start")
@DataScope(DataScopeType.SELF)
async start(@Param("id") id: string) { }

@Post(":id/stop")
@RequirePermission("device.stop")
@DataScope(DataScopeType.SELF)
async stop(@Param("id") id: string) { }

@Post(":id/restart")
@RequirePermission("device.restart")
@DataScope(DataScopeType.SELF)
async restart(@Param("id") id: string) { }

@Post(":id/reboot")
@RequirePermission("device.reboot")
@DataScope(DataScopeType.SELF)
async reboot(@Param("id") id: string) { }

@Post(":id/shell")
@RequirePermission("device.shell")
@DataScope(DataScopeType.SELF)
async executeShellCommand(@Param("id") id: string) { }

@Post(":id/screenshot")
@RequirePermission("device.screenshot")
@DataScope(DataScopeType.SELF)
async takeScreenshot(@Param("id") id: string) { }

@Post(":id/push")
@RequirePermission("device.push")
@DataScope(DataScopeType.SELF)
async pushFile(@Param("id") id: string) { }

@Post(":id/pull")
@RequirePermission("device.pull")
@DataScope(DataScopeType.SELF)
async pullFile(@Param("id") id: string) { }

@Post(":id/install")
@RequirePermission("device.install")
@DataScope(DataScopeType.SELF)
async installApk(@Param("id") id: string) { }

@Post(":id/uninstall")
@RequirePermission("device.uninstall")
@DataScope(DataScopeType.SELF)
async uninstallApk(@Param("id") id: string) { }

@Post(":id/logcat/clear")
@RequirePermission("device.logcat")
@DataScope(DataScopeType.SELF)
async clearLogcat(@Param("id") id: string) { }
```

### 删除接口（用户只能删除自己的设备）

```typescript
@Delete(":id")
@RequirePermission("device.delete")
@DataScope(DataScopeType.SELF)
async remove(@Param("id") id: string) { }
```

### 批量操作（只有管理员可以执行）

```typescript
@Post("batch/start")
@RequirePermission("device.start")
@DataScope(DataScopeType.ALL) // 只有管理员可以批量操作
async batchStart(@Body() dto: BatchOperationDto) { }

@Post("batch/stop")
@RequirePermission("device.stop")
@DataScope(DataScopeType.ALL)
async batchStop(@Body() dto: BatchOperationDto) { }

@Post("batch/reboot")
@RequirePermission("device.reboot")
@DataScope(DataScopeType.ALL)
async batchReboot(@Body() dto: BatchOperationDto) { }

@Post("batch/delete")
@RequirePermission("device.delete")
@DataScope(DataScopeType.ALL)
async batchDelete(@Body() dto: BatchOperationDto) { }
```

### 统计接口（根据角色自动过滤）

```typescript
@Get("stats")
@RequirePermission("device.read")
@DataScope(DataScopeType.ALL) // 管理员看所有统计，用户在 service 层过滤
async getOverallStats() { }

@Get("available")
@RequirePermission("device.read")
// 不添加 DataScope，在 service 层根据角色过滤
async getAvailableDevices() { }
```

## 实现步骤

1. 在每个接口的装饰器列表中添加 `@DataScope(...)`
2. 确保 Device 实体中有 `userId` 字段
3. DataScopeGuard 会自动从 params.id 提取设备ID
4. 然后查询设备，比较 device.userId 和 req.user.id

## 注意事项

1. **DataScopeGuard 工作原理**：
   - 从 request.params.id 提取设备ID
   - 查询设备获取 device.userId
   - 比较 device.userId === req.user.id
   - 管理员自动跳过检查

2. **需要在 Service 层添加验证**：
   ```typescript
   async findOne(id: string, userId?: string) {
     const device = await this.deviceRepository.findOne({
       where: { id, ...(userId && { userId }) }
     });
     if (!device) {
       throw new NotFoundException('设备不存在或无权访问');
     }
     return device;
   }
   ```

3. **批量操作需要额外验证**：
   - 批量操作接口中，用户提交的设备ID列表需要验证
   - 确保所有设备都属于该用户
   - 管理员可以操作所有设备
