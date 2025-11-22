import React, { useCallback, useRef, memo } from 'react';
import { List, ListImperativeAPI, RowComponentProps } from 'react-window';
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

// Row props for react-window 2.x
interface DeviceListRowProps {
  devices: Device[];
  hasNextPage: boolean;
  isNextPageLoading: boolean;
  onDeviceClick: (device: Device) => void;
}

// ✅ 使用 memo 包装组件，避免不必要的重渲染
export const VirtualizedDeviceList: React.FC<VirtualizedDeviceListProps> = memo(({
  devices,
  hasNextPage,
  isNextPageLoading,
  loadNextPage: _loadNextPage, // TODO: 需要实现滚动加载
  onDeviceClick,
}) => {
  const listRef = useRef<ListImperativeAPI>(null);

  // 计算总项数 (已加载 + 加载中占位符)
  const itemCount = hasNextPage ? devices.length + 1 : devices.length;

  // 检查某项是否已加载
  const isItemLoaded = useCallback(
    (index: number) => {
      return !hasNextPage || index < devices.length;
    },
    [hasNextPage, devices.length]
  );

  // 渲染单项 - react-window 2.x 风格
  const RowComponent = useCallback(
    (props: RowComponentProps<DeviceListRowProps>) => {
      const { index, style, ariaAttributes, devices: rowDevices, onDeviceClick: handleClick } = props;

      if (!isItemLoaded(index)) {
        return (
          <div style={style} {...ariaAttributes}>
            <DeviceListSkeleton />
          </div>
        );
      }

      const device = rowDevices[index];
      if (!device) {
        return <div style={style} {...ariaAttributes} />;
      }

      return (
        <div style={style} {...ariaAttributes}>
          <DeviceCard device={device} onClick={() => handleClick(device)} />
        </div>
      );
    },
    [isItemLoaded]
  );

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            listRef={listRef}
            rowComponent={RowComponent}
            rowProps={{
              devices,
              hasNextPage,
              isNextPageLoading,
              onDeviceClick,
            }}
            rowCount={itemCount}
            rowHeight={120} // 每个设备卡片高度 120px
            style={{ height, width }}
            overscanCount={5} // 预渲染上下各 5 项
          />
        )}
      </AutoSizer>
    </div>
  );
});

VirtualizedDeviceList.displayName = 'VirtualizedDeviceList';

export default VirtualizedDeviceList;
