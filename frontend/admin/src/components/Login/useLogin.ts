import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { login, getCaptcha } from '@/services/auth';
import { verify2FA } from '@/services/twoFactor';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import type { ErrorInfo } from '@/components/ErrorAlert';
import { parseLoginError, parseTwoFactorError } from './constants';

interface LoginForm {
  username: string;
  password: string;
  captcha: string;
}

interface UseLoginReturn {
  // 验证码相关
  captchaId: string;
  captchaSvg: string;
  captchaLoading: boolean;
  fetchCaptcha: () => Promise<void>;

  // 登录相关
  loginLoading: boolean;
  loginError: ErrorInfo | null;
  setLoginError: (error: ErrorInfo | null) => void;
  handleLogin: (values: LoginForm, onClearCaptcha: () => void) => Promise<void>;

  // 2FA 相关
  twoFactorModalVisible: boolean;
  twoFactorToken: string;
  twoFactorLoading: boolean;
  twoFactorError: ErrorInfo | null;
  setTwoFactorToken: (token: string) => void;
  setTwoFactorError: (error: ErrorInfo | null) => void;
  handleTwoFactorVerify: () => Promise<void>;
  handleTwoFactorCancel: () => void;
}

/**
 * 登录相关逻辑 Hook
 * 封装登录、验证码、2FA 验证的完整流程
 */
export const useLogin = (): UseLoginReturn => {
  const navigate = useNavigate();

  // 验证码状态
  const [captchaId, setCaptchaId] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  // 登录状态
  const [loginError, setLoginError] = useState<ErrorInfo | null>(null);
  const [loginCredentials, setLoginCredentials] = useState<any>(null);

  // 2FA 状态
  const [twoFactorModalVisible, setTwoFactorModalVisible] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [twoFactorError, setTwoFactorError] = useState<ErrorInfo | null>(null);

  // 异步操作 Hooks
  const { execute: executeLogin, loading: loginLoading } = useAsyncOperation();
  const { execute: executeCaptcha } = useAsyncOperation();
  const { execute: executeTwoFactor, loading: twoFactorLoading } = useAsyncOperation();

  // 获取验证码
  const fetchCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    await executeCaptcha(
      async () => {
        const data = await getCaptcha();
        setCaptchaId(data.id);
        setCaptchaSvg(data.svg);
        return data;
      },
      {
        errorContext: '获取验证码',
        showSuccessMessage: false,
        onFinally: () => setCaptchaLoading(false),
      }
    );
  }, [executeCaptcha]);

  // 页面加载时获取验证码
  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  // 保存用户信息到 localStorage
  const saveUserInfo = useCallback((token: string, user: any) => {
    localStorage.setItem('token', token);
    if (user?.id) {
      localStorage.setItem('userId', user.id);
    }
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }, []);

  // 处理登录
  const handleLogin = useCallback(
    async (values: LoginForm, onClearCaptcha: () => void) => {
      setLoginError(null);

      await executeLogin(
        async () => {
          const data: any = await login({
            ...values,
            captchaId,
          });

          // 检查是否需要 2FA 验证
          if (data.requiresTwoFactor) {
            message.info(data.message || '请输入双因素认证代码');
            setLoginCredentials({ ...values, captchaId });
            setTwoFactorModalVisible(true);
            return { requiresTwoFactor: true };
          }

          // 正常登录流程
          saveUserInfo(data.token, data.user);
          return data;
        },
        {
          successMessage: '登录成功',
          errorContext: '登录',
          showErrorMessage: false,
          onSuccess: (data) => {
            if (!data.requiresTwoFactor) {
              navigate('/');
            }
          },
          onError: (error: any) => {
            setLoginError(parseLoginError(error));
            // 登录失败后刷新验证码
            fetchCaptcha();
            onClearCaptcha();
          },
        }
      );
    },
    [captchaId, executeLogin, fetchCaptcha, navigate, saveUserInfo]
  );

  // 处理 2FA 验证
  const handleTwoFactorVerify = useCallback(async () => {
    if (!twoFactorToken || twoFactorToken.length !== 6) {
      message.error('请输入6位验证码');
      return;
    }

    setTwoFactorError(null);

    await executeTwoFactor(
      async () => {
        const result = await verify2FA({
          ...loginCredentials,
          twoFactorToken,
        });

        saveUserInfo(result.token, result.user);
        return result;
      },
      {
        successMessage: '登录成功',
        errorContext: '双因素认证',
        showErrorMessage: false,
        onSuccess: () => {
          setTwoFactorModalVisible(false);
          setTwoFactorToken('');
          navigate('/');
        },
        onError: (error: any) => {
          setTwoFactorError(parseTwoFactorError(error));
        },
      }
    );
  }, [twoFactorToken, loginCredentials, executeTwoFactor, navigate, saveUserInfo]);

  // 处理 2FA 取消
  const handleTwoFactorCancel = useCallback(() => {
    setTwoFactorModalVisible(false);
    setTwoFactorToken('');
    setTwoFactorError(null);
    setLoginCredentials(null);
  }, []);

  return {
    // 验证码相关
    captchaId,
    captchaSvg,
    captchaLoading,
    fetchCaptcha,

    // 登录相关
    loginLoading,
    loginError,
    setLoginError,
    handleLogin,

    // 2FA 相关
    twoFactorModalVisible,
    twoFactorToken,
    twoFactorLoading,
    twoFactorError,
    setTwoFactorToken,
    setTwoFactorError,
    handleTwoFactorVerify,
    handleTwoFactorCancel,
  };
};
