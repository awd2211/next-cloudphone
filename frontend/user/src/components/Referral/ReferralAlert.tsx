import React from 'react';
import { Alert } from 'antd';
import type { ReferralConfig } from '@/services/referral';

interface ReferralAlertProps {
  config: ReferralConfig | null;
}

/**
 * 邀请规则提示组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 条件渲染奖励金额
 */
export const ReferralAlert: React.FC<ReferralAlertProps> = React.memo(({ config }) => {
  return (
    <Alert
      message="邀请好友注册并完成首次充值，双方都可获得奖励!"
      description={
        <div>
          <p>• 邀请好友注册: 获得 ¥{config?.rewardPerInvite || 0} 奖励</p>
          <p>• 好友首次充值: 额外获得充值金额的 10% 返利</p>
          <p>• 最低提现金额: ¥{config?.minWithdrawAmount || 0}</p>
        </div>
      }
      type="info"
      showIcon
      style={{ marginBottom: 24 }}
    />
  );
});

ReferralAlert.displayName = 'ReferralAlert';
