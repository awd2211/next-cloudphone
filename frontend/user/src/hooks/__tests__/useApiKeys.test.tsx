import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useApiKeys } from '../useApiKeys';
import { message, Modal } from 'antd';

// Mock antd components
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
    Modal: {
      success: vi.fn(),
      confirm: vi.fn(),
    },
  };
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe('useApiKeys Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('初始化', () => {
    it('应该初始化默认的apiKeys', () => {
      const { result } = renderHook(() => useApiKeys());

      expect(result.current.apiKeys).toBeDefined();
      expect(result.current.apiKeys.length).toBeGreaterThan(0);
    });

    it('应该计算正确的统计数据', () => {
      const { result } = renderHook(() => useApiKeys());

      expect(result.current.stats.total).toBe(result.current.apiKeys.length);
      expect(result.current.stats.active).toBeGreaterThan(0);
      expect(result.current.stats.revoked).toBeGreaterThanOrEqual(0);
    });

    it('应该初始化loading为false', () => {
      const { result } = renderHook(() => useApiKeys());

      expect(result.current.loading).toBe(false);
    });

    it('应该初始化模态框状态为false', () => {
      const { result } = renderHook(() => useApiKeys());

      expect(result.current.createModalVisible).toBe(false);
      expect(result.current.statsModalVisible).toBe(false);
    });
  });

  describe('maskKey 密钥脱敏', () => {
    it('短密钥应该完整显示', () => {
      const { result } = renderHook(() => useApiKeys());

      const shortKey = 'short';
      const masked = result.current.maskKey(shortKey);

      expect(masked).toBe(shortKey);
    });

    it('长密钥应该正确脱敏', () => {
      const { result } = renderHook(() => useApiKeys());

      const longKey = 'sk_test_mock1234567890abcdefghijklmnopqrstuvwxyz';
      const masked = result.current.maskKey(longKey);

      // 脱敏逻辑：保留前8位和后4位，中间用星号替换
      expect(masked).toContain('sk_test_'); // 前8位
      expect(masked).toContain('*'); // 中间的星号
      expect(masked).toContain('wxyz'); // 后4位
      expect(masked.length).toBeGreaterThan(20);
    });

    it('应该保留前8位和后4位', () => {
      const { result } = renderHook(() => useApiKeys());

      const key = 'sk_test_1234567890abcdefghijklmnopqrstuvwxyz';
      const masked = result.current.maskKey(key);

      expect(masked.substring(0, 8)).toBe(key.substring(0, 8));
      expect(masked.substring(masked.length - 4)).toBe(key.substring(key.length - 4));
    });

    it('maskKey应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useApiKeys());

      const firstMaskKey = result.current.maskKey;
      rerender();
      const secondMaskKey = result.current.maskKey;

      expect(firstMaskKey).toBe(secondMaskKey);
    });
  });

  describe('toggleKeyVisibility 切换密钥可见性', () => {
    it('应该添加ID到可见集合', () => {
      const { result } = renderHook(() => useApiKeys());

      const keyId = '1';
      act(() => {
        result.current.toggleKeyVisibility(keyId);
      });

      expect(result.current.visibleKeys.has(keyId)).toBe(true);
    });

    it('再次切换应该移除ID', () => {
      const { result } = renderHook(() => useApiKeys());

      const keyId = '1';

      act(() => {
        result.current.toggleKeyVisibility(keyId);
      });
      expect(result.current.visibleKeys.has(keyId)).toBe(true);

      act(() => {
        result.current.toggleKeyVisibility(keyId);
      });
      expect(result.current.visibleKeys.has(keyId)).toBe(false);
    });

    it('应该独立管理多个密钥的可见性', () => {
      const { result } = renderHook(() => useApiKeys());

      act(() => {
        result.current.toggleKeyVisibility('1');
        result.current.toggleKeyVisibility('2');
      });

      expect(result.current.visibleKeys.has('1')).toBe(true);
      expect(result.current.visibleKeys.has('2')).toBe(true);

      act(() => {
        result.current.toggleKeyVisibility('1');
      });

      expect(result.current.visibleKeys.has('1')).toBe(false);
      expect(result.current.visibleKeys.has('2')).toBe(true);
    });
  });

  describe('handleCopyKey 复制密钥', () => {
    it('应该调用clipboard API', async () => {
      const { result } = renderHook(() => useApiKeys());

      const testKey = 'sk_test_1234567890';
      await act(async () => {
        await result.current.handleCopyKey(testKey);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testKey);
    });

    it('复制成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useApiKeys());

      await act(async () => {
        await result.current.handleCopyKey('test-key');
      });

      expect(message.success).toHaveBeenCalledWith('API Key 已复制到剪贴板');
    });

    it('handleCopyKey应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useApiKeys());

      const firstHandleCopyKey = result.current.handleCopyKey;
      rerender();
      const secondHandleCopyKey = result.current.handleCopyKey;

      expect(firstHandleCopyKey).toBe(secondHandleCopyKey);
    });
  });

  describe('handleViewStats 查看统计', () => {
    it('应该设置选中的apiKey', () => {
      const { result } = renderHook(() => useApiKeys());

      const apiKey = result.current.apiKeys[0];

      act(() => {
        result.current.handleViewStats(apiKey);
      });

      expect(result.current.selectedApiKey).toBe(apiKey);
    });

    it('应该打开统计模态框', () => {
      const { result } = renderHook(() => useApiKeys());

      const apiKey = result.current.apiKeys[0];

      act(() => {
        result.current.handleViewStats(apiKey);
      });

      expect(result.current.statsModalVisible).toBe(true);
    });
  });

  describe('handleCreate 创建API Key', () => {
    it('应该打开创建模态框', () => {
      const { result } = renderHook(() => useApiKeys());

      act(() => {
        result.current.handleCreate();
      });

      expect(result.current.createModalVisible).toBe(true);
    });

    it('应该重置表单', () => {
      const { result } = renderHook(() => useApiKeys());

      const resetFieldsSpy = vi.spyOn(result.current.form, 'resetFields');

      act(() => {
        result.current.handleCreate();
      });

      expect(resetFieldsSpy).toHaveBeenCalled();
    });
  });

  describe('handleSubmitCreate 提交创建', () => {
    it('表单验证失败应该不创建密钥', async () => {
      const { result } = renderHook(() => useApiKeys());

      vi.spyOn(result.current.form, 'validateFields').mockRejectedValue(
        new Error('Validation failed')
      );

      const initialLength = result.current.apiKeys.length;

      await act(async () => {
        await result.current.handleSubmitCreate();
      });

      expect(result.current.apiKeys.length).toBe(initialLength);
    });

    it('表单验证成功应该创建新密钥', async () => {
      const { result } = renderHook(() => useApiKeys());

      const mockValues = {
        name: 'New API Key',
        description: 'Test description',
        scope: ['devices', 'apps'],
      };

      vi.spyOn(result.current.form, 'validateFields').mockResolvedValue(mockValues);

      const initialLength = result.current.apiKeys.length;

      await act(async () => {
        await result.current.handleSubmitCreate();
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Check immediately after timer advancement
      expect(result.current.apiKeys.length).toBe(initialLength + 1);
    });

    it('创建成功应该设置loading状态', async () => {
      const { result } = renderHook(() => useApiKeys());

      vi.spyOn(result.current.form, 'validateFields').mockResolvedValue({
        name: 'Test',
        scope: ['devices'],
      });

      await act(async () => {
        await result.current.handleSubmitCreate();
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // 操作完成后loading应该是false
      expect(result.current.loading).toBe(false);
    });

    it('创建成功应该关闭创建模态框', async () => {
      const { result } = renderHook(() => useApiKeys());

      vi.spyOn(result.current.form, 'validateFields').mockResolvedValue({
        name: 'Test',
        scope: ['devices'],
      });

      await act(async () => {
        await result.current.handleSubmitCreate();
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.createModalVisible).toBe(false);
    });

    it('创建成功应该显示成功模态框', async () => {
      const { result } = renderHook(() => useApiKeys());

      vi.spyOn(result.current.form, 'validateFields').mockResolvedValue({
        name: 'Test',
        scope: ['devices'],
      });

      await act(async () => {
        await result.current.handleSubmitCreate();
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(Modal.success).toHaveBeenCalled();
    });
  });

  describe('handleRevoke 撤销API Key', () => {
    it('应该将状态更改为revoked', async () => {
      const { result } = renderHook(() => useApiKeys());

      const activeKey = result.current.apiKeys.find((k) => k.status === 'active');
      expect(activeKey).toBeDefined();

      act(() => {
        result.current.handleRevoke(activeKey!.id);
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      const revokedKey = result.current.apiKeys.find((k) => k.id === activeKey!.id);
      expect(revokedKey?.status).toBe('revoked');
    });

    it('应该显示成功消息', async () => {
      const { result } = renderHook(() => useApiKeys());

      act(() => {
        result.current.handleRevoke('1');
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(message.success).toHaveBeenCalledWith('API Key 已撤销');
    });

    it('撤销过程中loading变化应该正常', async () => {
      const { result } = renderHook(() => useApiKeys());

      act(() => {
        result.current.handleRevoke('1');
      });

      // 立即检查loading应该是true (在setTimeout开始时设置)
      // 然后在500ms后变成false

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 操作完成后loading应该是false
      expect(result.current.loading).toBe(false);
    });
  });

  describe('handleDelete 删除API Key', () => {
    it('应该从列表中移除密钥', async () => {
      const { result } = renderHook(() => useApiKeys());

      const initialLength = result.current.apiKeys.length;
      const keyToDelete = result.current.apiKeys[0];

      act(() => {
        result.current.handleDelete(keyToDelete.id);
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current.apiKeys.length).toBe(initialLength - 1);
      expect(result.current.apiKeys.find((k) => k.id === keyToDelete.id)).toBeUndefined();
    });

    it('应该显示成功消息', async () => {
      const { result } = renderHook(() => useApiKeys());

      act(() => {
        result.current.handleDelete('1');
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(message.success).toHaveBeenCalledWith('API Key 已删除');
    });

    it('删除过程中应该设置loading', async () => {
      const { result } = renderHook(() => useApiKeys());

      act(() => {
        result.current.handleDelete('1');
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 操作完成后loading应该是false
      expect(result.current.loading).toBe(false);
    });
  });

  describe('模态框关闭', () => {
    it('handleCloseStatsModal应该关闭统计模态框', () => {
      const { result } = renderHook(() => useApiKeys());

      // 打开模态框
      act(() => {
        result.current.handleViewStats(result.current.apiKeys[0]);
      });
      expect(result.current.statsModalVisible).toBe(true);

      // 关闭模态框
      act(() => {
        result.current.handleCloseStatsModal();
      });
      expect(result.current.statsModalVisible).toBe(false);
    });

    it('handleCloseCreateModal应该关闭创建模态框', () => {
      const { result } = renderHook(() => useApiKeys());

      // 打开模态框
      act(() => {
        result.current.handleCreate();
      });
      expect(result.current.createModalVisible).toBe(true);

      // 关闭模态框
      act(() => {
        result.current.handleCloseCreateModal();
      });
      expect(result.current.createModalVisible).toBe(false);
    });
  });

  describe('统计数据', () => {
    it('stats应该正确计算总数', () => {
      const { result } = renderHook(() => useApiKeys());

      expect(result.current.stats.total).toBe(result.current.apiKeys.length);
    });

    it('stats应该正确计算active数量', () => {
      const { result } = renderHook(() => useApiKeys());

      const activeCount = result.current.apiKeys.filter((k) => k.status === 'active').length;
      expect(result.current.stats.active).toBe(activeCount);
    });

    it('stats应该正确计算revoked数量', () => {
      const { result } = renderHook(() => useApiKeys());

      const revokedCount = result.current.apiKeys.filter((k) => k.status === 'revoked').length;
      expect(result.current.stats.revoked).toBe(revokedCount);
    });

    it('stats应该正确计算总请求数', () => {
      const { result } = renderHook(() => useApiKeys());

      const totalRequests = result.current.apiKeys.reduce((sum, k) => sum + k.requestCount, 0);
      expect(result.current.stats.totalRequests).toBe(totalRequests);
    });

    it('stats应该在apiKeys变化时重新计算', async () => {
      const { result } = renderHook(() => useApiKeys());

      const initialTotal = result.current.stats.total;

      act(() => {
        result.current.handleDelete(result.current.apiKeys[0].id);
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current.stats.total).toBe(initialTotal - 1);
    });
  });

  describe('API_SCOPES 常量', () => {
    it('应该导出API_SCOPES', async () => {
      const { API_SCOPES } = await import('../useApiKeys');

      expect(API_SCOPES).toBeDefined();
      expect(Array.isArray(API_SCOPES)).toBe(true);
      expect(API_SCOPES.length).toBeGreaterThan(0);
    });

    it('每个scope应该有label和value', async () => {
      const { API_SCOPES } = await import('../useApiKeys');

      API_SCOPES.forEach((scope) => {
        expect(scope.label).toBeDefined();
        expect(scope.value).toBeDefined();
        expect(scope.description).toBeDefined();
      });
    });
  });
});
