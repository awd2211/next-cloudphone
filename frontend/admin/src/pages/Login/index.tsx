import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Row, Col } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login, getCaptcha } from '@/services/auth';
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
      const { data } = await login({
        ...values,
        captchaId,
      });
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
    </div>
  );
};

export default Login;
