// ==================== 基础接口和工具类型 ====================

/**
 * 基础实体接口
 * 所有数据库实体的基类，包含通用字段
 */
export interface BaseEntity {
  /** 唯一标识符 */
  id: string;
  /** 创建时间 (ISO 8601 格式) */
  createdAt: string;
  /** 更新时间 (ISO 8601 格式) */
  updatedAt: string;
}

/**
 * 时间戳接口
 * 仅包含时间相关字段，适用于不需要 id 的场景
 */
export interface Timestamps {
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 带 ID 的类型
 * 为任意类型添加 id 字段
 */
export type WithId<T> = T & { id: string };

/**
 * 带时间戳的类型
 * 为任意类型添加时间戳字段
 */
export type WithTimestamps<T> = T & Timestamps;

/**
 * 完整实体类型
 * 为任意类型添加实体所需的全部字段 (id + timestamps)
 */
export type EntityBase<T> = T & BaseEntity;

// ==================== 高级工具类型 ====================

/**
 * 可为 null 的类型
 * @example type NullableString = Nullable<string> // string | null
 */
export type Nullable<T> = T | null;

/**
 * 可选类型（可为 null 或 undefined）
 * @example type OptionalString = Optional<string> // string | null | undefined
 */
export type Optional<T> = T | null | undefined;

/**
 * 美化类型显示
 * 展开嵌套类型定义，使 IDE 提示更清晰
 * @example
 * type User = { id: string } & { name: string }
 * type PrettyUser = Prettify<User> // { id: string; name: string }
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * 深度只读类型
 * 递归地将类型的所有属性设为只读
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * 深度部分类型
 * 递归地将类型的所有属性设为可选
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 提取对象类型的值联合类型
 * @example
 * const Colors = { RED: '#ff0000', GREEN: '#00ff00' } as const
 * type ColorValue = ValueOf<typeof Colors> // '#ff0000' | '#00ff00'
 */
export type ValueOf<T> = T[keyof T];

/**
 * 提取指定类型的键
 * @example
 * type User = { id: string; age: number; name: string }
 * type StringKeys = KeysOfType<User, string> // 'id' | 'name'
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * 将联合类型转为交叉类型
 * 高级类型操作辅助工具
 */
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * 排除 null 和 undefined
 * @example type NonNullString = NonNullable<string | null | undefined> // string
 */
export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

/**
 * 使指定字段必填
 * @example type UserWithEmail = RequireFields<User, 'email'> // email 变为必填
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * 使指定字段可选
 * @example type UserWithOptionalEmail = OptionalFields<User, 'email'>
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 只读指定字段
 * @example type UserWithReadonlyId = ReadonlyFields<User, 'id'>
 */
export type ReadonlyFields<T, K extends keyof T> = Omit<T, K> & Readonly<Pick<T, K>>;

/**
 * JSON 原始值类型
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * JSON 值类型（递归定义）
 * 用于替代 any，保证类型安全的同时保持灵活性
 */
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

/**
 * JSON 对象类型
 */
export type JsonObject = { [key: string]: JsonValue };

/**
 * JSON 数组类型
 */
export type JsonArray = JsonValue[];

// ==================== 通用枚举类型 ====================

/**
 * 用户状态枚举
 */
export enum UserStatus {
  /** 正常激活 */
  ACTIVE = 'active',
  /** 已停用 */
  INACTIVE = 'inactive',
  /** 已封禁 */
  BANNED = 'banned',
}

/**
 * 设备状态枚举
 */
export enum DeviceStatus {
  /** 空闲中 */
  IDLE = 'idle',
  /** 运行中 */
  RUNNING = 'running',
  /** 已停止 */
  STOPPED = 'stopped',
  /** 错误状态 */
  ERROR = 'error',
}

/**
 * 订单状态枚举
 */
export enum OrderStatus {
  /** 待支付 */
  PENDING = 'pending',
  /** 已支付 */
  PAID = 'paid',
  /** 已取消 */
  CANCELLED = 'cancelled',
  /** 已退款 */
  REFUNDED = 'refunded',
  /** 已过期 */
  EXPIRED = 'expired',
}

/**
 * 支付状态枚举
 */
export enum PaymentStatus {
  /** 待支付 */
  PENDING = 'pending',
  /** 处理中 */
  PROCESSING = 'processing',
  /** 支付成功 */
  SUCCESS = 'success',
  /** 支付失败 */
  FAILED = 'failed',
  /** 退款中 */
  REFUNDING = 'refunding',
  /** 已退款 */
  REFUNDED = 'refunded',
  /** 已取消 */
  CANCELLED = 'cancelled',
}

/**
 * 支付方式枚举
 */
export enum PaymentMethod {
  /** 微信支付 */
  WECHAT = 'wechat',
  /** 支付宝 */
  ALIPAY = 'alipay',
  /** 余额支付 */
  BALANCE = 'balance',
}

/**
 * 数据作用域类型枚举
 */
export enum ScopeType {
  /** 全部数据 */
  ALL = 'all',
  /** 租户级 */
  TENANT = 'tenant',
  /** 部门级（包含子部门） */
  DEPARTMENT = 'department',
  /** 仅当前部门 */
  DEPARTMENT_ONLY = 'department_only',
  /** 仅自己 */
  SELF = 'self',
  /** 自定义 */
  CUSTOM = 'custom',
}

/**
 * 字段访问级别枚举
 */
export enum FieldAccessLevel {
  /** 隐藏 */
  HIDDEN = 'hidden',
  /** 只读 */
  READ = 'read',
  /** 可写 */
  WRITE = 'write',
  /** 必填 */
  REQUIRED = 'required',
}

/**
 * 操作类型枚举
 */
export enum OperationType {
  /** 创建 */
  CREATE = 'create',
  /** 更新 */
  UPDATE = 'update',
  /** 查看 */
  VIEW = 'view',
  /** 导出 */
  EXPORT = 'export',
}

/**
 * 工单状态枚举
 */
export enum TicketStatus {
  /** 待处理 */
  OPEN = 'open',
  /** 处理中 */
  IN_PROGRESS = 'in_progress',
  /** 等待响应 */
  PENDING = 'pending',
  /** 已解决 */
  RESOLVED = 'resolved',
  /** 已关闭 */
  CLOSED = 'closed',
}

/**
 * 工单优先级枚举
 */
export enum TicketPriority {
  /** 低 */
  LOW = 'low',
  /** 中 */
  MEDIUM = 'medium',
  /** 高 */
  HIGH = 'high',
  /** 紧急 */
  URGENT = 'urgent',
}

/**
 * 工单类别枚举
 */
export enum TicketCategory {
  /** 技术问题 */
  TECHNICAL = 'technical',
  /** 账单问题 */
  BILLING = 'billing',
  /** 账户问题 */
  ACCOUNT = 'account',
  /** 功能请求 */
  FEATURE_REQUEST = 'feature_request',
  /** 其他 */
  OTHER = 'other',
}

/**
 * 回复类型枚举
 */
export enum ReplyType {
  /** 用户回复 */
  USER = 'user',
  /** 员工回复 */
  STAFF = 'staff',
  /** 系统回复 */
  SYSTEM = 'system',
}

/**
 * 审计级别枚举
 */
export enum AuditLevel {
  /** 信息 */
  INFO = 'info',
  /** 警告 */
  WARNING = 'warning',
  /** 错误 */
  ERROR = 'error',
  /** 严重 */
  CRITICAL = 'critical',
}

/**
 * API Key 状态枚举
 */
export enum ApiKeyStatus {
  /** 激活 */
  ACTIVE = 'active',
  /** 已撤销 */
  REVOKED = 'revoked',
  /** 已过期 */
  EXPIRED = 'expired',
}

/**
 * 配额状态枚举
 */
export enum QuotaStatus {
  /** 正常 */
  ACTIVE = 'active',
  /** 超限 */
  EXCEEDED = 'exceeded',
  /** 暂停 */
  SUSPENDED = 'suspended',
  /** 过期 */
  EXPIRED = 'expired',
}

/**
 * 配额类型枚举
 */
export enum QuotaType {
  /** 设备 */
  DEVICE = 'device',
  /** CPU */
  CPU = 'cpu',
  /** 内存 */
  MEMORY = 'memory',
  /** 存储 */
  STORAGE = 'storage',
  /** 带宽 */
  BANDWIDTH = 'bandwidth',
  /** 时长 */
  DURATION = 'duration',
}

// ==================== 通用类型 ====================

/**
 * 金额类型定义
 * PostgreSQL numeric(10,2) 在 JSON 序列化后为字符串，以保证精度
 * 前端统一使用 string 类型，避免浮点数精度问题
 */
export type MoneyAmount = string;

/**
 * 金额格式化工具函数
 * 将 MoneyAmount 字符串转换为数字进行计算
 */
export const parseMoneyAmount = (amount: MoneyAmount): number => {
  return parseFloat(amount);
};

/**
 * 数字转金额字符串
 * 保留两位小数
 */
export const toMoneyAmount = (value: number): MoneyAmount => {
  return value.toFixed(2);
};

/**
 * 金额格式化显示
 * @param amount - 金额字符串
 * @param currency - 货币符号，默认 ¥
 * @returns 格式化后的金额字符串，如 ¥123.45
 */
export const formatMoney = (amount: MoneyAmount, currency: string = '¥'): string => {
  return `${currency}${parseFloat(amount).toFixed(2)}`;
};

// ==================== 类型守卫函数 ====================

/**
 * 检查值是否为有效的 JSON 值
 * @param value - 待检查的值
 */
export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  if (typeof value === 'string') return true;
  if (typeof value === 'number') return !Number.isNaN(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === 'object') {
    return Object.values(value as object).every(isJsonValue);
  }
  return false;
}

/**
 * 检查值是否为 JSON 对象
 * @param value - 待检查的值
 */
export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 检查值是否为 JSON 数组
 * @param value - 待检查的值
 */
export function isJsonArray(value: unknown): value is JsonArray {
  return Array.isArray(value) && value.every(isJsonValue);
}

/**
 * 检查值是否为有效的用户状态
 * @param value - 待检查的值
 */
export function isUserStatus(value: unknown): value is UserStatus {
  return Object.values(UserStatus).includes(value as UserStatus);
}

/**
 * 检查值是否为有效的设备状态
 * @param value - 待检查的值
 */
export function isDeviceStatus(value: unknown): value is DeviceStatus {
  return Object.values(DeviceStatus).includes(value as DeviceStatus);
}

/**
 * 检查值是否为有效的订单状态
 * @param value - 待检查的值
 */
export function isOrderStatus(value: unknown): value is OrderStatus {
  return Object.values(OrderStatus).includes(value as OrderStatus);
}

/**
 * 检查值是否为有效的支付状态
 * @param value - 待检查的值
 */
export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return Object.values(PaymentStatus).includes(value as PaymentStatus);
}

/**
 * 检查值是否为有效的支付方式
 * @param value - 待检查的值
 */
export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return Object.values(PaymentMethod).includes(value as PaymentMethod);
}

/**
 * 检查值是否为有效的作用域类型
 * @param value - 待检查的值
 */
export function isScopeType(value: unknown): value is ScopeType {
  return Object.values(ScopeType).includes(value as ScopeType);
}

/**
 * 检查值是否为有效的字段访问级别
 * @param value - 待检查的值
 */
export function isFieldAccessLevel(value: unknown): value is FieldAccessLevel {
  return Object.values(FieldAccessLevel).includes(value as FieldAccessLevel);
}

/**
 * 检查值是否为有效的操作类型
 * @param value - 待检查的值
 */
export function isOperationType(value: unknown): value is OperationType {
  return Object.values(OperationType).includes(value as OperationType);
}

/**
 * 检查值是否为有效的工单状态
 * @param value - 待检查的值
 */
export function isTicketStatus(value: unknown): value is TicketStatus {
  return Object.values(TicketStatus).includes(value as TicketStatus);
}

/**
 * 检查值是否为有效的工单优先级
 * @param value - 待检查的值
 */
export function isTicketPriority(value: unknown): value is TicketPriority {
  return Object.values(TicketPriority).includes(value as TicketPriority);
}

/**
 * 检查值是否为有效的工单类别
 * @param value - 待检查的值
 */
export function isTicketCategory(value: unknown): value is TicketCategory {
  return Object.values(TicketCategory).includes(value as TicketCategory);
}

/**
 * 检查值是否为有效的回复类型
 * @param value - 待检查的值
 */
export function isReplyType(value: unknown): value is ReplyType {
  return Object.values(ReplyType).includes(value as ReplyType);
}

/**
 * 检查值是否为有效的审计级别
 * @param value - 待检查的值
 */
export function isAuditLevel(value: unknown): value is AuditLevel {
  return Object.values(AuditLevel).includes(value as AuditLevel);
}

/**
 * 检查值是否为有效的 API Key 状态
 * @param value - 待检查的值
 */
export function isApiKeyStatus(value: unknown): value is ApiKeyStatus {
  return Object.values(ApiKeyStatus).includes(value as ApiKeyStatus);
}

/**
 * 检查值是否为有效的配额状态
 * @param value - 待检查的值
 */
export function isQuotaStatus(value: unknown): value is QuotaStatus {
  return Object.values(QuotaStatus).includes(value as QuotaStatus);
}

/**
 * 检查值是否为有效的配额类型
 * @param value - 待检查的值
 */
export function isQuotaType(value: unknown): value is QuotaType {
  return Object.values(QuotaType).includes(value as QuotaType);
}

// ==================== 验证函数 ====================

/**
 * 验证金额字符串格式
 * @param value - 待验证的值
 * @returns 是否为有效的金额格式
 */
export function isValidMoneyAmount(value: unknown): value is MoneyAmount {
  if (typeof value !== 'string') return false;
  const num = parseFloat(value);
  return !Number.isNaN(num) && Number.isFinite(num) && num >= 0;
}

/**
 * 验证邮箱格式
 * @param email - 待验证的邮箱
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证手机号格式（中国大陆）
 * @param phone - 待验证的手机号
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 验证 ID 格式（UUID v4）
 * @param id - 待验证的 ID
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * 验证日期字符串格式（ISO 8601）
 * @param date - 待验证的日期字符串
 */
export function isValidISODate(date: string): boolean {
  const timestamp = Date.parse(date);
  return !Number.isNaN(timestamp);
}

/**
 * 验证对象是否具有指定的必填字段
 * @param obj - 待验证的对象
 * @param requiredFields - 必填字段数组
 */
export function hasRequiredFields<T extends object>(
  obj: unknown,
  requiredFields: (keyof T)[]
): obj is T {
  if (typeof obj !== 'object' || obj === null) return false;
  return requiredFields.every((field) => field in obj);
}

/**
 * 验证数组中所有元素是否为指定类型
 * @param arr - 待验证的数组
 * @param guard - 类型守卫函数
 */
export function isArrayOf<T>(arr: unknown, guard: (item: unknown) => item is T): arr is T[] {
  return Array.isArray(arr) && arr.every(guard);
}

/**
 * 创建 Enum 验证器
 * @param enumObj - Enum 对象
 * @returns 验证函数
 * @example
 * const isStatus = createEnumGuard(UserStatus);
 * if (isStatus(value)) { // value 的类型会被收窄为 UserStatus }
 */
export function createEnumGuard<T extends Record<string, string | number>>(enumObj: T) {
  return (value: unknown): value is T[keyof T] => {
    return Object.values(enumObj).includes(value as T[keyof T]);
  };
}

// 分页参数
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 游标分页类型
export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  count: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

// ==================== 用户相关 ====================

/**
 * 用户信息
 * 系统核心实体，包含用户基本信息、角色权限和账户状态
 */
export interface User extends BaseEntity {
  /** 用户名（唯一，用于登录） */
  username: string;
  /** 邮箱地址（唯一） */
  email: string;
  /** 手机号码（可选） */
  phone?: string;
  /** 账户余额（用于计费扣费） */
  balance: number;
  /** 用户角色列表（RBAC） */
  roles: Role[];
  /** 用户状态 */
  status: UserStatus;
}

/**
 * 角色
 * RBAC 权限控制的核心，定义用户组的权限集合
 */
export interface Role extends BaseEntity {
  /** 角色名称（如：admin, user, operator） */
  name: string;
  /** 角色描述 */
  description?: string;
  /** 角色拥有的权限列表 */
  permissions: Permission[];
}

/**
 * 权限
 * 定义对特定资源的操作权限
 */
export interface Permission extends BaseEntity {
  /** 资源类型（如：users, devices, apps） */
  resource: string;
  /** 操作类型（如：create, read, update, delete） */
  action: string;
  /** 权限描述 */
  description?: string;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  phone?: string;
  roleIds?: string[];
}

export interface UpdateUserDto {
  email?: string;
  phone?: string;
  status?: UserStatus;
  roleIds?: string[];
}

// ==================== 设备相关 ====================

/**
 * 云手机设备
 * 核心业务实体，代表一个 Android 虚拟设备实例
 */
export interface Device extends BaseEntity {
  /** 设备名称（用户自定义） */
  name: string;
  /** 所属用户 ID */
  userId: string;
  /** 所属用户信息（关联查询时返回） */
  user?: User;
  /** 设备状态 */
  status: DeviceStatus;
  /** Android 系统版本（如：11.0, 12.0） */
  androidVersion: string;
  /** CPU 核心数 */
  cpuCores: number;
  /** 内存大小（MB） */
  memoryMB: number;
  /** 存储空间（MB） */
  storageMB: number;
  /** 设备 IP 地址 */
  ipAddress?: string;
  /** ADB 调试端口 */
  adbPort?: number;
  /** VNC 远程桌面端口 */
  vncPort?: number;
  /** Docker 容器 ID（Redroid 模式） */
  containerId?: string;
  /** 最后启动时间 */
  lastStartedAt?: string;
  /** 最后停止时间 */
  lastStoppedAt?: string;
}

export interface CreateDeviceDto {
  name?: string;
  userId: string;
  androidVersion?: string;
  cpuCores?: number;
  memoryMB?: number;
  storageMB?: number;
}

export interface UpdateDeviceDto {
  name?: string;
  status?: string;
}

export interface DeviceStats {
  total: number;
  idle: number;
  running: number;
  stopped: number;
  error: number;
}

// 应用相关
export interface Application extends BaseEntity {
  name: string;
  packageName: string;
  versionName: string;
  versionCode: number;
  size: number;
  iconUrl?: string;
  icon?: string; // 应用图标（别名，兼容旧代码）
  description?: string;
  category?: string;
  uploadedBy: string;
  objectKey: string;
  apkPath?: string; // APK 文件路径
  version?: string; // 版本号（可能与 versionName 重复）
  minSdkVersion?: number;
  targetSdkVersion?: number;
  permissions?: string[];
  reviewStatus?: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  reviewComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

// 类型别名，为了兼容性
export type App = Application;

export interface CreateAppDto {
  name: string;
  packageName: string;
  versionName: string;
  versionCode: number;
  file: File | Blob;
  description?: string;
  category?: string;
  iconUrl?: string;
}

export interface UpdateAppDto {
  name?: string;
  description?: string;
  category?: string;
  iconUrl?: string;
  reviewStatus?: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  reviewComment?: string;
}

// 应用审核相关
export interface AppReviewRecord {
  id: string;
  applicationId: string;
  application?: Application;
  action: 'submit' | 'approve' | 'reject' | 'request_changes';
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  comment?: string;
  reviewedBy?: string;
  reviewer?: User;
  reviewerName?: string; // 审核者名称（兼容旧代码）
  createdAt: string;
}

export interface SubmitReviewDto {
  applicationId: string;
}

export interface ApproveAppDto {
  comment?: string;
}

export interface RejectAppDto {
  reason: string;
}

export interface RequestChangesDto {
  changes: string;
}

export interface DeviceApplication {
  id: string;
  deviceId: string;
  applicationId: string;
  application?: Application;
  status: 'installing' | 'installed' | 'failed' | 'uninstalling';
  installedAt?: string;
  uninstalledAt?: string;
}

export interface InstallAppDto {
  deviceId: string;
  applicationId: string;
}

// 套餐相关

/**
 * 套餐功能配置
 * 定义套餐包含的具体功能
 */
export interface PlanFeatures {
  /** 最大设备数 */
  maxDevices?: number;
  /** 最大存储空间 (GB) */
  maxStorage?: number;
  /** 自定义域名 */
  customDomain?: boolean;
  /** 高级分析 */
  advancedAnalytics?: boolean;
  /** API 访问 */
  apiAccess?: boolean;
  /** 优先支持 */
  prioritySupport?: boolean;
  /** 白标服务 */
  whiteLabel?: boolean;
  /** 其他动态配置（保持灵活性） */
  [key: string]: JsonValue | undefined;
}

/**
 * 套餐计划
 */
export interface Plan extends BaseEntity {
  name: string;
  description?: string;
  type: 'monthly' | 'yearly' | 'one-time';
  /** 价格（字符串格式，保证精度） */
  price: MoneyAmount;
  /** 时长（天数） */
  duration: number;
  /** 设备数量限制 */
  deviceLimit: number;
  /** 附加功能配置 */
  features?: PlanFeatures;
  isActive: boolean;
}

export interface CreatePlanDto {
  name: string;
  description?: string;
  type: 'monthly' | 'yearly' | 'one-time';
  price: number;
  duration: number;
  deviceLimit: number;
  features?: JsonObject;
}

// ==================== 订单相关 ====================

/**
 * 订单
 */
export interface Order extends BaseEntity {
  /** 订单号 */
  orderNo: string;
  userId: string;
  user?: User;
  planId: string;
  plan?: Plan;
  /** 订单金额（字符串格式，保证精度） */
  amount: MoneyAmount;
  /** 订单状态 */
  status: OrderStatus;
  /** 支付方式 */
  paymentMethod?: PaymentMethod;
  paidAt?: string;
  cancelledAt?: string;
  refundedAt?: string;
  expiresAt?: string;
}

export interface CreateOrderDto {
  planId: string;
  userId: string;
}

// ==================== 支付相关 ====================

/**
 * 支付记录
 */
export interface Payment extends BaseEntity {
  /** 支付单号 */
  paymentNo: string;
  orderId: string;
  order?: Order;
  /** 支付金额（字符串格式，保证精度） */
  amount: MoneyAmount;
  /** 支付方式 */
  method: PaymentMethod;
  /** 支付状态 */
  status: PaymentStatus;
  /** 第三方支付平台交易 ID */
  transactionId?: string;
  /** 支付页面 URL */
  paymentUrl?: string;
  paidAt?: string;
  refundedAt?: string;
  /** 失败原因 */
  failedReason?: string;
}

export interface CreatePaymentDto {
  orderId: string;
  method: PaymentMethod;
  amount: number;
}

// 使用记录
export interface UsageRecord {
  id: string;
  userId: string;
  deviceId: string;
  device?: Device;
  startTime: string;
  endTime?: string;
  duration: number;
  cpuUsage?: number;
  memoryUsage?: number;
  storageUsage?: number;
  networkUsage?: number;
  cost: string | number; // PostgreSQL numeric serializes as string in JSON
  createdAt: string;
}

// 统计相关
export interface DashboardStats {
  totalDevices: number;
  onlineDevices: number;
  totalUsers: number;
  totalApps: number;
  todayRevenue: number;
  monthRevenue: number;
  todayOrders: number;
  monthOrders: number;
}

export interface RevenueStats {
  date: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
}

export interface UserBill {
  userId: string;
  username: string;
  email: string;
  orders: Order[];
  usageRecords: UsageRecord[];
  totalAmount: number;
  totalDuration: number;
  period: {
    start: string;
    end: string;
  };
}

// ADB 相关
export interface ShellCommandDto {
  command: string;
}

export interface ShellCommandResult {
  output: string;
  exitCode: number;
}

export interface DevicePackage {
  name: string;
  versionName: string;
  versionCode: number;
}

export interface DeviceProperties {
  [key: string]: string;
}

// 设备模板相关
export interface DeviceTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  isPublic: boolean;
  androidVersion: string;
  cpuCores: number;
  memoryMB: number;
  storageMB: number;
  preInstalledApps?: string[];
  config?: JsonObject;
  tags?: string[];
  usageCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateDto {
  name: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
  androidVersion: string;
  cpuCores: number;
  memoryMB: number;
  storageMB: number;
  preInstalledApps?: string[];
  config?: JsonObject;
  tags?: string[];
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
  tags?: string[];
}

export interface CreateDeviceFromTemplateDto {
  templateId: string;
  name?: string;
  userId: string;
  count?: number;
}

// 设备快照相关
export interface DeviceSnapshot {
  id: string;
  deviceId: string;
  device?: Device;
  name: string;
  description?: string;
  size: number;
  compressed: boolean;
  status: 'creating' | 'ready' | 'restoring' | 'failed';
  storagePath: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSnapshotDto {
  deviceId: string;
  name: string;
  description?: string;
}

export interface SnapshotStats {
  totalSnapshots: number;
  totalSize: number;
  avgSize: number;
}

// 物理设备相关
export interface PhysicalDevice {
  id: string;
  serialNumber: string;
  name: string;
  status: 'online' | 'offline' | 'unregistered';
  model?: string;
  manufacturer?: string;
  androidVersion?: string;
  connectionType: 'usb' | 'network';
  ipAddress?: string;
  adbPort?: number;
  lastSeenAt?: string;
  assignedUserId?: string;
  assignedUser?: User;
  createdAt: string;
  updatedAt: string;
}

export interface ScanNetworkDto {
  subnet: string;
}

export interface RegisterPhysicalDeviceDto {
  serialNumber: string;
  name?: string;
  connectionType?: 'usb' | 'network';
  ipAddress?: string;
  adbPort?: number;
}

// 计费规则相关
export interface BillingRule {
  id: string;
  name: string;
  description?: string;
  type: 'time-based' | 'usage-based' | 'tiered' | 'custom';
  formula: string;
  parameters: JsonObject;
  isActive: boolean;
  priority: number;
  validFrom?: string;
  validUntil?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBillingRuleDto {
  name: string;
  description?: string;
  type: 'time-based' | 'usage-based' | 'tiered' | 'custom';
  formula: string;
  parameters: JsonObject;
  priority?: number;
  validFrom?: string;
  validUntil?: string;
}

export interface UpdateBillingRuleDto {
  name?: string;
  description?: string;
  formula?: string;
  parameters?: JsonObject;
  priority?: number;
  validFrom?: string;
  validUntil?: string;
}

/**
 * 计费规则测试结果
 */
export interface BillingRuleTestResult {
  success: boolean;
  /** 计算得出的成本（字符串格式，保证精度） */
  cost: MoneyAmount;
  /** 成本明细 */
  breakdown: {
    component: string;
    /** 组件值（可能不是金额，如时长、流量等） */
    value: number;
    unit: string;
  }[];
  /** 计费公式 */
  formula: string;
  /** 输入参数 */
  inputs: JsonObject;
}

// 生命周期自动化相关
export interface LifecycleRule {
  id: string;
  name: string;
  description?: string;
  type: 'cleanup' | 'autoscaling' | 'backup' | 'expiration-warning';
  enabled: boolean;
  priority: number;
  schedule?: string; // Cron 表达式
  config: JsonObject;
  lastExecutedAt?: string;
  nextExecutionAt?: string;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLifecycleRuleDto {
  name: string;
  description?: string;
  type: 'cleanup' | 'autoscaling' | 'backup' | 'expiration-warning';
  enabled?: boolean;
  priority?: number;
  schedule?: string;
  config: JsonObject;
}

export interface UpdateLifecycleRuleDto {
  name?: string;
  description?: string;
  enabled?: boolean;
  priority?: number;
  schedule?: string;
  config?: JsonObject;
}

export interface LifecycleExecutionHistory {
  id: string;
  ruleId: string;
  ruleName: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'success' | 'failed' | 'partial';
  affectedDevices: number;
  details?: {
    succeeded: number;
    failed: number;
    skipped: number;
    errors?: string[];
  };
  executedBy?: 'system' | 'manual';
  triggeredBy?: string;
}

export interface LifecycleStats {
  totalRules: number;
  activeRules: number;
  inactiveRules: number;
  totalExecutions: number;
  successRate: number;
  lastExecutionTime?: string;
}

// GPU 资源管理相关
export interface GPUDevice {
  id: string;
  name: string;
  model: string;
  vendor: string;
  driverVersion: string;
  cudaVersion?: string;
  totalMemoryMB: number;
  status: 'online' | 'offline' | 'error';
  nodeId: string;
  nodeName: string;
  temperature?: number;
  powerUsage?: number;
  powerLimit?: number;
  fanSpeed?: number;
  utilizationRate: number;
  memoryUsed: number;
  allocatedTo?: string; // deviceId
  allocationMode: 'exclusive' | 'shared' | 'available';
  createdAt: string;
  updatedAt: string;
}

export interface GPUAllocation {
  id: string;
  gpuId: string;
  deviceId: string;
  userId: string;
  allocatedAt: string;
  releasedAt?: string;
  status: 'active' | 'released';
  usageStats?: {
    avgUtilization: number;
    peakUtilization: number;
    avgMemoryUsage: number;
    peakMemoryUsage: number;
  };
}

export interface GPUStats {
  totalGPUs: number;
  onlineGPUs: number;
  offlineGPUs: number;
  avgUtilization: number;
  avgTemperature: number;
  totalMemoryMB: number;
  usedMemoryMB: number;
  allocations: number;
}

export interface GPUUsageTrend {
  timestamp: string;
  utilization: number;
  memoryUsage: number;
  temperature: number;
  powerUsage: number;
}

// 通知模板相关
export interface NotificationTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'email' | 'sms' | 'websocket';
  subject?: string; // 仅邮件
  content: string;
  contentType: 'plain' | 'html' | 'markdown';
  variables: string[]; // 可用变量列表
  isActive: boolean;
  language: string; // 语言代码
  category?: string;
  version: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationTemplateDto {
  name: string;
  description?: string;
  type: 'email' | 'sms' | 'websocket';
  subject?: string;
  content: string;
  contentType: 'plain' | 'html' | 'markdown';
  isActive?: boolean;
  language?: string;
  category?: string;
}

export interface UpdateNotificationTemplateDto {
  name?: string;
  description?: string;
  subject?: string;
  content?: string;
  contentType?: 'plain' | 'html' | 'markdown';
  isActive?: boolean;
  category?: string;
}

export interface NotificationTemplateVersion {
  id: string;
  templateId: string;
  version: number;
  content: string;
  subject?: string;
  createdBy: string;
  createdAt: string;
  changeNote?: string;
}

export interface TemplateTestRequest {
  templateId: string;
  recipient: string; // email or phone
  variables: JsonObject;
}

// 设备分组管理相关
export interface DeviceGroup {
  id: string;
  name: string;
  description?: string;
  deviceCount: number;
  tags?: string[];
  rules?: GroupRule[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupRule {
  field: string; // status, userId, tag, etc.
  operator: 'equals' | 'contains' | 'in' | 'gt' | 'lt';
  value: JsonValue;
}

export interface CreateDeviceGroupDto {
  name: string;
  description?: string;
  tags?: string[];
  rules?: GroupRule[];
}

export interface BatchOperationDto {
  operation: 'start' | 'stop' | 'restart' | 'install-app' | 'update-config';
  deviceIds?: string[];
  groupId?: string;
  params?: JsonObject;
}

// 网络策略配置相关
export interface NetworkPolicy {
  id: string;
  name: string;
  description?: string;
  deviceId?: string;
  groupId?: string;
  direction: 'inbound' | 'outbound' | 'both';
  protocol?: 'tcp' | 'udp' | 'icmp' | 'all';
  sourceIp?: string;
  sourcePort?: string;
  destIp?: string;
  destPort?: string;
  action: 'allow' | 'deny';
  priority: number;
  isEnabled: boolean;
  bandwidthLimit?: number; // Mbps
  createdAt: string;
  updatedAt: string;
}

export interface CreateNetworkPolicyDto {
  name: string;
  description?: string;
  deviceId?: string;
  groupId?: string;
  direction: 'inbound' | 'outbound' | 'both';
  protocol?: 'tcp' | 'udp' | 'icmp' | 'all';
  sourceIp?: string;
  sourcePort?: string;
  destIp?: string;
  destPort?: string;
  action: 'allow' | 'deny';
  priority?: number;
  bandwidthLimit?: number;
}

export interface NetworkStats {
  deviceId: string;
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  connectionsActive: number;
  bandwidthUsage: number; // Mbps
  timestamp: string;
}

// 菜单权限相关
export interface MenuItem {
  id: string;
  name: string;
  path: string;
  icon?: string;
  component?: string;
  permission?: string;
  children?: MenuItem[];
  meta?: {
    title?: string;
    requiresAuth?: boolean;
    hidden?: boolean;
    hideInMenu?: boolean;
    order?: number;
    [key: string]: JsonValue | string | boolean | number | undefined;
  };
}

export interface MenuCacheStats {
  totalCached: number;
  activeUsers: number;
  hitRate: number;
  missRate: number;
  avgLoadTime: number;
  cacheSize: number;
  lastClearTime?: string;
  uptime: number;
}

// 缓存管理相关
export interface CacheStats {
  l1Hits: number;
  l2Hits: number;
  misses: number;
  sets: number;
  totalRequests: number;
  hitRate: number;
  missRate: number;
  l1Size: number;
  l2Size: number;
  timestamp: string;
}

export interface CacheKey {
  key: string;
  value?: JsonValue;
  ttl?: number;
  createdAt?: string;
}

// 队列管理相关
export interface QueueStatus {
  name: string;
  isPaused: boolean;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
}

export interface QueueSummary {
  totalQueues: number;
  totalWaiting: number;
  totalActive: number;
  totalCompleted: number;
  totalFailed: number;
}

export interface QueueJob {
  id: string;
  name: string;
  data: JsonObject;
  progress: number;
  attemptsMade: number;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
}

export interface QueueJobDetail {
  id: string;
  name: string;
  data: JsonObject;
  opts: JsonObject;
  progress: number;
  delay: number;
  timestamp: number;
  attemptsMade: number;
  failedReason?: string;
  stacktrace?: string[];
  returnvalue?: JsonValue;
  finishedOn?: number;
  processedOn?: number;
  error?: string;
}

// 事件溯源相关
export interface UserEvent {
  id: string;
  aggregateId: string; // 用户ID
  eventType: string;
  version: number;
  createdAt: string;
  eventData: JsonObject;
}

export interface EventHistory {
  userId: string;
  events: UserEvent[];
  totalEvents: number;
  currentVersion: number;
}

export interface EventStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
}

// 数据范围权限相关
// 保留原有类型作为值类型别名，以保持向后兼容
export type ScopeTypeValue = `${ScopeType}`;

export interface DataScope {
  id: string;
  roleId: string;
  role?: Role;
  resourceType: string; // 资源类型，如 'user', 'device', 'order'
  scopeType: ScopeType;
  filter?: JsonObject; // 自定义过滤条件
  departmentIds?: string[]; // 部门ID列表
  includeSubDepartments?: boolean; // 是否包含子部门
  description?: string;
  isActive: boolean;
  priority: number; // 优先级，数字越小优先级越高
  createdAt: string;
  updatedAt: string;
}

export interface CreateDataScopeDto {
  roleId: string;
  resourceType: string;
  scopeType: ScopeType;
  filter?: JsonObject;
  departmentIds?: string[];
  includeSubDepartments?: boolean;
  description?: string;
  priority?: number;
}

export interface UpdateDataScopeDto {
  scopeType?: ScopeType;
  filter?: JsonObject;
  departmentIds?: string[];
  includeSubDepartments?: boolean;
  description?: string;
  isActive?: boolean;
  priority?: number;
}

// ==================== Field Permission Types ====================

// 字段访问级别值类型（从 Enum 派生）
export type FieldAccessLevelValue = `${FieldAccessLevel}`;

// 操作类型值类型（从 Enum 派生）
export type OperationTypeValue = `${OperationType}`;

export interface FieldPermission {
  id: string;
  roleId: string;
  role?: Role;
  resourceType: string;
  operation: OperationType;
  hiddenFields?: string[];
  readOnlyFields?: string[];
  writableFields?: string[];
  requiredFields?: string[];
  fieldAccessMap?: Record<string, FieldAccessLevel>;
  fieldTransforms?: Record<
    string,
    {
      type: 'mask' | 'hash' | 'encrypt' | 'truncate';
      config?: JsonObject;
    }
  >;
  description?: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFieldPermissionDto {
  roleId: string;
  resourceType: string;
  operation: OperationType;
  hiddenFields?: string[];
  readOnlyFields?: string[];
  writableFields?: string[];
  requiredFields?: string[];
  fieldAccessMap?: Record<string, FieldAccessLevel>;
  fieldTransforms?: Record<
    string,
    {
      type: 'mask' | 'hash' | 'encrypt' | 'truncate';
      config?: JsonObject;
    }
  >;
  description?: string;
  priority?: number;
}

export interface UpdateFieldPermissionDto {
  operation?: OperationType;
  hiddenFields?: string[];
  readOnlyFields?: string[];
  writableFields?: string[];
  requiredFields?: string[];
  fieldAccessMap?: Record<string, FieldAccessLevel>;
  fieldTransforms?: Record<
    string,
    {
      type: 'mask' | 'hash' | 'encrypt' | 'truncate';
      config?: JsonObject;
    }
  >;
  description?: string;
  isActive?: boolean;
  priority?: number;
}

// ==================== Ticket System Types ====================

// 工单状态值类型（从 Enum 派生）
export type TicketStatusValue = `${TicketStatus}`;

// 工单优先级值类型（从 Enum 派生）
export type TicketPriorityValue = `${TicketPriority}`;

// 工单类别值类型（从 Enum 派生）
export type TicketCategoryValue = `${TicketCategory}`;

// 回复类型值类型（从 Enum 派生）
export type ReplyTypeValue = `${ReplyType}`;

export interface TicketAttachment {
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  userId: string;
  user?: User;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string;
  attachments?: TicketAttachment[];
  tags?: string[];
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  replyCount: number;
  lastReplyAt?: string;
  internalNotes?: string;
  rating?: number;
  feedback?: string;
  replies?: TicketReply[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketReply {
  id: string;
  ticketId: string;
  ticket?: Ticket;
  userId: string;
  user?: User;
  type: ReplyType;
  content: string;
  attachments?: TicketAttachment[];
  isInternal: boolean;
  createdAt: string;
}

export interface CreateTicketDto {
  userId: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  attachments?: TicketAttachment[];
  tags?: string[];
}

export interface UpdateTicketDto {
  subject?: string;
  description?: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  status?: TicketStatus;
  assignedTo?: string;
  tags?: string[];
  internalNotes?: string;
}

export interface CreateReplyDto {
  ticketId: string;
  userId: string;
  type: ReplyType;
  content: string;
  attachments?: TicketAttachment[];
  isInternal?: boolean;
}

export interface TicketStatistics {
  total: number;
  byStatus: {
    open: number;
    in_progress: number;
    pending: number;
    resolved: number;
    closed: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  byCategory: {
    technical: number;
    billing: number;
    account: number;
    feature_request: number;
    other: number;
  };
  avgResponseTime?: number;
  avgResolutionTime?: number;
  satisfactionRate?: number;
}

// ==================== Audit Log Types ====================

export type AuditAction =
  // 用户操作
  | 'user_login'
  | 'user_logout'
  | 'user_register'
  | 'user_update'
  | 'user_delete'
  | 'password_change'
  | 'password_reset'
  // 配额操作
  | 'quota_create'
  | 'quota_update'
  | 'quota_deduct'
  | 'quota_restore'
  // 余额操作
  | 'balance_recharge'
  | 'balance_consume'
  | 'balance_adjust'
  | 'balance_freeze'
  | 'balance_unfreeze'
  // 设备操作
  | 'device_create'
  | 'device_start'
  | 'device_stop'
  | 'device_delete'
  | 'device_update'
  // 权限操作
  | 'role_assign'
  | 'role_revoke'
  | 'permission_grant'
  | 'permission_revoke'
  // 系统操作
  | 'config_update'
  | 'system_maintenance'
  // API 操作
  | 'api_key_create'
  | 'api_key_revoke';

// 审计级别值类型（从 Enum 派生）
export type AuditLevelValue = `${AuditLevel}`;

export interface AuditLog {
  id: string;
  userId: string;
  targetUserId?: string;
  action: AuditAction;
  level: AuditLevel;
  resourceType: string;
  resourceId?: string;
  description: string;
  oldValue?: JsonObject;
  newValue?: JsonObject;
  metadata?: JsonObject;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

export interface AuditLogStatistics {
  total: number;
  byAction: Record<string, number>;
  byLevel: {
    info: number;
    warning: number;
    error: number;
    critical: number;
  };
  byResourceType: Record<string, number>;
  successRate: number;
  recentActivity: {
    hour: number;
    day: number;
    week: number;
  };
}

// ==================== API Key Types ====================

// API Key 状态值类型（从 Enum 派生）
export type ApiKeyStatusValue = `${ApiKeyStatus}`;

export interface ApiKey {
  id: string;
  userId: string;
  user?: User;
  name: string;
  key: string; // 哈希后的密钥
  prefix: string; // 密钥前缀 (如 cp_live_)
  status: ApiKeyStatus;
  scopes: string[]; // 权限范围 ['devices:read', 'devices:write']
  expiresAt?: string;
  lastUsedAt?: string;
  usageCount: number;
  lastUsedIp?: string;
  description?: string;
  metadata?: JsonObject;
  revokedAt?: string; // 撤销时间
  revokedBy?: string; // 撤销者 ID
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyDto {
  userId: string;
  name: string;
  scopes: string[];
  description?: string;
  expiresAt?: string;
  metadata?: JsonObject;
}

export interface UpdateApiKeyDto {
  name?: string;
  scopes?: string[];
  description?: string;
  expiresAt?: string;
}

export interface ApiKeyStatistics {
  total: number;
  active: number;
  revoked: number;
  expired: number;
  totalUsage: number;
  byStatus: {
    active: number;
    revoked: number;
    expired: number;
  };
  recentUsage: {
    hour: number;
    day: number;
    week: number;
  };
  topKeys: Array<{
    id: string;
    name: string;
    usageCount: number;
  }>;
}

// ==================== 配额管理类型 ====================

/**
 * 配额状态值类型（从 Enum 派生）
 * - active: 正常激活
 * - exceeded: 已超限（触发限流）
 * - suspended: 已暂停（管理员操作）
 * - expired: 已过期
 */
export type QuotaStatusValue = `${QuotaStatus}`;

/**
 * 配额类型值类型（从 Enum 派生）
 * 用于精细化控制不同资源的使用
 */
export type QuotaTypeValue = `${QuotaType}`;

/**
 * 配额限制
 * 定义用户可使用的资源上限
 */
export interface QuotaLimits {
  // === 设备限制 ===
  /** 最大设备总数 */
  maxDevices: number;
  /** 最大并发运行设备数 */
  maxConcurrentDevices: number;

  // === 单设备资源限制 ===
  /** 单个设备最大 CPU 核数 */
  maxCpuCoresPerDevice: number;
  /** 单个设备最大内存（MB） */
  maxMemoryMBPerDevice: number;
  /** 单个设备最大存储（GB） */
  maxStorageGBPerDevice: number;

  // === 总资源限制 ===
  /** 总 CPU 核数上限 */
  totalCpuCores: number;
  /** 总内存上限（GB） */
  totalMemoryGB: number;
  /** 总存储上限（GB） */
  totalStorageGB: number;

  // === 带宽限制 ===
  /** 最大带宽速率（Mbps） */
  maxBandwidthMbps: number;
  /** 每月流量限制（GB） */
  monthlyTrafficGB: number;

  // === 时长限制 ===
  /** 每日使用时长上限（小时） */
  maxUsageHoursPerDay: number;
  /** 每月使用时长上限（小时） */
  maxUsageHoursPerMonth: number;
}

/**
 * 配额使用量
 * 记录用户当前的资源使用情况
 */
export interface QuotaUsage {
  // === 设备使用量 ===
  /** 当前设备总数 */
  currentDevices: number;
  /** 当前并发运行设备数 */
  currentConcurrentDevices: number;

  // === 资源使用量 ===
  /** 已使用 CPU 核数 */
  usedCpuCores: number;
  /** 已使用内存（GB） */
  usedMemoryGB: number;
  /** 已使用存储（GB） */
  usedStorageGB: number;

  // === 带宽使用量 ===
  /** 当前带宽使用（Mbps） */
  currentBandwidthMbps: number;
  /** 本月已用流量（GB） */
  monthlyTrafficUsedGB: number;

  // === 时长使用量 ===
  /** 今日已用时长（小时） */
  todayUsageHours: number;
  /** 本月已用时长（小时） */
  monthlyUsageHours: number;

  /** 最后更新时间 */
  lastUpdatedAt: string;
}

/**
 * 配额
 * 核心计费和限流实体，控制用户资源使用权限
 */
export interface Quota extends BaseEntity {
  /** 所属用户 ID */
  userId: string;
  /** 所属用户信息（关联查询） */
  user?: User;
  /** 关联套餐 ID */
  planId?: string;
  /** 套餐名称（快照，避免套餐删除后数据丢失） */
  planName?: string;
  /** 配额状态 */
  status: QuotaStatus;
  /** 资源限制配置 */
  limits: QuotaLimits;
  /** 当前使用量 */
  usage: QuotaUsage;
  /** 生效开始时间 */
  validFrom?: string;
  /** 生效结束时间 */
  validUntil?: string;
  /** 是否自动续费 */
  autoRenew: boolean;
  /** 扩展元数据（存储额外配置，类型安全的 JSON） */
  metadata?: JsonObject;
}

export interface CreateQuotaDto {
  userId: string;
  planId?: string;
  planName?: string;
  limits: QuotaLimits;
  validFrom?: string;
  validUntil?: string;
  autoRenew?: boolean;
}

export interface UpdateQuotaDto {
  planId?: string;
  planName?: string;
  limits?: Partial<QuotaLimits>;
  validFrom?: string;
  validUntil?: string;
  autoRenew?: boolean;
  status?: QuotaStatus;
}

export interface CheckQuotaRequest {
  userId: string;
  quotaType: QuotaType;
  requestedAmount: number;
}

export interface DeductQuotaRequest {
  userId: string;
  deviceCount?: number;
  cpuCores?: number;
  memoryGB?: number;
  storageGB?: number;
  bandwidthMbps?: number;
  trafficGB?: number;
  usageHours?: number;
}

export interface RestoreQuotaRequest {
  userId: string;
  deviceCount?: number;
  cpuCores?: number;
  memoryGB?: number;
  storageGB?: number;
  bandwidthMbps?: number;
  trafficGB?: number;
  usageHours?: number;
}

export interface QuotaStatistics {
  userId: string;
  quota: Quota;
  currentUsage?: {
    devices: number;
    cpuCores: number;
    memoryGB: number;
    storageGB: number;
    bandwidth?: number;
    monthlyTrafficGB?: number;
  };
  usagePercentages: {
    devices: number;
    cpu: number;
    memory: number;
    storage: number;
    bandwidth: number;
    monthlyTraffic: number;
    dailyUsageHours: number;
    monthlyUsageHours: number;
  };
  trends: {
    deviceUsageTrend: 'increasing' | 'stable' | 'decreasing';
    resourceUsageTrend: 'increasing' | 'stable' | 'decreasing';
  };
  predictions: {
    daysUntilDeviceLimit?: number;
    daysUntilResourceLimit?: number;
  };
  dailyUsage?: Array<{
    date: string;
    devices: number;
    cpuCores: number;
    memoryGB: number;
    storageGB: number;
  }>;
}

export interface QuotaAlert {
  id: string;
  userId: string;
  user?: User;
  quotaType: QuotaType;
  usagePercent: number;
  current: number;
  limit: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
  createdAt: string;
}
