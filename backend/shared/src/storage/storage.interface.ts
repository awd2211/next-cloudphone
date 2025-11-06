import { Readable } from 'stream';

/**
 * IStorageService - 统一的文件存储接口
 *
 * 用途：抽象本地文件系统和对象存储（MinIO/S3）的差异
 *
 * 实现类：
 * - LocalFileStorage: 本地开发环境使用（存储到 /tmp 或指定目录）
 * - MinIOStorage: K8s 集群环境使用（存储到 MinIO 对象存储）
 *
 * 使用方法：
 * ```typescript
 * constructor(private readonly storageService: IStorageService) {}
 *
 * async uploadFile(file: Express.Multer.File) {
 *   const url = await this.storageService.save(file, 'apks/my-app.apk');
 *   return { url };
 * }
 * ```
 */
export interface IStorageService {
  /**
   * 保存文件到存储系统
   *
   * @param file - Multer 上传的文件对象
   * @param path - 存储路径（相对路径，如 'apks/my-app.apk'）
   * @returns 文件的访问 URL（本地：file:// 协议，MinIO：http:// 协议）
   *
   * 示例：
   * ```typescript
   * const url = await storage.save(file, 'apks/com.example.app.apk');
   * // 本地开发：file:///tmp/apk-uploads/apks/com.example.app.apk
   * // K8s 集群：http://minio:9000/cloudphone/apks/com.example.app.apk
   * ```
   */
  save(file: Express.Multer.File, path: string): Promise<string>;

  /**
   * 保存 Buffer 数据到存储系统
   *
   * @param buffer - 文件数据
   * @param path - 存储路径
   * @param contentType - MIME 类型（如 'application/vnd.android.package-archive'）
   * @returns 文件的访问 URL
   */
  saveBuffer(
    buffer: Buffer,
    path: string,
    contentType?: string,
  ): Promise<string>;

  /**
   * 保存 Stream 数据到存储系统
   *
   * @param stream - 文件流
   * @param path - 存储路径
   * @param contentType - MIME 类型
   * @returns 文件的访问 URL
   */
  saveStream(
    stream: Readable,
    path: string,
    contentType?: string,
  ): Promise<string>;

  /**
   * 读取文件内容
   *
   * @param path - 文件路径（相对路径）
   * @returns 文件的 Buffer 数据
   *
   * 示例：
   * ```typescript
   * const buffer = await storage.get('apks/com.example.app.apk');
   * // 可用于下载或转发文件
   * ```
   */
  get(path: string): Promise<Buffer>;

  /**
   * 获取文件的可读流
   *
   * @param path - 文件路径
   * @returns 文件的可读流（用于大文件下载，避免内存溢出）
   *
   * 示例：
   * ```typescript
   * const stream = await storage.getStream('apks/large-app.apk');
   * stream.pipe(response);
   * ```
   */
  getStream(path: string): Promise<Readable>;

  /**
   * 删除文件
   *
   * @param path - 文件路径
   *
   * 示例：
   * ```typescript
   * await storage.delete('apks/old-app.apk');
   * ```
   */
  delete(path: string): Promise<void>;

  /**
   * 检查文件是否存在
   *
   * @param path - 文件路径
   * @returns true = 文件存在，false = 文件不存在
   *
   * 示例：
   * ```typescript
   * if (await storage.exists('apks/my-app.apk')) {
   *   // 文件已存在，跳过上传
   * }
   * ```
   */
  exists(path: string): Promise<boolean>;

  /**
   * 获取文件的元数据
   *
   * @param path - 文件路径
   * @returns 文件元数据（大小、MIME 类型、最后修改时间等）
   *
   * 示例：
   * ```typescript
   * const metadata = await storage.getMetadata('apks/my-app.apk');
   * console.log(`File size: ${metadata.size} bytes`);
   * ```
   */
  getMetadata(path: string): Promise<FileMetadata>;

  /**
   * 列出指定目录下的所有文件
   *
   * @param prefix - 目录前缀（如 'apks/'）
   * @returns 文件路径列表
   *
   * 示例：
   * ```typescript
   * const files = await storage.list('apks/');
   * // ['apks/app1.apk', 'apks/app2.apk']
   * ```
   */
  list(prefix: string): Promise<string[]>;

  /**
   * 生成文件的预签名下载 URL（临时访问链接）
   *
   * @param path - 文件路径
   * @param expiresIn - 过期时间（秒），默认 3600（1 小时）
   * @returns 预签名 URL
   *
   * 示例：
   * ```typescript
   * const downloadUrl = await storage.getPresignedUrl('apks/my-app.apk', 3600);
   * // 用户可以在 1 小时内通过此链接下载文件
   * ```
   */
  getPresignedUrl(path: string, expiresIn?: number): Promise<string>;
}

/**
 * 文件元数据
 */
export interface FileMetadata {
  /**
   * 文件路径
   */
  path: string;

  /**
   * 文件大小（字节）
   */
  size: number;

  /**
   * MIME 类型
   */
  contentType?: string;

  /**
   * 最后修改时间
   */
  lastModified: Date;

  /**
   * ETag（用于缓存验证）
   */
  etag?: string;
}
