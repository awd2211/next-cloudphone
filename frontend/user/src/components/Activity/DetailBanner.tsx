import React from 'react';
import { Card, Space } from 'antd';
import type { Activity } from '@/services/activity';
import { getTypeIcon } from '@/utils/activityConfig';

interface DetailBannerProps {
  activity: Activity;
}

/**
 * 活动详情横幅组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 配置驱动的图标显示
 * - 渐变背景和图片支持
 */
export const DetailBanner: React.FC<DetailBannerProps> = React.memo(({ activity }) => {
  return (
    <Card styles={{ body: { padding: 0 } }} style={{ marginBottom: 24 }}>
      <div
        style={{
          height: 320,
          background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {activity.bannerImage && (
          <img
            src={activity.bannerImage}
            alt={activity.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '32px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
            color: '#fff',
          }}
        >
          <Space size="large" align="center">
            <div style={{ fontSize: 48 }}>{getTypeIcon(activity.type)}</div>
            <div>
              <h1 style={{ color: '#fff', margin: 0, fontSize: 32 }}>{activity.title}</h1>
              <p style={{ margin: '8px 0 0', fontSize: 16, opacity: 0.9 }}>
                {activity.description}
              </p>
            </div>
          </Space>
        </div>
      </div>
    </Card>
  );
});

DetailBanner.displayName = 'DetailBanner';
