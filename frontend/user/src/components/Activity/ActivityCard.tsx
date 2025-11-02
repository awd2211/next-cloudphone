import React from 'react';
import { Card, Space, Tag, Button } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import type { Activity } from '@/services/activity';
import { ActivityStatus } from '@/services/activity';
import {
  getTypeConfig,
  getStatusTag,
  calculateProgress,
  formatDateRange,
  getActivityButtonText,
} from '@/utils/activityConfig';

interface ActivityCardProps {
  activity: Activity;
  onClick: (activityId: string) => void;
}

/**
 * 活动卡片组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 配置驱动的类型和状态显示
 * - 进度条可视化
 * - 响应式图片
 */
export const ActivityCard: React.FC<ActivityCardProps> = React.memo(
  ({ activity, onClick }) => {
    const typeConfig = getTypeConfig(activity.type);
    const progress = calculateProgress(activity.currentParticipants, activity.maxParticipants);

    return (
      <Card
        hoverable
        cover={
          <div style={{ height: 180, overflow: 'hidden', position: 'relative' }}>
            {activity.coverImage ? (
              <img
                alt={activity.title}
                src={activity.coverImage}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: 48, color: '#fff', opacity: 0.8 }}>
                  {typeConfig.icon}
                </div>
              </div>
            )}
            <div style={{ position: 'absolute', top: 12, right: 12 }}>
              {getStatusTag(activity.status)}
            </div>
          </div>
        }
        onClick={() => onClick(activity.id)}
      >
        <Card.Meta
          title={
            <Space>
              <Tag icon={typeConfig.icon} color={typeConfig.color}>
                {typeConfig.text}
              </Tag>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{activity.title}</span>
            </Space>
          }
          description={
            <div>
              {/* 活动描述 */}
              <p
                style={{
                  margin: '12px 0',
                  color: '#666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {activity.description}
              </p>

              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {/* 折扣信息 */}
                {activity.discount && (
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                    {activity.discount}折
                  </div>
                )}

                {/* 参与进度 */}
                {activity.maxParticipants && (
                  <div style={{ fontSize: 12, color: '#999' }}>
                    已参与: {activity.currentParticipants} / {activity.maxParticipants}
                    <div
                      style={{
                        marginTop: 4,
                        height: 4,
                        background: '#f0f0f0',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${progress}%`,
                          background: typeConfig.color,
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* 日期范围 */}
                <div style={{ fontSize: 12, color: '#999' }}>
                  {formatDateRange(activity.startTime, activity.endTime)}
                </div>
              </Space>

              {/* 操作按钮 */}
              <Button
                type="primary"
                block
                style={{ marginTop: 12 }}
                disabled={activity.status !== ActivityStatus.ONGOING}
                icon={<RightOutlined />}
              >
                {getActivityButtonText(activity.status)}
              </Button>
            </div>
          }
        />
      </Card>
    );
  }
);

ActivityCard.displayName = 'ActivityCard';
