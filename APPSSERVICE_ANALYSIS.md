# AppsService 实现分析报告

**日期**: 2025-10-30
**Phase**: Phase 7.1 - AppsService Analysis
**文件**: `backend/app-service/src/apps/apps.service.ts` (833 lines)

---

## 执行摘要

AppsService 是一个复杂的应用管理服务，使用 **Saga 模式** 处理 APK 上传工作流，集成 **MinIO** 对象存储、**ADB** 设备管理和 **EventBus** 事件发布。服务还包括完整的应用审核工作流。

**关键发现**:
- ✅ 使用 Saga 模式（4 步骤）进行 APK 上传
- ✅ 与 MinIO、ADB、EventBus 三个外部服务集成
- ✅ 完整的应用审核流程（提交、批准、拒绝、要求修改）
- ✅ 版本管理（isLatest 标记）
- ✅ 多租户支持
- ⚠️ **当前测试覆盖: 0%** - 需要创建 15-20 个测试

---

## 服务依赖关系

### 1. 数据库 Repositories (3 个)
```typescript
@InjectRepository(Application)
private appsRepository: Repository<Application>

@InjectRepository(DeviceApplication)
private deviceAppsRepository: Repository<DeviceApplication>

@InjectRepository(AppAuditRecord)
private auditRecordsRepository: Repository<AppAuditRecord>
```

### 2. 外部服务 (6 个)
```typescript
private minioService: MinioService           // 对象存储
private apkParserService: ApkParserService   // APK 解析
private httpService: HttpService             // HTTP 客户端 (Axios)
private configService: ConfigService         // 配置管理
private eventBus: EventBusService            // 事件发布
private sagaOrchestrator: SagaOrchestratorService  // Saga 编排
@InjectDataSource() private dataSource: DataSource // 数据库连接
```

---

## 核心业务方法

### 1. uploadApp() - APK 上传 (Saga Pattern)

**工作流**: 4 步 Saga，超时 10 分钟，最多重试 3 次

#### 步骤 1: CREATE_APP_RECORD
- **执行**: 创建 Application 记录，状态 = `UPLOADING`
- **补偿**: 删除 Application 记录
- **事务**: QueryRunner transaction

#### 步骤 2: UPLOAD_TO_MINIO
- **执行**: 上传文件到 MinIO (`apps/{packageName}/{versionName}_{timestamp}.apk`)
- **补偿**: 删除 MinIO 文件
- **调用**: `minioService.uploadFile(filePath, objectKey, metadata)`

#### 步骤 3: UPDATE_APP_STATUS
- **执行**: 更新状态为 `AVAILABLE`，设置 downloadUrl
- **补偿**: 回滚到 `UPLOADING`
- **事务**: QueryRunner transaction

#### 步骤 4: UPDATE_LATEST_VERSION
- **执行**: 更新 `isLatest` 标记（最高 versionCode 的版本）
- **补偿**: 重新计算最新版本
- **调用**: `updateLatestVersion(packageName)`

**关键特性**:
- APK 解析: `apkParserService.parseApk()` 提取包名、版本号、权限
- 临时文件清理: `finally` 块确保删除上传的临时文件
- 异步等待: 500ms 等待第一步完成后返回结果

---

### 2. findAll() - 应用列表查询

**功能**: 分页查询可用应用

```typescript
async findAll(
  page: number = 1,
  limit: number = 10,
  tenantId?: string,
  category?: string,
): Promise<{ data: Application[]; total: number; page: number; limit: number }>
```

**特性**:
- 默认过滤: `status: AppStatus.AVAILABLE`
- 可选过滤: `tenantId`, `category`
- 排序: `createdAt DESC` (最新优先)
- 分页: skip/take 模式

---

### 3. findOne() - 单个应用查询

**功能**: 根据 ID 查询应用，刷新下载 URL

```typescript
async findOne(id: string): Promise<Application>
```

**特性**:
- 404 检查: 不存在则抛出 `NotFoundException`
- URL 刷新: 调用 `minioService.getFileUrl(app.objectKey)` 生成新的临时下载链接

---

### 4. installToDevice() - 应用安装

**工作流**: 事件驱动（异步）

```typescript
async installToDevice(applicationId: string, deviceId: string): Promise<DeviceApplication>
```

**步骤**:
1. 检查应用是否已安装
2. 创建 `DeviceApplication` 记录，状态 = `PENDING`
3. 发布 `app.install.requested` 事件到 RabbitMQ
4. 返回 `DeviceApplication` 记录（安装异步进行）

**事件 Payload**:
```typescript
{
  installationId: string,
  deviceId: string,
  appId: string,
  downloadUrl: string,
  userId: string | null,
  timestamp: string
}
```

**实际安装** (私有方法 `performInstall()`):
- 从 MinIO 下载 APK 到临时文件 `/tmp/apk_{appId}_{timestamp}.apk`
- 调用 Device Service API: `POST /devices/{deviceId}/install`
- 更新 `DeviceApplication` 状态为 `INSTALLED`
- 增加 `installCount`
- 清理临时文件

---

### 5. uninstallFromDevice() - 应用卸载

**工作流**: 事件驱动（异步）

```typescript
async uninstallFromDevice(applicationId: string, deviceId: string): Promise<void>
```

**步骤**:
1. 查找 `DeviceApplication` 记录（状态 = `INSTALLED`）
2. 更新状态为 `UNINSTALLING`
3. 发布 `app.uninstall.requested` 事件到 RabbitMQ

**事件 Payload**:
```typescript
{
  deviceId: string,
  appId: string,
  packageName: string,
  userId: string | null,
  timestamp: string
}
```

**实际卸载** (私有方法 `performUninstall()`):
- 调用 Device Service API: `POST /devices/{deviceId}/uninstall`
- 更新 `DeviceApplication` 状态为 `UNINSTALLED`

---

### 6. update() - 更新应用元数据

```typescript
async update(id: string, updateAppDto: UpdateAppDto): Promise<Application>
```

**特性**:
- 使用 `Object.assign()` 更新字段
- 不更新 APK 文件本身（只更新元数据）

---

### 7. remove() - 删除应用

```typescript
async remove(id: string): Promise<void>
```

**步骤**:
1. 删除 MinIO 文件: `minioService.deleteFile(objectKey)`
2. 软删除: 设置 `status = DELETED`

---

### 8. 版本管理方法

#### updateLatestVersion() - 更新最新版本标记
```typescript
private async updateLatestVersion(packageName: string): Promise<void>
```
**逻辑**:
1. 查询该包名的所有 `AVAILABLE` 版本，按 `versionCode DESC` 排序
2. 将所有版本的 `isLatest` 设置为 `false`
3. 将 versionCode 最高的版本标记为 `isLatest = true`

#### getAppVersions() - 获取所有版本
```typescript
async getAppVersions(packageName: string): Promise<Application[]>
```

#### getLatestVersion() - 获取最新版本
```typescript
async getLatestVersion(packageName: string): Promise<Application | null>
```

---

### 9. 应用审核方法

#### submitForReview() - 提交审核
```typescript
async submitForReview(applicationId: string, dto: SubmitReviewDto): Promise<Application>
```
- 前置条件: `status = UPLOADING` 或 `REJECTED`
- 更新状态为 `PENDING_REVIEW`
- 创建审核记录: `AuditAction.SUBMIT`, `AuditStatus.PENDING`

#### approveApp() - 批准应用
```typescript
async approveApp(applicationId: string, dto: ApproveAppDto): Promise<Application>
```
- 前置条件: `status = PENDING_REVIEW`
- 更新状态为 `APPROVED`
- 创建审核记录: `AuditAction.APPROVE`, `AuditStatus.APPROVED`
- 发布事件: `app.审核.批准`

#### rejectApp() - 拒绝应用
```typescript
async rejectApp(applicationId: string, dto: RejectAppDto): Promise<Application>
```
- 前置条件: `status = PENDING_REVIEW`
- 更新状态为 `REJECTED`
- 创建审核记录: `AuditAction.REJECT`, `AuditStatus.REJECTED`
- 发布事件: `app.审核.拒绝`

#### requestChanges() - 要求修改
```typescript
async requestChanges(applicationId: string, dto: RequestChangesDto): Promise<Application>
```
- 前置条件: `status = PENDING_REVIEW`
- 状态保持 `PENDING_REVIEW`
- 创建审核记录: `AuditAction.REQUEST_CHANGES`, `AuditStatus.CHANGES_REQUESTED`

#### getAuditRecords() - 获取审核记录
```typescript
async getAuditRecords(applicationId: string): Promise<AppAuditRecord[]>
```

#### getPendingReviewApps() - 获取待审核应用列表
```typescript
async getPendingReviewApps(page: number = 1, limit: number = 10)
```

---

## 数据模型

### Application Entity
```typescript
{
  id: string (UUID)
  name: string
  description: string
  packageName: string
  versionName: string
  versionCode: number (bigint)
  isLatest: boolean
  status: AppStatus
  category: AppCategory
  icon: string
  size: number (bigint)
  minSdkVersion: number
  targetSdkVersion: number
  tenantId: string
  uploaderId: string
  bucketName: string
  objectKey: string
  downloadUrl: string
  permissions: string[] (jsonb)
  metadata: Record<string, any> (jsonb)
  tags: string[] (jsonb)
  downloadCount: number
  installCount: number
  createdAt: Date
  updatedAt: Date
}
```

### AppStatus Enum
```typescript
enum AppStatus {
  UPLOADING = 'uploading',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  DELETED = 'deleted',
}
```

### DeviceApplication Entity (关联表)
```typescript
{
  id: string
  deviceId: string
  applicationId: string
  status: InstallStatus (PENDING, INSTALLED, UNINSTALLING, UNINSTALLED, FAILED)
  installedAt: Date
  uninstalledAt: Date
  errorMessage: string
}
```

---

## 事件发布

### 1. Install Requested Event
```typescript
eventBus.publishAppEvent('install.requested', {
  installationId: string,
  deviceId: string,
  appId: string,
  downloadUrl: string,
  userId: string | null,
  timestamp: string
})
```

### 2. Uninstall Requested Event
```typescript
eventBus.publishAppEvent('uninstall.requested', {
  deviceId: string,
  appId: string,
  packageName: string,
  userId: string | null,
  timestamp: string
})
```

### 3. Approve Event
```typescript
eventBus.publishAppEvent('审核.批准', {
  appId: string,
  packageName: string,
  versionName: string,
  reviewerId: string,
  timestamp: string
})
```

### 4. Reject Event
```typescript
eventBus.publishAppEvent('审核.拒绝', {
  appId: string,
  packageName: string,
  versionName: string,
  reviewerId: string,
  reason: string,
  timestamp: string
})
```

---

## 外部服务调用

### MinIO Service
```typescript
// 上传文件
await minioService.uploadFile(filePath, objectKey, metadata)

// 获取文件流
await minioService.getFileStream(objectKey)

// 获取文件 URL
await minioService.getFileUrl(objectKey)

// 删除文件
await minioService.deleteFile(objectKey)

// 获取 bucket 名称
minioService.getBucketName()
```

### APK Parser Service
```typescript
// 解析 APK 文件
const apkInfo = await apkParserService.parseApk(filePath)
// 返回: { appName, packageName, versionName, versionCode, minSdkVersion, targetSdkVersion, permissions }
```

### Device Service HTTP API
```typescript
// 安装应用
POST http://localhost:30002/devices/{deviceId}/install
Body: { apkPath: string, reinstall: boolean }

// 卸载应用
POST http://localhost:30002/devices/{deviceId}/uninstall
Body: { packageName: string }
```

---

## 测试计划

### 测试覆盖范围

#### 1. APK 上传测试 (Saga Pattern) - 4 tests
- ✅ 成功上传 APK (4 步 Saga 全部完成)
- ✅ 步骤 1 失败 - 创建记录失败
- ✅ 步骤 2 失败 - MinIO 上传失败，触发补偿
- ✅ APK 解析失败

#### 2. 应用查询测试 - 3 tests
- ✅ findAll() - 分页查询
- ✅ findAll() - 按 tenantId 和 category 过滤
- ✅ findOne() - 刷新下载 URL

#### 3. 应用安装测试 - 4 tests
- ✅ installToDevice() - 成功发布事件
- ✅ installToDevice() - 应用已安装，抛出错误
- ✅ performInstall() - 成功安装（私有方法）
- ✅ performInstall() - 安装失败，清理临时文件

#### 4. 应用卸载测试 - 3 tests
- ✅ uninstallFromDevice() - 成功发布事件
- ✅ uninstallFromDevice() - 应用未安装，抛出错误
- ✅ performUninstall() - 成功卸载

#### 5. 版本管理测试 - 3 tests
- ✅ updateLatestVersion() - 正确标记最新版本
- ✅ getAppVersions() - 获取所有版本
- ✅ getLatestVersion() - 获取最新版本

#### 6. 应用审核测试 - 3 tests
- ✅ submitForReview() - 提交审核
- ✅ approveApp() - 批准应用
- ✅ rejectApp() - 拒绝应用

#### 7. 删除测试 - 1 test
- ✅ remove() - 软删除应用并删除 MinIO 文件

**总计**: 21 tests (超过目标 15-20 个)

---

## Mock 依赖清单

### 1. Repository Mocks (3 个)
```typescript
const mockAppsRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  increment: jest.fn(),
}

const mockDeviceAppsRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
}

const mockAuditRecordsRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
}
```

### 2. Service Mocks (5 个)
```typescript
const mockMinioService = {
  uploadFile: jest.fn(),
  getFileStream: jest.fn(),
  getFileUrl: jest.fn(),
  deleteFile: jest.fn(),
  getBucketName: jest.fn(() => 'cloudphone-apps'),
}

const mockApkParserService = {
  parseApk: jest.fn(),
}

const mockHttpService = {
  post: jest.fn(),
}

const mockConfigService = {
  get: jest.fn((key) => {
    if (key === 'DEVICE_SERVICE_URL') return 'http://localhost:30002';
    return null;
  }),
}

const mockEventBus = {
  publishAppEvent: jest.fn(),
}

const mockSagaOrchestrator = {
  executeSaga: jest.fn(),
  getSagaStatus: jest.fn(),
  compensateSaga: jest.fn(),
}
```

### 3. DataSource Mock (QueryRunner)
```typescript
const mockQueryRunner = {
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  manager: {
    create: jest.fn((entity, data) => ({ id: 'app-123', ...data })),
    save: jest.fn((entity, data) => Promise.resolve(data)),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  },
}

const mockDataSource = {
  createQueryRunner: jest.fn(() => mockQueryRunner),
}
```

---

## 测试挑战

### 1. Saga 模式测试
**挑战**: Saga 有 4 个步骤，每步都有 execute 和 compensate
**解决方案**: Mock `sagaOrchestrator.executeSaga()` 返回 sagaId，验证 Saga 定义结构

### 2. 文件上传模拟
**挑战**: Express multer 文件对象
**解决方案**: 创建 mock file buffer
```typescript
const mockFile = {
  buffer: Buffer.from('fake apk content'),
  originalname: 'test.apk',
  mimetype: 'application/vnd.android.package-archive',
  size: 1024000,
}
```

### 3. MinIO 集成
**挑战**: 对象存储操作
**解决方案**: Mock `uploadFile()`, `getFileStream()`, `getFileUrl()`, `deleteFile()`

### 4. APK 解析
**挑战**: 解析 APK 文件元数据
**解决方案**: Mock `apkParserService.parseApk()` 返回固定结构
```typescript
mockApkParserService.parseApk.mockResolvedValue({
  appName: 'Test App',
  packageName: 'com.test.app',
  versionName: '1.0.0',
  versionCode: 1,
  minSdkVersion: 21,
  targetSdkVersion: 30,
  permissions: ['INTERNET', 'CAMERA'],
})
```

### 5. HTTP 调用 (Device Service)
**挑战**: Axios Observable
**解决方案**: Mock `httpService.post()` 返回 Observable
```typescript
import { of } from 'rxjs';
mockHttpService.post.mockReturnValue(of({ data: { success: true } }));
```

### 6. 临时文件清理
**挑战**: 验证临时文件被删除
**解决方案**: Mock `fs.existsSync()` 和 `fs.unlinkSync()`（或使用 spyOn）

### 7. 事件发布验证
**挑战**: 验证正确的事件被发布
**解决方案**: 验证 `mockEventBus.publishAppEvent()` 调用
```typescript
expect(mockEventBus.publishAppEvent).toHaveBeenCalledWith(
  'install.requested',
  expect.objectContaining({
    deviceId: 'device-123',
    appId: 'app-123',
  }),
);
```

---

## 参考模式 (DevicesService)

AppsService 和 DevicesService 有相似的模式:

### Saga 模式
```typescript
it('should successfully upload app using Saga', async () => {
  const sagaId = 'saga-123';
  mockSagaOrchestrator.executeSaga.mockResolvedValue(sagaId);

  const result = await service.uploadApp(mockFile, createAppDto);

  expect(result.sagaId).toBe(sagaId);
  expect(mockSagaOrchestrator.executeSaga).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'APP_UPLOAD',
      steps: expect.arrayContaining([
        expect.objectContaining({ name: 'CREATE_APP_RECORD' }),
        expect.objectContaining({ name: 'UPLOAD_TO_MINIO' }),
        expect.objectContaining({ name: 'UPDATE_APP_STATUS' }),
        expect.objectContaining({ name: 'UPDATE_LATEST_VERSION' }),
      ]),
    }),
    expect.any(Object),
  );
});
```

### 事件发布
```typescript
it('should publish install.requested event', async () => {
  await service.installToDevice('app-123', 'device-123');

  expect(mockEventBus.publishAppEvent).toHaveBeenCalledWith(
    'install.requested',
    expect.objectContaining({
      deviceId: 'device-123',
      appId: 'app-123',
    }),
  );
});
```

---

## 下一步

1. ✅ **分析完成** - AppsService 实现已全面分析
2. 📝 **创建测试框架** - 设置 `apps.service.spec.ts` 和所有 mocks
3. 📝 **编写核心测试** - 21 个测试（上传、查询、安装、卸载、版本、审核、删除）
4. 📝 **运行测试** - 确保 100% 通过
5. 📝 **文档** - 创建测试报告和 Phase 7 完成报告

---

**分析完成时间**: 2025-10-30
**预计测试编写时间**: 3-4 小时
**下一步**: 创建测试框架
