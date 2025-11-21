import React, { useCallback, useEffect } from 'react';
import { Card, Form, Button, Space, Typography, Spin } from 'antd';
import { BellOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import {
  NotificationMethodCards,
  NotificationTypeList,
  QuietHoursSettings,
} from '@/components/Message';
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from '@/hooks/queries';
import type { NotificationSettings } from '@/services/notification';

const { Title, Text } = Typography;

/**
 * 消息设置页面
 *
 * 功能：
 * 1. 通知方式设置（邮件、短信、推送、声音）
 * 2. 通知类型设置（系统、工单、订单、设备等）
 * 3. 免打扰时间设置
 * 4. 保存/恢复默认设置
 */
const MessageSettings: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // React Query hooks
  const { data: settings, isLoading: loading } = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();

  // 加载设置到表单
  useEffect(() => {
    if (settings) {
      const formData: any = { ...settings };

      // 转换时间格式
      if (settings.quietHoursStart) {
        formData.quietHoursStart = dayjs(settings.quietHoursStart, 'HH:mm');
      }
      if (settings.quietHoursEnd) {
        formData.quietHoursEnd = dayjs(settings.quietHoursEnd, 'HH:mm');
      }

      form.setFieldsValue(formData);
    }
  }, [settings, form]);

  // 保存设置
  const handleSave = useCallback(async () => {
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

    await updateSettings.mutateAsync(settingsData);
  }, [form, updateSettings]);

  // 重置为默认
  const handleReset = useCallback(() => {
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
  }, [form]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载设置中..." />
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
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={updateSettings.isPending}
              onClick={handleSave}
            >
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
