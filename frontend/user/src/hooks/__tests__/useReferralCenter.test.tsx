import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReferralCenter } from '../useReferralCenter';
import * as referralService from '@/services/referral';
import { message } from 'antd';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock antd
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock referral service
vi.mock('@/services/referral', () => ({
  getReferralConfig: vi.fn(),
  getReferralStats: vi.fn(),
  generatePoster: vi.fn(),
  shareToSocial: vi.fn(),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

// Mock window.open
global.window.open = vi.fn();

describe('useReferralCenter Hook', () => {
  const mockConfig = {
    inviteCode: 'ABC123',
    inviteLink: 'https://example.com/invite/ABC123',
    commission: 0.1,
  };

  const mockStats = {
    totalInvited: 10,
    totalEarned: 1000,
    pendingEarned: 200,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(referralService.getReferralConfig).mockResolvedValue(mockConfig as any);
    vi.mocked(referralService.getReferralStats).mockResolvedValue(mockStats as any);
    vi.mocked(referralService.generatePoster).mockResolvedValue({
      posterUrl: 'https://example.com/poster.png',
    } as any);
    vi.mocked(referralService.shareToSocial).mockResolvedValue({
      shareUrl: 'https://share.example.com',
    } as any);
  });

  describe('初始化', () => {
    it('应该初始化所有状态', () => {
      const { result } = renderHook(() => useReferralCenter());

      expect(typeof result.current.loading).toBe('boolean');
      expect(result.current.config).toBeNull();
      expect(result.current.stats).toBeNull();
      expect(result.current.posterUrl).toBe('');
    });
  });

  describe('数据加载', () => {
    it('mount时应该加载配置和统计数据', async () => {
      renderHook(() => useReferralCenter());

      await waitFor(() => {
        expect(referralService.getReferralConfig).toHaveBeenCalled();
        expect(referralService.getReferralStats).toHaveBeenCalled();
      });
    });

    it('加载成功应该更新config', async () => {
      const { result } = renderHook(() => useReferralCenter());

      await waitFor(() => {
        expect(result.current.config).toEqual(mockConfig);
      });
    });

    it('加载成功应该更新stats', async () => {
      const { result } = renderHook(() => useReferralCenter());

      await waitFor(() => {
        expect(result.current.stats).toEqual(mockStats);
      });
    });

    it('加载失败应该显示错误消息', async () => {
      vi.mocked(referralService.getReferralConfig).mockRejectedValue(
        new Error('加载失败')
      );

      renderHook(() => useReferralCenter());

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('加载失败');
      });
    });
  });

  describe('copyInviteCode 复制邀请码', () => {
    it('没有config时不应该执行', async () => {
      const { result } = renderHook(() => useReferralCenter());

      act(() => {
        result.current.copyInviteCode();
      });

      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });

    it('有config时应该复制邀请码', async () => {
      const { result } = renderHook(() => useReferralCenter());

      await waitFor(() => {
        expect(result.current.config).not.toBeNull();
      });

      act(() => {
        result.current.copyInviteCode();
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABC123');
      expect(message.success).toHaveBeenCalledWith('邀请码已复制到剪贴板');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useReferralCenter());

      const firstHandle = result.current.copyInviteCode;
      rerender();
      const secondHandle = result.current.copyInviteCode;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('copyInviteLink 复制邀请链接', () => {
    it('没有config时不应该执行', async () => {
      const { result } = renderHook(() => useReferralCenter());

      act(() => {
        result.current.copyInviteLink();
      });

      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });

    it('有config时应该复制邀请链接', async () => {
      const { result } = renderHook(() => useReferralCenter());

      await waitFor(() => {
        expect(result.current.config).not.toBeNull();
      });

      act(() => {
        result.current.copyInviteLink();
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://example.com/invite/ABC123'
      );
      expect(message.success).toHaveBeenCalledWith('邀请链接已复制到剪贴板');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useReferralCenter());

      const firstHandle = result.current.copyInviteLink;
      rerender();
      const secondHandle = result.current.copyInviteLink;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleGeneratePoster 生成海报', () => {
    it('生成成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useReferralCenter());

      await waitFor(() => {
        expect(result.current.config).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleGeneratePoster();
      });

      expect(message.success).toHaveBeenCalledWith('海报生成成功');
    });

    it('生成成功应该更新posterUrl', async () => {
      const { result } = renderHook(() => useReferralCenter());

      await waitFor(() => {
        expect(result.current.config).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleGeneratePoster();
      });

      expect(result.current.posterUrl).toBe('https://example.com/poster.png');
    });

    it('生成失败应该显示错误消息', async () => {
      vi.mocked(referralService.generatePoster).mockRejectedValue(
        new Error('生成失败')
      );

      const { result } = renderHook(() => useReferralCenter());

      await waitFor(() => {
        expect(result.current.config).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleGeneratePoster();
      });

      expect(message.error).toHaveBeenCalledWith('生成失败');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useReferralCenter());

      const firstHandle = result.current.handleGeneratePoster;
      rerender();
      const secondHandle = result.current.handleGeneratePoster;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleShare 分享到社交平台', () => {
    it('没有config时不应该执行', async () => {
      const { result } = renderHook(() => useReferralCenter());

      await act(async () => {
        await result.current.handleShare('wechat');
      });

      expect(referralService.shareToSocial).not.toHaveBeenCalled();
    });

    it('分享到link应该复制链接', async () => {
      const { result } = renderHook(() => useReferralCenter());

      await waitFor(() => {
        expect(result.current.config).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleShare('link');
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://share.example.com'
      );
      expect(message.success).toHaveBeenCalledWith('分享链接已复制');
    });

    it('分享到其他平台应该打开新窗口', async () => {
      const { result } = renderHook(() => useReferralCenter());

      await waitFor(() => {
        expect(result.current.config).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleShare('wechat');
      });

      expect(window.open).toHaveBeenCalledWith('https://share.example.com', '_blank');
    });

    it('分享失败应该显示错误消息', async () => {
      vi.mocked(referralService.shareToSocial).mockRejectedValue(
        new Error('分享失败')
      );

      const { result } = renderHook(() => useReferralCenter());

      await waitFor(() => {
        expect(result.current.config).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleShare('weibo');
      });

      expect(message.error).toHaveBeenCalledWith('分享失败');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useReferralCenter());

      const firstHandle = result.current.handleShare;
      rerender();
      const secondHandle = result.current.handleShare;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('goToRecords 跳转邀请记录', () => {
    it('应该导航到邀请记录页', async () => {
      const { result } = renderHook(() => useReferralCenter());

      await waitFor(() => {
        expect(result.current.config).not.toBeNull();
      });

      act(() => {
        result.current.goToRecords();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/referral/records');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useReferralCenter());

      const firstHandle = result.current.goToRecords;
      rerender();
      const secondHandle = result.current.goToRecords;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('loadData 重新加载', () => {
    it('应该重新加载配置和统计数据', async () => {
      const { result } = renderHook(() => useReferralCenter());

      await waitFor(() => {
        expect(result.current.config).not.toBeNull();
      });

      vi.clearAllMocks();

      act(() => {
        result.current.loadData();
      });

      await waitFor(() => {
        expect(referralService.getReferralConfig).toHaveBeenCalled();
        expect(referralService.getReferralStats).toHaveBeenCalled();
      });
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useReferralCenter());

      const firstHandle = result.current.loadData;
      rerender();
      const secondHandle = result.current.loadData;

      expect(firstHandle).toBe(secondHandle);
    });
  });
});
