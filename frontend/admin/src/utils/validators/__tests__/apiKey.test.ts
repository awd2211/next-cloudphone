/**
 * API Key 验证工具单元测试
 * 测试 API Key 相关的验证函数
 */

import { describe, it, expect } from 'vitest';
import {
  validateScope,
  isDateInFuture,
  validateCreateApiKeyDto,
  getScopeSuggestions,
} from '../apiKey';
import type { CreateApiKeyDto } from '@/types';

describe('API Key Validators', () => {
  describe('validateScope', () => {
    describe('✅ 有效的 scope 格式', () => {
      it('应该接受单数形式: device:read', () => {
        expect(validateScope('device:read')).toBe(true);
      });

      it('应该接受复数形式: devices:read', () => {
        expect(validateScope('devices:read')).toBe(true);
      });

      it('应该接受 write 操作', () => {
        expect(validateScope('device:write')).toBe(true);
        expect(validateScope('devices:write')).toBe(true);
      });

      it('应该接受 delete 操作', () => {
        expect(validateScope('device:delete')).toBe(true);
        expect(validateScope('devices:delete')).toBe(true);
      });

      it('应该接受其他资源类型', () => {
        expect(validateScope('user:read')).toBe(true);
        expect(validateScope('users:read')).toBe(true);
        expect(validateScope('billing:read')).toBe(true);
        expect(validateScope('app:write')).toBe(true);
        expect(validateScope('apps:write')).toBe(true);
      });
    });

    describe('❌ 无效的 scope 格式', () => {
      it('应该拒绝大写字母', () => {
        expect(validateScope('Device:Read')).toBe(false);
        expect(validateScope('DEVICE:READ')).toBe(false);
        expect(validateScope('device:Write')).toBe(false);
      });

      it('应该拒绝错误的分隔符', () => {
        expect(validateScope('device-read')).toBe(false);
        expect(validateScope('device_read')).toBe(false);
        expect(validateScope('device.read')).toBe(false);
        expect(validateScope('device read')).toBe(false);
      });

      it('应该拒绝空字符串', () => {
        expect(validateScope('')).toBe(false);
      });

      it('应该拒绝缺少操作部分', () => {
        expect(validateScope('device:')).toBe(false);
        expect(validateScope('device')).toBe(false);
      });

      it('应该拒绝缺少资源部分', () => {
        expect(validateScope(':read')).toBe(false);
      });

      it('应该拒绝包含数字', () => {
        expect(validateScope('device123:read')).toBe(false);
        expect(validateScope('device:read123')).toBe(false);
      });

      it('应该拒绝包含特殊字符', () => {
        expect(validateScope('device@:read')).toBe(false);
        expect(validateScope('device:read!')).toBe(false);
      });

      it('应该拒绝多个冒号', () => {
        expect(validateScope('device:action:read')).toBe(false);
      });
    });
  });

  describe('isDateInFuture', () => {
    describe('✅ 未来日期', () => {
      it('应该识别明天的日期', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        expect(isDateInFuture(tomorrow)).toBe(true);
      });

      it('应该识别下个月的日期', () => {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        expect(isDateInFuture(nextMonth)).toBe(true);
      });

      it('应该识别明年的日期', () => {
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        expect(isDateInFuture(nextYear)).toBe(true);
      });

      it('应该接受字符串格式的未来日期', () => {
        const future = new Date();
        future.setDate(future.getDate() + 1);
        expect(isDateInFuture(future.toISOString())).toBe(true);
      });

      it('应该接受 Date 对象的未来日期', () => {
        const future = new Date(Date.now() + 86400000); // +1 day
        expect(isDateInFuture(future)).toBe(true);
      });
    });

    describe('❌ 过去或当前日期', () => {
      it('应该拒绝昨天的日期', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        expect(isDateInFuture(yesterday)).toBe(false);
      });

      it('应该拒绝上个月的日期', () => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        expect(isDateInFuture(lastMonth)).toBe(false);
      });

      it('应该拒绝去年的日期', () => {
        const lastYear = new Date();
        lastYear.setFullYear(lastYear.getFullYear() - 1);
        expect(isDateInFuture(lastYear)).toBe(false);
      });

      it('应该拒绝字符串格式的过去日期', () => {
        expect(isDateInFuture('2020-01-01')).toBe(false);
      });

      it('应该拒绝 Date 对象的过去日期', () => {
        const past = new Date(Date.now() - 86400000); // -1 day
        expect(isDateInFuture(past)).toBe(false);
      });

      // Note: 当前时刻的测试可能不稳定，因为时间在流逝
      // 这里我们只测试明确的过去和未来
    });
  });

  describe('validateCreateApiKeyDto', () => {
    describe('✅ 有效的 DTO', () => {
      it('应该通过所有有效字段的验证', () => {
        const dto: CreateApiKeyDto = {
          userId: 'user-123',
          name: 'Test Key',
          scopes: ['device:read', 'device:write'],
          description: 'Test description',
        };
        const errors = validateCreateApiKeyDto(dto);
        expect(errors).toEqual([]);
      });

      it('应该接受复数形式的 scopes', () => {
        const dto: CreateApiKeyDto = {
          userId: 'user-123',
          name: 'Test Key',
          scopes: ['devices:read', 'users:write', 'apps:delete'],
        };
        const errors = validateCreateApiKeyDto(dto);
        expect(errors).toEqual([]);
      });

      it('应该接受未来的过期时间', () => {
        const future = new Date();
        future.setDate(future.getDate() + 30);

        const dto: CreateApiKeyDto = {
          userId: 'user-123',
          name: 'Test Key',
          scopes: ['device:read'],
          expiresAt: future.toISOString(),
        };
        const errors = validateCreateApiKeyDto(dto);
        expect(errors).toEqual([]);
      });

      it('应该接受不含 expiresAt 的 DTO', () => {
        const dto: CreateApiKeyDto = {
          userId: 'user-123',
          name: 'Test Key',
          scopes: ['device:read'],
        };
        const errors = validateCreateApiKeyDto(dto);
        expect(errors).toEqual([]);
      });
    });

    describe('❌ 无效的 DTO', () => {
      it('应该检测无效的 scope 格式', () => {
        const dto: CreateApiKeyDto = {
          userId: 'user-123',
          name: 'Test Key',
          scopes: ['Device:Read', 'device-write'],
        };
        const errors = validateCreateApiKeyDto(dto);
        expect(errors).toHaveLength(2);
        expect(errors[0]).toContain('scopes[0]');
        expect(errors[1]).toContain('scopes[1]');
      });

      it('应该检测混合的有效和无效 scopes', () => {
        const dto: CreateApiKeyDto = {
          userId: 'user-123',
          name: 'Test Key',
          scopes: ['device:read', 'Invalid:Scope', 'user:write'],
        };
        const errors = validateCreateApiKeyDto(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('scopes[1]');
        expect(errors[0]).toContain('格式必须为 "resource:action" (小写字母)');
      });

      it('应该检测过去的过期时间', () => {
        const past = new Date();
        past.setDate(past.getDate() - 1);

        const dto: CreateApiKeyDto = {
          userId: 'user-123',
          name: 'Test Key',
          scopes: ['device:read'],
          expiresAt: past.toISOString(),
        };
        const errors = validateCreateApiKeyDto(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('expiresAt');
        expect(errors[0]).toContain('过期时间必须是未来日期');
      });

      it('应该同时检测多个错误', () => {
        const past = new Date();
        past.setDate(past.getDate() - 1);

        const dto: CreateApiKeyDto = {
          userId: 'user-123',
          name: 'Test Key',
          scopes: ['Invalid:Scope', 'device-read'],
          expiresAt: past.toISOString(),
        };
        const errors = validateCreateApiKeyDto(dto);
        expect(errors.length).toBeGreaterThanOrEqual(3); // 2 scope errors + 1 date error
      });
    });

    describe('🔄 边界情况', () => {
      it('应该处理空的 scopes 数组', () => {
        const dto: CreateApiKeyDto = {
          userId: 'user-123',
          name: 'Test Key',
          scopes: [],
        };
        const errors = validateCreateApiKeyDto(dto);
        expect(errors).toEqual([]); // 空数组本身不是验证错误，required 验证在表单层
      });

      it('应该处理 undefined scopes', () => {
        const dto = {
          userId: 'user-123',
          name: 'Test Key',
        } as CreateApiKeyDto;
        const errors = validateCreateApiKeyDto(dto);
        expect(errors).toEqual([]);
      });

      it('应该处理 undefined expiresAt', () => {
        const dto: CreateApiKeyDto = {
          userId: 'user-123',
          name: 'Test Key',
          scopes: ['device:read'],
          expiresAt: undefined,
        };
        const errors = validateCreateApiKeyDto(dto);
        expect(errors).toEqual([]);
      });
    });
  });

  describe('getScopeSuggestions', () => {
    it('应该返回建议的 scope 列表', () => {
      const suggestions = getScopeSuggestions();
      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('应该包含常用的 scope', () => {
      const suggestions = getScopeSuggestions();
      expect(suggestions).toContain('device:read');
      expect(suggestions).toContain('device:write');
      expect(suggestions).toContain('user:read');
    });

    it('返回的所有 scope 应该通过格式验证', () => {
      const suggestions = getScopeSuggestions();
      suggestions.forEach((scope) => {
        expect(validateScope(scope)).toBe(true);
      });
    });
  });
});
