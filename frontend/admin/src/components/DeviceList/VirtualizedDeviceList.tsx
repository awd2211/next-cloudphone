import React, { useCallback, useRef } from 'react';
import { List } from 'react-window';
import { useInfiniteLoader } from 'react-window-infinite-loader';
// @ts-ignore
import AutoSizer from 'react-virtualized-auto-sizer';
import DeviceCard from './DeviceCard';
import DeviceListSkeleton from './DeviceListSkeleton';

interface Device {
  id: string;
  name: string;
  userId: string;
  providerType: string;
  deviceType?: string;
  status: string;
  cpu?: number;
  memory?: number;
  gpuEnabled?: boolean;
  screenshotUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface VirtualizedDeviceListProps {
  devices: Device[];
  totalCount: number;
  hasNextPage: boolean;
  isNextPageLoading: boolean;
  loadNextPage: () => Promise<void>;
  onDeviceClick: (device: Device) => void;
}

export const VirtualizedDeviceList: React.FC<VirtualizedDeviceListProps> = ({
  devices,
  totalCount,
  hasNextPage,
  isNextPageLoading,
  loadNextPage,
  onDeviceClick,
}) => {
  const listRef = useRef<List>(null);

  // 计算总项数 (已加载 + 加载中占位符)
  const itemCount = hasNextPage ? devices.length + 1 : devices.length;

  // 检查某项是否已加载
  const isItemLoaded = (index: number) => {
    return !hasNextPage || index < devices.length;
  };

  // 渲染单项
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      if (!isItemLoaded(index)) {
        return (
          <div style={style}>
            <DeviceListSkeleton />
          </div>
        );
      }

      const device = devices[index];
      if (!device) return null; // Type guard for undefined
      return (
        <div style={style}>
          <DeviceCard device={device} onClick={() => onDeviceClick(device)} />
        </div>
      );
    },
    [devices, isItemLoaded, onDeviceClick]
  );

  // 使用 useInfiniteLoader hook
  const infiniteLoaderRef = useInfiniteLoader({
    isItemLoaded,
    itemCount,
    loadMoreItems: isNextPageLoading ? () => Promise.resolve() : loadNextPage,
    threshold: 15,
    minimumBatchSize: 10,
  });

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            ref={(list) => {
              // 合并 refs
              if (infiniteLoaderRef && typeof infiniteLoaderRef === 'object' && 'current' in infiniteLoaderRef) {
                (infiniteLoaderRef as any).current = list;
              }
              (listRef as any).current = list;
            }}
            height={height}
            width={width}
            itemCount={itemCount}
            itemSize={120} // 每个设备卡片高度 120px
            overscanCount={5} // 预渲染上下各 5 项
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
};

export default VirtualizedDeviceList;
