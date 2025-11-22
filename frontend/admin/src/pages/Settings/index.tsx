import { useState, useEffect } from 'react';
import { Tabs, Form, message } from 'antd';
import request from '../../utils/request';
import {
  BasicSettingsTab,
  EmailSettingsTab,
  SmsSettingsTab,
  PaymentSettingsTab,
  StorageSettingsTab,
} from '@/components/Settings';

const Settings = () => {
  const [basicForm] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [smsForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [storageForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testSmsLoading, setTestSmsLoading] = useState(false);
  const [selectedSmsProvider, setSelectedSmsProvider] = useState<string>('aliyun');

  // 加载设置
  const loadSettings = async () => {
    try {
      // 从后端 API 加载设置
      // request.get 已经返回 response.data，无需再取 .data
      const settings = await request.get('/settings') as any;

      // 设置基本配置
      if (settings?.basic) {
        basicForm.setFieldsValue(settings.basic);
      }

      // 设置邮件配置
      if (settings?.email) {
        emailForm.setFieldsValue(settings.email);
      }

      // 设置短信配置
      if (settings?.sms) {
        smsForm.setFieldsValue(settings.sms);
      }

      // 设置支付配置
      if (settings?.payment) {
        paymentForm.setFieldsValue(settings.payment);
      }

      // 设置存储配置
      if (settings?.storage) {
        storageForm.setFieldsValue(settings.storage);
      }
    } catch (error) {
      message.error('加载设置失败');
      console.error('Failed to load settings:', error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // 保存基本设置
  const handleSaveBasic = async (values: any) => {
    setLoading(true);
    try {
      // 调用后端 API 保存基本设置
      await request.put('/settings/basic', values);
      message.success('基本设置保存成功');
    } catch (error) {
      message.error('保存基本设置失败');
      console.error('Failed to save basic settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存邮件设置
  const handleSaveEmail = async (values: any) => {
    setLoading(true);
    try {
      await request.put('/settings/email', values);
      message.success('邮件设置保存成功');
    } catch (error) {
      message.error('保存邮件设置失败');
      console.error('Failed to save email settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存短信设置
  const handleSaveSms = async (values: any) => {
    setLoading(true);
    try {
      await request.put('/settings/sms', values);
      message.success('短信设置保存成功');
    } catch (error) {
      message.error('保存短信设置失败');
      console.error('Failed to save SMS settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存支付设置
  const handleSavePayment = async (values: any) => {
    setLoading(true);
    try {
      await request.put('/settings/payment', values);
      message.success('支付设置保存成功');
    } catch (error) {
      message.error('保存支付设置失败');
      console.error('Failed to save payment settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存存储设置
  const handleSaveStorage = async (values: any) => {
    setLoading(true);
    try {
      await request.put('/settings/storage', values);
      message.success('存储设置保存成功');
    } catch (error) {
      message.error('保存存储设置失败');
      console.error('Failed to save storage settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // 测试邮件发送
  const handleTestEmail = async (testEmail: string) => {
    try {
      const values = await emailForm.validateFields();
      setTestEmailLoading(true);
      await request.post('/email/test', {
        ...values,
        testEmail, // 用户输入的测试邮箱地址
      });
      message.success(`测试邮件已发送至 ${testEmail}，请检查收件箱`);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || '测试邮件发送失败';
      message.error(errorMsg);
      console.error('Failed to send test email:', error);
    } finally {
      setTestEmailLoading(false);
    }
  };

  // 测试短信发送
  const handleTestSms = async () => {
    try {
      const values = await smsForm.validateFields();
      setTestSmsLoading(true);
      await request.post('/settings/sms/test', values);
      message.success('测试短信发送成功，请检查手机');
    } catch (error) {
      message.error('测试短信发送失败');
      console.error('Failed to send test SMS:', error);
    } finally {
      setTestSmsLoading(false);
    }
  };

  const items = [
    {
      key: 'basic',
      label: '基本设置',
      children: (
        <BasicSettingsTab form={basicForm} loading={loading} onFinish={handleSaveBasic} />
      ),
    },
    {
      key: 'email',
      label: '邮件设置',
      children: (
        <EmailSettingsTab
          form={emailForm}
          loading={loading}
          testLoading={testEmailLoading}
          onFinish={handleSaveEmail}
          onTest={handleTestEmail}
        />
      ),
    },
    {
      key: 'sms',
      label: '短信设置',
      children: (
        <SmsSettingsTab
          form={smsForm}
          loading={loading}
          testLoading={testSmsLoading}
          selectedProvider={selectedSmsProvider}
          onFinish={handleSaveSms}
          onTest={handleTestSms}
          onProviderChange={setSelectedSmsProvider}
        />
      ),
    },
    {
      key: 'payment',
      label: '支付设置',
      children: (
        <PaymentSettingsTab form={paymentForm} loading={loading} onFinish={handleSavePayment} />
      ),
    },
    {
      key: 'storage',
      label: '存储设置',
      children: (
        <StorageSettingsTab form={storageForm} loading={loading} onFinish={handleSaveStorage} />
      ),
    },
  ];

  return (
    <div>
      <h2>系统设置</h2>
      <Tabs items={items} />
    </div>
  );
};

export default Settings;
