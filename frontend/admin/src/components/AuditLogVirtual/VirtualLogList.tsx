import React, { useCallback } from 'react';
import { List, RowComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Tag } from 'antd';
import type { AuditLog } from '@/types/auditLog';
import { LogRow } from './LogRow';

interface VirtualLogListProps {
  logs: AuditLog[];
}

// Row props for react-window 2.x
interface LogListRowProps {
  logs: AuditLog[];
}

export const VirtualLogList: React.FC<VirtualLogListProps> = ({ logs }) => {
  const RowComponent = useCallback(
    (props: RowComponentProps<LogListRowProps>) => {
      const { index, style, ariaAttributes, logs: rowLogs } = props;
      const log = rowLogs[index];

      if (!log) {
        return <div style={style} {...ariaAttributes} />;
      }

      return <LogRow log={log} style={style} {...ariaAttributes} />;
    },
    []
  );

  return (
    <>
      <div className="virtual-list-container">
        <AutoSizer>
          {({ height, width }: { height: number; width: number }) => (
            <List
              rowComponent={RowComponent}
              rowProps={{ logs }}
              rowCount={logs.length}
              rowHeight={120}
              style={{ height, width }}
              overscanCount={5}
            />
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
