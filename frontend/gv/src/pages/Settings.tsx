import { Card, Form, Input, Button, Switch, Select, Divider, Typography, message, Space, Row, Col } from 'antd';
import {
  SaveOutlined,
  UserOutlined,
  LockOutlined,
  BellOutlined,
  GlobalOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

const Settings = () => {
  const [form] = Form.useForm();

  const handleSave = () => {
    message.success('设置已保存（演示模式）');
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          系统设置
        </Title>
        <Text type="secondary">配置系统参数和个人偏好</Text>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          {/* 基本设置 */}
          <Card title={<><UserOutlined /> 基本设置</>} style={{ marginBottom: 24 }}>
            <Form form={form} layout="vertical" initialValues={{
              username: 'admin',
              email: 'admin@gov.cn',
              department: '信息安全部',
            }}>
              <Form.Item label="用户名" name="username">
                <Input disabled />
              </Form.Item>
              <Form.Item label="邮箱" name="email">
                <Input />
              </Form.Item>
              <Form.Item label="所属部门" name="department">
                <Input />
              </Form.Item>
            </Form>
          </Card>

          {/* 安全设置 */}
          <Card title={<><LockOutlined /> 安全设置</>} style={{ marginBottom: 24 }}>
            <Form layout="vertical">
              <Form.Item label="修改密码">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Input.Password placeholder="当前密码" />
                  <Input.Password placeholder="新密码" />
                  <Input.Password placeholder="确认新密码" />
                </Space>
              </Form.Item>
              <Form.Item label="双因素认证" name="twoFactor">
                <Space>
                  <Switch defaultChecked />
                  <Text type="secondary">启用后登录需要验证码</Text>
                </Space>
              </Form.Item>
              <Form.Item label="登录超时时间" name="sessionTimeout">
                <Select defaultValue={30} style={{ width: 200 }}>
                  <Select.Option value={15}>15 分钟</Select.Option>
                  <Select.Option value={30}>30 分钟</Select.Option>
                  <Select.Option value={60}>1 小时</Select.Option>
                  <Select.Option value={120}>2 小时</Select.Option>
                </Select>
              </Form.Item>
            </Form>
          </Card>

          {/* 通知设置 */}
          <Card title={<><BellOutlined /> 通知设置</>} style={{ marginBottom: 24 }}>
            <Form layout="vertical">
              <Form.Item label="系统通知">
                <Space>
                  <Switch defaultChecked />
                  <Text type="secondary">接收系统通知消息</Text>
                </Space>
              </Form.Item>
              <Form.Item label="设备状态变更通知">
                <Space>
                  <Switch defaultChecked />
                  <Text type="secondary">设备启动/停止时通知</Text>
                </Space>
              </Form.Item>
              <Form.Item label="验证码接收通知">
                <Space>
                  <Switch defaultChecked />
                  <Text type="secondary">收到新验证码时通知</Text>
                </Space>
              </Form.Item>
              <Form.Item label="代理状态通知">
                <Space>
                  <Switch defaultChecked />
                  <Text type="secondary">代理即将过期时通知</Text>
                </Space>
              </Form.Item>
            </Form>
          </Card>

          <Button type="primary" icon={<SaveOutlined />} size="large" onClick={handleSave}>
            保存设置
          </Button>
        </Col>

        <Col span={8}>
          {/* 系统信息 */}
          <Card title={<><SafetyCertificateOutlined /> 系统信息</>}>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">系统版本</Text>
              <div style={{ fontWeight: 500 }}>v1.0.0</div>
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">最后登录时间</Text>
              <div>2024-01-20 10:30:45</div>
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">最后登录IP</Text>
              <div>192.168.1.100</div>
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <div>
              <Text type="secondary">账户状态</Text>
              <div style={{ color: '#52c41a' }}>正常</div>
            </div>
          </Card>

          {/* 快速链接 */}
          <Card title={<><GlobalOutlined /> 快速链接</>} style={{ marginTop: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="link" style={{ padding: 0 }}>
                使用帮助文档
              </Button>
              <Button type="link" style={{ padding: 0 }}>
                API 接口文档
              </Button>
              <Button type="link" style={{ padding: 0 }}>
                系统操作日志
              </Button>
              <Button type="link" style={{ padding: 0 }}>
                联系技术支持
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Settings;
