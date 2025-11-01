import { useMemo } from 'react';
import { Space, Button, Tag, Tooltip, Popconfirm } from 'antd';
import { DeleteOutlined, RollbackOutlined, CompressOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DeviceSnapshot } from '@/types';
import dayjs from 'dayjs';
import { formatSize, renderStatus } from './utils';
import { COMPRESSED_FILTERS, STATUS_CONFIG } from './constants';

interface UseSnapshotColumnsProps {
  onRestore: (id: string, deviceName: string) => void;
  onCompress: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * 快照列表表格列定义 Hook
 */
export const useSnapshotColumns = ({
  onRestore,
  onCompress,
  onDelete,
}: UseSnapshotColumnsProps): ColumnsType<DeviceSnapshot> => {
  return useMemo(
    () => [
      {
        title: '快照名称',
        dataIndex: 'name',
        key: 'name',
        width: 200,
        render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
        sorter: (a, b) => a.name.localeCompare(b.name),
      },
      {
        title: '设备',
        dataIndex: ['device', 'name'],
        key: 'deviceName',
        width: 150,
        render: (text, record) => (
          <Tooltip title={`设备 ID: ${record.deviceId}`}>
            <span>{text || record.deviceId}</span>
          </Tooltip>
        ),
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        render: (text) => text || '-',
      },
      {
        title: '大小',
        dataIndex: 'size',
        key: 'size',
        width: 120,
        sorter: (a, b) => a.size - b.size,
        render: (size) => formatSize(size),
      },
      {
        title: '压缩状态',
        dataIndex: 'compressed',
        key: 'compressed',
        width: 100,
        align: 'center',
        filters: COMPRESSED_FILTERS,
        render: (compressed) =>
          compressed ? <Tag color="green">已压缩</Tag> : <Tag color="orange">未压缩</Tag>,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        align: 'center',
        filters: Object.entries(STATUS_CONFIG).map(([value, config]) => ({
          text: config.text,
          value,
        })),
        render: renderStatus,
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 180,
        sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: '操作',
        key: 'action',
        width: 280,
        fixed: 'right',
        render: (_, record) => (
          <Space size="small">
            {record.status === 'ready' && (
              <>
                <Popconfirm
                  title={`确定要恢复快照 "${record.name}" 吗？`}
                  description="此操作将覆盖设备当前状态，无法撤销"
                  onConfirm={() => onRestore(record.id, record.device?.name || record.deviceId)}
                >
                  <Button type="link" size="small" icon={<RollbackOutlined />}>
                    恢复
                  </Button>
                </Popconfirm>
                {!record.compressed && (
                  <Tooltip title="压缩快照以节省存储空间">
                    <Button
                      type="link"
                      size="small"
                      icon={<CompressOutlined />}
                      onClick={() => onCompress(record.id)}
                    >
                      压缩
                    </Button>
                  </Tooltip>
                )}
              </>
            )}
            <Popconfirm
              title="确定要删除这个快照吗？"
              description="删除后将无法恢复"
              onConfirm={() => onDelete(record.id)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [onRestore, onCompress, onDelete],
  );
};
