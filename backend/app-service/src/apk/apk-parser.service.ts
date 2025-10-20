import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AppInfoParser } from 'app-info-parser';
import * as fs from 'fs';
import * as path from 'path';

export interface ApkInfo {
  packageName: string;
  appName: string;
  versionName: string;
  versionCode: number;
  minSdkVersion: number;
  targetSdkVersion: number;
  permissions: string[];
  icon?: Buffer;
  iconPath?: string;
}

@Injectable()
export class ApkParserService {
  private readonly logger = new Logger(ApkParserService.name);

  /**
   * 解析 APK 文件
   */
  async parseApk(filePath: string): Promise<ApkInfo> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new BadRequestException(`APK 文件不存在: ${filePath}`);
      }

      // 使用 app-info-parser 解析 APK
      const parser = new AppInfoParser(filePath);
      const info = await parser.parse();

      this.logger.log(`APK parsed: ${info.package}`);

      // 提取图标
      let iconData: Buffer | undefined;
      let iconPath: string | undefined;

      if (info.icon) {
        try {
          iconPath = await this.extractIcon(filePath, info);
          if (iconPath && fs.existsSync(iconPath)) {
            iconData = fs.readFileSync(iconPath);
          }
        } catch (error) {
          this.logger.warn(`Failed to extract icon: ${error.message}`);
        }
      }

      // 提取权限列表
      const permissions: string[] = [];
      if (info.usePermissions && Array.isArray(info.usePermissions)) {
        info.usePermissions.forEach((perm: any) => {
          if (typeof perm === 'string') {
            permissions.push(perm);
          } else if (perm.name) {
            permissions.push(perm.name);
          }
        });
      }

      return {
        packageName: info.package || '',
        appName: info.name || path.basename(filePath, '.apk'),
        versionName: info.versionName || '1.0.0',
        versionCode: parseInt(info.versionCode) || 1,
        minSdkVersion: parseInt(info.minSdkVersion) || 21,
        targetSdkVersion: parseInt(info.targetSdkVersion) || 33,
        permissions,
        icon: iconData,
        iconPath,
      };
    } catch (error) {
      this.logger.error(`Failed to parse APK: ${error.message}`, error.stack);
      throw new BadRequestException(`APK 解析失败: ${error.message}`);
    }
  }

  /**
   * 提取应用图标
   */
  private async extractIcon(apkPath: string, info: any): Promise<string | undefined> {
    try {
      if (!info.icon) {
        return undefined;
      }

      // 创建图标目录
      const iconDir = path.join(path.dirname(apkPath), 'icons');
      if (!fs.existsSync(iconDir)) {
        fs.mkdirSync(iconDir, { recursive: true });
      }

      // 保存图标
      const iconPath = path.join(iconDir, `${info.package}.png`);

      // app-info-parser 返回的 icon 可能是 Buffer 或路径
      if (Buffer.isBuffer(info.icon)) {
        fs.writeFileSync(iconPath, info.icon);
      } else if (typeof info.icon === 'string' && fs.existsSync(info.icon)) {
        fs.copyFileSync(info.icon, iconPath);
      }

      return iconPath;
    } catch (error) {
      this.logger.warn(`Failed to extract icon: ${error.message}`);
      return undefined;
    }
  }

  /**
   * 验证 APK 文件
   */
  async validateApk(filePath: string): Promise<boolean> {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return false;
      }

      // 检查文件扩展名
      if (!filePath.toLowerCase().endsWith('.apk')) {
        return false;
      }

      // 检查文件大小（最大 500MB）
      const stats = fs.statSync(filePath);
      if (stats.size > 500 * 1024 * 1024) {
        throw new BadRequestException('APK 文件过大（最大 500MB）');
      }

      // 尝试解析 APK
      await this.parseApk(filePath);

      return true;
    } catch (error) {
      this.logger.error(`APK validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取APK文件信息摘要（不解析完整内容）
   */
  async getApkSummary(filePath: string): Promise<{
    fileName: string;
    fileSize: number;
    fileSizeFormatted: string;
  }> {
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const fileSize = stats.size;

    // 格式化文件大小
    let fileSizeFormatted: string;
    if (fileSize < 1024) {
      fileSizeFormatted = `${fileSize} B`;
    } else if (fileSize < 1024 * 1024) {
      fileSizeFormatted = `${(fileSize / 1024).toFixed(2)} KB`;
    } else if (fileSize < 1024 * 1024 * 1024) {
      fileSizeFormatted = `${(fileSize / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      fileSizeFormatted = `${(fileSize / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }

    return {
      fileName,
      fileSize,
      fileSizeFormatted,
    };
  }
}
