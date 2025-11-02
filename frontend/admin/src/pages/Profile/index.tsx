import React from 'react';
import TwoFactorSettings from '@/components/TwoFactorSettings';
import {
  ProfileBasicInfo,
  ProfilePreferencesCard,
  ProfileSecurityCard,
  ChangePasswordModal,
  PreferencesModal,
} from '@/components/Profile';
import { useProfile } from '@/hooks/useProfile';

const Profile: React.FC = () => {
  const {
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
  } = useProfile();

  if (!user) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <h2>个人中心</h2>

      <ProfileBasicInfo user={user} loading={loading} />

      <ProfilePreferencesCard
        user={user}
        onEdit={handleOpenPreferencesModal}
      />

      <ProfileSecurityCard onChangePassword={handleOpenPasswordModal} />

      {/* 2FA设置 */}
      <TwoFactorSettings
        isEnabled={user?.twoFactorEnabled || false}
        onStatusChange={loadUser}
      />

      {/* 偏好设置对话框 */}
      <PreferencesModal
        visible={preferencesModalVisible}
        form={preferencesForm}
        onCancel={handleClosePreferencesModal}
        onSubmit={handleSavePreferences}
      />

      {/* 修改密码对话框 */}
      <ChangePasswordModal
        visible={passwordModalVisible}
        form={passwordForm}
        onCancel={handleClosePasswordModal}
        onSubmit={handleChangePassword}
      />
    </div>
  );
};

export default Profile;
