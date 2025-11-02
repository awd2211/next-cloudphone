import React from 'react';
import { Card, Carousel } from 'antd';
import { ActivityStatus, type Activity } from '@/services/activity';

interface ActivityBannerProps {
  activities: Activity[];
  onActivityClick: (activityId: string) => void;
}

/**
 * 活动轮播图组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 自动筛选进行中且有 banner 的活动
 * - 条件渲染（无 banner 活动时不显示）
 */
export const ActivityBanner: React.FC<ActivityBannerProps> = React.memo(
  ({ activities, onActivityClick }) => {
    // 筛选有 banner 的进行中活动
    const bannerActivities = activities.filter(
      (a) => a.status === ActivityStatus.ONGOING && a.bannerImage
    );

    if (bannerActivities.length === 0) return null;

    return (
      <Card style={{ marginBottom: 24 }} bodyStyle={{ padding: 0 }}>
        <Carousel autoplay>
          {bannerActivities.map((activity) => (
            <div key={activity.id}>
              <div
                style={{
                  height: 300,
                  background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onClick={() => onActivityClick(activity.id)}
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
                    padding: '20px 32px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    color: '#fff',
                  }}
                >
                  <h2 style={{ color: '#fff', margin: 0 }}>{activity.title}</h2>
                  <p style={{ margin: '8px 0 0', opacity: 0.9 }}>{activity.description}</p>
                </div>
              </div>
            </div>
          ))}
        </Carousel>
      </Card>
    );
  }
);

ActivityBanner.displayName = 'ActivityBanner';
