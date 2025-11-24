import { useState } from 'react';
import { Modal, Button, Steps, Input, message, Card, Alert, Space, theme } from 'antd';
import { SafetyOutlined, QrcodeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { generate2FASecret, enable2FA, disable2FA } from '@/services/twoFactor';
import type { TwoFactorSecret } from '@/services/twoFactor';

const { useToken } = theme;

interface TwoFactorSettingsProps {
  isEnabled: boolean;
  onStatusChange: () => void;
}

const TwoFactorSettings = ({ isEnabled, onStatusChange }: TwoFactorSettingsProps) => {
  const { token } = useToken();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState<TwoFactorSecret | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [disableModalVisible, setDisableModalVisible] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  // 启用2FA流程
  const handleEnableClick = async () => {
    setModalVisible(true);
    setCurrentStep(0);
    setLoading(true);

    try {
      const data = await generate2FASecret();
      setSecret(data);
      setCurrentStep(1);
    } catch (error) {
      message.error('生成2FA密钥失败');
      setModalVisible(false);
    } finally {
      setLoading(false);
    }
  };

  // 验证并启用2FA
  const handleVerifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      message.error('请输入6位验证码');
      return;
    }

    setLoading(true);
    try {
      await enable2FA({ token: verificationCode });
      message.success('双因素认证已启用！');
      setCurrentStep(2);
      setTimeout(() => {
        setModalVisible(false);
        setVerificationCode('');
        setSecret(null);
        setCurrentStep(0);
        onStatusChange();
      }, 2000);
    } catch (error: any) {
      message.error(error.response?.data?.message || '验证码错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 禁用2FA
  const handleDisable = async () => {
    if (!disableCode || disableCode.length !== 6) {
      message.error('请输入6位验证码');
      return;
    }

    setLoading(true);
    try {
      await disable2FA({ token: disableCode });
      message.success('双因素认证已禁用');
      setDisableModalVisible(false);
      setDisableCode('');
      onStatusChange();
    } catch (error: any) {
      message.error(error.response?.data?.message || '验证码错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card
        title={
          <Space>
            <SafetyOutlined />
            双因素认证 (2FA)
          </Space>
        }
      >
        <Alert
          message={isEnabled ? '✅ 双因素认证已启用' : '⚠️ 双因素认证未启用'}
          description={
            isEnabled
              ? '您的账户已受到双因素认证保护，登录时需要提供验证码。'
              : '启用双因素认证可以大大提高账户安全性，防止未经授权的访问。'
          }
          type={isEnabled ? 'success' : 'warning'}
          showIcon
          style={{ marginBottom: 16 }}
        />

        {isEnabled ? (
          <Button danger onClick={() => setDisableModalVisible(true)}>
            禁用双因素认证
          </Button>
        ) : (
          <Button type="primary" icon={<SafetyOutlined />} onClick={handleEnableClick}>
            启用双因素认证
          </Button>
        )}
      </Card>

      {/* 启用2FA Modal */}
      <Modal
        title="启用双因素认证"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setVerificationCode('');
          setSecret(null);
          setCurrentStep(0);
        }}
        footer={null}
        width={600}
      >
        <Steps
          current={currentStep}
          items={[
            { title: '生成密钥', icon: <QrcodeOutlined /> },
            { title: '扫描二维码', icon: <QrcodeOutlined /> },
            { title: '完成', icon: <CheckCircleOutlined /> },
          ]}
          style={{ marginBottom: 24 }}
        />

        {currentStep === 1 && secret && (
          <div style={{ textAlign: 'center' }}>
            <Alert
              message="使用验证器应用扫描二维码"
              description={
                <div>
                  <p>1. 打开 Google Authenticator、Authy 或其他TOTP验证器应用</p>
                  <p>2. 扫描下方二维码或手动输入密钥</p>
                  <p>3. 输入验证器显示的6位验证码</p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16, textAlign: 'left' }}
            />

            <div
              style={{
                padding: 20,
                background: '#fff',
                border: '1px solid #d9d9d9',
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <img
                src={secret.qrCode}
                alt="2FA QR Code"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>

            <Alert
              message="密钥（手动输入）"
              description={
                <code style={{ wordBreak: 'break-all', display: 'block', marginTop: 8 }}>
                  {secret.secret}
                </code>
              }
              type="info"
              style={{ marginBottom: 16, textAlign: 'left' }}
            />

            <Input
              placeholder="请输入6位验证码"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              size="large"
              style={{ marginBottom: 16 }}
            />

            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={handleVerifyAndEnable}
            >
              验证并启用
            </Button>
          </div>
        )}

        {currentStep === 2 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: token.colorSuccess }} />
            <h2 style={{ marginTop: 24 }}>双因素认证已成功启用！</h2>
            <p style={{ color: token.colorTextSecondary }}>下次登录时，系统会要求您输入验证码</p>
          </div>
        )}
      </Modal>

      {/* 禁用2FA Modal */}
      <Modal
        title="禁用双因素认证"
        open={disableModalVisible}
        onCancel={() => {
          setDisableModalVisible(false);
          setDisableCode('');
        }}
        onOk={handleDisable}
        okText="确认禁用"
        cancelText="取消"
        okButtonProps={{ danger: true, loading }}
      >
        <Alert
          message="警告"
          description="禁用双因素认证会降低您的账户安全性。请输入验证器中的当前验证码以确认操作。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Input
          placeholder="请输入6位验证码"
          value={disableCode}
          onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
          maxLength={6}
          size="large"
        />
      </Modal>
    </>
  );
};

export default TwoFactorSettings;
