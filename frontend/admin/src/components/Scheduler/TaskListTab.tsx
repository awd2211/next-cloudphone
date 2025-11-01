import { memo } from 'react';
import { Table, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { SchedulingTask } from '@/services/scheduler';

interface TaskListTabProps {
  tasks: SchedulingTask[];
  taskColumns: ColumnsType<SchedulingTask>;
  onRefresh: () => void;
}

export const TaskListTab = memo<TaskListTabProps>(({ tasks, taskColumns, onRefresh }) => {
  return (
    <>
      <div style={{ marginBottom: '16px' }}>
        <Button icon={<ReloadOutlined />} onClick={onRefresh}>
          刷新
        </Button>
      </div>
      <Table columns={taskColumns} dataSource={tasks} rowKey="id" pagination={{ pageSize: 10 }} />
    </>
  );
});

TaskListTab.displayName = 'TaskListTab';
