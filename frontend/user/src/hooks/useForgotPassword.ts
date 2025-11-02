import { useState, useCallback } from 'react';
import { Form, message } from 'antd';
import { forgotPassword } from '@/services/auth';
import type { ForgotPasswordFormValues } from '@/components/Auth/ForgotPasswordForm';

/**
 * 忘记密码 Hook
 *
 * 功能：
 * 1. 管理表单状态
 * 2. 处理忘记密码提交
 * 3. 管理加载和成功状态
 */
export const useForgotPassword = () => {
  const [form] = Form.useForm<ForgotPasswordFormValues>();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  /**
   * 处理忘记密码提交
   */
  const handleSubmit = useCallback(async (values: ForgotPasswordFormValues) => {
    setLoading(true);

    try {
      // 调用忘记密码 API
      await forgotPassword({
        type: values.type,
        email: values.type === 'email' ? values.email : undefined,
        phone: values.type === 'phone' ? values.phone : undefined,
      });

      // 显示成功状态
      setSuccess(true);
      message.success('重置链接已发送，请查收邮件');
    } catch (error: any) {
      // 错误处理
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        '发送失败，请稍后重试';

      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    form,
    loading,
    success,
    handleSubmit,
  };
};
