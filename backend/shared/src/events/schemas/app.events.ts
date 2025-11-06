/**
 * 应用相关事件定义
 *
 * 所有应用事件统一遵循以下规范：
 * 1. 包含 userId 的事件需添加 userRole 和 userEmail（用于角色化通知）✨ 2025-11-03
 */

export class AppInstallRequestedEvent {
  installationId: string;
  deviceId: string;
  appId: string;
  downloadUrl: string;
  userId: string;
  userRole: string;
  userEmail?: string;
  timestamp: string;
}

export class AppInstallCompletedEvent {
  installationId: string;
  deviceId: string;
  appId: string;
  status: 'success';
  installedAt?: Date;
  timestamp: string;
}

export class AppInstallFailedEvent {
  installationId: string;
  deviceId: string;
  appId: string;
  status: 'failed';
  error: string;
  timestamp: string;
}

export class AppUninstallRequestedEvent {
  deviceId: string;
  appId: string;
  packageName: string;
  userId: string;
  userRole: string;
  userEmail?: string;
  timestamp: string;
}

export class AppUninstallCompletedEvent {
  deviceId: string;
  appId: string;
  packageName: string;
  status: 'success' | 'failed';
  error?: string;
  timestamp: string;
}

export class AppUploadedEvent {
  appId: string;
  packageName: string;
  versionName: string;
  versionCode: number;
  uploadedBy: string;
  userRole: string;
  userEmail?: string;
  timestamp: string;
}
