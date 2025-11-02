import { Tag, Button, Space, Popconfirm } from 'antd';
import { CloudDownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

/**
 * 快照配置文件
 *
 * 包含：
 * - 状态配置
 * - 工具函数
 * - 表格列工厂函数
 * - 警告信息配置
 */

// ==================== 类型定义 ====================

export interface Snapshot {
  id: string;
  deviceId: string;
  name: string;
  description?: string;
  size: number;
  createdAt: string;
  status: string;
}

// ==================== 状态配置 ====================

export const statusConfig: Record<string, { color: string; text: string }> = {
  active: { color: 'green', text: '可用' },
  creating: { color: 'blue', text: '创建中' },
  restoring: { color: 'orange', text: '恢复中' },
  failed: { color: 'red', text: '失败' },
};

/**
 * 获取状态标签
 */
export const getStatusTag = (status: string) => {
  const config = statusConfig[status] || { color: 'default', text: status };
  return <Tag color={config.color}>{config.text}</Tag>;
};

// ==================== 工具函数 ====================

/**
 * 格式化文件大小
 */
export const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// ==================== 表格列工厂函数 ====================

/**
 * 创建快照列表表格列定义
 */
export const createSnapshotColumns = (
  onRestore: (snapshot: Snapshot) => void,
  onDelete: (snapshotId: string) => void
): ColumnsType<Snapshot> => [
  {
    title: '快照名称',
    dataIndex: 'name',
    key: 'name',
    width: 200,
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
  },
  {
    title: '大小',
    dataIndex: 'size',
    key: 'size',
    width: 120,
    render: (size: number) => formatSize(size),
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    render: (status: string) => getStatusTag(status),
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 180,
    render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    fixed: 'right' as const,
    render: (_: any, record: Snapshot) => (
      <Space>
        <Button
          type="link"
          size="small"
          icon={<CloudDownloadOutlined />}
          onClick={() => onRestore(record)}
          disabled={record.status !== 'active'}
        >
          恢复
        </Button>
        <Popconfirm
          title="确定要删除此快照吗？"
          description="删除后无法恢复"
          onConfirm={() => onDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      </Space>
    ),
  },
];

// ==================== 警告信息配置 ====================

/**
 * 创建快照警告信息
 */
export const createSnapshotWarning = {
  message: '注意',
  description: '创建快照会暂停设备运行，完成后自动恢复',
  type: 'warning' as const,
};

/**
 * 恢复快照警告信息
 */
export const restoreSnapshotWarning = {
  message: '警告',
  description: (
    <div>
      <p>恢复快照将：</p>
      <ul style={{ marginBottom: 0 }}>
        <li>覆盖设备当前的所有数据</li>
        <li>恢复到快照创建时的状态</li>
        <li>无法撤销此操作</li>
      </ul>
    </div>
  ),
  type: 'error' as const,
};

// ==================== 使用说明配置 ====================

export const usageGuideItems = [
  '快照会保存设备的完整系统状态、已安装应用和数据',
  '创建快照时设备会暂时停止，完成后自动恢复',
  '恢复快照会覆盖设备当前的所有内容，请谨慎操作',
  '快照会占用存储空间，建议定期清理不需要的快照',
  '建议在重要操作前创建快照，以便出现问题时快速恢复',
];
