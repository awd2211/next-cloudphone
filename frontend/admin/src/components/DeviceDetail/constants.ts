// Device Detail 页面常量

export const DEVICE_STATUS_MAP: Record<string, { color: string; text: string }> = {
  idle: { color: 'default', text: '空闲' },
  running: { color: 'green', text: '运行中' },
  stopped: { color: 'red', text: '已停止' },
  error: { color: 'red', text: '错误' },
};

export const APP_OPERATIONS_TIPS = [
  '这些功能仅支持阿里云 ECP 平台的设备',
  '设备必须处于运行状态才能执行应用操作',
  '需要输入应用的包名（例如: com.tencent.mm）',
];

export const SNAPSHOT_TIPS = [
  '快照功能仅支持阿里云 ECP 平台的设备',
  '快照会保存设备的完整状态，包括系统和数据',
  '恢复快照会覆盖设备当前的所有数据',
];
