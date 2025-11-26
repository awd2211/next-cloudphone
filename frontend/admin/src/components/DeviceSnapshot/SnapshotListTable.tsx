import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Table, Button, Space, Tag, Popconfirm, message, Tooltip } from 'antd';
import {
  RollbackOutlined,
  DeleteOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { NEUTRAL_LIGHT } from '@/theme';
import type { ColumnsType } from 'antd/es/table';
import { createTimeColumn } from '@/utils/tableColumns';

interface Snapshot {
  id: string;
  name: string;
  description?: string;
  deviceId: string;
  createdAt: string;
  status: 'creating' | 'available' | 'error';
  size?: number;
}

interface SnapshotListTableProps {
  deviceId: string;
  onRestore?: (snapshotId: string, snapshotName: string) => void;
}

// ✅ 使用 memo 包装组件，避免不必要的重渲染
const SnapshotListTable: React.FC<SnapshotListTableProps> = memo(({ deviceId, onRestore }) => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ 使用 useCallback 包装加载函数
  const fetchSnapshots = useCallback(async () => {
    setLoading(true);
    try {
      // 注意: 这里需要后端提供快照列表API
      // 暂时使用模拟数据
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/devices/${deviceId}/snapshots`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSnapshots(data.data || []);
      } else {
        // 如果API不存在,使用模拟数据
        setSnapshots([]);
      }
    } catch (error) {
      console.error('Failed to fetch snapshots:', error);
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchSnapshots();
  }, [deviceId]);

  // ✅ 使用 useCallback 包装删除函数
  const handleDelete = useCallback(async (snapshotId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/devices/${deviceId}/snapshots/${snapshotId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('删除失败');
      }

      message.success('快照删除成功');
      fetchSnapshots();
    } catch (error: any) {
      message.error(error.message || '删除快照失败');
    }
  }, [deviceId, fetchSnapshots]);

  // ✅ 使用 useCallback 缓存格式化函数
  const formatSize = useCallback((bytes?: number) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  }, []);

  // ✅ 使用 useMemo 缓存列定义，避免每次渲染都重新创建
  const columns: ColumnsType<Snapshot> = useMemo(() => [
    {
      title: '快照名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusMap = {
          creating: { color: 'processing', text: '创建中' },
          available: { color: 'success', text: '可用' },
          error: { color: 'error', text: '错误' },
        };
        const config = statusMap[status as keyof typeof statusMap] || statusMap.available;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: formatSize,
    },
    createTimeColumn<Snapshot>('创建时间', 'createdAt'),
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="恢复快照">
            <Button
              type="link"
              size="small"
              icon={<RollbackOutlined />}
              onClick={() => onRestore?.(record.id, record.name)}
              disabled={record.status !== 'available'}
            >
              恢复
            </Button>
          </Tooltip>
          <Popconfirm
            title="确认删除快照?"
            description="删除后无法恢复,请谨慎操作"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={record.status === 'creating'}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [formatSize, handleDelete, onRestore]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchSnapshots} loading={loading}>
            刷新
          </Button>
          <Tooltip title="快照列表显示该设备的所有备份快照">
            <InfoCircleOutlined style={{ color: NEUTRAL_LIGHT.text.tertiary }} />
          </Tooltip>
        </Space>
      </div>
      <Table
        columns={columns}
        dataSource={snapshots}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 个快照`,
        }}
        locale={{
          emptyText: '暂无快照数据',
        }}
      />
    </div>
  );
});

SnapshotListTable.displayName = 'SnapshotListTable';

export default SnapshotListTable;
