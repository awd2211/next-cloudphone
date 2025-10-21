import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Statistic,
  QRCode,
  Input,
  message,
  Tabs,
  Typography,
  Divider,
  Alert,
} from 'antd';
import {
  TeamOutlined,
  DollarOutlined,
  GiftOutlined,
  CopyOutlined,
  QrcodeOutlined,
  ShareAltOutlined,
  WechatOutlined,
  QqOutlined,
  WeiboOutlined,
  LinkOutlined,
  DownloadOutlined,
  RightOutlined,
} from '@ant-design/icons';
import {
  getReferralConfig,
  getReferralStats,
  generatePoster,
  shareToSocial,
  type ReferralStats,
  type ReferralConfig,
} from '@/services/referral';

const { Paragraph, Title, Text } = Typography;
const { TabPane } = Tabs;

const ReferralCenter = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<ReferralConfig | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [posterUrl, setPosterUrl] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
  };

  // 复制邀请码
  const copyInviteCode = () => {
    if (!config) return;
    navigator.clipboard.writeText(config.inviteCode);
    message.success('邀请码已复制到剪贴板');
  };

  // 复制邀请链接
  const copyInviteLink = () => {
    if (!config) return;
    navigator.clipboard.writeText(config.inviteLink);
    message.success('邀请链接已复制到剪贴板');
  };

  // 生成海报
  const handleGeneratePoster = async () => {
    try {
      const result = await generatePoster();
      setPosterUrl(result.posterUrl);
      message.success('海报生成成功');
    } catch (error: any) {
      message.error(error.message || '生成海报失败');
    }
  };

  // 分享到社交平台
  const handleShare = async (platform: 'wechat' | 'qq' | 'weibo' | 'link') => {
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
  };

  // 下载二维码
  const downloadQRCode = () => {
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
  };

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
          <Button
            type="primary"
            onClick={() => navigate('/referral/records')}
            icon={<RightOutlined />}
          >
            邀请记录
          </Button>
        }
        loading={loading}
      >
        {/* 统计数据 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="累计邀请"
                value={stats?.totalInvites || 0}
                suffix="人"
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="成功邀请"
                value={stats?.confirmedInvites || 0}
                suffix="人"
                prefix={<GiftOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="累计收益"
                value={stats?.totalRewards || 0}
                prefix="¥"
                precision={2}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="可提现余额"
                value={stats?.availableBalance || 0}
                prefix="¥"
                precision={2}
                valueStyle={{ color: '#faad14' }}
              />
              <Button
                type="link"
                size="small"
                onClick={() => navigate('/referral/records')}
                style={{ padding: 0, marginTop: 8 }}
              >
                查看提现记录 →
              </Button>
            </Card>
          </Col>
        </Row>

        {/* 邀请提示 */}
        <Alert
          message="邀请好友注册并完成首次充值，双方都可获得奖励!"
          description={
            <div>
              <p>• 邀请好友注册: 获得 ¥{config?.rewardPerInvite || 0} 奖励</p>
              <p>• 好友首次充值: 额外获得充值金额的 10% 返利</p>
              <p>• 最低提现金额: ¥{config?.minWithdrawAmount || 0}</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

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
            <Card>
              <Title level={4}>我的邀请码</Title>
              <Paragraph>分享您的专属邀请码给好友，好友注册时填写即可</Paragraph>

              <div
                style={{
                  background: '#f5f5f5',
                  padding: '24px',
                  borderRadius: 8,
                  textAlign: 'center',
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 48, fontWeight: 'bold', color: '#1890ff', letterSpacing: 4 }}>
                  {config?.inviteCode || '----'}
                </div>
              </div>

              <Space style={{ width: '100%' }} direction="vertical">
                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<CopyOutlined />}
                  onClick={copyInviteCode}
                >
                  复制邀请码
                </Button>
              </Space>
            </Card>
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
            <Card>
              <Title level={4}>我的邀请链接</Title>
              <Paragraph>复制链接发送给好友，好友点击链接即可注册</Paragraph>

              <Input.TextArea
                value={config?.inviteLink || ''}
                readOnly
                rows={3}
                style={{ marginBottom: 16 }}
              />

              <Space style={{ width: '100%' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<CopyOutlined />}
                  onClick={copyInviteLink}
                  block
                >
                  复制链接
                </Button>
              </Space>

              <Divider />

              <Title level={5}>分享到社交平台</Title>
              <Space wrap>
                <Button
                  icon={<WechatOutlined />}
                  onClick={() => handleShare('wechat')}
                  style={{ color: '#07c160' }}
                >
                  微信
                </Button>
                <Button
                  icon={<QqOutlined />}
                  onClick={() => handleShare('qq')}
                  style={{ color: '#12b7f5' }}
                >
                  QQ
                </Button>
                <Button
                  icon={<WeiboOutlined />}
                  onClick={() => handleShare('weibo')}
                  style={{ color: '#ff8200' }}
                >
                  微博
                </Button>
                <Button
                  icon={<ShareAltOutlined />}
                  onClick={() => handleShare('link')}
                >
                  更多...
                </Button>
              </Space>
            </Card>
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
            <Card>
              <Title level={4}>邀请二维码</Title>
              <Paragraph>好友扫码即可快速注册</Paragraph>

              <div
                id="qr-code"
                style={{
                  textAlign: 'center',
                  padding: '32px',
                  background: '#f5f5f5',
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                {config?.inviteLink && (
                  <QRCode
                    value={config.inviteLink}
                    size={240}
                    icon="/logo.png"
                    errorLevel="H"
                  />
                )}
              </div>

              <Space style={{ width: '100%' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<DownloadOutlined />}
                  onClick={downloadQRCode}
                  block
                >
                  下载二维码
                </Button>
              </Space>
            </Card>
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
            <Card>
              <Title level={4}>邀请海报</Title>
              <Paragraph>生成精美的邀请海报，分享给好友更有吸引力</Paragraph>

              {posterUrl ? (
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <img
                    src={posterUrl}
                    alt="邀请海报"
                    style={{ maxWidth: '100%', maxHeight: 600, borderRadius: 8 }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '60px 0',
                    background: '#f5f5f5',
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                >
                  <Text type="secondary">点击下方按钮生成邀请海报</Text>
                </div>
              )}

              <Space style={{ width: '100%' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<GiftOutlined />}
                  onClick={handleGeneratePoster}
                  block
                >
                  生成海报
                </Button>
                {posterUrl && (
                  <Button
                    size="large"
                    icon={<DownloadOutlined />}
                    onClick={() => window.open(posterUrl)}
                    block
                  >
                    下载海报
                  </Button>
                )}
              </Space>
            </Card>
          </TabPane>
        </Tabs>

        {/* 邀请规则 */}
        <Card title="邀请规则" style={{ marginTop: 24 }}>
          <div dangerouslySetInnerHTML={{ __html: config?.rules || '加载中...' }} />
        </Card>
      </Card>
    </div>
  );
};

export default ReferralCenter;
