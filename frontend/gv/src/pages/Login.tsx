import { useState, useEffect, useCallback, useRef } from 'react';
import { Form, Input, Button, Card, message, Typography, Checkbox, Space, Divider } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  SafetyOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  KeyOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/services/api';

const { Title, Text } = Typography;

interface LoginForm {
  username: string;
  password: string;
  captcha: string;
  remember: boolean;
}

// 生成随机验证码
const generateCaptcha = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 验证码画布组件
const CaptchaCanvas = ({
  code,
  onClick,
}: {
  code: string;
  onClick: () => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景
    ctx.fillStyle = '#f0f2f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 干扰线
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(${Math.random() * 200}, ${Math.random() * 200}, ${Math.random() * 200}, 0.5)`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // 干扰点
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.8)`;
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // 绘制验证码文字
    ctx.font = 'bold 28px Arial';
    ctx.textBaseline = 'middle';

    const colors = ['#1677ff', '#c41d1d', '#52c41a', '#722ed1', '#faad14'];

    for (let i = 0; i < code.length; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.save();
      ctx.translate(25 + i * 28, 25 + Math.random() * 10 - 5);
      ctx.rotate((Math.random() - 0.5) * 0.4);
      ctx.fillText(code[i], 0, 0);
      ctx.restore();
    }
  }, [code]);

  return (
    <canvas
      ref={canvasRef}
      width={130}
      height={50}
      onClick={onClick}
      style={{
        cursor: 'pointer',
        borderRadius: 4,
        border: '1px solid #d9d9d9',
      }}
      title="点击刷新验证码"
    />
  );
};

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState(() => generateCaptcha());
  const [form] = Form.useForm();

  // 初始化记住的用户名
  useEffect(() => {
    const rememberedUser = localStorage.getItem('gv-remembered-user');
    if (rememberedUser) {
      form.setFieldsValue({
        username: rememberedUser,
        remember: true,
      });
    }
  }, [form]);

  // 刷新验证码
  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
    form.setFieldValue('captcha', '');
  }, [form]);

  const handleSubmit = async (values: LoginForm) => {
    // 验证码校验（忽略大小写）
    if (values.captcha.toUpperCase() !== captcha.toUpperCase()) {
      message.error('验证码错误，请重新输入');
      refreshCaptcha();
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.login({
        username: values.username,
        password: values.password,
      });

      // 保存登录信息
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));

      // 记住用户名
      if (values.remember) {
        localStorage.setItem('gv-remembered-user', values.username);
      } else {
        localStorage.removeItem('gv-remembered-user');
      }

      message.success('登录成功');
      navigate('/dashboard');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败');
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #001529 0%, #003366 50%, #001529 100%)',
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 背景装饰元素 */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: 300,
          height: 300,
          background: 'radial-gradient(circle, rgba(22, 119, 255, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(196, 29, 29, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

      <Card
        style={{
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        bordered={false}
      >
        {/* Logo和标题区域 */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 4px 20px rgba(22, 119, 255, 0.4)',
            }}
          >
            <SafetyCertificateOutlined style={{ fontSize: 40, color: '#fff' }} />
          </div>
          <Title level={3} style={{ margin: 0, color: '#001529', letterSpacing: 3 }}>
            境外移动集群
          </Title>
          <Title
            level={4}
            style={{
              margin: '8px 0 0',
              color: '#c41d1d',
              letterSpacing: 4,
              fontWeight: 700,
            }}
          >
            察打一体平台
          </Title>
          <Text
            type="secondary"
            style={{
              marginTop: 12,
              display: 'block',
              fontSize: 13,
            }}
          >
            <SafetyOutlined style={{ marginRight: 4 }} />
            安全登录系统
          </Text>
        </div>

        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
          initialValues={{
            username: 'admin',
            password: 'admin123',
            remember: false,
          }}
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="密码"
              autoComplete="current-password"
              iconRender={(visible) =>
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
              }
            />
          </Form.Item>

          <Form.Item
            name="captcha"
            rules={[
              { required: true, message: '请输入验证码' },
              { len: 4, message: '验证码为4位' },
            ]}
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input
                prefix={<KeyOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="验证码"
                style={{ flex: 1 }}
                maxLength={4}
                autoComplete="off"
              />
              <CaptchaCanvas code={captcha} onClick={refreshCaptcha} />
            </Space.Compact>
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>记住用户名</Checkbox>
              </Form.Item>
              <Button type="link" size="small" style={{ padding: 0 }}>
                忘记密码？
              </Button>
            </div>
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: 48,
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: 4,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(22, 119, 255, 0.4)',
              }}
            >
              安全登录
            </Button>
          </Form.Item>
        </Form>

        <Divider plain style={{ margin: '16px 0' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            演示账号信息
          </Text>
        </Divider>

        <div
          style={{
            textAlign: 'center',
            padding: '12px 16px',
            background: '#f6ffed',
            borderRadius: 8,
            border: '1px solid #b7eb8f',
          }}
        >
          <Text style={{ fontSize: 13 }}>
            <Text strong>用户名：</Text>admin &nbsp;&nbsp;
            <Text strong>密码：</Text>admin123
          </Text>
        </div>

        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid #f0f0f0',
            textAlign: 'center',
          }}
        >
          <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.6 }}>
            本系统仅供授权人员使用
            <br />
            非法访问将被追究法律责任
          </Text>
        </div>

        {/* 版本信息 */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 10 }}>
            v1.0.0 | 技术支持: support@cloudphone.run
          </Text>
        </div>
      </Card>

      {/* 页脚版权 */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 0,
          right: 0,
          textAlign: 'center',
        }}
      >
        <Text style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: 12 }}>
          Copyright 2024 CloudPhone Platform. All Rights Reserved.
        </Text>
      </div>
    </div>
  );
};

export default Login;
