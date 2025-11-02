import { useMemo } from 'react';
import type { ColumnsType } from 'antd/es/table';

interface TopApp {
  id: string;
  rank: number;
  name: string;
  installCount: number;
  activeDevices: number;
}

export const useTopAppsTableColumns = () => {
  const columns: ColumnsType<TopApp> = useMemo(
    () => [
      {
        title: '排名',
        dataIndex: 'rank',
        key: 'rank',
        width: 60,
      },
      {
        title: '应用名称',
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: '安装次数',
        dataIndex: 'installCount',
        key: 'installCount',
        sorter: (a, b) => a.installCount - b.installCount,
      },
      {
        title: '活跃设备',
        dataIndex: 'activeDevices',
        key: 'activeDevices',
      },
    ],
    []
  );

  return columns;
};
