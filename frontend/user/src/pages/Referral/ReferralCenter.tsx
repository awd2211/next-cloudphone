import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Space, Tabs, message } from 'antd';
import { TeamOutlined, CopyOutlined, LinkOutlined, QrcodeOutlined, GiftOutlined, RightOutlined } from '@ant-design/icons';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  StatsCards,
  ReferralAlert,
  InviteCodeTab,
  InviteLinkTab,
  QRCodeTab,
  PosterTab,
  RulesCard,
} from '@/components/Referral';
import {
  useReferralConfig,
  useReferralStats,
  useGeneratePoster,
} from '@/hooks/queries';

const { TabPane } = Tabs;

/**
 * 邀请返利中心页面
 *
 * 功能：
 * 1. 展示推荐统计（推荐人数、奖励金额等）
 * 2. 邀请码、邀请链接、二维码、海报
 * 3. 邀请规则说明
 * 4. 查看邀请记录
 */
const ReferralCenter: React.FC = () => {
  const navigate = useNavigate();
  const [posterUrl, setPosterUrl] = useState<string>('');

  // React Query hooks
  const { data: config, isLoading: loading, refetch: refetchConfig } = useReferralConfig();
  const { data: stats, refetch: refetchStats } = useReferralStats();
  const generatePoster = useGeneratePoster();

  // 刷新数据
  const handleRefresh = useCallback(() => {
    refetchConfig();
    refetchStats();
    message.success('数据已刷新');
  }, [refetchConfig, refetchStats]);

  // 快捷键支持：Ctrl+R 刷新
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRefresh]);

  // 复制邀请码
  const copyInviteCode = useCallback(() => {
    if (config?.inviteCode) {
      navigator.clipboard.writeText(config.inviteCode);
      message.success('邀请码已复制');
    }
  }, [config]);

  // 复制邀请链接
  const copyInviteLink = useCallback(() => {
    if (config?.inviteLink) {
      navigator.clipboard.writeText(config.inviteLink);
      message.success('邀请链接已复制');
    }
  }, [config]);

  // 生成海报
  const handleGeneratePoster = useCallback(async () => {
    const result = await generatePoster.mutateAsync();
    setPosterUrl(result.posterUrl);
  }, [generatePoster]);

  // 分享
  const handleShare = useCallback((platform: string) => {
    message.info(`分享到 ${platform} 功能开发中...`);
  }, []);

  // 下载二维码
  const downloadQRCode = useCallback(() => {
    message.success('二维码已下载');
  }, []);

  // 查看邀请记录
  const goToRecords = useCallback(() => {
    navigate('/referral/records');
  }, [navigate]);

  return (
    <ErrorBoundary>
      <div>
        <Card
          title={
            <Space>
              <TeamOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <span style={{ fontSize: 24, fontWeight: 'bold' }}>邀请返利中心</span>
            </Space>
          }
          extra={
            <Button type="primary" onClick={goToRecords} icon={<RightOutlined />}>
              邀请记录
            </Button>
          }
          loading={loading}
        >
          {/* 统计卡片 */}
          <StatsCards stats={stats ?? null} onViewRecords={goToRecords} />

          {/* 邀请提示 */}
          <ReferralAlert config={config ?? null} />

          {/* Tabs 区域 */}
          <Tabs defaultActiveKey="code">
            {/* 邀请码 Tab */}
            <TabPane
              tab={
                <span>
                  <CopyOutlined />
                  邀请码
                </span>
              }
              key="code"
            >
              <InviteCodeTab config={config ?? null} onCopyCode={copyInviteCode} />
            </TabPane>

            {/* 邀请链接 Tab */}
            <TabPane
              tab={
                <span>
                  <LinkOutlined />
                  邀请链接
                </span>
              }
              key="link"
            >
              <InviteLinkTab config={config ?? null} onCopyLink={copyInviteLink} onShare={handleShare} />
            </TabPane>

            {/* 二维码 Tab */}
            <TabPane
              tab={
                <span>
                  <QrcodeOutlined />
                  二维码
                </span>
              }
              key="qrcode"
            >
              <QRCodeTab config={config ?? null} onDownloadQRCode={downloadQRCode} />
            </TabPane>

            {/* 海报 Tab */}
            <TabPane
              tab={
                <span>
                  <GiftOutlined />
                  邀请海报
                </span>
              }
              key="poster"
            >
              <PosterTab posterUrl={posterUrl} onGeneratePoster={handleGeneratePoster} />
            </TabPane>
          </Tabs>

          {/* 邀请规则 */}
          <RulesCard config={config ?? null} />
        </Card>
      </div>
    </ErrorBoundary>
  );
};

export default ReferralCenter;
