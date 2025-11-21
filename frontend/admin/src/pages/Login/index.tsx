import { Form, Input, Button, Card } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { CaptchaInput, TwoFactorModal, useLogin } from '@/components/Login';
import ErrorAlert from '@/components/ErrorAlert';
import './index.css';

interface LoginForm {
  username: string;
  password: string;
  captcha: string;
}

const Login = () => {
  const [form] = Form.useForm();

  const {
    // 验证码相关
    captchaSvg,
    captchaLoading,
    fetchCaptcha,

    // 登录相关
    loginLoading,
    loginError,
    setLoginError,
    handleLogin,

    // 2FA 相关
    twoFactorModalVisible,
    twoFactorToken,
    twoFactorLoading,
    twoFactorError,
    setTwoFactorToken,
    setTwoFactorError,
    handleTwoFactorVerify,
    handleTwoFactorCancel,
  } = useLogin();

  const onFinish = async (values: LoginForm) => {
    await handleLogin(values, () => form.setFieldValue('captcha', ''));
  };

  return (
    <div className="login-container">
      <Card title="云手机平台 - 管理后台" className="login-card">
        {/* 登录错误提示 */}
        {loginError && (
          <ErrorAlert
            error={loginError}
            onClose={() => setLoginError(null)}
            onRetry={() => form.submit()}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form form={form} onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>

          <Form.Item
            name="captcha"
            rules={[
              { required: true, message: '请输入验证码' },
              { len: 4, message: '验证码为4位' },
            ]}
          >
            <CaptchaInput
              captchaSvg={captchaSvg}
              captchaLoading={captchaLoading}
              onRefresh={fetchCaptcha}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loginLoading}>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 2FA 验证 Modal */}
      <TwoFactorModal
        visible={twoFactorModalVisible}
        loading={twoFactorLoading}
        token={twoFactorToken}
        error={twoFactorError}
        onTokenChange={setTwoFactorToken}
        onVerify={handleTwoFactorVerify}
        onCancel={handleTwoFactorCancel}
        onErrorClose={() => setTwoFactorError(null)}
      />
    </div>
  );
};

export default Login;
