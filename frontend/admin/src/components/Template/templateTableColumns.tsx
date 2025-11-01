import { Space, Tag, Tooltip, Badge, Button, Popconfirm } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  AppstoreAddOutlined,
  LockOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DeviceTemplate } from '@/types';
import dayjs from 'dayjs';

interface ColumnHandlers {
  onCreateDevice: (template: DeviceTemplate) => void;
  onBatchCreate: (template: DeviceTemplate) => void;
  onEdit: (template: DeviceTemplate) => void;
  onDelete: (id: string) => void;
}

export const createTemplateColumns = (handlers: ColumnHandlers): ColumnsType<DeviceTemplate> => [
  {
    title: '模板名称',
    dataIndex: 'name',
    key: 'name',
    width: 200,
    render: (text, record) => (
      <Space>
        <span style={{ fontWeight: 500 }}>{text}</span>
        {!record.isPublic && (
          <Tooltip title="私有模板">
            <LockOutlined style={{ color: '#faad14' }} />
          </Tooltip>
        )}
      </Space>
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
    title: '分类',
    dataIndex: 'category',
    key: 'category',
    width: 100,
    render: (text) => (text ? <Tag color="blue">{text}</Tag> : '-'),
  },
  {
    title: '配置',
    key: 'config',
    width: 200,
    render: (_, record) => (
      <Space direction="vertical" size={0}>
        <span>Android {record.androidVersion}</span>
        <span style={{ fontSize: '12px', color: '#999' }}>
          {record.cpuCores} 核 / {record.memoryMB}MB / {record.storageMB}MB
        </span>
      </Space>
    ),
  },
  {
    title: '标签',
    dataIndex: 'tags',
    key: 'tags',
    width: 150,
    render: (tags: string[]) =>
      tags && tags.length > 0 ? (
        <Space wrap>
          {tags.map((tag) => (
            <Tag key={tag} style={{ margin: 0 }}>
              {tag}
            </Tag>
          ))}
        </Space>
      ) : (
        '-'
      ),
  },
  {
    title: '使用次数',
    dataIndex: 'usageCount',
    key: 'usageCount',
    width: 100,
    align: 'center',
    sorter: (a, b) => a.usageCount - b.usageCount,
    render: (count) => <Badge count={count} showZero style={{ backgroundColor: '#52c41a' }} />,
  },
  {
    title: '可见性',
    dataIndex: 'isPublic',
    key: 'isPublic',
    width: 100,
    align: 'center',
    filters: [
      { text: '公开', value: true },
      { text: '私有', value: false },
    ],
    render: (isPublic) =>
      isPublic ? (
        <Tag icon={<UnlockOutlined />} color="success">
          公开
        </Tag>
      ) : (
        <Tag icon={<LockOutlined />} color="warning">
          私有
        </Tag>
      ),
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 180,
    render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    title: '操作',
    key: 'action',
    width: 280,
    fixed: 'right',
    render: (_, record) => (
      <Space size="small">
        <Tooltip title="创建单个设备">
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => handlers.onCreateDevice(record)}
          >
            创建设备
          </Button>
        </Tooltip>
        <Tooltip title="批量创建设备">
          <Button
            type="link"
            size="small"
            icon={<AppstoreAddOutlined />}
            onClick={() => handlers.onBatchCreate(record)}
          >
            批量创建
          </Button>
        </Tooltip>
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handlers.onEdit(record)}
        >
          编辑
        </Button>
        <Popconfirm title="确定要删除这个模板吗？" onConfirm={() => handlers.onDelete(record.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      </Space>
    ),
  },
];
