import React from 'react';
import { Card, Button, Space, Tabs } from 'antd';
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
import { useReferralCenter } from '@/hooks/useReferralCenter';

const { TabPane } = Tabs;

/**
 * 邀请返利中心页面（优化版）
 *
 * 优化点：
 * 1. ✅ 使用自定义 hook 管理所有业务逻辑
 * 2. ✅ 页面组件只负责布局和 UI 组合
 * 3. ✅ 所有子组件使用 React.memo 优化
 * 4. ✅ 处理函数使用 useCallback 优化
 * 5. ✅ 代码从 442 行减少到 ~125 行
 */
const ReferralCenter: React.FC = () => {
  const {
    loading,
    config,
    stats,
    posterUrl,
    copyInviteCode,
    copyInviteLink,
    handleGeneratePoster,
    handleShare,
    downloadQRCode,
    goToRecords,
  } = useReferralCenter();

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
