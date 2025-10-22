/**
 * Device Service 事件补丁
 * 
 * 在 devices.service.ts 的 remove 方法末尾添加：
 */

// 发布设备删除事件
if (this.eventBus) {
  await this.eventBus.publishDeviceEvent('deleted', {
    deviceId: id,
    userId: device.userId,
    deviceName: device.name,
    tenantId: device.tenantId,
  });
}

