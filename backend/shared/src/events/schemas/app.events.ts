/**
 * 应用相关事件定义
 */

export class AppInstallRequestedEvent {
  installationId: string;
  deviceId: string;
  appId: string;
  downloadUrl: string;
  userId: string;
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
  timestamp: string;
}

