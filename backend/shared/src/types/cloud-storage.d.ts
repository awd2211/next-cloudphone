/**
 * 云存储 SDK 类型声明
 */

// 阿里云 OSS SDK 类型声明
declare module 'ali-oss' {
  interface PutObjectOptions {
    headers?: Record<string, string>;
    mime?: string;
    meta?: Record<string, string>;
    callback?: {
      url: string;
      body: string;
      contentType?: string;
    };
  }

  interface GetObjectOptions {
    process?: string;
    headers?: Record<string, string>;
  }

  interface ListOptions {
    prefix?: string;
    marker?: string;
    delimiter?: string;
    'max-keys'?: number;
  }

  interface SignatureUrlOptions {
    expires?: number;
    method?: string;
    process?: string;
    response?: {
      'content-type'?: string;
      'content-disposition'?: string;
    };
  }

  interface ObjectMeta {
    name: string;
    size: number;
    lastModified: Date;
    etag: string;
    type: string;
    storageClass: string;
    url?: string;
  }

  interface PutObjectResult {
    name: string;
    url: string;
    res: {
      status: number;
      statusCode: number;
      headers: Record<string, string>;
    };
  }

  interface GetObjectResult {
    content: Buffer | string;
    res: {
      status: number;
      statusCode: number;
      headers: Record<string, string>;
    };
  }

  interface GetStreamResult {
    stream: NodeJS.ReadableStream;
    res: {
      status: number;
      statusCode: number;
      headers: Record<string, string>;
    };
  }

  interface HeadObjectResult {
    res: {
      status: number;
      statusCode: number;
      headers: Record<string, string>;
    };
    meta?: Record<string, string>;
  }

  interface ListObjectsResult {
    objects?: ObjectMeta[];
    prefixes?: string[];
    isTruncated: boolean;
    nextMarker?: string;
    res: {
      status: number;
      statusCode: number;
      headers: Record<string, string>;
    };
  }

  interface OSSOptions {
    endpoint: string;
    bucket: string;
    accessKeyId: string;
    accessKeySecret: string;
    region?: string;
    secure?: boolean;
    timeout?: number;
    cname?: boolean;
    internal?: boolean;
    stsToken?: string;
  }

  class OSS {
    constructor(options: OSSOptions);
    put(name: string, file: Buffer | string | NodeJS.ReadableStream, options?: PutObjectOptions): Promise<PutObjectResult>;
    get(name: string, options?: GetObjectOptions): Promise<GetObjectResult>;
    getStream(name: string, options?: GetObjectOptions): Promise<GetStreamResult>;
    head(name: string): Promise<HeadObjectResult>;
    delete(name: string): Promise<void>;
    list(options: ListOptions, query?: Record<string, any>): Promise<ListObjectsResult>;
    signatureUrl(name: string, options?: SignatureUrlOptions): string;
  }

  export = OSS;
}

// 腾讯云 COS SDK 类型声明
declare module 'cos-nodejs-sdk-v5' {
  interface COSOptions {
    SecretId: string;
    SecretKey: string;
    SecurityToken?: string;
    FileParallelLimit?: number;
    ChunkParallelLimit?: number;
    ChunkSize?: number;
    Domain?: string;
    ServiceDomain?: string;
    Protocol?: string;
    CompatibilityMode?: boolean;
    ForcePathStyle?: boolean;
    UseRawKey?: boolean;
    Timeout?: number;
    CorrectClockSkew?: boolean;
    SystemClockOffset?: number;
    UploadCheckContentMd5?: boolean;
    UploadAddMetaMd5?: boolean;
    UploadQueueSize?: number;
    StrictSsl?: boolean;
    Proxy?: string;
    getAuthorization?: (options: any, callback: (data: any) => void) => void;
  }

  interface PutObjectParams {
    Bucket: string;
    Region: string;
    Key: string;
    Body: Buffer | string | NodeJS.ReadableStream;
    ContentType?: string;
    ContentLength?: number;
    ACL?: string;
    GrantRead?: string;
    GrantWrite?: string;
    GrantFullControl?: string;
    StorageClass?: string;
    Headers?: Record<string, string>;
    ServerSideEncryption?: string;
    onProgress?: (progressData: { loaded: number; total: number; speed: number; percent: number }) => void;
  }

  interface GetObjectParams {
    Bucket: string;
    Region: string;
    Key: string;
    Output?: string | NodeJS.WritableStream;
    ResponseContentType?: string;
    ResponseContentLanguage?: string;
    ResponseExpires?: string;
    ResponseCacheControl?: string;
    ResponseContentDisposition?: string;
    ResponseContentEncoding?: string;
    Range?: string;
    IfModifiedSince?: string;
    IfUnmodifiedSince?: string;
    IfMatch?: string;
    IfNoneMatch?: string;
    VersionId?: string;
    onProgress?: (progressData: { loaded: number; total: number; speed: number; percent: number }) => void;
  }

  interface HeadObjectParams {
    Bucket: string;
    Region: string;
    Key: string;
    VersionId?: string;
  }

  interface DeleteObjectParams {
    Bucket: string;
    Region: string;
    Key: string;
    VersionId?: string;
  }

  interface GetBucketParams {
    Bucket: string;
    Region: string;
    Prefix?: string;
    Delimiter?: string;
    Marker?: string;
    MaxKeys?: number;
    EncodingType?: string;
  }

  interface GetObjectUrlParams {
    Bucket: string;
    Region: string;
    Key: string;
    Sign?: boolean;
    Expires?: number;
    Method?: string;
    Query?: Record<string, string>;
    Headers?: Record<string, string>;
  }

  interface PutObjectResult {
    statusCode: number;
    headers: Record<string, string>;
    ETag: string;
    Location: string;
    VersionId?: string;
  }

  interface GetObjectResult {
    statusCode: number;
    headers: Record<string, string>;
    Body: Buffer;
    ETag: string;
    LastModified: string;
    ContentLength: number;
    VersionId?: string;
  }

  interface HeadObjectResult {
    statusCode: number;
    headers: Record<string, string>;
    ETag: string;
    LastModified: string;
    ContentLength: number;
    VersionId?: string;
  }

  interface GetBucketResult {
    statusCode: number;
    headers: Record<string, string>;
    Name: string;
    Prefix: string;
    Marker: string;
    MaxKeys: number;
    IsTruncated: string;
    NextMarker?: string;
    Contents?: Array<{
      Key: string;
      LastModified: string;
      ETag: string;
      Size: number;
      Owner: { ID: string; DisplayName: string };
      StorageClass: string;
    }>;
    CommonPrefixes?: Array<{ Prefix: string }>;
    EncodingType?: string;
  }

  interface GetObjectUrlResult {
    Url: string;
  }

  interface COSError extends Error {
    code: string;
    statusCode: number;
  }

  class COS {
    constructor(options: COSOptions);

    putObject(
      params: PutObjectParams,
      callback: (err: COSError | null, data?: PutObjectResult) => void
    ): void;

    getObject(
      params: GetObjectParams,
      callback: (err: COSError | null, data?: GetObjectResult) => void
    ): void;

    headObject(
      params: HeadObjectParams,
      callback: (err: COSError | null, data?: HeadObjectResult) => void
    ): void;

    deleteObject(
      params: DeleteObjectParams,
      callback: (err: COSError | null, data?: any) => void
    ): void;

    getBucket(
      params: GetBucketParams,
      callback: (err: COSError | null, data?: GetBucketResult) => void
    ): void;

    getObjectUrl(
      params: GetObjectUrlParams,
      callback: (err: COSError | null, data?: GetObjectUrlResult) => void
    ): void;
  }

  export = COS;
}

// 七牛云 SDK 类型声明
declare module 'qiniu' {
  namespace auth {
    namespace digest {
      class Mac {
        constructor(accessKey: string, secretKey: string);
        accessKey: string;
        secretKey: string;
      }
    }
  }

  namespace rs {
    interface PutPolicyOptions {
      scope?: string;
      isPrefixalScope?: number;
      expires?: number;
      insertOnly?: number;
      saveKey?: string;
      endUser?: string;
      returnUrl?: string;
      returnBody?: string;
      callbackUrl?: string;
      callbackHost?: string;
      callbackBody?: string;
      callbackBodyType?: string;
      persistentOps?: string;
      persistentNotifyUrl?: string;
      persistentPipeline?: string;
      fsizeLimit?: number;
      fsizeMin?: number;
      mimeLimit?: string;
      detectMime?: number;
      deleteAfterDays?: number;
      fileType?: number;
    }

    class PutPolicy {
      constructor(options: PutPolicyOptions);
      uploadToken(mac: auth.digest.Mac): string;
    }

    class BucketManager {
      constructor(mac: auth.digest.Mac, config: conf.Config);
      stat(bucket: string, key: string, callback: (err: Error | null, body: any, info: any) => void): void;
      delete(bucket: string, key: string, callback: (err: Error | null, body: any, info: any) => void): void;
      listPrefix(bucket: string, options: { prefix?: string; marker?: string; limit?: number }, callback: (err: Error | null, body: any, info: any) => void): void;
    }
  }

  namespace form_up {
    class FormUploader {
      constructor(config?: conf.Config);
      put(uploadToken: string, key: string, body: Buffer | string, putExtra: PutExtra, callback: (err: Error | null, body: any, info: any) => void): void;
      putStream(uploadToken: string, key: string, stream: NodeJS.ReadableStream, putExtra: PutExtra, callback: (err: Error | null, body: any, info: any) => void): void;
    }

    class PutExtra {
      fname?: string;
      params?: Record<string, string>;
      mimeType?: string;
      crc32?: string;
      checkCrc?: boolean;
      progressCallback?: (uploadBytes: number, totalBytes: number) => void;
    }
  }

  namespace conf {
    class Config {
      zone?: Zone;
      useHttpsDomain?: boolean;
      useCdnDomain?: boolean;
    }
  }

  namespace zone {
    const Zone_z0: any;
    const Zone_z1: any;
    const Zone_z2: any;
    const Zone_na0: any;
    const Zone_as0: any;
  }

  namespace util {
    function urlsafeBase64Encode(data: string | Buffer): string;
    function hmacSha1(data: string, key: string): string;
  }
}
