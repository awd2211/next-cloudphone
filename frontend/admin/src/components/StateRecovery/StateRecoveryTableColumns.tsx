import { useMemo } from 'react';
import { Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  StateRecoveryRecord,
  RECOVERY_TYPE_MAP,
  STATUS_CONFIG,
} from './constants';

export const useStateRecoveryColumns = (): ColumnsType<StateRecoveryRecord> => {
  return useMemo(
    () => [
      {
        title: '设备ID',
        dataIndex: 'deviceId',
        key: 'deviceId',
        width: 200,
        ellipsis: true,
      },
      {
        title: '设备名称',
        dataIndex: 'deviceName',
        key: 'deviceName',
        width: 150,
      },
      {
        title: '之前状态',
        dataIndex: 'previousState',
        key: 'previousState',
        width: 100,
        render: (state: string) => <Tag>{state}</Tag>,
      },
      {
        title: '当前状态',
        dataIndex: 'currentState',
        key: 'currentState',
        width: 100,
        render: (state: string) => <Tag color="blue">{state}</Tag>,
      },
      {
        title: '目标状态',
        dataIndex: 'targetState',
        key: 'targetState',
        width: 100,
        render: (state: string) => <Tag color="green">{state}</Tag>,
      },
      {
        title: '恢复类型',
        dataIndex: 'recoveryType',
        key: 'recoveryType',
        width: 100,
        render: (type: string) => RECOVERY_TYPE_MAP[type] || type,
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
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
      },
      {
        title: '完成时间',
        dataIndex: 'completedAt',
        key: 'completedAt',
        width: 160,
        render: (time: string) => time || '-',
      },
    ],
    []
  );
};
