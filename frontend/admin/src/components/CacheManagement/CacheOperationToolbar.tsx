import React from 'react';
import { Card, Space, Button, Popconfirm } from 'antd';
import {
  ReloadOutlined,
  DeleteOutlined,
  ClearOutlined,
  SearchOutlined,
} from '@ant-design/icons';

interface CacheOperationToolbarProps {
  loading: boolean;
  onRefresh: () => void;
  onResetStats: () => void;
  onDeleteKey: () => void;
  onDeletePattern: () => void;
  onCheckKey: () => void;
  onFlushCache: () => void;
}

export const CacheOperationToolbar: React.FC<CacheOperationToolbarProps> = React.memo(
  ({
    loading,
    onRefresh,
    onResetStats,
    onDeleteKey,
    onDeletePattern,
    onCheckKey,
    onFlushCache,
  }) => {
    return (
      <Card title="缓存操作">
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
            刷新统计
          </Button>

          <Button icon={<ReloadOutlined />} onClick={onResetStats}>
            重置统计
          </Button>

          <Button icon={<DeleteOutlined />} onClick={onDeleteKey}>
            删除指定键
          </Button>

          <Button icon={<ClearOutlined />} onClick={onDeletePattern}>
            按模式删除
          </Button>

          <Button icon={<SearchOutlined />} onClick={onCheckKey}>
            检查键存在
          </Button>

          <Popconfirm
            title="清空所有缓存"
            description="此操作将清空 L1 和 L2 的所有缓存数据，确定继续？"
            onConfirm={onFlushCache}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<ClearOutlined />} loading={loading}>
              清空所有缓存
            </Button>
          </Popconfirm>
        </Space>
      </Card>
    );
  }
);

CacheOperationToolbar.displayName = 'CacheOperationToolbar';
