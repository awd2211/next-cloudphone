import React from 'react';
import { Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';

/**
 * CTA (Call To Action) 横幅组件
 * 鼓励用户注册或联系销售
 */
export const CTABanner: React.FC = React.memo(() => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '80px 24px',
        marginTop: 80,
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
        <h2
          style={{
            fontSize: 36,
            color: 'white',
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          立即开始您的云手机之旅
        </h2>
        <p
          style={{
            fontSize: 18,
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: 32,
            lineHeight: 1.6,
          }}
        >
          注册即可获得免费试用额度，体验企业级云手机服务
        </p>
        <Space size="large">
          <Button
            type="primary"
            size="large"
            onClick={() => navigate('/login')}
            style={{
              height: 48,
              padding: '0 48px',
              fontSize: 16,
              fontWeight: 500,
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: 24,
            }}
          >
            立即注册
          </Button>
          <Button
            size="large"
            onClick={() => navigate('/help')}
            style={{
              height: 48,
              padding: '0 48px',
              fontSize: 16,
              fontWeight: 500,
              background: 'transparent',
              color: 'white',
              border: '2px solid white',
              borderRadius: 24,
            }}
          >
            联系销售
          </Button>
        </Space>
      </div>
    </div>
  );
});

CTABanner.displayName = 'CTABanner';
