import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Row, Col, message, Spin, theme } from 'antd';
import {
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  WechatOutlined,
  QqOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getSiteSettings, type SiteSettings } from '@/services/cms';

const { TextArea } = Input;
const { useToken } = theme;

/**
 * 联系我们页面
 * 提供联系表单、联系方式和办公地址
 */
// 默认联系方式图标配置函数
const getDefaultContactMethods = (token: any) => [
  {
    icon: <PhoneOutlined style={{ fontSize: 32, color: token.colorPrimary }} />,
    title: '电话咨询',
    content: '400-123-4567',
    description: '工作日 9:00-18:00',
  },
  {
    icon: <MailOutlined style={{ fontSize: 32, color: token.colorSuccess }} />,
    title: '邮箱联系',
    content: 'support@cloudphone.run',
    description: '我们会在24小时内回复',
  },
  {
    icon: <WechatOutlined style={{ fontSize: 32, color: token.colorSuccess }} />,
    title: '微信客服',
    content: 'CloudPhone_Support',
    description: '扫码添加客服微信',
  },
  {
    icon: <QqOutlined style={{ fontSize: 32, color: token.colorPrimary }} />,
    title: 'QQ 群',
    content: '123456789',
    description: '加入开发者交流群',
  },
];

// 默认办公地址
const defaultOffices = [
  {
    city: '北京总部',
    address: '北京市朝阳区建国路 88 号 SOHO 现代城',
    phone: '010-12345678',
  },
  {
    city: '上海分公司',
    address: '上海市浦东新区陆家嘴环路 1000 号',
    phone: '021-12345678',
  },
  {
    city: '深圳分公司',
    address: '深圳市南山区科技园南区科苑路 15 号',
    phone: '0755-12345678',
  },
];

const Contact: React.FC = () => {
  const { token } = useToken();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);

  // 从 CMS 加载网站设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const settings = await getSiteSettings();
        setSiteSettings(settings);
      } catch (error) {
        console.error('Failed to load site settings from CMS, using defaults:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  // 根据 CMS 数据生成联系方式
  const contactMethods = siteSettings
    ? [
        {
          icon: <PhoneOutlined style={{ fontSize: 32, color: token.colorPrimary }} />,
          title: '电话咨询',
          content: siteSettings.contact.phone,
          description: '工作日 9:00-18:00',
        },
        {
          icon: <MailOutlined style={{ fontSize: 32, color: token.colorSuccess }} />,
          title: '邮箱联系',
          content: siteSettings.contact.email,
          description: '我们会在24小时内回复',
        },
        {
          icon: <WechatOutlined style={{ fontSize: 32, color: token.colorSuccess }} />,
          title: '微信客服',
          content: siteSettings.contact.wechat,
          description: '扫码添加客服微信',
        },
        {
          icon: <QqOutlined style={{ fontSize: 32, color: token.colorPrimary }} />,
          title: 'QQ 群',
          content: siteSettings.contact.qq_group,
          description: '加入开发者交流群',
        },
      ]
    : getDefaultContactMethods(token);

  // 办公地址
  const offices = siteSettings?.company?.offices ?? defaultOffices;

  // 处理表单提交
  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      // 这里应该调用 API 提交表单
      console.log('Contact form submission:', values);

      // 模拟 API 调用
      await new Promise((resolve) => setTimeout(resolve, 1000));

      message.success('感谢您的留言！我们会尽快与您联系。');
      form.resetFields();
    } catch (error) {
      message.error('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* 页面内容 */}
      <div style={{ background: token.colorBgLayout, minHeight: 'calc(100vh - 300px)' }}>
        {/* Hero Section */}
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '80px 24px',
            textAlign: 'center',
            color: 'white',
          }}
        >
          <h1 style={{ fontSize: 48, marginBottom: 16, color: 'white' }}>联系我们</h1>
          <p style={{ fontSize: 20, opacity: 0.9 }}>
            有任何问题或建议？我们随时为您服务
          </p>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
              <p style={{ marginTop: 16, color: token.colorTextSecondary }}>正在加载联系信息...</p>
            </div>
          ) : (
          <>
          {/* 联系方式 */}
          <div style={{ marginBottom: 60 }}>
            <h2 style={{ fontSize: 28, marginBottom: 32, textAlign: 'center' }}>联系方式</h2>
            <Row gutter={[24, 24]}>
              {contactMethods.map((method, index) => (
                <Col xs={24} sm={12} md={6} key={index}>
                  <Card
                    hoverable
                    style={{ textAlign: 'center', height: '100%' }}
                  >
                    <div style={{ marginBottom: 16 }}>{method.icon}</div>
                    <h3 style={{ fontSize: 18, marginBottom: 12 }}>{method.title}</h3>
                    <p style={{ fontSize: 16, fontWeight: 600, color: token.colorPrimary, marginBottom: 8 }}>
                      {method.content}
                    </p>
                    <p style={{ fontSize: 14, color: token.colorTextSecondary }}>{method.description}</p>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>

          {/* 联系表单 + 营业时间 */}
          <Row gutter={[48, 48]}>
            {/* 左侧：联系表单 */}
            <Col xs={24} md={14}>
              <Card title="发送消息" style={{ height: '100%' }}>
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSubmit}
                >
                  <Form.Item
                    name="name"
                    label="姓名"
                    rules={[{ required: true, message: '请输入您的姓名' }]}
                  >
                    <Input size="large" placeholder="请输入您的姓名" />
                  </Form.Item>

                  <Form.Item
                    name="email"
                    label="邮箱"
                    rules={[
                      { required: true, message: '请输入您的邮箱' },
                      { type: 'email', message: '请输入有效的邮箱地址' },
                    ]}
                  >
                    <Input size="large" placeholder="your.email@example.com" />
                  </Form.Item>

                  <Form.Item
                    name="phone"
                    label="电话（选填）"
                  >
                    <Input size="large" placeholder="请输入您的联系电话" />
                  </Form.Item>

                  <Form.Item
                    name="subject"
                    label="主题"
                    rules={[{ required: true, message: '请输入消息主题' }]}
                  >
                    <Input size="large" placeholder="请简要描述您的问题" />
                  </Form.Item>

                  <Form.Item
                    name="message"
                    label="消息内容"
                    rules={[
                      { required: true, message: '请输入消息内容' },
                      { min: 10, message: '消息内容至少需要10个字符' },
                    ]}
                  >
                    <TextArea
                      rows={6}
                      placeholder="请详细描述您的问题或建议..."
                      maxLength={1000}
                      showCount
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      loading={submitting}
                      block
                    >
                      提交留言
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>

            {/* 右侧：工作时间和地址 */}
            <Col xs={24} md={10}>
              {/* 工作时间 */}
              <Card style={{ marginBottom: 24 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <ClockCircleOutlined style={{ fontSize: 48, color: token.colorWarning }} />
                  <h3 style={{ fontSize: 20, marginTop: 16, marginBottom: 16 }}>营业时间</h3>
                </div>
                <div style={{ fontSize: 15, lineHeight: 2 }}>
                  <p><strong>客服热线：</strong></p>
                  <p>周一至周五：9:00 - 18:00</p>
                  <p>周六至周日：10:00 - 17:00</p>
                  <p style={{ marginTop: 16 }}><strong>技术支持：</strong></p>
                  <p>7×24 小时在线支持</p>
                  <p style={{ marginTop: 16, color: '#999', fontSize: 14 }}>
                    法定节假日客服时间可能调整，请以实际为准
                  </p>
                </div>
              </Card>

              {/* 办公地址 */}
              <Card>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <EnvironmentOutlined style={{ fontSize: 48, color: token.colorPrimary }} />
                  <h3 style={{ fontSize: 20, marginTop: 16, marginBottom: 16 }}>办公地址</h3>
                </div>
                {offices.map((office, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: index < offices.length - 1 ? 24 : 0,
                      paddingBottom: index < offices.length - 1 ? 24 : 0,
                      borderBottom: index < offices.length - 1 ? '1px solid #f0f0f0' : 'none',
                    }}
                  >
                    <h4 style={{ fontSize: 16, marginBottom: 8, fontWeight: 600 }}>
                      {office.city}
                    </h4>
                    <p style={{ color: token.colorTextSecondary, marginBottom: 4, fontSize: 14 }}>
                      {office.address}
                    </p>
                    <p style={{ color: '#999', fontSize: 14 }}>电话：{office.phone}</p>
                  </div>
                ))}
              </Card>
            </Col>
          </Row>

          {/* 常见问题链接 */}
          <Card style={{ marginTop: 60, textAlign: 'center', background: token.colorBgLayout }}>
            <h3 style={{ fontSize: 20, marginBottom: 16 }}>访问帮助中心</h3>
            <p style={{ color: token.colorTextSecondary, marginBottom: 24 }}>
              您也可以在帮助中心查找常见问题的答案
            </p>
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/help')}
            >
              前往帮助中心
            </Button>
          </Card>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Contact;
