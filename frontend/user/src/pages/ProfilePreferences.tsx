import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Select,
  Switch,
  Button,
  message,
  Divider,
  Space,
  Alert,
  Typography,
  Row,
  Col,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  GlobalOutlined,
  BgColorsOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { getUserInfo, updateUserPreferences } from '@/services/user';

const { Title, Paragraph } = Typography;
const { Option } = Select;

interface UserPreferences {
  language: string;
  theme: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  systemNotifications: boolean;
  marketingEmails: boolean;
}

const ProfilePreferences = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState<UserPreferences | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const res = await getUserInfo();
      const user = res.data;

      const preferences: UserPreferences = {
        language: user.language || 'zh-CN',
        theme: user.theme || 'light',
        emailNotifications: user.preferences?.emailNotifications ?? true,
        smsNotifications: user.preferences?.smsNotifications ?? false,
        systemNotifications: user.preferences?.systemNotifications ?? true,
        marketingEmails: user.preferences?.marketingEmails ?? false,
      };

      setInitialValues(preferences);
      form.setFieldsValue(preferences);
    } catch (error) {
      message.error('加载偏好设置失败');
    }
  };

  const handleSubmit = async (values: UserPreferences) => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        message.error('用户未登录');
        return;
      }

      await updateUserPreferences(userId, {
        language: values.language,
        theme: values.theme,
        preferences: {
          emailNotifications: values.emailNotifications,
          smsNotifications: values.smsNotifications,
          systemNotifications: values.systemNotifications,
          marketingEmails: values.marketingEmails,
        },
      });

      message.success('偏好设置已保存');

      // 如果语言或主题改变，提示刷新页面
      if (
        initialValues &&
        (values.language !== initialValues.language || values.theme !== initialValues.theme)
      ) {
        message.info('语言或主题设置已更改，建议刷新页面以应用更改', 3);
      }

      setInitialValues(values);
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/profile')}>
          返回个人中心
        </Button>
      </Space>

      <Title level={2}>偏好设置</Title>
      <Paragraph type="secondary">自定义您的使用体验，包括语言、主题和通知偏好</Paragraph>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            language: 'zh-CN',
            theme: 'light',
            emailNotifications: true,
            smsNotifications: false,
            systemNotifications: true,
            marketingEmails: false,
          }}
        >
          {/* 语言和外观 */}
          <Title level={4}>
            <GlobalOutlined /> 语言和外观
          </Title>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="界面语言" name="language" tooltip="选择您偏好的界面显示语言">
                <Select size="large">
                  <Option value="zh-CN">简体中文</Option>
                  <Option value="zh-TW">繁體中文</Option>
                  <Option value="en-US">English (US)</Option>
                  <Option value="ja-JP">日本語</Option>
                  <Option value="ko-KR">한국어</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="主题模式" name="theme" tooltip="选择浅色或深色主题">
                <Select size="large">
                  <Option value="light">
                    <BgColorsOutlined /> 浅色模式
                  </Option>
                  <Option value="dark">
                    <BgColorsOutlined /> 深色模式
                  </Option>
                  <Option value="auto">
                    <BgColorsOutlined /> 跟随系统
                  </Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          {/* 通知偏好 */}
          <Title level={4}>
            <BellOutlined /> 通知偏好
          </Title>
          <Alert
            message="控制您接收通知的方式"
            description="您可以选择通过哪些渠道接收不同类型的通知"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Form.Item label="邮件通知" name="emailNotifications" valuePropName="checked">
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
          <Paragraph type="secondary" style={{ marginTop: -16, marginBottom: 16 }}>
            接收设备状态、账单、工单回复等重要通知邮件
          </Paragraph>

          <Form.Item label="短信通知" name="smsNotifications" valuePropName="checked">
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
          <Paragraph type="secondary" style={{ marginTop: -16, marginBottom: 16 }}>
            接收紧急通知和安全验证短信
          </Paragraph>

          <Form.Item label="系统消息通知" name="systemNotifications" valuePropName="checked">
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
          <Paragraph type="secondary" style={{ marginTop: -16, marginBottom: 16 }}>
            在平台内接收系统消息和重要公告
          </Paragraph>

          <Form.Item label="营销邮件" name="marketingEmails" valuePropName="checked">
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
          <Paragraph type="secondary" style={{ marginTop: -16, marginBottom: 16 }}>
            接收产品更新、优惠活动等营销信息
          </Paragraph>

          <Divider />

          {/* 操作按钮 */}
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
                size="large"
              >
                保存设置
              </Button>
              <Button onClick={handleReset} size="large">
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 说明 */}
      <Card style={{ marginTop: 24 }} bordered={false}>
        <Title level={5}>关于偏好设置</Title>
        <ul>
          <li>语言和主题设置会立即应用到您的账户</li>
          <li>部分设置可能需要刷新页面后生效</li>
          <li>通知偏好不会影响安全相关的关键通知</li>
          <li>即使关闭营销邮件，您仍会收到账单和系统通知</li>
        </ul>
      </Card>
    </div>
  );
};

export default ProfilePreferences;
