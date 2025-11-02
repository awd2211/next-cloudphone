import React from 'react';
import { Card, Form, Button, Space, Typography, Spin } from 'antd';
import { BellOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  NotificationMethodCards,
  NotificationTypeList,
  QuietHoursSettings,
} from '@/components/Message';
import { useMessageSettings } from '@/hooks/useMessageSettings';

const { Title, Text } = Typography;

/**
 * 消息设置页面
 * 管理通知方式、类型和免打扰时间
 */
const MessageSettings: React.FC = () => {
  const navigate = useNavigate();
  const { form, loading, saving, handleSave, handleReset } = useMessageSettings();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* 页面标题 */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={4} style={{ margin: 0 }}>
            <BellOutlined /> 消息通知设置
          </Title>
          <Text type="secondary">自定义您的消息通知偏好，控制如何接收各类通知提醒</Text>
        </Space>
      </Card>

      {/* 设置表单 */}
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
        <NotificationMethodCards form={form} />

        {/* 通知类型 */}
        <NotificationTypeList form={form} />

        {/* 免打扰设置 */}
        <QuietHoursSettings form={form} />

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
