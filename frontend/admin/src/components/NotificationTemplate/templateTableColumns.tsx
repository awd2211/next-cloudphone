import { Space, Switch, Badge, Button, Popconfirm } from 'antd';
import {
  EyeOutlined,
  SendOutlined,
  HistoryOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { NotificationTemplate } from '@/types';
import { getTypeTag, getContentTypeTag } from './templateUtils';
import dayjs from 'dayjs';

interface ColumnHandlers {
  onPreview: (template: NotificationTemplate) => void;
  onTest: (template: NotificationTemplate) => void;
  onHistory: (template: NotificationTemplate) => void;
  onEdit: (template: NotificationTemplate) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
}

/**
 * 创建通知模板表格列定义
 */
export const createTemplateColumns = (handlers: ColumnHandlers): ColumnsType<NotificationTemplate> => [
  {
    title: '模板名称',
    dataIndex: 'name',
    key: 'name',
    width: 200,
    render: (name, record) => (
      <Space direction="vertical" size={0}>
        <strong>{name}</strong>
        {record.description && (
          <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.description}</span>
        )}
      </Space>
    ),
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 100,
    render: (type) => getTypeTag(type),
  },
  {
    title: '内容类型',
    dataIndex: 'contentType',
    key: 'contentType',
    width: 120,
    render: (type) => getContentTypeTag(type),
  },
  {
    title: '分类',
    dataIndex: 'category',
    key: 'category',
    width: 120,
    render: (cat) => cat || '-',
  },
  {
    title: '语言',
    dataIndex: 'language',
    key: 'language',
    width: 100,
  },
  {
    title: '版本',
    dataIndex: 'version',
    key: 'version',
    width: 80,
    align: 'center',
    render: (ver) => <Badge count={`v${ver}`} style={{ backgroundColor: '#52c41a' }} />,
  },
  {
    title: '状态',
    dataIndex: 'isActive',
    key: 'isActive',
    width: 100,
    render: (isActive, record) => (
      <Switch
        checked={isActive}
        checkedChildren={<CheckCircleOutlined />}
        unCheckedChildren={<CloseCircleOutlined />}
        onChange={(checked) => handlers.onToggle(record.id, checked)}
      />
    ),
  },
  {
    title: '更新时间',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 160,
    render: (time) => dayjs(time).format('MM-DD HH:mm'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 300,
    fixed: 'right',
    render: (_, record) => (
      <Space size="small">
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handlers.onPreview(record)}
        >
          预览
        </Button>
        <Button
          type="link"
          size="small"
          icon={<SendOutlined />}
          onClick={() => handlers.onTest(record)}
        >
          测试
        </Button>
        <Button
          type="link"
          size="small"
          icon={<HistoryOutlined />}
          onClick={() => handlers.onHistory(record)}
        >
          历史
        </Button>
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handlers.onEdit(record)}
        >
          编辑
        </Button>
        <Popconfirm title="确定删除此模板？" onConfirm={() => handlers.onDelete(record.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      </Space>
    ),
  },
];
