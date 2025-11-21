import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Switch,
  Alert,
  Modal,
  Input,
  QRCode,
  Space,
  Typography,
  Divider,
  message,
} from 'antd';
import {
  SafetyOutlined,
  MobileOutlined,
  CopyOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import {
  get2FAStatus,
  generate2FA,
  enable2FA,
  disable2FA,
} from '@/services/auth';

const { Text, Paragraph } = Typography;

interface TwoFactorDisplayStatus {
  enabled: boolean;
  qrCode?: string;
  secret?: string;
}

/**
 * 双因素认证管理组件
 *
 * 功能：
 * 1. 查看 2FA 状态
 * 2. 启用 2FA（显示二维码和密钥）
 * 3. 禁用 2FA
 * 4. 验证 2FA 代码
 */
export const TwoFactorManagement: React.FC = React.memo(() => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<TwoFactorDisplayStatus>({
    enabled: false,
  });
  const [enableModalVisible, setEnableModalVisible] = useState(false);
  const [disableModalVisible, setDisableModalVisible] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');

  // 加载 2FA 状态
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await get2FAStatus();
      setStatus({
        enabled: response.data.enabled,
      });
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error);
    }
  };

  // 启用 2FA - 第一步：生成二维码和密钥
  const handleEnableStart = async () => {
    setLoading(true);
    try {
      const response = await generate2FA();
      setStatus({
        enabled: false,
        qrCode: response.data.otpauthUrl, // 使用 otpauthUrl 生成二维码
        secret: response.data.secret,
      });
      setEnableModalVisible(true);
    } catch (error: any) {
      message.error(error.response?.data?.message || '生成密钥失败');
    } finally {
      setLoading(false);
    }
  };

  // 启用 2FA - 第二步：验证代码并启用
  const handleEnableConfirm = async () => {
    if (!verifyCode) {
      message.warning('请输入验证码');
      return;
    }

    setLoading(true);
    try {
      await enable2FA({ token: verifyCode });
      message.success('双因素认证已启用');
      setEnableModalVisible(false);
      setVerifyCode('');
      await fetchStatus();
    } catch (error: any) {
      message.error(error.response?.data?.message || '验证码错误');
    } finally {
      setLoading(false);
    }
  };

  // 禁用 2FA
  const handleDisable = async () => {
    if (!disableCode) {
      message.warning('请输入验证码');
      return;
    }

    setLoading(true);
    try {
      await disable2FA({ token: disableCode });
      message.success('双因素认证已禁用');
      setDisableModalVisible(false);
      setDisableCode('');
      await fetchStatus();
    } catch (error: any) {
      message.error(error.response?.data?.message || '验证码错误');
    } finally {
      setLoading(false);
    }
  };

  // 复制密钥
  const handleCopySecret = () => {
    if (status.secret) {
      navigator.clipboard.writeText(status.secret);
      message.success('密钥已复制到剪贴板');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Alert
        message="什么是双因素认证？"
        description={
          <div>
            <p>
              双因素认证（2FA）为您的账户增加了额外的安全层。启用后，登录时除了密码，还需要输入手机应用生成的动态验证码。
            </p>
            <p style={{ marginBottom: 0 }}>
              推荐使用 <strong>Google Authenticator</strong>、
              <strong>Microsoft Authenticator</strong> 或
              <strong>Authy</strong> 等认证应用。
            </p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card
        title={
          <Space>
            <SafetyOutlined style={{ color: '#1890ff' }} />
            <span>双因素认证状态</span>
          </Space>
        }
        extra={
          <Space>
            <Text type={status.enabled ? 'success' : 'secondary'}>
              {status.enabled ? '已启用' : '未启用'}
            </Text>
            <Switch
              checked={status.enabled}
              loading={loading}
              onChange={(checked) => {
                if (checked) {
                  handleEnableStart();
                } else {
                  setDisableModalVisible(true);
                }
              }}
            />
          </Space>
        }
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {status.enabled ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircleOutlined
                  style={{ color: '#52c41a', fontSize: 20 }}
                />
                <Text>您的账户已受到双因素认证保护</Text>
              </div>
              <Text type="secondary">
                每次登录时，除了密码外，您还需要输入认证应用生成的 6 位验证码。
              </Text>
            </>
          ) : (
            <>
              <Text>启用双因素认证可以大大提高您的账户安全性</Text>
              <Button
                type="primary"
                icon={<MobileOutlined />}
                onClick={handleEnableStart}
                loading={loading}
              >
                启用双因素认证
              </Button>
            </>
          )}
        </Space>
      </Card>

      {/* 启用 2FA 模态框 */}
      <Modal
        title="启用双因素认证"
        open={enableModalVisible}
        onCancel={() => {
          setEnableModalVisible(false);
          setVerifyCode('');
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setEnableModalVisible(false);
              setVerifyCode('');
            }}
          >
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={loading}
            onClick={handleEnableConfirm}
          >
            验证并启用
          </Button>,
        ]}
        width={600}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="设置步骤"
            description={
              <ol style={{ marginBottom: 0, paddingLeft: '20px' }}>
                <li>在手机上安装认证应用（如 Google Authenticator）</li>
                <li>扫描下方二维码，或手动输入密钥</li>
                <li>输入认证应用显示的 6 位验证码</li>
              </ol>
            }
            type="info"
            showIcon
          />

          <Divider />

          {status.qrCode && (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  display: 'inline-block',
                  padding: '16px',
                  background: '#fff',
                  border: '1px solid #d9d9d9',
                  borderRadius: '8px',
                }}
              >
                <QRCode value={status.qrCode} size={200} />
              </div>
            </div>
          )}

          {status.secret && (
            <div>
              <Paragraph>
                <Text strong>手动输入密钥：</Text>
              </Paragraph>
              <Input
                value={status.secret}
                readOnly
                addonAfter={
                  <CopyOutlined
                    onClick={handleCopySecret}
                    style={{ cursor: 'pointer' }}
                  />
                }
              />
            </div>
          )}

          <Divider />

          <div>
            <Paragraph>
              <Text strong>输入验证码：</Text>
            </Paragraph>
            <Input
              placeholder="请输入 6 位验证码"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              maxLength={6}
              size="large"
            />
          </div>
        </Space>
      </Modal>

      {/* 禁用 2FA 模态框 */}
      <Modal
        title="禁用双因素认证"
        open={disableModalVisible}
        onCancel={() => {
          setDisableModalVisible(false);
          setDisableCode('');
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setDisableModalVisible(false);
              setDisableCode('');
            }}
          >
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            danger
            loading={loading}
            onClick={handleDisable}
          >
            确认禁用
          </Button>,
        ]}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="安全警告"
            description="禁用双因素认证会降低您的账户安全性。如果您确定要禁用，请输入当前的 2FA 验证码。"
            type="warning"
            showIcon
          />

          <div>
            <Paragraph>
              <Text strong>2FA 验证码：</Text>
            </Paragraph>
            <Input
              placeholder="请输入 6 位验证码"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              maxLength={6}
              size="large"
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
});

TwoFactorManagement.displayName = 'TwoFactorManagement';
