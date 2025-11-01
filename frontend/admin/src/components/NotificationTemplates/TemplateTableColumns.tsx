import React, { useMemo } from 'react';
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

const { Text } = Typography;

interface UseTemplateColumnsProps {
  onEdit: (record: NotificationTemplate) => void;
  onPreview: (record: NotificationTemplate) => void;
  onToggle: (id: string) => void;
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
        render: (text: string) => <Text code>{text}</Text>,
      },
      {
        title: '模板名称',
        dataIndex: 'name',
        key: 'name',
        width: 200,
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 120,
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
        render: (language: string) => <Tag>{language}</Tag>,
      },
      {
        title: '状态',
        dataIndex: 'isActive',
        key: 'isActive',
        width: 100,
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
              <Button type="link" size="small" onClick={() => onToggle(record.id)}>
                {record.isActive ? '停用' : '激活'}
              </Button>
            </Tooltip>
            <Popconfirm
              title="确定删除此模板吗？"
              onConfirm={() => onDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button type="link" size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [onEdit, onPreview, onToggle, onDelete]
  );
};
