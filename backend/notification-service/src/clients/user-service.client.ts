import { Injectable, Logger } from '@nestjs/common';
import { HttpClientService } from '@cloudphone/shared';
import { ConsulService } from '@cloudphone/shared';

/**
 * User 接口定义
 */
export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  phone?: string;
  status: string;
  roles?: Role[];
  isSuperAdmin?: boolean;
}

/**
 * Role 接口定义
 */
export interface Role {
  id: string;
  name: string;
  displayName?: string;
}

/**
 * 用户列表响应
 */
export interface UsersResponse {
  success: boolean;
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
  hasMore?: boolean;
}

/**
 * 角色列表响应
 */
export interface RolesResponse {
  success: boolean;
  data: Role[];
  total: number;
  page: number;
  limit: number;
}

/**
 * UserServiceClient
 *
 * 用于与 user-service 通信的客户端
 * 提供获取用户和角色信息的方法
 */
@Injectable()
export class UserServiceClient {
  private readonly logger = new Logger(UserServiceClient.name);
  private readonly serviceName = 'user-service';

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly consulService: ConsulService,
  ) {}

  /**
   * 获取 user-service 的基础 URL
   */
  private async getUserServiceUrl(): Promise<string> {
    try {
      // 从 Consul 获取 user-service 地址 (返回完整的 URL)
      const serviceUrl = await this.consulService.getService(this.serviceName);
      this.logger.debug(`Resolved user-service URL from Consul: ${serviceUrl}`);
      return serviceUrl;
    } catch (error) {
      this.logger.warn(`Failed to resolve user-service from Consul: ${error.message}`);

      // Fallback: 使用环境变量或默认地址
      const fallbackUrl = process.env.USER_SERVICE_URL || 'http://localhost:30001';
      this.logger.debug(`Using fallback user-service URL: ${fallbackUrl}`);
      return fallbackUrl;
    }
  }

  /**
   * 获取所有角色列表
   *
   * @param page 页码
   * @param limit 每页数量
   * @returns 角色列表
   */
  async getRoles(page: number = 1, limit: number = 100): Promise<RolesResponse> {
    try {
      const baseUrl = await this.getUserServiceUrl();
      const url = `${baseUrl}/users/roles?page=${page}&limit=${limit}`;

      this.logger.debug(`Fetching roles from: ${url}`);

      const response = await this.httpClient.get<RolesResponse>(
        url,
        {},
        { timeout: 5000, retries: 2 },
      );

      return response;
    } catch (error) {
      this.logger.error(`Failed to fetch roles: ${error.message}`);
      throw error;
    }
  }

  /**
   * 根据角色名称查找角色
   *
   * @param roleName 角色名称 (例如: 'admin', 'super_admin')
   * @returns 角色对象或 undefined
   */
  async findRoleByName(roleName: string): Promise<Role | undefined> {
    try {
      const rolesResponse = await this.getRoles(1, 100);

      if (!rolesResponse.success || !rolesResponse.data) {
        this.logger.warn('Failed to get roles or empty roles data');
        return undefined;
      }

      // 查找匹配的角色（不区分大小写）
      const role = rolesResponse.data.find(
        (r) => r.name.toLowerCase() === roleName.toLowerCase(),
      );

      if (role) {
        this.logger.debug(`Found role: ${role.name} (${role.id})`);
      } else {
        this.logger.warn(`Role not found: ${roleName}`);
      }

      return role;
    } catch (error) {
      this.logger.error(`Failed to find role by name: ${error.message}`);
      throw error;
    }
  }

  /**
   * 根据角色 ID 获取用户列表
   *
   * @param roleId 角色 ID
   * @param page 页码
   * @param limit 每页数量
   * @returns 用户列表
   */
  async getUsersByRole(roleId: string, page: number = 1, limit: number = 100): Promise<UsersResponse> {
    try {
      const baseUrl = await this.getUserServiceUrl();
      const url = `${baseUrl}/users/filter?roleId=${roleId}&page=${page}&limit=${limit}&includeRoles=true`;

      this.logger.debug(`Fetching users by role from: ${url}`);

      const response = await this.httpClient.get<UsersResponse>(
        url,
        {},
        { timeout: 5000, retries: 2 },
      );

      return response;
    } catch (error) {
      this.logger.error(`Failed to fetch users by role: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取管理员用户列表
   *
   * 查找具有 'admin' 或 'super_admin' 角色的用户
   *
   * @returns 管理员用户 ID 列表
   */
  async getAdminUsers(): Promise<string[]> {
    try {
      this.logger.debug('Fetching admin users...');

      const adminUserIds: string[] = [];

      // 1. 查找 admin 角色
      const adminRole = await this.findRoleByName('admin');
      if (adminRole) {
        const adminUsers = await this.getUsersByRole(adminRole.id, 1, 100);
        if (adminUsers.success && adminUsers.data) {
          const ids = adminUsers.data
            .filter((user) => user.status === 'active') // 只返回激活的用户
            .map((user) => user.id);
          adminUserIds.push(...ids);
          this.logger.debug(`Found ${ids.length} users with 'admin' role`);
        }
      }

      // 2. 查找 super_admin 角色
      const superAdminRole = await this.findRoleByName('super_admin');
      if (superAdminRole) {
        const superAdminUsers = await this.getUsersByRole(superAdminRole.id, 1, 100);
        if (superAdminUsers.success && superAdminUsers.data) {
          const ids = superAdminUsers.data
            .filter((user) => user.status === 'active') // 只返回激活的用户
            .map((user) => user.id);

          // 去重：避免同时有 admin 和 super_admin 角色的用户重复
          const uniqueIds = ids.filter((id) => !adminUserIds.includes(id));
          adminUserIds.push(...uniqueIds);
          this.logger.debug(`Found ${ids.length} users with 'super_admin' role (${uniqueIds.length} unique)`);
        }
      }

      // 3. 查找 isSuperAdmin 标记的用户（作为补充）
      const baseUrl = await this.getUserServiceUrl();
      const url = `${baseUrl}/users/filter?isSuperAdmin=true&page=1&limit=100`;

      try {
        const superAdmins = await this.httpClient.get<UsersResponse>(
          url,
          {},
          { timeout: 5000, retries: 1 },
        );

        if (superAdmins.success && superAdmins.data) {
          const ids = superAdmins.data
            .filter((user) => user.status === 'active')
            .map((user) => user.id);

          // 去重
          const uniqueIds = ids.filter((id) => !adminUserIds.includes(id));
          adminUserIds.push(...uniqueIds);
          this.logger.debug(`Found ${ids.length} users with isSuperAdmin=true (${uniqueIds.length} unique)`);
        }
      } catch (error) {
        // isSuperAdmin 过滤可能不支持，忽略错误
        this.logger.debug(`isSuperAdmin filter not supported or failed: ${error.message}`);
      }

      this.logger.log(`Total admin users found: ${adminUserIds.length}`);

      return adminUserIds;
    } catch (error) {
      this.logger.error(`Failed to get admin users: ${error.message}`, error.stack);

      // Fallback: 从环境变量读取
      const fallbackIds = process.env.ADMIN_USER_IDS || '';
      if (fallbackIds) {
        const ids = fallbackIds.split(',').map((id) => id.trim()).filter(Boolean);
        this.logger.warn(`Using fallback admin IDs from environment: ${ids.length} IDs`);
        return ids;
      }

      return [];
    }
  }

  /**
   * 获取用户详情
   *
   * @param userId 用户 ID
   * @returns 用户对象
   */
  async getUser(userId: string): Promise<User | null> {
    try {
      const baseUrl = await this.getUserServiceUrl();
      const url = `${baseUrl}/users/${userId}`;

      this.logger.debug(`Fetching user: ${url}`);

      const response = await this.httpClient.get<{ success: boolean; data: User }>(
        url,
        {},
        { timeout: 5000, retries: 2 },
      );

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to fetch user ${userId}: ${error.message}`);
      return null;
    }
  }
}
