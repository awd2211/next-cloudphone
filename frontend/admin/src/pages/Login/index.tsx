import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Row, Col, Modal } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login, getCaptcha } from '@/services/auth';
import { verify2FA } from '@/services/twoFactor';
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
  const [loading, setLoading] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [twoFactorModalVisible, setTwoFactorModalVisible] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [loginCredentials, setLoginCredentials] = useState<any>(null);

  // 获取验证码
  const fetchCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const data = await getCaptcha();
      setCaptchaId(data.id);
      setCaptchaSvg(data.svg);
    } catch (error) {
      message.error('获取验证码失败');
    } finally {
      setCaptchaLoading(false);
    }
  };

  // 页面加载时获取验证码
  useEffect(() => {
    fetchCaptcha();
  }, []);

  const handleSubmit = async (values: LoginForm) => {
    setLoading(true);
    try {
      const data: any = await login({
        ...values,
        captchaId,
      });

      // 检查是否需要2FA验证
      if (data.requiresTwoFactor) {
        message.info(data.message || '请输入双因素认证代码');
        setLoginCredentials({ ...values, captchaId });
        setTwoFactorModalVisible(true);
        setLoading(false);
        return;
      }

      // 正常登录流程
      localStorage.setItem('token', data.token);
      message.success('登录成功');
      navigate('/');
    } catch (error: any) {
      message.error(error.response?.data?.message || '登录失败');
      // 登录失败后刷新验证码
      fetchCaptcha();
      form.setFieldValue('captcha', '');
    } finally {
      setLoading(false);
    }
  };

  // 处理2FA验证
  const handle2FAVerify = async () => {
    if (!twoFactorToken || twoFactorToken.length !== 6) {
      message.error('请输入6位验证码');
      return;
    }

    setLoading(true);
    try {
      const result = await verify2FA({
        ...loginCredentials,
        twoFactorToken,
      });

      localStorage.setItem('token', result.token);
      message.success('登录成功');
      setTwoFactorModalVisible(false);
      setTwoFactorToken('');
      navigate('/');
    } catch (error: any) {
      message.error(error.response?.data?.message || '验证码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card title="云手机平台 - 管理后台" className="login-card">
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
            <Button type="primary" htmlType="submit" block loading={loading}>
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
          setLoginCredentials(null);
        }}
        onOk={handle2FAVerify}
        okText="验证"
        cancelText="取消"
        okButtonProps={{ loading }}
      >
        <div style={{ padding: '20px 0' }}>
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
