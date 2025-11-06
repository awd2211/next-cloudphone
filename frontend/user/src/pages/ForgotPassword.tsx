import { Card, Result, Button, Typography } from 'antd';
import { ArrowLeftOutlined, LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ForgotPasswordForm } from '@/components/Auth';
import { useForgotPassword } from '@/hooks/useForgotPassword';

const { Title, Paragraph, Text } = Typography;

/**
 * 忘记密码页面（优化版）
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
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>
        {`
          @keyframes float {
            0%, 100% {
              transform: translateY(0) rotate(0deg);
            }
            50% {
              transform: translateY(-20px) rotate(5deg);
            }
          }
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .forgot-password-card {
            animation: fadeIn 0.6s ease-out;
          }
        `}
      </style>

      {/* 背景装饰圆圈 */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'float 8s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-5%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'float 6s ease-in-out infinite reverse',
        }}
      />

      <Card
        className="forgot-password-card"
        style={{
          width: 460,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
          zIndex: 1,
        }}
        bodyStyle={{ padding: 40 }}
      >
        {!success ? (
          <>
            {/* 页面标题 */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                }}
              >
                <LockOutlined style={{ fontSize: 32, color: '#fff' }} />
              </div>
              <Title level={3} style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
                忘记密码
              </Title>
              <Paragraph style={{ color: '#64748b', marginTop: 8, marginBottom: 0 }}>
                请输入您的邮箱或手机号，我们将发送重置链接
              </Paragraph>
            </div>

            {/* 忘记密码表单 */}
            <ForgotPasswordForm
              form={form}
              loading={loading}
              onFinish={handleSubmit}
            />

            {/* 返回登录 */}
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/login')}
                style={{ color: '#6366f1', fontWeight: 500 }}
              >
                返回登录
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* 成功提示 */}
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
                }}
              >
                <CheckCircleOutlined style={{ fontSize: 48, color: '#fff' }} />
              </div>
              <Title level={3} style={{ color: '#1f2937', marginBottom: 16 }}>
                重置链接已发送
              </Title>
              <Paragraph style={{ color: '#6b7280', fontSize: 14, marginBottom: 32 }}>
                我们已向您的邮箱发送了密码重置链接，请查收邮件并按照说明重置密码。链接有效期为 <Text strong style={{ color: '#6366f1' }}>24 小时</Text>。
              </Paragraph>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate('/login')}
                  style={{
                    height: 48,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    border: 'none',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  返回登录
                </Button>
                <Button
                  size="large"
                  onClick={() => window.location.reload()}
                  style={{
                    height: 48,
                    borderRadius: 10,
                    borderColor: '#e2e8f0',
                    color: '#64748b',
                    fontWeight: 500,
                  }}
                >
                  重新发送
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default ForgotPassword;
