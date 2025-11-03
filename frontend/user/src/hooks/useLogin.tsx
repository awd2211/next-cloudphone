import { useState, useEffect, useCallback } from 'react';
import { Form, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { login, register, getCaptcha } from '@/services/auth';
import { verify2FA } from '@/services/twoFactor';
import type { LoginDto, RegisterDto } from '@/types';

/**
 * 登录页面业务逻辑 Hook
 * 封装登录、注册、验证码、2FA 验证等功能
 */
export function useLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [captchaId, setCaptchaId] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [twoFactorModalVisible, setTwoFactorModalVisible] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [loginCredentials, setLoginCredentials] = useState<any>(null);

  // 获取验证码
  const fetchCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const data = await getCaptcha();
      setCaptchaId(data.id);
      setCaptchaSvg(data.svg);
    } catch (error) {
      message.error('获取验证码失败');
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  // 页面加载时获取验证码
  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  // 处理登录
  const handleLogin = useCallback(
    async (values: Omit<LoginDto, 'captchaId'>) => {
      setLoading(true);
      try {
        const result: any = await login({
          ...values,
          captchaId,
        });
        console.log('Login result:', result);

        // 检查是否需要2FA验证
        if (result.requiresTwoFactor) {
          message.info(result.message || '请输入双因素认证代码');
          setLoginCredentials({ ...values, captchaId });
          setTwoFactorModalVisible(true);
          setLoading(false);
          return;
        }

        // 正常登录流程
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        message.success('登录成功');
        navigate('/dashboard');
      } catch (error: any) {
        console.error('Login error:', error);
        message.error(error.response?.data?.message || '登录失败');
        // 登录失败后刷新验证码
        fetchCaptcha();
        loginForm.setFieldValue('captcha', '');
      } finally {
        setLoading(false);
      }
    },
    [captchaId, navigate, fetchCaptcha, loginForm]
  );

  // 处理2FA验证
  const handle2FAVerify = useCallback(async () => {
    if (!twoFactorToken || twoFactorToken.length !== 6) {
      message.error('请输入6位验证码');
      return;
    }

    setLoading(true);
    try {
      const result = await verify2FA({
        ...loginCredentials,
        twoFactorToken,
      });

      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      message.success('登录成功');
      setTwoFactorModalVisible(false);
      setTwoFactorToken('');
      navigate('/dashboard');
    } catch (error: any) {
      message.error(error.response?.data?.message || '验证码错误');
    } finally {
      setLoading(false);
    }
  }, [twoFactorToken, loginCredentials, navigate]);

  // 处理注册
  const handleRegister = useCallback(
    async (values: RegisterDto) => {
      setLoading(true);
      try {
        await register(values);
        message.success('注册成功，请登录');
        registerForm.resetFields();
      } catch (error) {
        message.error('注册失败');
      } finally {
        setLoading(false);
      }
    },
    [registerForm]
  );

  // 关闭2FA弹窗
  const handle2FACancel = useCallback(() => {
    setTwoFactorModalVisible(false);
    setTwoFactorToken('');
    setLoginCredentials(null);
  }, []);

  return {
    // 表单实例
    loginForm,
    registerForm,

    // 状态
    loading,
    captchaSvg,
    captchaLoading,
    twoFactorModalVisible,
    twoFactorToken,

    // 操作方法
    handleLogin,
    handleRegister,
    fetchCaptcha,
    handle2FAVerify,
    handle2FACancel,
    setTwoFactorToken,
  };
}
