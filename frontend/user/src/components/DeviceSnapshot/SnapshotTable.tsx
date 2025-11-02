import React, { useMemo } from 'react';
import { Table } from 'antd';
import { createSnapshotColumns, type Snapshot } from '@/utils/snapshotConfig';

interface SnapshotTableProps {
  snapshots: Snapshot[];
  loading: boolean;
  onRestore: (snapshot: Snapshot) => void;
  onDelete: (snapshotId: string) => void;
}

/**
 * 快照表格组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 使用 useMemo 缓存表格列定义
 * - 响应式表格（横向滚动）
 */
export const SnapshotTable: React.FC<SnapshotTableProps> = React.memo(
  ({ snapshots, loading, onRestore, onDelete }) => {
    // 使用 useMemo 缓存表格列定义
    const columns = useMemo(
      () => createSnapshotColumns(onRestore, onDelete),
      [onRestore, onDelete]
    );

    return (
      <Table
        columns={columns}
        dataSource={snapshots}
        rowKey="id"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        scroll={{ x: 1000 }}
      />
    );
  }
);

SnapshotTable.displayName = 'SnapshotTable';
