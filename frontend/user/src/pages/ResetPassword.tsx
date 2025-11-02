import { useEffect } from 'react';
import { Card, Result, Button, Spin, Alert } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { ResetPasswordForm } from '@/components/Auth';
import { useResetPassword } from '@/hooks/useResetPassword';

/**
 * 重置密码页面
 *
 * 功能：
 * 1. 验证 token 有效性
 * 2. 用户输入新密码
 * 3. 重置密码成功后跳转登录
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();

  const {
    form,
    loading,
    verifying,
    tokenValid,
    tokenError,
    success,
    handleSubmit,
    verifyToken,
  } = useResetPassword();

  // 页面加载时验证 token
  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token, verifyToken]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card
        style={{
          width: 450,
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* 验证 Token 中 */}
        {verifying && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <p style={{ marginTop: 16, color: '#999' }}>正在验证重置链接...</p>
          </div>
        )}

        {/* Token 无效 */}
        {!verifying && !tokenValid && (
          <Result
            status="error"
            title="链接无效或已过期"
            subTitle={tokenError || '该重置密码链接可能已过期或已被使用，请重新申请。'}
            extra={[
              <Button type="primary" onClick={() => navigate('/forgot-password')} key="forgot">
                重新申请
              </Button>,
              <Button onClick={() => navigate('/login')} key="login">
                返回登录
              </Button>,
            ]}
          />
        )}

        {/* Token 有效但未重置 */}
        {!verifying && tokenValid && !success && (
          <>
            {/* 页面标题 */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>
                重置密码
              </h1>
              <p style={{ color: '#999', marginTop: 8 }}>
                请输入您的新密码
              </p>
            </div>

            {/* 安全提示 */}
            <Alert
              message="密码安全建议"
              description="密码长度至少8位，包含大小写字母、数字和特殊字符，避免使用常见密码。"
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />

            {/* 重置密码表单 */}
            <ResetPasswordForm
              form={form}
              loading={loading}
              onFinish={(values) => handleSubmit(token!, values)}
            />
          </>
        )}

        {/* 重置成功 */}
        {!verifying && success && (
          <Result
            status="success"
            title="密码重置成功"
            subTitle="您的密码已成功重置，请使用新密码登录。"
            extra={[
              <Button type="primary" onClick={() => navigate('/login')} key="login">
                立即登录
              </Button>,
            ]}
          />
        )}
      </Card>
    </div>
  );
};

export default ResetPassword;
