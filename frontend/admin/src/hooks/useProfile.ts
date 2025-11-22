import { useState, useEffect, useCallback } from 'react';
import { Form, message } from 'antd';
import { applyTheme, type User } from '@/components/Profile/constants';
import { api } from '@/utils/api';

export const useProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [preferencesModalVisible, setPreferencesModalVisible] = useState(false);

  const [passwordForm] = Form.useForm();
  const [preferencesForm] = Form.useForm();

  // 加载用户信息
  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      // 从localStorage获取用户信息
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);

        // 从metadata中提取语言和主题设置
        if (userData.metadata) {
          userData.language = userData.metadata.language || 'zh-CN';
          userData.theme = userData.metadata.theme || 'auto';
        } else {
          userData.language = 'zh-CN';
          userData.theme = 'auto';
        }

        setUser(userData);

        // 应用主题设置
        applyTheme(userData.theme);
      }
    } catch (error) {
      message.error('加载用户信息失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // 修改密码
  const handleChangePassword = useCallback(
    async (values: { oldPassword: string; newPassword: string }) => {
      try {
        const userId = user?.id;
        if (!userId) {
          message.error('用户信息获取失败');
          return;
        }

        // 调用后端 API 修改密码
        await api.post(`/users/${userId}/change-password`, {
          oldPassword: values.oldPassword,
          newPassword: values.newPassword,
        });

        message.success('密码修改成功，请重新登录');
        setPasswordModalVisible(false);
        passwordForm.resetFields();

        // 清除本地存储并退出登录
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userId');

        // 延迟跳转到登录页
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      } catch (error) {
        message.error('密码修改失败，请检查原密码是否正确');
        console.error('Failed to change password:', error);
      }
    },
    [user, passwordForm]
  );

  // 保存偏好设置
  const handleSavePreferences = useCallback(
    async (values: { language: string; theme: string }) => {
      try {
        const userId = user?.id;
        if (!userId) {
          message.error('用户信息获取失败');
          return;
        }

        // 调用后端 API 保存偏好设置
        await api.patch(`/users/${userId}/preferences`, {
          language: values.language,
          theme: values.theme,
        });

        // 更新本地用户信息
        const updatedUser = {
          ...user,
          language: values.language,
          theme: values.theme,
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));

        // 应用主题设置
        applyTheme(values.theme);

        message.success('偏好设置保存成功');
        setPreferencesModalVisible(false);
      } catch (error) {
        message.error('保存偏好设置失败');
        console.error('Failed to save preferences:', error);
      }
    },
    [user]
  );

  // 打开修改密码模态框
  const handleOpenPasswordModal = useCallback(() => {
    setPasswordModalVisible(true);
  }, []);

  // 关闭修改密码模态框
  const handleClosePasswordModal = useCallback(() => {
    setPasswordModalVisible(false);
  }, []);

  // 打开偏好设置模态框
  const handleOpenPreferencesModal = useCallback(() => {
    if (user) {
      preferencesForm.setFieldsValue({
        language: user.language || 'zh-CN',
        theme: user.theme || 'auto',
      });
    }
    setPreferencesModalVisible(true);
  }, [user, preferencesForm]);

  // 关闭偏好设置模态框
  const handleClosePreferencesModal = useCallback(() => {
    setPreferencesModalVisible(false);
  }, []);

  return {
    user,
    loading,
    passwordModalVisible,
    preferencesModalVisible,
    passwordForm,
    preferencesForm,
    loadUser,
    handleChangePassword,
    handleSavePreferences,
    handleOpenPasswordModal,
    handleClosePasswordModal,
    handleOpenPreferencesModal,
    handleClosePreferencesModal,
  };
};
