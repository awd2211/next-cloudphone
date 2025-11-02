import React, { useMemo } from 'react';
import { Row, Col } from 'antd';
import { FeatureItem } from './FeatureItem';

/**
 * 特性介绍区域组件
 * 展示平台的核心特性
 */
export const FeatureSection: React.FC = React.memo(() => {
  const features = useMemo(
    () => [
      {
        icon: '/images/icons/feature-performance.svg',
        title: '高性能',
        description: '高性能云服务器，流畅运行 Android 系统',
        backgroundColor: '#e6f7ff',
      },
      {
        icon: '/images/icons/feature-security.svg',
        title: '安全可靠',
        description: '数据隔离存储，7x24 小时监控保障',
        backgroundColor: '#f6ffed',
      },
      {
        icon: '/images/icons/feature-pricing.svg',
        title: '价格实惠',
        description: '灵活的套餐选择，按需付费更省钱',
        backgroundColor: '#fff7e6',
      },
    ],
    []
  );

  return (
    <div style={{ marginTop: 80, marginBottom: 80 }}>
      <h2 style={{ textAlign: 'center', fontSize: 32, marginBottom: 48 }}>
        为什么选择我们
      </h2>

      <Row gutter={[48, 48]}>
        {features.map((feature, index) => (
          <Col key={index} xs={24} md={8}>
            <FeatureItem {...feature} />
          </Col>
        ))}
      </Row>
    </div>
  );
});

FeatureSection.displayName = 'FeatureSection';
