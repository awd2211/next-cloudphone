import { useState, useEffect, useCallback } from 'react';
import { Form, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import {
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings,
} from '@/services/notification';

/**
 * 消息设置业务逻辑 Hook
 * 封装设置加载、保存和重置功能
 * @param userId - 当前用户ID (必需)
 */
export function useMessageSettings(userId: string) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);

  // 加载设置
  const loadSettings = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getNotificationSettings(userId);
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
  }, [userId, form]);

  // 页面加载时获取数据
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 保存设置
  const handleSave = useCallback(async () => {
    if (!userId) return;
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
      await updateNotificationSettings(userId, settingsData);
      message.success('保存成功');
      loadSettings();
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  }, [userId, form, loadSettings]);

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

  return {
    form,
    loading,
    saving,
    settings,
    handleSave,
    handleReset,
  };
}
