import { useMemo } from 'react';
import { Button, Tag } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { FailoverRecord, STATUS_CONFIG, TRIGGER_TYPE_MAP } from './constants';

interface FailoverTableColumnsProps {
  onViewDetail: (record: FailoverRecord) => void;
}

export const useFailoverTableColumns = ({
  onViewDetail,
}: FailoverTableColumnsProps): ColumnsType<FailoverRecord> => {
  return useMemo(
    () => [
      {
        title: '设备ID',
        dataIndex: 'deviceId',
        key: 'deviceId',
        width: 200,
        ellipsis: true,
        sorter: (a, b) => a.deviceId.localeCompare(b.deviceId),
      },
      {
        title: '设备名称',
        dataIndex: 'deviceName',
        key: 'deviceName',
        width: 150,
        sorter: (a, b) => a.deviceName.localeCompare(b.deviceName),
      },
      {
        title: '源节点',
        dataIndex: 'sourceNode',
        key: 'sourceNode',
        width: 120,
        sorter: (a, b) => a.sourceNode.localeCompare(b.sourceNode),
      },
      {
        title: '目标节点',
        dataIndex: 'targetNode',
        key: 'targetNode',
        width: 120,
        sorter: (a, b) => a.targetNode.localeCompare(b.targetNode),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        sorter: (a, b) => a.status.localeCompare(b.status),
        render: (status: string) => {
          const config = STATUS_CONFIG[status] || {
            color: 'default',
            text: status,
          };
          return <Tag color={config.color}>{config.text}</Tag>;
        },
      },
      {
        title: '触发方式',
        dataIndex: 'triggerType',
        key: 'triggerType',
        width: 100,
        sorter: (a, b) => a.triggerType.localeCompare(b.triggerType),
        render: (type: string) => TRIGGER_TYPE_MAP[type] || type,
      },
      {
        title: '开始时间',
        dataIndex: 'startedAt',
        key: 'startedAt',
        width: 160,
        sorter: (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
      },
      {
        title: '耗时',
        dataIndex: 'duration',
        key: 'duration',
        width: 100,
        sorter: (a, b) => (a.duration || 0) - (b.duration || 0),
        render: (duration: number) => (duration ? `${duration}s` : '-'),
      },
      {
        title: '操作',
        key: 'action',
        width: 100,
        fixed: 'right' as const,
        render: (_: any, record: FailoverRecord) => (
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onViewDetail(record)}
          >
            详情
          </Button>
        ),
      },
    ],
    [onViewDetail]
  );
};
