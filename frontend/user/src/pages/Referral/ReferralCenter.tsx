import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Space, Tabs, message } from 'antd';
import { TeamOutlined, CopyOutlined, LinkOutlined, QrcodeOutlined, GiftOutlined, RightOutlined } from '@ant-design/icons';
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
  useGenerateReferralPoster,
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
  const { data: config, isLoading: loading } = useReferralConfig();
  const { data: stats } = useReferralStats();
  const generatePoster = useGenerateReferralPoster();

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
    const url = await generatePoster.mutateAsync();
    setPosterUrl(url);
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
        <StatsCards stats={stats} onViewRecords={goToRecords} />

        {/* 邀请提示 */}
        <ReferralAlert config={config} />

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
            <InviteCodeTab config={config} onCopyCode={copyInviteCode} />
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
            <InviteLinkTab config={config} onCopyLink={copyInviteLink} onShare={handleShare} />
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
            <QRCodeTab config={config} onDownloadQRCode={downloadQRCode} />
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
        <RulesCard config={config} />
      </Card>
    </div>
  );
};

export default ReferralCenter;
