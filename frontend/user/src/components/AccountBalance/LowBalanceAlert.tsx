import React, { memo } from 'react';
import { Alert, Space, Typography } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import type { BalanceData } from '@/hooks/useAccountBalance';

const { Text } = Typography;

interface LowBalanceAlertProps {
  balanceData: BalanceData;
  isLowBalance: boolean;
}

export const LowBalanceAlert = memo<LowBalanceAlertProps>(
  ({ balanceData, isLowBalance }) => {
    if (!isLowBalance || !balanceData.alertEnabled) {
      return null;
    }

    return (
      <Alert
        message="余额不足提醒"
        description={
          <Space direction="vertical" size="small">
            <Text>
              您的账户余额已低于预警值（¥{balanceData.lowBalanceThreshold}
              ）， 请及时充值以免影响服务使用。
            </Text>
            <Text>按当前消费速度，预计还可使用 {balanceData.forecastDaysLeft} 天。</Text>
          </Space>
        }
        type="warning"
        showIcon
        icon={<ExclamationCircleOutlined />}
        closable
        style={{ marginBottom: 16 }}
      />
    );
  }
);

LowBalanceAlert.displayName = 'LowBalanceAlert';
