/**
 * Role 验证工具单元测试
 * 测试角色相关的验证函数
 */

import { describe, it, expect } from 'vitest';
import {
  validateRoleName,
  getRoleNameError,
  validateCreateRoleData,
  validatePermissionIds,
  getRoleNameSuggestions,
} from '../role';

describe('Role Validators', () => {
  describe('validateRoleName', () => {
    describe('✅ 有效的角色名', () => {
      it('应该接受纯字母角色名', () => {
        expect(validateRoleName('admin')).toBe(true);
        expect(validateRoleName('user')).toBe(true);
        expect(validateRoleName('manager')).toBe(true);
      });

      it('应该接受混合大小写', () => {
        expect(validateRoleName('Admin')).toBe(true);
        expect(validateRoleName('AdminRole')).toBe(true);
        expect(validateRoleName('ADMIN')).toBe(true);
      });

      it('应该接受包含数字的角色名（非开头）', () => {
        expect(validateRoleName('admin123')).toBe(true);
        expect(validateRoleName('user2')).toBe(true);
        expect(validateRoleName('role1')).toBe(true);
      });

      it('应该接受包含下划线的角色名', () => {
        expect(validateRoleName('admin_role')).toBe(true);
        expect(validateRoleName('super_admin')).toBe(true);
        expect(validateRoleName('user_manager')).toBe(true);
      });

      it('应该接受包含连字符的角色名', () => {
        expect(validateRoleName('admin-role')).toBe(true);
        expect(validateRoleName('super-admin')).toBe(true);
        expect(validateRoleName('user-manager')).toBe(true);
      });

      it('应该接受混合使用字母、数字、下划线和连字符', () => {
        expect(validateRoleName('admin_role-2')).toBe(true);
        expect(validateRoleName('Super-Admin_123')).toBe(true);
        expect(validateRoleName('test_Role-v2')).toBe(true);
      });

      it('应该接受单个字母', () => {
        expect(validateRoleName('a')).toBe(true);
        expect(validateRoleName('A')).toBe(true);
      });

      it('应该接受最大长度（50字符）', () => {
        const maxLength = 'a'.repeat(50);
        expect(validateRoleName(maxLength)).toBe(true);
      });
    });

    describe('❌ 无效的角色名', () => {
      it('应该拒绝空字符串', () => {
        expect(validateRoleName('')).toBe(false);
      });

      it('应该拒绝数字开头', () => {
        expect(validateRoleName('123admin')).toBe(false);
        expect(validateRoleName('1_admin')).toBe(false);
        expect(validateRoleName('2-role')).toBe(false);
      });

      it('应该拒绝下划线开头', () => {
        expect(validateRoleName('_admin')).toBe(false);
        expect(validateRoleName('_role')).toBe(false);
      });

      it('应该拒绝连字符开头', () => {
        expect(validateRoleName('-admin')).toBe(false);
        expect(validateRoleName('-role')).toBe(false);
      });

      it('应该拒绝包含空格', () => {
        expect(validateRoleName('admin role')).toBe(false);
        expect(validateRoleName('super admin')).toBe(false);
        expect(validateRoleName(' admin')).toBe(false);
        expect(validateRoleName('admin ')).toBe(false);
      });

      it('应该拒绝包含特殊字符', () => {
        expect(validateRoleName('admin@role')).toBe(false);
        expect(validateRoleName('admin#role')).toBe(false);
        expect(validateRoleName('admin$role')).toBe(false);
        expect(validateRoleName('admin.role')).toBe(false);
        expect(validateRoleName('admin:role')).toBe(false);
      });

      it('应该拒绝超过50个字符', () => {
        const tooLong = 'a'.repeat(51);
        expect(validateRoleName(tooLong)).toBe(false);
      });
    });
  });

  describe('getRoleNameError', () => {
    describe('✅ 有效角色名返回 null', () => {
      it('应该对有效角色名返回 null', () => {
        expect(getRoleNameError('admin')).toBeNull();
        expect(getRoleNameError('admin_role')).toBeNull();
        expect(getRoleNameError('Admin-Role-123')).toBeNull();
      });
    });

    describe('❌ 无效角色名返回错误消息', () => {
      it('应该检测空角色名', () => {
        const error = getRoleNameError('');
        expect(error).toBe('角色名不能为空');
      });

      it('应该检测超长角色名', () => {
        const tooLong = 'a'.repeat(51);
        const error = getRoleNameError(tooLong);
        expect(error).toBe('角色名不能超过50个字符');
      });

      it('应该检测非字母开头', () => {
        expect(getRoleNameError('123admin')).toBe('角色名必须以字母开头');
        expect(getRoleNameError('_admin')).toBe('角色名必须以字母开头');
        expect(getRoleNameError('-admin')).toBe('角色名必须以字母开头');
      });

      it('应该检测非法字符', () => {
        expect(getRoleNameError('admin role')).toBe(
          '角色名只能包含字母、数字、下划线和连字符'
        );
        expect(getRoleNameError('admin@role')).toBe(
          '角色名只能包含字母、数字、下划线和连字符'
        );
      });
    });

    describe('🔄 错误优先级', () => {
      it('空字符串应该优先于其他错误', () => {
        const error = getRoleNameError('');
        expect(error).toBe('角色名不能为空');
      });

      it('超长应该优先于格式错误', () => {
        const tooLong = '@'.repeat(51);
        const error = getRoleNameError(tooLong);
        expect(error).toBe('角色名不能超过50个字符');
      });

      it('字母开头检查应该优先于字符检查', () => {
        const error = getRoleNameError('123@admin');
        expect(error).toBe('角色名必须以字母开头');
      });
    });
  });

  describe('validateCreateRoleData', () => {
    describe('✅ 有效的角色数据', () => {
      it('应该通过所有有效字段的验证', () => {
        const data = {
          name: 'admin',
          description: 'Administrator role',
          permissionIds: ['perm-1', 'perm-2'],
        };
        const errors = validateCreateRoleData(data);
        expect(errors).toEqual([]);
      });

      it('应该接受不含描述的数据', () => {
        const data = {
          name: 'admin',
          permissionIds: ['perm-1'],
        };
        const errors = validateCreateRoleData(data);
        expect(errors).toEqual([]);
      });

      it('应该接受空描述', () => {
        const data = {
          name: 'admin',
          description: '',
          permissionIds: ['perm-1'],
        };
        const errors = validateCreateRoleData(data);
        expect(errors).toEqual([]);
      });

      it('应该接受最大长度的描述（200字符）', () => {
        const data = {
          name: 'admin',
          description: '描述'.repeat(100), // 200个字符
          permissionIds: ['perm-1'],
        };
        const errors = validateCreateRoleData(data);
        expect(errors).toEqual([]);
      });
    });

    describe('❌ 无效的角色数据', () => {
      it('应该检测无效的角色名', () => {
        const data = {
          name: '123admin', // 数字开头
          description: 'Test role',
          permissionIds: ['perm-1'],
        };
        const errors = validateCreateRoleData(data);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((e) => e.includes('name'))).toBe(true);
      });

      it('应该检测空的 permissionIds', () => {
        const data = {
          name: 'admin',
          description: 'Test role',
          permissionIds: [],
        };
        const errors = validateCreateRoleData(data);
        expect(errors).toContain('permissionIds: 至少需要选择一个权限');
      });

      it('应该检测超长的描述', () => {
        const data = {
          name: 'admin',
          description: '描述'.repeat(101), // 202个字符
          permissionIds: ['perm-1'],
        };
        const errors = validateCreateRoleData(data);
        expect(errors).toContain('description: 描述不能超过200个字符');
      });

      it('应该同时检测多个错误', () => {
        const data = {
          name: '123invalid',
          description: '描述'.repeat(101),
          permissionIds: [],
        };
        const errors = validateCreateRoleData(data);
        expect(errors.length).toBeGreaterThanOrEqual(3);
        expect(errors.some((e) => e.includes('name'))).toBe(true);
        expect(errors.some((e) => e.includes('description'))).toBe(true);
        expect(errors.some((e) => e.includes('permissionIds'))).toBe(true);
      });
    });

    describe('🔄 边界情况', () => {
      it('应该处理 undefined description', () => {
        const data = {
          name: 'admin',
          permissionIds: ['perm-1'],
        };
        const errors = validateCreateRoleData(data);
        expect(errors).toEqual([]);
      });

      it('应该处理正好200字符的描述', () => {
        const description = 'a'.repeat(200);
        const data = {
          name: 'admin',
          description,
          permissionIds: ['perm-1'],
        };
        const errors = validateCreateRoleData(data);
        expect(errors).toEqual([]);
      });

      it('应该处理正好201字符的描述', () => {
        const description = 'a'.repeat(201);
        const data = {
          name: 'admin',
          description,
          permissionIds: ['perm-1'],
        };
        const errors = validateCreateRoleData(data);
        expect(errors).toContain('description: 描述不能超过200个字符');
      });
    });
  });

  describe('validatePermissionIds', () => {
    describe('✅ 有效的权限 ID 数组', () => {
      it('应该接受包含一个权限的数组', () => {
        expect(validatePermissionIds(['perm-1'])).toBe(true);
      });

      it('应该接受包含多个权限的数组', () => {
        expect(validatePermissionIds(['perm-1', 'perm-2', 'perm-3'])).toBe(true);
      });
    });

    describe('❌ 无效的权限 ID 数组', () => {
      it('应该拒绝空数组', () => {
        expect(validatePermissionIds([])).toBe(false);
      });

      it('应该拒绝非数组', () => {
        expect(validatePermissionIds(null as any)).toBe(false);
        expect(validatePermissionIds(undefined as any)).toBe(false);
        expect(validatePermissionIds('perm-1' as any)).toBe(false);
        expect(validatePermissionIds(123 as any)).toBe(false);
      });
    });
  });

  describe('getRoleNameSuggestions', () => {
    it('应该返回建议的角色名列表', () => {
      const suggestions = getRoleNameSuggestions();
      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('应该包含常用的角色名', () => {
      const suggestions = getRoleNameSuggestions();
      expect(suggestions).toContain('admin');
      expect(suggestions).toContain('user');
      expect(suggestions).toContain('manager');
    });

    it('返回的所有角色名应该通过格式验证', () => {
      const suggestions = getRoleNameSuggestions();
      suggestions.forEach((name) => {
        expect(validateRoleName(name)).toBe(true);
      });
    });

    it('返回的所有角色名应该无错误', () => {
      const suggestions = getRoleNameSuggestions();
      suggestions.forEach((name) => {
        expect(getRoleNameError(name)).toBeNull();
      });
    });
  });
});
