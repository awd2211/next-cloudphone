/**
 * 可拖拽表格 + 右键菜单示例页面
 *
 * 展示 P3 优化功能：
 * 1. 拖拽排序
 * 2. 右键菜单
 */

import { useState } from 'react';
import { Card, Table, Tag, Space, message, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import { useDraggableTable } from '@/components/DraggableTable';
import { useContextMenu } from '@/components/ContextMenu';

// 示例数据类型
interface ExampleDevice {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  order: number;
}

// 示例数据
const generateExampleData = (): ExampleDevice[] => {
  return Array.from({ length: 10 }, (_, index) => ({
    id: `device-${index + 1}`,
    name: `设备 ${index + 1}`,
    status: ['running', 'stopped', 'error'][Math.floor(Math.random() * 3)] as any,
    order: index + 1,
  }));
};

/**
 * 可拖拽表格示例页面
 */
const DraggableTableExample = () => {
  const [dataSource, setDataSource] = useState<ExampleDevice[]>(generateExampleData());

  // 使用可拖拽表格 Hook
  const { sortedDataSource, DndWrapper, tableComponents, sortColumn } = useDraggableTable({
    dataSource,
    getRowKey: (device) => device.id,
    onSortEnd: (newDataSource) => {
      message.success('排序已更新');
      // 这里可以保存新的排序到服务器
      console.log('New order:', newDataSource.map((d) => d.id));
      setDataSource(newDataSource);
    },
  });

  // 使用右键菜单 Hook
  const { onContextMenu, contextMenu } = useContextMenu({
    items: [
      {
        key: 'view',
        label: '查看详情',
        icon: <EyeOutlined />,
        onClick: (device) => {
          message.info(`查看设备: ${device.name}`);
        },
      },
      {
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />,
        onClick: (device) => {
          message.info(`编辑设备: ${device.name}`);
        },
      },
      { key: 'divider-1', type: 'divider' },
      {
        key: 'start',
        label: '启动',
        icon: <PlayCircleOutlined />,
        onClick: (device) => {
          message.success(`启动设备: ${device.name}`);
        },
        visible: (device) => device.status !== 'running',
      },
      {
        key: 'stop',
        label: '停止',
        icon: <StopOutlined />,
        onClick: (device) => {
          message.success(`停止设备: ${device.name}`);
        },
        visible: (device) => device.status === 'running',
      },
      {
        key: 'reboot',
        label: '重启',
        icon: <ReloadOutlined />,
        onClick: (device) => {
          message.success(`重启设备: ${device.name}`);
        },
      },
      { key: 'divider-2', type: 'divider' },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: (device) => {
          message.warning(`删除设备: ${device.name}`);
        },
      },
    ],
  });

  // 表格列定义
  const columns: ColumnsType<ExampleDevice> = [
    sortColumn, // 拖拽手柄列
    {
      title: '序号',
      dataIndex: 'order',
      width: 80,
    },
    {
      title: 'ID',
      dataIndex: 'id',
      width: 150,
    },
    {
      title: '设备名称',
      dataIndex: 'name',
      width: 200,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (status) => {
        const config = {
          running: { color: 'green', text: '运行中' },
          stopped: { color: 'default', text: '已停止' },
          error: { color: 'red', text: '错误' },
        };
        return <Tag color={config[status].color}>{config[status].text}</Tag>;
      },
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 说明卡片 */}
        <Card title="🎯 P3 优化功能演示" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <strong>1. 拖拽排序：</strong>
              <p style={{ marginTop: 8, marginBottom: 0, color: '#666' }}>
                按住最左侧的 <HolderOutlined style={{ fontSize: 16, margin: '0 4px' }} />{' '}
                图标拖拽行，可以调整顺序
              </p>
            </div>

            <div>
              <strong>2. 右键菜单：</strong>
              <p style={{ marginTop: 8, marginBottom: 0, color: '#666' }}>
                在表格行上点击鼠标右键，显示快捷操作菜单（根据设备状态动态显示不同的菜单项）
              </p>
            </div>

            <div style={{ padding: 12, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
              <strong>💡 提示：</strong>
              <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                <li>拖拽需要移动 5px 以上才会触发，避免误操作</li>
                <li>右键菜单会根据设备状态显示不同的操作项（启动/停止）</li>
                <li>危险操作（删除）会以红色显示</li>
              </ul>
            </div>

            <Button onClick={() => setDataSource(generateExampleData())} type="primary">
              重新生成数据
            </Button>
          </Space>
        </Card>

        {/* 数据表格 */}
        <Card title="设备列表（支持拖拽排序 + 右键菜单）" bordered={false}>
          <DndWrapper>
            <Table
              columns={columns}
              dataSource={sortedDataSource}
              components={tableComponents}
              rowKey="id"
              pagination={false}
              onRow={(record) => ({
                onContextMenu: (e) => onContextMenu(record, e),
              })}
            />
          </DndWrapper>
          {contextMenu}
        </Card>
      </Space>
    </div>
  );
};

export default DraggableTableExample;
