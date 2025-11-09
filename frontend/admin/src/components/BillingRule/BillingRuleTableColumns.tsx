import { useMemo } from 'react';
import { Space, Button, Popconfirm, Tag, Switch } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { BillingRule } from '@/types';
import { typeMap } from './billingRuleUtils';
import dayjs from 'dayjs';
import { createTimeColumn } from '@/utils/tableColumns';

interface BillingRuleTableColumnsProps {
  onDetailClick: (rule: BillingRule) => void;
  onTest: (rule: BillingRule) => void;
  onEdit: (rule: BillingRule) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

/**
 * 计费规则表格列配置
 */
export const useBillingRuleTableColumns = ({
  onDetailClick,
  onTest,
  onEdit,
  onDelete,
  onToggleActive,
}: BillingRuleTableColumnsProps): ColumnsType<BillingRule> => {
  return useMemo(
    () => [
      {
        title: '规则名称',
        dataIndex: 'name',
        key: 'name',
        width: 200,
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (name: string, record: BillingRule) => (
          <a onClick={() => onDetailClick(record)}>{name}</a>
        ),
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 120,
        sorter: (a, b) => a.type.localeCompare(b.type),
        render: (type: string) => {
          const config = typeMap[type as keyof typeof typeMap];
          return <Tag color={config?.color}>{config?.text}</Tag>;
        },
      },
      {
        title: '公式',
        dataIndex: 'formula',
        key: 'formula',
        width: 200,
        ellipsis: true,
        render: (formula: string) => (
          <code style={{ fontSize: '12px', color: '#595959' }}>{formula}</code>
        ),
      },
      {
        title: '优先级',
        dataIndex: 'priority',
        key: 'priority',
        width: 80,
        align: 'center',
        sorter: (a, b) => a.priority - b.priority,
      },
      {
        title: '状态',
        dataIndex: 'isActive',
        key: 'isActive',
        width: 100,
        render: (isActive: boolean, record: BillingRule) => (
          <Switch
            checked={isActive}
            checkedChildren={<CheckCircleOutlined />}
            unCheckedChildren={<CloseCircleOutlined />}
            onChange={(checked) => onToggleActive(record.id, checked)}
          />
        ),
      },
      {
        title: '有效期',
        key: 'validity',
        width: 200,
        render: (_, record: BillingRule) => {
          if (!record.validFrom && !record.validUntil) {
            return <Tag color="green">永久有效</Tag>;
          }
          return (
            <div>
              {record.validFrom && <div>从: {dayjs(record.validFrom).format('YYYY-MM-DD')}</div>}
              {record.validUntil && <div>至: {dayjs(record.validUntil).format('YYYY-MM-DD')}</div>}
            </div>
          );
        },
      },
      createTimeColumn<BillingRule>('创建时间', 'createdAt', { format: 'YYYY-MM-DD HH:mm', width: 160 }),
      {
        title: '操作',
        key: 'actions',
        width: 200,
        fixed: 'right',
        render: (_, record: BillingRule) => (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<ExperimentOutlined />}
              onClick={() => onTest(record)}
            >
              测试
            </Button>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定要删除此规则吗？"
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
    ],
    [onDetailClick, onTest, onEdit, onDelete, onToggleActive]
  );
};
