import React, { useMemo } from 'react';
import { Card, Button, Tag } from 'antd';
import { EyeOutlined, DownloadOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { Application } from '@/types';

interface AppCardProps {
  app: Application;
  loading?: boolean;
  onView: (app: Application) => void;
  onInstall: (app: Application) => void;
}

/**
 * 应用卡片组件
 * 展示单个应用的信息和操作按钮
 */
export const AppCard: React.FC<AppCardProps> = React.memo(({
  app,
  loading = false,
  onView,
  onInstall,
}) => {
  // 格式化文件大小
  const formattedSize = useMemo(() => {
    if (app.size < 1024 * 1024) {
      return (app.size / 1024).toFixed(2) + ' KB';
    }
    return (app.size / 1024 / 1024).toFixed(2) + ' MB';
  }, [app.size]);

  return (
    <Card
      hoverable
      loading={loading}
      cover={
        app.icon ? (
          <img
            alt={app.name}
            src={app.icon}
            style={{
              width: '100%',
              height: 150,
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: 150,
              background: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppstoreOutlined style={{ fontSize: 48, color: '#999' }} />
          </div>
        )
      }
      actions={[
        <Button
          key="view"
          size="small"
          icon={<EyeOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onView(app);
          }}
        >
          详情
        </Button>,
        <Button
          key="install"
          type="primary"
          size="small"
          icon={<DownloadOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onInstall(app);
          }}
        >
          安装
        </Button>,
      ]}
    >
      <Card.Meta
        title={app.name}
        description={
          <div>
            <div style={{ marginBottom: 8 }}>
              <Tag color="blue">{app.category}</Tag>
              <Tag>{formattedSize}</Tag>
            </div>
            <div
              style={{
                color: '#666',
                fontSize: 12,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {app.description || '暂无描述'}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              版本: {app.version}
            </div>
          </div>
        }
      />
    </Card>
  );
});

AppCard.displayName = 'AppCard';
