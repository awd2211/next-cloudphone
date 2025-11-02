import React from 'react';

interface DeviceConfigCellProps {
  cpuCores: number;
  memoryMB: number;
}

export const DeviceConfigCell: React.FC<DeviceConfigCellProps> = React.memo(
  ({ cpuCores, memoryMB }) => {
    return (
      <span>
        {cpuCores}核 / {(memoryMB / 1024).toFixed(1)}GB
      </span>
    );
  }
);

DeviceConfigCell.displayName = 'DeviceConfigCell';
