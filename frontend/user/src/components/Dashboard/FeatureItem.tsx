import React from 'react';

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
  backgroundColor: string;
}

/**
 * 特性展示项组件
 * 展示单个产品特性（图标、标题、描述）
 */
export const FeatureItem: React.FC<FeatureItemProps> = React.memo(({
  icon,
  title,
  description,
  backgroundColor,
}) => {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: backgroundColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}
      >
        <img
          src={icon}
          alt={title}
          style={{ width: 50, height: 50 }}
        />
      </div>
      <h3 style={{ fontSize: 20, marginBottom: 12 }}>{title}</h3>
      <p style={{ color: '#666' }}>{description}</p>
    </div>
  );
});

FeatureItem.displayName = 'FeatureItem';
