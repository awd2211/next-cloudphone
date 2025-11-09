import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface MenuItem {
  id: string;
  name: string;
  title: string;
  icon?: string;
  path: string;
  component?: string;
  orderNum: number;
  metadata?: Record<string, any>;
  children?: MenuItem[];
}

@Injectable()
export class MenusService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  /**
   * 获取用户的菜单树
   * 通过用户角色查询有权限访问的菜单，并构建树形结构
   */
  async getUserMenus(userId: string): Promise<MenuItem[]> {
    const query = `
      WITH user_menu_ids AS (
        -- 获取用户所有角色的菜单ID
        SELECT DISTINCT m.id
        FROM menus m
        JOIN menu_roles mr ON m.id = mr."menuId"
        JOIN user_roles ur ON mr."roleId" = ur.role_id
        WHERE ur.user_id = $1
          AND m.visible = true
          AND m."isActive" = true
      ),
      menu_tree AS (
        -- 获取完整的菜单树（包括父菜单）
        SELECT DISTINCT m.*
        FROM menus m
        WHERE m.id IN (SELECT id FROM user_menu_ids)
           OR m.id IN (
             SELECT DISTINCT "parentId"
             FROM menus
             WHERE id IN (SELECT id FROM user_menu_ids)
               AND "parentId" IS NOT NULL
           )
      )
      -- 构建一级菜单和子菜单的嵌套结构
      SELECT
        m.id,
        m.code as name,
        m.name as title,
        m.icon,
        m.path,
        m.metadata->>'component' as component,
        m.sort as "orderNum",
        m.metadata,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', child.id,
                'name', child.code,
                'title', child.name,
                'icon', child.icon,
                'path', child.path,
                'component', child.metadata->>'component',
                'orderNum', child.sort,
                'metadata', child.metadata,
                'permissionCode', child."permissionCode"
              )
              ORDER BY child.sort
            )
            FROM menu_tree child
            WHERE child."parentId" = m.id
          ),
          '[]'::json
        ) as children
      FROM menu_tree m
      WHERE m."parentId" IS NULL
      ORDER BY m.sort;
    `;

    const result = await this.dataSource.query(query, [userId]);

    return result.map((row: any) => ({
      id: row.id,
      name: row.name,
      title: row.title,
      icon: row.icon,
      path: row.path,
      component: row.component,
      orderNum: row.orderNum,
      metadata: row.metadata,
      children: row.children,
    }));
  }

  /**
   * 检查用户是否有访问某个菜单路径的权限
   */
  async canAccessMenu(userId: string, menuPath: string): Promise<boolean> {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM menus m
        JOIN menu_roles mr ON m.id = mr."menuId"
        JOIN user_roles ur ON mr."roleId" = ur.role_id
        WHERE ur.user_id = $1
          AND m.path = $2
          AND m.visible = true
          AND m."isActive" = true
      ) as has_access;
    `;

    const result = await this.dataSource.query(query, [userId, menuPath]);
    return result[0]?.has_access || false;
  }

  /**
   * 获取用户所有可访问的菜单路径列表（用于路由守卫）
   */
  async getUserMenuPaths(userId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT m.path
      FROM menus m
      JOIN menu_roles mr ON m.id = mr."menuId"
      JOIN user_roles ur ON mr."roleId" = ur.role_id
      WHERE ur.user_id = $1
        AND m.visible = true
        AND m."isActive" = true
      ORDER BY m.path;
    `;

    const result = await this.dataSource.query(query, [userId]);
    return result.map((row: any) => row.path);
  }

  /**
   * 获取用户所有可访问的权限代码列表
   */
  async getUserPermissionCodes(userId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT m."permissionCode"
      FROM menus m
      JOIN menu_roles mr ON m.id = mr."menuId"
      JOIN user_roles ur ON mr."roleId" = ur.role_id
      WHERE ur.user_id = $1
        AND m."permissionCode" IS NOT NULL
        AND m.visible = true
        AND m."isActive" = true;
    `;

    const result = await this.dataSource.query(query, [userId]);
    return result.map((row: any) => row.permissionCode).filter(Boolean);
  }
}
