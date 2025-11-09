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
        sorter: (a, b) => a.rank - b.rank,
      },
      {
        title: '应用名称',
        dataIndex: 'name',
        key: 'name',
        sorter: (a, b) => a.name.localeCompare(b.name),
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
        sorter: (a, b) => a.activeDevices - b.activeDevices,
      },
    ],
    []
  );

  return columns;
};
