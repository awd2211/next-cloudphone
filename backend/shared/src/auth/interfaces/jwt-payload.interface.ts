/**
 * JWT Payload 接口
 *
 * 定义 JWT Token 中包含的用户信息标准格式
 * 所有微服务共享此接口,确保 Token 格式一致性
 */
export interface JwtPayload {
  /** 用户唯一标识符 (UUID) */
  sub: string;

  /** 用户名 */
  username: string;

  /** 电子邮箱 */
  email: string;

  /** 租户ID (多租户场景) */
  tenantId?: string;

  /** 角色列表 */
  roles?: string[];

  /** 权限列表 (扁平化) */
  permissions?: string[];

  /** 是否为超级管理员 */
  isSuperAdmin?: boolean;

  /** Token 签发时间 */
  iat?: number;

  /** Token 过期时间 */
  exp?: number;

  /** Token 受众 */
  aud?: string;

  /** Token 签发者 */
  iss?: string;
}

/**
 * 验证后的用户对象
 *
 * JwtStrategy.validate() 方法返回的用户信息
 * 会被设置到 request.user
 */
export interface ValidatedUser {
  /** 用户ID */
  id: string;

  /** 用户名 */
  username: string;

  /** 电子邮箱 */
  email: string;

  /** 租户ID */
  tenantId?: string;

  /** 角色列表 */
  roles: string[];

  /** 权限列表 */
  permissions: string[];

  /** 是否为超级管理员 */
  isSuperAdmin: boolean;
}
