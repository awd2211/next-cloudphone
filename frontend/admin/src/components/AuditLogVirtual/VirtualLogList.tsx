import React from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Tag } from 'antd';
import type { AuditLog } from '@/types/auditLog';
import { LogRow } from './LogRow';

interface VirtualLogListProps {
  logs: AuditLog[];
}

export const VirtualLogList: React.FC<VirtualLogListProps> = ({ logs }) => {
  const renderRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const log = logs[index];
    return <LogRow log={log} style={style} />;
  };

  return (
    <>
      <div className="virtual-list-container">
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              itemCount={logs.length}
              itemSize={120}
              width={width}
              overscanCount={5}
            >
              {renderRow}
            </List>
          )}
        </AutoSizer>
      </div>

      <div className="performance-note">
        <Tag color="blue">💡 性能提示</Tag>
        <span>
          虚拟滚动只渲染可见区域的项，即使有 10,000+ 条记录也能流畅滚动。
          传统列表会渲染所有项，导致浏览器卡顿。
        </span>
      </div>
    </>
  );
};
