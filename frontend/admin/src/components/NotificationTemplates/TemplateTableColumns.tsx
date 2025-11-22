import { useMemo } from 'react';
import { Typography, Tag, Space, Button, Tooltip, Popconfirm } from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { NotificationTemplate } from './TemplateActions';
import { TYPE_CONFIG, CHANNEL_CONFIG } from './constants';
import { AccessibleButton } from '@/components/Accessible/AccessibleButton';

const { Text } = Typography;

interface UseTemplateColumnsProps {
  onEdit: (record: NotificationTemplate) => void;
  onPreview: (record: NotificationTemplate) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

export const useTemplateColumns = ({
  onEdit,
  onPreview,
  onToggle,
  onDelete,
}: UseTemplateColumnsProps) => {
  return useMemo(
    () => [
      {
        title: '模板代码',
        dataIndex: 'code',
        key: 'code',
        width: 200,
        sorter: (a: NotificationTemplate, b: NotificationTemplate) => a.code.localeCompare(b.code),
        render: (text: string) => <Text code>{text}</Text>,
      },
      {
        title: '模板名称',
        dataIndex: 'name',
        key: 'name',
        width: 180,
        sorter: (a: NotificationTemplate, b: NotificationTemplate) => a.name.localeCompare(b.name),
        ellipsis: {
          showTitle: false,
        },
        render: (text: string) => (
          <Tooltip placement="topLeft" title={text}>
            <span>{text}</span>
          </Tooltip>
        ),
      },
      {
        title: '通知标题',
        dataIndex: 'title',
        key: 'title',
        width: 200,
        ellipsis: {
          showTitle: false,
        },
        render: (text: string) => (
          <Tooltip placement="topLeft" title={text}>
            <span>{text || '-'}</span>
          </Tooltip>
        ),
      },
      {
        title: '通知内容',
        dataIndex: 'body',
        key: 'body',
        width: 300,
        ellipsis: {
          showTitle: false,
        },
        render: (text: string) => (
          <Tooltip placement="topLeft" title={text} overlayStyle={{ maxWidth: 500 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>{text || '-'}</Text>
          </Tooltip>
        ),
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 120,
        sorter: (a: NotificationTemplate, b: NotificationTemplate) => a.type.localeCompare(b.type),
        render: (type: string) => {
          const config = TYPE_CONFIG[type] || { color: 'default', label: type };
          return <Tag color={config.color}>{config.label}</Tag>;
        },
      },
      {
        title: '通知渠道',
        dataIndex: 'channels',
        key: 'channels',
        width: 150,
        render: (channels: string[]) => (
          <>
            {channels.map((channel) => {
              const config = CHANNEL_CONFIG[channel] || { color: 'default', label: channel };
              return (
                <Tag key={channel} color={config.color}>
                  {config.label}
                </Tag>
              );
            })}
          </>
        ),
      },
      {
        title: '语言',
        dataIndex: 'language',
        key: 'language',
        width: 80,
        sorter: (a: NotificationTemplate, b: NotificationTemplate) => a.language.localeCompare(b.language),
        render: (language: string) => <Tag>{language}</Tag>,
      },
      {
        title: '状态',
        dataIndex: 'isActive',
        key: 'isActive',
        width: 100,
        sorter: (a: NotificationTemplate, b: NotificationTemplate) => Number(a.isActive) - Number(b.isActive),
        render: (isActive: boolean) =>
          isActive ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              激活
            </Tag>
          ) : (
            <Tag color="default" icon={<StopOutlined />}>
              停用
            </Tag>
          ),
      },
      {
        title: '操作',
        key: 'action',
        width: 300,
        fixed: 'right' as const,
        render: (_: any, record: NotificationTemplate) => (
          <Space size="small">
            <Tooltip title="预览">
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => onPreview(record)}
              />
            </Tooltip>
            <Tooltip title="编辑">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit(record)}
              />
            </Tooltip>
            <Tooltip title={record.isActive ? '停用' : '激活'}>
              <Button type="link" size="small" onClick={() => onToggle(record.id, !record.isActive)}>
                {record.isActive ? '停用' : '激活'}
              </Button>
            </Tooltip>
            <Popconfirm
              title="确定删除此模板吗？"
              onConfirm={() => onDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <AccessibleButton
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                ariaLabel={`删除通知模板 ${record.name}`}
                ariaDescription="删除此通知模板，此操作不可恢复"
              />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [onEdit, onPreview, onToggle, onDelete]
  );
};
