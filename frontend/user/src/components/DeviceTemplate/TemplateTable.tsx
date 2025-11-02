import React from 'react';
import { Table } from 'antd';
import {
  type DeviceTemplate,
  type TemplateTableHandlers,
  createTemplateColumns,
} from '@/utils/templateConfig';

interface TemplateTableProps {
  templates: DeviceTemplate[];
  loading: boolean;
  handlers: TemplateTableHandlers;
}

/**
 * 模板列表表格组件
 *
 * 优化点:
 * - 使用 React.memo 优化
 * - 配置驱动列定义（通过工厂函数）
 * - 分页、排序、滚动配置
 */
export const TemplateTable: React.FC<TemplateTableProps> = React.memo(
  ({ templates, loading, handlers }) => {
    const columns = createTemplateColumns(handlers);

    return (
      <Table
        columns={columns}
        dataSource={templates}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 个模板`,
        }}
        scroll={{ x: 1200 }}
      />
    );
  }
);

TemplateTable.displayName = 'TemplateTable';
