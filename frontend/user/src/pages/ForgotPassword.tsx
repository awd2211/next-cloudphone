import { Card, Result, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ForgotPasswordForm } from '@/components/Auth';
import { useForgotPassword } from '@/hooks/useForgotPassword';

/**
 * 忘记密码页面
 *
 * 功能：
 * 1. 用户输入邮箱或手机号
 * 2. 发送重置密码链接到邮箱/短信
 * 3. 显示成功提示
 */
const ForgotPassword = () => {
  const navigate = useNavigate();
  const { form, loading, success, handleSubmit } = useForgotPassword();

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
        {!success ? (
          <>
            {/* 页面标题 */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>
                忘记密码
              </h1>
              <p style={{ color: '#999', marginTop: 8 }}>
                请输入您的邮箱或手机号，我们将发送重置密码链接
              </p>
            </div>

            {/* 忘记密码表单 */}
            <ForgotPasswordForm
              form={form}
              loading={loading}
              onFinish={handleSubmit}
            />

            {/* 返回登录 */}
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/login')}
              >
                返回登录
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* 成功提示 */}
            <Result
              status="success"
              title="重置链接已发送"
              subTitle="我们已向您的邮箱发送了密码重置链接，请查收邮件并按照说明重置密码。链接有效期为 24 小时。"
              extra={[
                <Button type="primary" onClick={() => navigate('/login')} key="login">
                  返回登录
                </Button>,
                <Button onClick={() => window.location.reload()} key="resend">
                  重新发送
                </Button>,
              ]}
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default ForgotPassword;
