/**
 * Cloud Phone Platform - Mock Factories
 *
 * 统一的 Mock 对象工厂,用于生成测试数据
 */

import { randomString, randomUUID, randomEmail } from './test-helpers';

/**
 * 用户状态枚举
 */
export enum MockUserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

/**
 * 设备状态枚举
 */
export enum MockDeviceStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  STOPPED = 'stopped',
  ERROR = 'error',
  DELETED = 'deleted',
}

/**
 * 订单状态枚举
 */
export enum MockOrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

/**
 * 通知类型枚举
 */
export enum MockNotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  WEBSOCKET = 'websocket',
  SYSTEM = 'system',
}

/**
 * 设备 Provider 类型
 */
export enum MockDeviceProviderType {
  REDROID = 'redroid',
  GENYMOTION = 'genymotion',
  PHYSICAL = 'physical',
}

/**
 * 创建 Mock 用户
 */
export function createMockUser(overrides: Partial<any> = {}) {
  return {
    id: randomUUID(),
    username: `user_${randomString(8)}`,
    email: randomEmail(),
    password: '$2a$10$hashedPasswordExample',
    fullName: 'Test User',
    avatar: null,
    phoneNumber: null,
    status: MockUserStatus.ACTIVE,
    tenantId: randomUUID(),
    isSuperAdmin: false,
    roles: [],
    loginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    lastLoginIp: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * 创建 Mock 设备
 */
export function createMockDevice(overrides: Partial<any> = {}) {
  return {
    id: randomUUID(),
    name: `device_${randomString(8)}`,
    userId: randomUUID(),
    tenantId: randomUUID(),
    status: MockDeviceStatus.RUNNING,
    androidVersion: '11',
    cpuCores: 4,
    memoryMb: 4096,
    diskGb: 32,
    resolution: '1080x1920',
    dpi: 480,
    adbPort: 5555,
    vncPort: 5900,
    containerName: `redroid_${randomString(8)}`,
    providerType: MockDeviceProviderType.REDROID,
    externalId: randomString(16),
    healthScore: 100,
    lastHeartbeatAt: new Date(),
    lastActiveAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000), // +1 day
    autoBackupEnabled: false,
    backupIntervalHours: 24,
    lastBackupAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * 创建 Mock 角色
 */
export function createMockRole(overrides: Partial<any> = {}) {
  return {
    id: randomUUID(),
    name: `role_${randomString(8)}`,
    description: 'Test role description',
    tenantId: randomUUID(),
    isSystem: false,
    metadata: {},
    permissions: [],
    users: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * 创建 Mock 权限
 */
export function createMockPermission(overrides: Partial<any> = {}) {
  // Apply overrides first to get the actual resource and action
  const merged = {
    resource: 'device',
    action: 'read',
    ...overrides,
  };

  // Generate permission code as "resource:action" (e.g., "device:read")
  const permissionCode = `${merged.resource}:${merged.action}`;

  return {
    id: randomUUID(),
    name: merged.name || permissionCode, // Use code as name if not provided
    code: permissionCode, // Add code field for JWT payload
    description: 'Test permission description',
    resource: merged.resource,
    action: merged.action,
    conditions: null,
    scope: 'tenant',
    dataFilter: null,
    fieldRules: null,
    metadata: {},
    isActive: true,
    roles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * 创建 Mock 配额
 */
export function createMockQuota(overrides: Partial<any> = {}) {
  return {
    id: randomUUID(),
    userId: randomUUID(),
    tenantId: randomUUID(),
    maxDevices: 10,
    maxCpuCores: 16,
    maxMemoryMb: 32768,
    maxDiskGb: 500,
    currentDevices: 0,
    currentCpuCores: 0,
    currentMemoryMb: 0,
    currentDiskGb: 0,
    expiresAt: new Date(Date.now() + 2592000000), // +30 days
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * 创建 Mock 套餐
 */
export function createMockPlan(overrides: Partial<any> = {}) {
  return {
    id: randomUUID(),
    name: `plan_${randomString(8)}`,
    description: 'Test plan description',
    price: 99.99,
    currency: 'CNY',
    billingCycle: 'monthly',
    maxDevices: 5,
    maxCpuCores: 8,
    maxMemoryMb: 16384,
    maxDiskGb: 200,
    features: ['feature1', 'feature2'],
    isActive: true,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * 创建 Mock 订单
 */
export function createMockOrder(overrides: Partial<any> = {}) {
  return {
    id: randomUUID(),
    orderNo: `ORD${Date.now()}`,
    userId: randomUUID(),
    planId: randomUUID(),
    status: MockOrderStatus.PENDING,
    amount: 99.99,
    currency: 'CNY',
    expiresAt: new Date(Date.now() + 3600000), // +1 hour
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * 创建 Mock 支付
 */
export function createMockPayment(overrides: Partial<any> = {}) {
  return {
    id: randomUUID(),
    paymentNo: `PAY${Date.now()}`,
    orderId: randomUUID(),
    amount: 99.99,
    currency: 'CNY',
    provider: 'alipay',
    status: 'pending',
    externalId: randomString(32),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * 创建 Mock 应用
 */
export function createMockApplication(overrides: Partial<any> = {}) {
  return {
    id: randomUUID(),
    name: `app_${randomString(8)}`,
    packageName: `com.example.${randomString(8)}`,
    version: '1.0.0',
    versionCode: 1,
    description: 'Test application',
    category: 'utility',
    fileSize: 10240000, // 10MB
    fileUrl: `https://storage.example.com/${randomString(16)}.apk`,
    iconUrl: 'https://storage.example.com/icon.png',
    screenshots: [],
    isPublic: true,
    uploaderId: randomUUID(),
    tenantId: randomUUID(),
    downloadCount: 0,
    installCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * 创建 Mock 通知
 */
export function createMockNotification(overrides: Partial<any> = {}) {
  return {
    id: randomUUID(),
    userId: randomUUID(),
    type: MockNotificationType.SYSTEM,
    title: 'Test Notification',
    content: 'This is a test notification',
    channel: 'websocket',
    priority: 'normal',
    isRead: false,
    readAt: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * 创建 Mock 模板
 */
export function createMockTemplate(overrides: Partial<any> = {}) {
  return {
    id: randomUUID(),
    code: `template_${randomString(8)}`,
    name: 'Test Template',
    subject: 'Test Subject',
    content: '<p>Hello {{name}}!</p>',
    type: 'email',
    variables: ['name'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * 创建 Mock 事件载荷
 */
export function createMockEventPayload(eventType: string, data: Record<string, any> = {}) {
  return {
    eventId: randomUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    data,
  };
}

/**
 * 创建 Mock Repository
 *
 * @param entity - 实体名称
 * @returns Jest Mock Repository
 */
export function createMockRepository() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
      setLock: jest.fn().mockReturnThis(),
    })),
    query: jest.fn(),
    manager: {
      transaction: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    },
    metadata: {
      tableName: 'test_table',
    },
  };
}

/**
 * 创建 Mock EventBusService
 */
export function createMockEventBusService() {
  return {
    publish: jest.fn().mockResolvedValue(true),
    publishDeviceEvent: jest.fn().mockResolvedValue(true),
    publishUserEvent: jest.fn().mockResolvedValue(true),
    publishBillingEvent: jest.fn().mockResolvedValue(true),
    publishAppEvent: jest.fn().mockResolvedValue(true),
  };
}

/**
 * 创建 Mock CacheService
 */
export function createMockCacheService() {
  return {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
    reset: jest.fn().mockResolvedValue(true),
    wrap: jest.fn((key, fn) => fn()),
    exists: jest.fn().mockResolvedValue(false),
  };
}

/**
 * 创建 Mock HttpClientService
 */
export function createMockHttpClientService() {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };
}

/**
 * 创建 Mock ConfigService
 */
export function createMockConfigService(config: Record<string, any> = {}) {
  return {
    get: jest.fn((key: string, defaultValue?: any) =>
      config[key] !== undefined ? config[key] : defaultValue
    ),
    getOrThrow: jest.fn((key: string) => {
      if (config[key] === undefined) {
        throw new Error(`Configuration key "${key}" not found`);
      }
      return config[key];
    }),
  };
}

/**
 * 创建 Mock JwtService
 */
export function createMockJwtService() {
  return {
    sign: jest.fn((payload) => `mock.jwt.${JSON.stringify(payload)}`),
    verify: jest.fn(),
    decode: jest.fn(),
  };
}

/**
 * 创建 Mock Logger
 */
export function createMockLogger() {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };
}

/**
 * 创建 Mock SagaOrchestratorService
 */
export function createMockSagaOrchestratorService() {
  return {
    execute: jest.fn().mockResolvedValue({ success: true }),
    compensate: jest.fn().mockResolvedValue(true),
    getSagaState: jest.fn(),
  };
}

/**
 * 创建 Mock Redis 客户端
 */
export function createMockRedisClient() {
  const store = new Map();

  return {
    get: jest.fn((key) => Promise.resolve(store.get(key) || null)),
    set: jest.fn((key, value) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    del: jest.fn((key) => {
      store.delete(key);
      return Promise.resolve(1);
    }),
    exists: jest.fn((key) => Promise.resolve(store.has(key) ? 1 : 0)),
    keys: jest.fn((pattern) => {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return Promise.resolve(Array.from(store.keys()).filter((k) => regex.test(k as string)));
    }),
    zadd: jest.fn().mockResolvedValue(1),
    zremrangebyscore: jest.fn().mockResolvedValue(1),
    zcard: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    pipeline: jest.fn(() => ({
      zadd: jest.fn().mockReturnThis(),
      zremrangebyscore: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 1],
        [null, 1],
        [null, 0],
        [null, 1],
      ]),
    })),
  };
}

/**
 * 创建 Mock RabbitMQ Channel
 */
export function createMockRabbitMQChannel() {
  return {
    assertExchange: jest.fn().mockResolvedValue({ exchange: 'test' }),
    assertQueue: jest.fn().mockResolvedValue({ queue: 'test', messageCount: 0, consumerCount: 0 }),
    bindQueue: jest.fn().mockResolvedValue({ queue: 'test', routingKey: 'test' }),
    publish: jest.fn().mockResolvedValue(true),
    sendToQueue: jest.fn().mockResolvedValue(true),
    consume: jest.fn(),
    ack: jest.fn(),
    nack: jest.fn(),
    prefetch: jest.fn(),
  };
}

/**
 * 创建 Mock Docker Service
 */
export function createMockDockerService() {
  return {
    createContainer: jest.fn().mockResolvedValue({ id: randomString(64) }),
    startContainer: jest.fn().mockResolvedValue(true),
    stopContainer: jest.fn().mockResolvedValue(true),
    removeContainer: jest.fn().mockResolvedValue(true),
    getContainerInfo: jest.fn(),
    listContainers: jest.fn().mockResolvedValue([]),
    execCommand: jest.fn(),
  };
}

/**
 * 创建 Mock ADB Service
 */
export function createMockADBService() {
  return {
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    installApk: jest.fn().mockResolvedValue(true),
    uninstallApp: jest.fn().mockResolvedValue(true),
    shell: jest.fn(),
    listPackages: jest.fn().mockResolvedValue([]),
    getDeviceInfo: jest.fn(),
  };
}

/**
 * 批量创建 Mock 对象
 */
export function createMockUsers(count: number, overrides: Partial<any> = {}) {
  return Array.from({ length: count }, () => createMockUser(overrides));
}

export function createMockDevices(count: number, overrides: Partial<any> = {}) {
  return Array.from({ length: count }, () => createMockDevice(overrides));
}

export function createMockOrders(count: number, overrides: Partial<any> = {}) {
  return Array.from({ length: count }, () => createMockOrder(overrides));
}

export function createMockNotifications(count: number, overrides: Partial<any> = {}) {
  return Array.from({ length: count }, () => createMockNotification(overrides));
}

/**
 * 工单状态枚举
 */
export enum MockTicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

/**
 * 工单优先级枚举
 */
export enum MockTicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * 工单分类枚举
 */
export enum MockTicketCategory {
  TECHNICAL = 'technical',
  BILLING = 'billing',
  ACCOUNT = 'account',
  FEATURE_REQUEST = 'feature_request',
  OTHER = 'other',
}

/**
 * 回复类型枚举
 */
export enum MockReplyType {
  USER = 'user',
  STAFF = 'staff',
  SYSTEM = 'system',
}

/**
 * 创建 Mock 工单
 */
export function createMockTicket(overrides: Partial<any> = {}) {
  const now = new Date();
  const ticketNumber = `TKT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;

  return {
    id: randomUUID(),
    ticketNumber,
    userId: randomUUID(),
    subject: 'Test Ticket Subject',
    description: 'This is a test ticket description',
    category: MockTicketCategory.TECHNICAL,
    priority: MockTicketPriority.MEDIUM,
    status: MockTicketStatus.OPEN,
    assignedTo: null,
    attachments: [],
    tags: [],
    firstResponseAt: null,
    resolvedAt: null,
    closedAt: null,
    replyCount: 0,
    lastReplyAt: null,
    internalNotes: null,
    rating: null,
    feedback: null,
    user: null,
    replies: [],
    createdAt: now,
    updatedAt: now,
    isOpen: () =>
      [MockTicketStatus.OPEN, MockTicketStatus.IN_PROGRESS, MockTicketStatus.PENDING].includes(
        overrides.status || MockTicketStatus.OPEN
      ),
    isClosed: () =>
      [MockTicketStatus.RESOLVED, MockTicketStatus.CLOSED].includes(
        overrides.status || MockTicketStatus.OPEN
      ),
    canReply: () => (overrides.status || MockTicketStatus.OPEN) !== MockTicketStatus.CLOSED,
    getResponseTime: () => {
      const firstResponse = overrides.firstResponseAt;
      if (!firstResponse) return null;
      return new Date(firstResponse).getTime() - now.getTime();
    },
    getResolutionTime: () => {
      const resolved = overrides.resolvedAt;
      if (!resolved) return null;
      return new Date(resolved).getTime() - now.getTime();
    },
    ...overrides,
  };
}

/**
 * 创建 Mock 工单回复
 */
export function createMockTicketReply(overrides: Partial<any> = {}) {
  return {
    id: randomUUID(),
    ticketId: randomUUID(),
    userId: randomUUID(),
    type: MockReplyType.USER,
    content: 'This is a test reply',
    attachments: [],
    isInternal: false,
    ticket: null,
    user: null,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * 批量创建工单
 */
export function createMockTickets(count: number, overrides: Partial<any> = {}) {
  return Array.from({ length: count }, () => createMockTicket(overrides));
}

/**
 * 批量创建工单回复
 */
export function createMockTicketReplies(count: number, overrides: Partial<any> = {}) {
  return Array.from({ length: count }, () => createMockTicketReply(overrides));
}

/**
 * 审计日志动作枚举
 */
export enum MockAuditAction {
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  DEVICE_CREATED = 'DEVICE_CREATED',
  DEVICE_STARTED = 'DEVICE_STARTED',
  DEVICE_STOPPED = 'DEVICE_STOPPED',
  DEVICE_DELETED = 'DEVICE_DELETED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REVOKED = 'ROLE_REVOKED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',
}

/**
 * 审计日志级别枚举
 */
export enum MockAuditLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * 创建 Mock 审计日志
 */
export function createMockAuditLog(overrides: Partial<any> = {}) {
  return {
    id: randomUUID(),
    userId: randomUUID(),
    action: MockAuditAction.USER_LOGIN,
    resourceType: 'user',
    resourceId: randomUUID(),
    level: MockAuditLevel.INFO,
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    metadata: {},
    success: true,
    errorMessage: null,
    user: null,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * 批量创建审计日志
 */
export function createMockAuditLogs(count: number, overrides: Partial<any> = {}) {
  return Array.from({ length: count }, () => createMockAuditLog(overrides));
}

/**
 * 创建 Mock API密钥
 */
export function createMockApiKey(overrides: Partial<any> = {}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // +1 year

  return {
    id: randomUUID(),
    userId: randomUUID(),
    name: 'Test API Key',
    description: 'This is a test API key',
    key: `ak_test_${randomString(32)}`,
    keyHash: randomString(64),
    scopes: ['read', 'write'],
    lastUsedAt: null,
    usageCount: 0,
    expiresAt,
    revokedAt: null,
    isActive: true,
    metadata: {},
    user: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * 批量创建API密钥
 */
export function createMockApiKeys(count: number, overrides: Partial<any> = {}) {
  return Array.from({ length: count }, () => createMockApiKey(overrides));
}
