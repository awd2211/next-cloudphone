import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Row, Col, Modal } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login, getCaptcha } from '@/services/auth';
import { verify2FA } from '@/services/twoFactor';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { EnhancedErrorAlert, type EnhancedError } from '@/components/EnhancedErrorAlert';
import './index.css';

interface LoginForm {
  username: string;
  password: string;
  captcha: string;
}

const Login = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [captchaId, setCaptchaId] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [twoFactorModalVisible, setTwoFactorModalVisible] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [loginCredentials, setLoginCredentials] = useState<any>(null);
  const [loginError, setLoginError] = useState<EnhancedError | null>(null);
  const [twoFactorError, setTwoFactorError] = useState<EnhancedError | null>(null);

  const { execute: executeLogin, loading: loginLoading } = useAsyncOperation();
  const { execute: executeCaptcha } = useAsyncOperation();
  const { execute: executeTwoFactor, loading: twoFactorLoading } = useAsyncOperation();

  // 获取验证码
  const fetchCaptcha = async () => {
    setCaptchaLoading(true);
    await executeCaptcha(
      async () => {
        const data = await getCaptcha();
        setCaptchaId(data.id);
        setCaptchaSvg(data.svg);
        return data;
      },
      {
        errorContext: '获取验证码',
        showSuccessMessage: false,
        onFinally: () => setCaptchaLoading(false),
      }
    );
  };

  // 页面加载时获取验证码
  useEffect(() => {
    fetchCaptcha();
  }, []);

  const handleSubmit = async (values: LoginForm) => {
    setLoginError(null);

    const result = await executeLogin(
      async () => {
        const data: any = await login({
          ...values,
          captchaId,
        });

        // 检查是否需要2FA验证
        if (data.requiresTwoFactor) {
          message.info(data.message || '请输入双因素认证代码');
          setLoginCredentials({ ...values, captchaId });
          setTwoFactorModalVisible(true);
          return { requiresTwoFactor: true };
        }

        // 正常登录流程
        localStorage.setItem('token', data.token);
        if (data.user?.id) {
          localStorage.setItem('userId', data.user.id);
        }
        // 保存完整的用户信息（包括 roles 和 isSuperAdmin）
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        return data;
      },
      {
        successMessage: '登录成功',
        errorContext: '登录',
        showErrorMessage: false, // 使用EnhancedErrorAlert显示
        onSuccess: (data) => {
          if (!data.requiresTwoFactor) {
            navigate('/');
          }
        },
        onError: (error: any) => {
          // 解析错误信息
          const response = error.response?.data;
          setLoginError({
            message: response?.message || '登录失败',
            userMessage: response?.userMessage || '登录失败，请检查用户名和密码',
            code: response?.errorCode || error.response?.status?.toString(),
            requestId: response?.requestId,
            recoverySuggestions: response?.recoverySuggestions || [
              {
                action: '检查用户名密码',
                description: '请确认用户名和密码是否正确',
              },
              {
                action: '刷新验证码',
                description: '验证码可能已过期，请点击验证码图片刷新',
              },
              {
                action: '联系管理员',
                description: '如果多次尝试失败，请联系系统管理员',
                actionUrl: '/support',
              },
            ],
            retryable: true,
          });
          // 登录失败后刷新验证码
          fetchCaptcha();
          form.setFieldValue('captcha', '');
        },
      }
    );
  };

  // 处理2FA验证
  const handle2FAVerify = async () => {
    if (!twoFactorToken || twoFactorToken.length !== 6) {
      message.error('请输入6位验证码');
      return;
    }

    setTwoFactorError(null);

    await executeTwoFactor(
      async () => {
        const result = await verify2FA({
          ...loginCredentials,
          twoFactorToken,
        });

        localStorage.setItem('token', result.token);
        if (result.user?.id) {
          localStorage.setItem('userId', result.user.id);
        }
        // 保存完整的用户信息（包括 roles 和 isSuperAdmin）
        if (result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
        }
        return result;
      },
      {
        successMessage: '登录成功',
        errorContext: '双因素认证',
        showErrorMessage: false,
        onSuccess: () => {
          setTwoFactorModalVisible(false);
          setTwoFactorToken('');
          navigate('/');
        },
        onError: (error: any) => {
          const response = error.response?.data;
          setTwoFactorError({
            message: response?.message || '验证码错误',
            userMessage: response?.userMessage || '验证码错误，请检查您的验证器应用',
            code: response?.errorCode || error.response?.status?.toString(),
            requestId: response?.requestId,
            recoverySuggestions: response?.recoverySuggestions || [
              {
                action: '重新输入',
                description: '请确认输入的6位验证码是否正确',
              },
              {
                action: '同步时间',
                description: '验证器应用依赖设备时间，请确保设备时间准确',
              },
              {
                action: '联系管理员',
                description: '如无法登录，请联系系统管理员重置双因素认证',
                actionUrl: '/support',
              },
            ],
            retryable: true,
          });
        },
      }
    );
  };

  return (
    <div className="login-container">
      <Card title="云手机平台 - 管理后台" className="login-card">
        {/* 登录错误提示 */}
        {loginError && (
          <EnhancedErrorAlert
            error={loginError}
            onClose={() => setLoginError(null)}
            onRetry={() => form.submit()}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form form={form} onFinish={handleSubmit} size="large">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item
            name="captcha"
            rules={[
              { required: true, message: '请输入验证码' },
              { len: 4, message: '验证码为4位' },
            ]}
          >
            <Row gutter={8}>
              <Col span={14}>
                <Input
                  prefix={<SafetyOutlined />}
                  placeholder="验证码"
                  maxLength={4}
                  autoComplete="off"
                />
              </Col>
              <Col span={10}>
                <div
                  className="captcha-wrapper"
                  onClick={fetchCaptcha}
                  style={{
                    height: 40,
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5',
                    position: 'relative',
                  }}
                >
                  {captchaLoading ? (
                    <ReloadOutlined spin style={{ fontSize: 20, color: '#1890ff' }} />
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: captchaSvg }} />
                  )}
                </div>
              </Col>
            </Row>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loginLoading}>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 2FA验证Modal */}
      <Modal
        title="双因素认证"
        open={twoFactorModalVisible}
        onCancel={() => {
          setTwoFactorModalVisible(false);
          setTwoFactorToken('');
          setTwoFactorError(null);
          setLoginCredentials(null);
        }}
        onOk={handle2FAVerify}
        okText="验证"
        cancelText="取消"
        okButtonProps={{ loading: twoFactorLoading }}
      >
        <div style={{ padding: '20px 0' }}>
          {/* 2FA错误提示 */}
          {twoFactorError && (
            <EnhancedErrorAlert
              error={twoFactorError}
              onClose={() => setTwoFactorError(null)}
              onRetry={handle2FAVerify}
              style={{ marginBottom: 16 }}
            />
          )}

          <p style={{ marginBottom: 16, color: '#666' }}>
            请输入验证器应用中显示的6位验证码
          </p>
          <Input
            placeholder="请输入6位验证码"
            value={twoFactorToken}
            onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, ''))}
            maxLength={6}
            size="large"
            prefix={<SafetyOutlined />}
            autoFocus
            onPressEnter={handle2FAVerify}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Login;
