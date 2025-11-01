import { useMemo } from 'react';
import { Space, Button, Tag } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { SMSRecord } from './types';
import { STATUS_CONFIG, PROVIDER_MAP } from './constants';

interface UseSMSColumnsProps {
  onViewDetail: (record: SMSRecord) => void;
}

/**
 * SMS 表格列定义 Hook
 */
export const useSMSColumns = ({
  onViewDetail,
}: UseSMSColumnsProps): ColumnsType<SMSRecord> => {
  return useMemo(
    () => [
      {
        title: '手机号',
        dataIndex: 'phone',
        key: 'phone',
        width: 120,
      },
      {
        title: '内容',
        dataIndex: 'content',
        key: 'content',
        ellipsis: true,
        width: 200,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: string) => {
          const config = STATUS_CONFIG[status] || {
            color: 'default',
            text: status,
          };
          return <Tag color={config.color}>{config.text}</Tag>;
        },
      },
      {
        title: '供应商',
        dataIndex: 'provider',
        key: 'provider',
        width: 100,
        render: (provider: string) => PROVIDER_MAP[provider] || provider,
      },
      {
        title: '用户',
        dataIndex: 'userName',
        key: 'userName',
        width: 120,
      },
      {
        title: '模板代码',
        dataIndex: 'templateCode',
        key: 'templateCode',
        width: 120,
      },
      {
        title: '发送时间',
        dataIndex: 'sentAt',
        key: 'sentAt',
        width: 160,
        render: (sentAt: string) => sentAt || '-',
      },
      {
        title: '操作',
        key: 'action',
        width: 100,
        fixed: 'right',
        render: (_: any, record: SMSRecord) => (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onViewDetail(record)}
            >
              详情
            </Button>
          </Space>
        ),
      },
    ],
    [onViewDetail],
  );
};
