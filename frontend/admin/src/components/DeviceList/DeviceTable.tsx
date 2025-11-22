import { memo } from 'react';
import { Table } from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import type { Device } from '@/types';

interface DeviceTableProps {
  columns: ColumnsType<Device>;
  dataSource: Device[];
  loading: boolean;
  selectedRowKeys: React.Key[];
  onSelectionChange: (selectedRowKeys: React.Key[]) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
  components?: TableProps<Device>['components'];
  onRow?: TableProps<Device>['onRow'];
}

/**
 * 设备列表表格组件
 * 支持分页、排序、行选择
 *
 * 性能优化:
 * - ✅ 使用 memo 避免不必要的重渲染
 * - ✅ 启用虚拟滚动，提升大数据场景性能（仅在非拖拽模式下）
 *
 * 注意：
 * - antd Table 的 virtual 属性与 @dnd-kit 存在兼容性问题
 * - 当启用拖拽（传入 components）时，自动禁用虚拟滚动
 */
export const DeviceTable = memo<DeviceTableProps>(
  ({
    columns,
    dataSource,
    loading,
    selectedRowKeys,
    onSelectionChange,
    page,
    pageSize,
    total,
    onPageChange,
    components,
    onRow,
  }) => {
    // 当使用自定义 components（如 dnd-kit 拖拽）时，禁用虚拟滚动
    // 因为 antd virtual 与 dnd-kit 存在已知兼容性问题
    const enableVirtual = !components;

    // 拖拽模式下完全禁用 scroll.y 和 virtual，避免 antd 内部的滚动监听冲突
    const scrollConfig = enableVirtual
      ? { x: 1200, y: 600 }
      : { x: 1200 }; // 拖拽模式只保留横向滚动

    return (
      <Table<Device>
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        components={components}
        onRow={onRow}
        rowSelection={{
          selectedRowKeys,
          onChange: onSelectionChange,
        }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 台设备`,
          onChange: onPageChange,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        scroll={scrollConfig}
        {...(enableVirtual ? { virtual: true } : {})} // 仅在非拖拽模式下添加 virtual 属性
      />
    );
  }
);

DeviceTable.displayName = 'DeviceTable';
