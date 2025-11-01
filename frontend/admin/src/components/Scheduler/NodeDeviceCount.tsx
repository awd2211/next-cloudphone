/**
 * NodeDeviceCount - 节点设备数显示组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';

interface NodeDeviceCountProps {
  deviceCount: number;
  maxDevices: number;
}

/**
 * NodeDeviceCount 组件
 * 显示节点当前设备数和最大容量
 */
export const NodeDeviceCount = memo<NodeDeviceCountProps>(({ deviceCount, maxDevices }) => {
  return (
    <span>
      {deviceCount}/{maxDevices}
    </span>
  );
});

NodeDeviceCount.displayName = 'NodeDeviceCount';
