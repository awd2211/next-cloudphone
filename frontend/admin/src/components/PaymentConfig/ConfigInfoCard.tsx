import React from 'react';
import { Card, Space } from 'antd';
import { CONFIG_INFO_TEXTS } from './constants';
import { NEUTRAL_LIGHT } from '@/theme';

export const ConfigInfoCard: React.FC = React.memo(() => {
  return (
    <Card title="配置说明">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <h4>{CONFIG_INFO_TEXTS.envConfig.title}</h4>
          <p style={{ color: NEUTRAL_LIGHT.text.secondary }}>
            {CONFIG_INFO_TEXTS.envConfig.description.split('backend/billing-service/.env')[0]}
            <code style={{ margin: '0 4px' }}>backend/billing-service/.env</code>
            {CONFIG_INFO_TEXTS.envConfig.description.split('backend/billing-service/.env')[1]}
          </p>
        </div>
        <div>
          <h4>{CONFIG_INFO_TEXTS.testMode.title}</h4>
          <p style={{ color: NEUTRAL_LIGHT.text.secondary }}>{CONFIG_INFO_TEXTS.testMode.description}</p>
        </div>
        <div>
          <h4>{CONFIG_INFO_TEXTS.connectionTest.title}</h4>
          <p style={{ color: NEUTRAL_LIGHT.text.secondary }}>{CONFIG_INFO_TEXTS.connectionTest.description}</p>
        </div>
      </Space>
    </Card>
  );
});

ConfigInfoCard.displayName = 'ConfigInfoCard';
