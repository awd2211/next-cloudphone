import { memo } from 'react';
import { Table, Button, Space } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { SchedulerNode } from '@/services/scheduler';

interface NodeListTabProps {
  nodes: SchedulerNode[];
  loading: boolean;
  nodeColumns: ColumnsType<SchedulerNode>;
  onRefresh: () => void;
  onAdd: () => void;
}

export const NodeListTab = memo<NodeListTabProps>(
  ({ nodes, loading, nodeColumns, onRefresh, onAdd }) => {
    return (
      <>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={onRefresh}>
              刷新
            </Button>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
            添加节点
          </Button>
        </div>
        <Table
          columns={nodeColumns}
          dataSource={nodes}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1600 }}
        />
      </>
    );
  }
);

NodeListTab.displayName = 'NodeListTab';
