import { useState, useCallback } from 'react';
import { Form, message } from 'antd';
import { verifyResetToken, resetPassword } from '@/services/auth';
import type { ResetPasswordFormValues } from '@/components/Auth/ResetPasswordForm';

/**
 * 重置密码 Hook
 *
 * 功能：
 * 1. 验证重置 token 有效性
 * 2. 管理表单状态
 * 3. 处理密码重置提交
 * 4. 管理各种状态（验证中、加载中、成功等）
 */
export const useResetPassword = () => {
  const [form] = Form.useForm<ResetPasswordFormValues>();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  /**
   * 验证重置 token 是否有效
   */
  const verifyToken = useCallback(async (token: string) => {
    setVerifying(true);
    setTokenError('');

    try {
      // 调用验证 token API
      await verifyResetToken(token);

      // Token 有效
      setTokenValid(true);
    } catch (error: any) {
      // Token 无效
      setTokenValid(false);

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        '重置链接无效或已过期';

      setTokenError(errorMessage);
    } finally {
      setVerifying(false);
    }
  }, []);

  /**
   * 处理密码重置提交
   */
  const handleSubmit = useCallback(
    async (token: string, values: ResetPasswordFormValues) => {
      setLoading(true);

      try {
        // 调用重置密码 API
        await resetPassword({
          token,
          password: values.password,
        });

        // 显示成功状态
        setSuccess(true);
        message.success('密码重置成功，请使用新密码登录');

        // 清空表单
        form.resetFields();
      } catch (error: any) {
        // 错误处理
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          '重置失败，请稍后重试';

        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [form]
  );

  return {
    form,
    loading,
    verifying,
    tokenValid,
    tokenError,
    success,
    handleSubmit,
    verifyToken,
  };
};
