import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { AdbService } from "../adb/adb.service";
import {
  AppInstallRequestedEvent,
  AppUninstallRequestedEvent,
  DeviceAllocateRequestedEvent,
} from "@cloudphone/shared";
import * as fs from "fs/promises";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import * as crypto from "crypto";
import { DevicesService } from "./devices.service";

/**
 * 允许的 APK 下载域名白名单
 * 只允许从这些可信来源下载 APK
 */
const ALLOWED_DOWNLOAD_DOMAINS = [
  "storage.googleapis.com", // Google Cloud Storage
  "s3.amazonaws.com", // AWS S3
  "cloudphone-storage.oss-cn-beijing.aliyuncs.com", // 阿里云 OSS
  "localhost", // 本地开发
  "127.0.0.1", // 本地开发
] as const;

/**
 * APK 文件大小限制（200MB）
 */
const MAX_APK_SIZE = 200 * 1024 * 1024;

@Injectable()
export class DevicesConsumer {
  private readonly logger = new Logger(DevicesConsumer.name);

  constructor(
    private readonly adbService: AdbService,
    private readonly devicesService: DevicesService,
  ) {}

  /**
   * 处理应用安装请求
   *
   * ⚠️ SECURITY: 安全下载和验证 APK
   */
  @RabbitSubscribe({
    exchange: "cloudphone.events",
    routingKey: "app.install.requested",
    queue: "device-service.app-install",
    queueOptions: {
      durable: true,
    },
  })
  async handleAppInstall(event: AppInstallRequestedEvent) {
    this.logger.log(
      `Received app install request: ${event.appId} for device ${event.deviceId}`,
    );

    try {
      // 1. 🔒 下载 APK 到临时文件（带安全验证）
      // 注意：event 中应包含 sha256 字段用于校验
      const checksum = (event as any).sha256 || null;
      const apkPath = await this.downloadApkSecure(
        event.downloadUrl,
        event.appId,
        checksum,
      );

      // 2. 🔒 验证 APK 文件完整性
      await this.validateApkFile(apkPath);

      // 3. 通过 ADB 安装
      await this.adbService.installApk(event.deviceId, apkPath);

      // 4. 清理临时文件
      await fs.unlink(apkPath);

      // 5. 发布安装成功事件
      await this.devicesService.publishAppInstallCompleted({
        installationId: event.installationId,
        deviceId: event.deviceId,
        appId: event.appId,
        status: "success",
        installedAt: new Date(),
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `App ${event.appId} installed successfully on device ${event.deviceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to install app ${event.appId} on device ${event.deviceId}:`,
        error.message,
      );

      // 发布安装失败事件
      await this.devicesService.publishAppInstallFailed({
        installationId: event.installationId,
        deviceId: event.deviceId,
        appId: event.appId,
        status: "failed",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 处理应用卸载请求
   */
  @RabbitSubscribe({
    exchange: "cloudphone.events",
    routingKey: "app.uninstall.requested",
    queue: "device-service.app-uninstall",
    queueOptions: {
      durable: true,
    },
  })
  async handleAppUninstall(event: AppUninstallRequestedEvent) {
    this.logger.log(
      `Received app uninstall request: ${event.packageName} from device ${event.deviceId}`,
    );

    try {
      // 通过 ADB 卸载
      await this.adbService.uninstallApp(event.deviceId, event.packageName);

      // 发布卸载成功事件
      await this.devicesService.publishAppUninstallCompleted({
        deviceId: event.deviceId,
        appId: event.appId,
        packageName: event.packageName,
        status: "success",
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `App ${event.packageName} uninstalled successfully from device ${event.deviceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to uninstall app ${event.packageName} from device ${event.deviceId}:`,
        error.message,
      );

      // 发布卸载失败事件
      await this.devicesService.publishAppUninstallCompleted({
        deviceId: event.deviceId,
        appId: event.appId,
        packageName: event.packageName,
        status: "failed",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 处理设备分配请求（Saga）
   */
  @RabbitSubscribe({
    exchange: "cloudphone.events",
    routingKey: "device.allocate.requested",
    queue: "device-service.device-allocate",
    queueOptions: {
      durable: true,
    },
  })
  async handleDeviceAllocate(event: DeviceAllocateRequestedEvent) {
    this.logger.log(
      `Received device allocate request for order ${event.orderId}, sagaId: ${event.sagaId}`,
    );

    try {
      // 分配一个可用设备
      const device = await this.devicesService.allocateDevice(
        event.userId,
        event.planId,
      );

      // 发布设备分配成功事件
      await this.devicesService.publishDeviceAllocated({
        sagaId: event.sagaId,
        deviceId: device.id,
        orderId: event.orderId,
        userId: event.userId,
        success: true,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Device ${device.id} allocated for order ${event.orderId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to allocate device for order ${event.orderId}:`,
        error.message,
      );

      // 发布设备分配失败事件
      await this.devicesService.publishDeviceAllocated({
        sagaId: event.sagaId,
        deviceId: null,
        orderId: event.orderId,
        userId: event.userId,
        success: false,
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  /**
   * 处理设备释放请求
   */
  @RabbitSubscribe({
    exchange: "cloudphone.events",
    routingKey: "device.release",
    queue: "device-service.device-release",
    queueOptions: {
      durable: true,
    },
  })
  async handleDeviceRelease(event: { deviceId: string; reason?: string }) {
    this.logger.log(`Received device release request: ${event.deviceId}`);

    try {
      await this.devicesService.releaseDevice(event.deviceId, event.reason);
      this.logger.log(`Device ${event.deviceId} released successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to release device ${event.deviceId}:`,
        error.message,
      );
    }
  }

  /**
   * 🔒 验证 URL 安全性
   */
  private validateDownloadUrl(url: string): void {
    try {
      const parsedUrl = new URL(url);

      // 1. 只允许 HTTPS（生产环境）或 HTTP localhost（开发环境）
      if (parsedUrl.protocol !== "https:") {
        if (
          parsedUrl.protocol === "http:" &&
          (parsedUrl.hostname === "localhost" ||
            parsedUrl.hostname === "127.0.0.1")
        ) {
          this.logger.warn(
            `Allowing HTTP download from localhost: ${url} (development only)`,
          );
        } else {
          throw new BadRequestException(
            "只允许 HTTPS URL 或 localhost HTTP URL",
          );
        }
      }

      // 2. 验证域名是否在白名单中
      const isAllowedDomain = ALLOWED_DOWNLOAD_DOMAINS.some(
        (domain) =>
          parsedUrl.hostname === domain ||
          parsedUrl.hostname.endsWith(`.${domain}`),
      );

      if (!isAllowedDomain) {
        this.logger.error(`Blocked download from untrusted domain: ${url}`);
        throw new BadRequestException(
          `不允许从该域名下载: ${parsedUrl.hostname}`,
        );
      }

      // 3. 防止 SSRF 攻击：禁止内网 IP
      const privateIPPatterns = [
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[01])\./,
        /^192\.168\./,
        /^169\.254\./, // Link-local
        /^127\./, // Loopback (允许 localhost 已在上面处理)
      ];

      for (const pattern of privateIPPatterns) {
        if (pattern.test(parsedUrl.hostname)) {
          // 允许 localhost
          if (
            parsedUrl.hostname === "127.0.0.1" ||
            parsedUrl.hostname === "localhost"
          ) {
            continue;
          }
          throw new BadRequestException("不允许访问内网地址");
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`无效的 URL: ${error.message}`);
    }
  }

  /**
   * 🔒 计算文件 SHA-256 校验和
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    const hash = crypto.createHash("sha256");
    hash.update(fileBuffer);
    return hash.digest("hex");
  }

  /**
   * 🔒 验证 APK 文件格式和魔数
   */
  private async validateApkFile(filePath: string): Promise<void> {
    const fileHandle = await fs.open(filePath, "r");
    try {
      // 读取文件头（前 4 字节）
      const buffer = Buffer.alloc(4);
      await fileHandle.read(buffer, 0, 4, 0);

      // APK 是 ZIP 文件，魔数应为 0x504B0304 (PK..)
      const magicNumber = buffer.toString("hex");
      if (magicNumber !== "504b0304" && magicNumber !== "504b0506") {
        this.logger.error(`Invalid APK file magic number: ${magicNumber}`);
        throw new BadRequestException("文件不是有效的 APK 格式");
      }

      // 验证文件大小
      const stats = await fs.stat(filePath);
      if (stats.size > MAX_APK_SIZE) {
        throw new BadRequestException(
          `APK 文件过大: ${stats.size} bytes (限制: ${MAX_APK_SIZE} bytes)`,
        );
      }

      this.logger.log(`APK file validated: ${filePath} (${stats.size} bytes)`);
    } finally {
      await fileHandle.close();
    }
  }

  /**
   * 🔒 安全下载 APK 文件
   *
   * 安全措施：
   * - 只允许 HTTPS（或 localhost HTTP）
   * - 域名白名单验证
   * - SSRF 防护
   * - 文件大小限制
   * - SHA-256 校验和验证
   * - APK 魔数验证
   */
  private async downloadApkSecure(
    url: string,
    appId: string,
    expectedChecksum: string | null,
  ): Promise<string> {
    // 🔒 1. 验证 URL 安全性
    this.validateDownloadUrl(url);

    const tmpDir = "/tmp/cloudphone-apks";
    await fs.mkdir(tmpDir, { recursive: true });

    const filePath = path.join(tmpDir, `${appId}-${Date.now()}.apk`);
    const file = await fs.open(filePath, "w");

    try {
      // 🔒 2. 只使用 HTTPS 下载（除非是 localhost）
      const parsedUrl = new URL(url);
      const useHttps = parsedUrl.protocol === "https:";
      const protocol = useHttps ? https : http;

      await new Promise<void>((resolve, reject) => {
        let downloadedSize = 0;

        const request = protocol.get(url, {
          timeout: 30000, // 30 秒超时
          headers: {
            "User-Agent": "CloudPhone-Service/1.0",
          },
        });

        request.on("response", (response) => {
          // 🔒 3. 验证 HTTP 状态码
          if (response.statusCode !== 200) {
            reject(
              new BadRequestException(
                `下载失败: HTTP ${response.statusCode}`,
              ),
            );
            return;
          }

          // 🔒 4. 验证 Content-Type
          const contentType = response.headers["content-type"];
          const validContentTypes = [
            "application/vnd.android.package-archive",
            "application/octet-stream",
            "application/zip",
          ];

          if (
            contentType &&
            !validContentTypes.some((type) => contentType.includes(type))
          ) {
            this.logger.warn(`Unexpected content-type: ${contentType}`);
          }

          // 🔒 5. 检查文件大小（从 Content-Length）
          const contentLength = parseInt(
            response.headers["content-length"] || "0",
            10,
          );
          if (contentLength > MAX_APK_SIZE) {
            reject(
              new BadRequestException(
                `APK 文件过大: ${contentLength} bytes`,
              ),
            );
            return;
          }

          const writeStream = file.createWriteStream();

          // 🔒 6. 监控下载大小
          response.on("data", (chunk) => {
            downloadedSize += chunk.length;
            if (downloadedSize > MAX_APK_SIZE) {
              request.destroy();
              writeStream.destroy();
              reject(new BadRequestException("APK 文件超出大小限制"));
            }
          });

          writeStream.on("finish", async () => {
            try {
              await file.close();

              // 🔒 7. 验证文件校验和（如果提供）
              if (expectedChecksum) {
                const actualChecksum = await this.calculateChecksum(filePath);
                if (actualChecksum !== expectedChecksum.toLowerCase()) {
                  this.logger.error(
                    `Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`,
                  );
                  await fs.unlink(filePath);
                  reject(new BadRequestException("APK 文件校验和不匹配"));
                  return;
                }
                this.logger.log(`Checksum verified: ${actualChecksum}`);
              } else {
                this.logger.warn(
                  "No checksum provided, skipping verification (not recommended)",
                );
              }

              resolve();
            } catch (error) {
              reject(error);
            }
          });

          writeStream.on("error", (error) => {
            fs.unlink(filePath).catch(() => {});
            reject(error);
          });

          response.pipe(writeStream);
        });

        request.on("error", (error) => {
          fs.unlink(filePath).catch(() => {});
          reject(error);
        });

        request.on("timeout", () => {
          request.destroy();
          fs.unlink(filePath).catch(() => {});
          reject(new BadRequestException("下载超时"));
        });
      });

      this.logger.log(`APK downloaded securely: ${filePath}`);
      return filePath;
    } catch (error) {
      // 清理失败的下载
      try {
        await file.close();
        await fs.unlink(filePath);
      } catch {}

      throw error;
    }
  }
}
