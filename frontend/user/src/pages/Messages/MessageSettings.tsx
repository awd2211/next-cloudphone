import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Switch,
  Button,
  Space,
  Divider,
  Typography,
  message,
  TimePicker,
  Alert,
  Row,
  Col,
  Spin,
} from 'antd';
import {
  BellOutlined,
  MailOutlined,
  MessageOutlined,
  MobileOutlined,
  SoundOutlined,
  ClockCircleOutlined,
  SaveOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import {
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings,
} from '@/services/notification';

const { Title, Text, Paragraph } = Typography;

const MessageSettings: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);

  // 加载设置
  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getNotificationSettings();
      setSettings(data);

      // 转换时间格式
      const formData: any = {
        ...data,
      };

      if (data.quietHoursStart) {
        formData.quietHoursStart = dayjs(data.quietHoursStart, 'HH:mm');
      }
      if (data.quietHoursEnd) {
        formData.quietHoursEnd = dayjs(data.quietHoursEnd, 'HH:mm');
      }

      form.setFieldsValue(formData);
    } catch (error) {
      message.error('加载设置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // 保存设置
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      // 转换时间格式
      const settingsData: Partial<NotificationSettings> = {
        ...values,
      };

      if (values.quietHoursStart) {
        settingsData.quietHoursStart = (values.quietHoursStart as Dayjs).format('HH:mm');
      }
      if (values.quietHoursEnd) {
        settingsData.quietHoursEnd = (values.quietHoursEnd as Dayjs).format('HH:mm');
      }

      setSaving(true);
      await updateNotificationSettings(settingsData);
      message.success('保存成功');
      loadSettings();
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 重置为默认
  const handleReset = () => {
    form.setFieldsValue({
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      soundEnabled: true,
      systemNotifications: true,
      ticketNotifications: true,
      orderNotifications: true,
      deviceNotifications: true,
      billingNotifications: true,
      promotionNotifications: true,
      quietHoursEnabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={4} style={{ margin: 0 }}>
            <BellOutlined /> 消息通知设置
          </Title>
          <Text type="secondary">自定义您的消息通知偏好，控制如何接收各类通知提醒</Text>
        </Space>
      </Card>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: true,
          soundEnabled: true,
          systemNotifications: true,
          ticketNotifications: true,
          orderNotifications: true,
          deviceNotifications: true,
          billingNotifications: true,
          promotionNotifications: true,
          quietHoursEnabled: false,
        }}
      >
        {/* 通知方式 */}
        <Card
          title={
            <Space>
              <MessageOutlined />
              <span>通知方式</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="emailEnabled" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Card
                  size="small"
                  hoverable
                  style={{
                    textAlign: 'center',
                    borderColor: form.getFieldValue('emailEnabled') ? '#1890ff' : undefined,
                  }}
                >
                  <Space direction="vertical" size="small">
                    <MailOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>邮件通知</div>
                      <Switch
                        checked={form.getFieldValue('emailEnabled')}
                        onChange={(checked) => form.setFieldValue('emailEnabled', checked)}
                      />
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      重要消息邮件提醒
                    </Text>
                  </Space>
                </Card>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="smsEnabled" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Card
                  size="small"
                  hoverable
                  style={{
                    textAlign: 'center',
                    borderColor: form.getFieldValue('smsEnabled') ? '#1890ff' : undefined,
                  }}
                >
                  <Space direction="vertical" size="small">
                    <MobileOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>短信通知</div>
                      <Switch
                        checked={form.getFieldValue('smsEnabled')}
                        onChange={(checked) => form.setFieldValue('smsEnabled', checked)}
                      />
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      紧急事件短信提醒
                    </Text>
                  </Space>
                </Card>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="pushEnabled" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Card
                  size="small"
                  hoverable
                  style={{
                    textAlign: 'center',
                    borderColor: form.getFieldValue('pushEnabled') ? '#1890ff' : undefined,
                  }}
                >
                  <Space direction="vertical" size="small">
                    <BellOutlined style={{ fontSize: 32, color: '#faad14' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>推送通知</div>
                      <Switch
                        checked={form.getFieldValue('pushEnabled')}
                        onChange={(checked) => form.setFieldValue('pushEnabled', checked)}
                      />
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      浏览器推送提醒
                    </Text>
                  </Space>
                </Card>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="soundEnabled" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Card
                  size="small"
                  hoverable
                  style={{
                    textAlign: 'center',
                    borderColor: form.getFieldValue('soundEnabled') ? '#1890ff' : undefined,
                  }}
                >
                  <Space direction="vertical" size="small">
                    <SoundOutlined style={{ fontSize: 32, color: '#722ed1' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>声音提醒</div>
                      <Switch
                        checked={form.getFieldValue('soundEnabled')}
                        onChange={(checked) => form.setFieldValue('soundEnabled', checked)}
                      />
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      新消息声音提示
                    </Text>
                  </Space>
                </Card>
              </Form.Item>
            </Col>
          </Row>

          <Alert
            message="提示"
            description="邮件和短信通知可能会产生额外费用，建议仅对重要通知启用"
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        </Card>

        {/* 通知类型 */}
        <Card
          title={
            <Space>
              <BellOutlined />
              <span>通知类型</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Paragraph type="secondary">选择您希望接收的通知类型</Paragraph>

          <Row gutter={[24, 16]}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="systemNotifications"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '4px',
                    backgroundColor: '#f5f5f5',
                  }}
                >
                  <Space>
                    <BellOutlined style={{ fontSize: 18, color: '#1890ff' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>系统通知</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        系统公告、维护通知
                      </Text>
                    </div>
                  </Space>
                  <Switch
                    checked={form.getFieldValue('systemNotifications')}
                    onChange={(checked) => form.setFieldValue('systemNotifications', checked)}
                  />
                </div>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="ticketNotifications"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '4px',
                    backgroundColor: '#f5f5f5',
                  }}
                >
                  <Space>
                    <MessageOutlined style={{ fontSize: 18, color: '#52c41a' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>工单通知</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        工单回复、状态变更
                      </Text>
                    </div>
                  </Space>
                  <Switch
                    checked={form.getFieldValue('ticketNotifications')}
                    onChange={(checked) => form.setFieldValue('ticketNotifications', checked)}
                  />
                </div>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="orderNotifications"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '4px',
                    backgroundColor: '#f5f5f5',
                  }}
                >
                  <Space>
                    <MessageOutlined style={{ fontSize: 18, color: '#faad14' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>订单通知</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        订单创建、完成、失败
                      </Text>
                    </div>
                  </Space>
                  <Switch
                    checked={form.getFieldValue('orderNotifications')}
                    onChange={(checked) => form.setFieldValue('orderNotifications', checked)}
                  />
                </div>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="deviceNotifications"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '4px',
                    backgroundColor: '#f5f5f5',
                  }}
                >
                  <Space>
                    <MobileOutlined style={{ fontSize: 18, color: '#13c2c2' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>设备通知</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        设备状态、应用安装
                      </Text>
                    </div>
                  </Space>
                  <Switch
                    checked={form.getFieldValue('deviceNotifications')}
                    onChange={(checked) => form.setFieldValue('deviceNotifications', checked)}
                  />
                </div>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="billingNotifications"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '4px',
                    backgroundColor: '#f5f5f5',
                  }}
                >
                  <Space>
                    <MessageOutlined style={{ fontSize: 18, color: '#eb2f96' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>账单通知</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        充值、余额不足
                      </Text>
                    </div>
                  </Space>
                  <Switch
                    checked={form.getFieldValue('billingNotifications')}
                    onChange={(checked) => form.setFieldValue('billingNotifications', checked)}
                  />
                </div>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="promotionNotifications"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '4px',
                    backgroundColor: '#f5f5f5',
                  }}
                >
                  <Space>
                    <MessageOutlined style={{ fontSize: 18, color: '#fa8c16' }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>促销通知</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        优惠活动、新功能
                      </Text>
                    </div>
                  </Space>
                  <Switch
                    checked={form.getFieldValue('promotionNotifications')}
                    onChange={(checked) => form.setFieldValue('promotionNotifications', checked)}
                  />
                </div>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 免打扰设置 */}
        <Card
          title={
            <Space>
              <ClockCircleOutlined />
              <span>免打扰时间</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Paragraph type="secondary">
            在指定时间段内，系统将不会发送推送通知和声音提醒（紧急通知除外）
          </Paragraph>

          <Form.Item
            name="quietHoursEnabled"
            valuePropName="checked"
            label={
              <Space>
                <span>启用免打扰</span>
                <Text type="secondary" style={{ fontWeight: 'normal' }}>
                  (建议在休息时间启用)
                </Text>
              </Space>
            }
          >
            <Switch />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.quietHoursEnabled !== currentValues.quietHoursEnabled
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('quietHoursEnabled') ? (
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="quietHoursStart"
                      label="开始时间"
                      rules={[
                        {
                          required: getFieldValue('quietHoursEnabled'),
                          message: '请选择开始时间',
                        },
                      ]}
                    >
                      <TimePicker
                        format="HH:mm"
                        style={{ width: '100%' }}
                        placeholder="选择开始时间"
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="quietHoursEnd"
                      label="结束时间"
                      rules={[
                        {
                          required: getFieldValue('quietHoursEnabled'),
                          message: '请选择结束时间',
                        },
                      ]}
                    >
                      <TimePicker
                        format="HH:mm"
                        style={{ width: '100%' }}
                        placeholder="选择结束时间"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              ) : null
            }
          </Form.Item>

          {form.getFieldValue('quietHoursEnabled') && (
            <Alert
              message="免打扰期间，紧急通知（如安全提醒）仍会正常发送"
              type="warning"
              showIcon
            />
          )}
        </Card>

        {/* 操作按钮 */}
        <Card>
          <Space>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
              保存设置
            </Button>

            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              恢复默认
            </Button>

            <Button onClick={() => navigate('/messages')}>返回消息列表</Button>
          </Space>
        </Card>
      </Form>
    </div>
  );
};

export default MessageSettings;
