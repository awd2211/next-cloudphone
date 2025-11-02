import React from 'react';
import { Button } from 'antd';
import { RocketOutlined } from '@ant-design/icons';

interface HeroBannerProps {
  onGetStarted: () => void;
}

/**
 * 首页头部横幅组件
 * 展示平台名称、标语和快速开始按钮
 */
export const HeroBanner: React.FC<HeroBannerProps> = React.memo(({ onGetStarted }) => {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '60px 0',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 48,
      }}
    >
      <h1 style={{ fontSize: 48, fontWeight: 'bold', color: '#fff', margin: 0 }}>
        云手机平台
      </h1>
      <p style={{ fontSize: 20, marginTop: 16, opacity: 0.9 }}>
        随时随地，轻松使用云端手机
      </p>
      <Button
        type="primary"
        size="large"
        icon={<RocketOutlined />}
        style={{ marginTop: 24, height: 48, fontSize: 18, padding: '0 48px' }}
        onClick={onGetStarted}
      >
        开始使用
      </Button>
    </div>
  );
});

HeroBanner.displayName = 'HeroBanner';
