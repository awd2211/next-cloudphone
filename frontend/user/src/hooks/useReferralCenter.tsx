import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import {
  getReferralConfig,
  getReferralStats,
  generatePoster,
  shareToSocial,
  type ReferralStats,
  type ReferralConfig,
} from '@/services/referral';

/**
 * 邀请返利中心 Hook
 *
 * 优化点:
 * 1. ✅ 提取所有业务逻辑到自定义 hook
 * 2. ✅ 使用 useCallback 优化所有处理函数
 * 3. ✅ 统一错误处理和消息提示
 * 4. ✅ 集中管理所有状态
 */
export function useReferralCenter() {
  const navigate = useNavigate();

  // ===== 状态管理 =====
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<ReferralConfig | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [posterUrl, setPosterUrl] = useState<string>('');

  // ===== 数据加载 =====
  /**
   * 加载配置和统计数据
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [configData, statsData] = await Promise.all([
        getReferralConfig(),
        getReferralStats(),
      ]);
      setConfig(configData);
      setStats(statsData);
    } catch (error: any) {
      message.error(error.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== 复制功能 =====
  /**
   * 复制邀请码
   */
  const copyInviteCode = useCallback(() => {
    if (!config) return;
    navigator.clipboard.writeText(config.inviteCode);
    message.success('邀请码已复制到剪贴板');
  }, [config]);

  /**
   * 复制邀请链接
   */
  const copyInviteLink = useCallback(() => {
    if (!config) return;
    navigator.clipboard.writeText(config.inviteLink);
    message.success('邀请链接已复制到剪贴板');
  }, [config]);

  // ===== 海报生成 =====
  /**
   * 生成邀请海报
   */
  const handleGeneratePoster = useCallback(async () => {
    try {
      const result = await generatePoster();
      setPosterUrl(result.posterUrl);
      message.success('海报生成成功');
    } catch (error: any) {
      message.error(error.message || '生成海报失败');
    }
  }, []);

  // ===== 社交分享 =====
  /**
   * 分享到社交平台
   */
  const handleShare = useCallback(
    async (platform: 'wechat' | 'qq' | 'weibo' | 'link') => {
      if (!config) return;

      try {
        const result = await shareToSocial({
          platform,
          inviteCode: config.inviteCode,
        });

        if (platform === 'link') {
          navigator.clipboard.writeText(result.shareUrl);
          message.success('分享链接已复制');
        } else {
          window.open(result.shareUrl, '_blank');
        }
      } catch (error: any) {
        message.error(error.message || '分享失败');
      }
    },
    [config]
  );

  // ===== 二维码下载 =====
  /**
   * 下载二维码
   */
  const downloadQRCode = useCallback(() => {
    const canvas = document.getElementById('qr-code')?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL();
      const a = document.createElement('a');
      a.download = `邀请码-${config?.inviteCode}.png`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      message.success('二维码已下载');
    }
  }, [config?.inviteCode]);

  // ===== 导航功能 =====
  /**
   * 跳转到邀请记录页面
   */
  const goToRecords = useCallback(() => {
    navigate('/referral/records');
  }, [navigate]);

  // ===== 副作用 =====
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===== 返回所有状态和方法 =====
  return {
    // 状态
    loading,
    config,
    stats,
    posterUrl,

    // 数据操作
    loadData,

    // 复制功能
    copyInviteCode,
    copyInviteLink,

    // 海报功能
    handleGeneratePoster,

    // 分享功能
    handleShare,

    // 下载功能
    downloadQRCode,

    // 导航功能
    goToRecords,
  };
}
