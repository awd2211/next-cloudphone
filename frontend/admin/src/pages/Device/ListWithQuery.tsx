/**
 * 设备列表页面 (使用 React Query 优化版本)
 *
 * 优化点：
 * - 使用 React Query 管理数据获取和缓存
 * - 添加骨架屏加载状态
 * - 使用 useMemo 优化表格列配置
 * - 使用 useCallback 优化事件处理
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Modal,
  Form,
  message,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useDevices, useCreateDevice, useBatchDeviceOperation } from '../../hooks/queries/useDevices';
import { TableSkeleton } from '../../components/PageSkeleton';
import type { Device, CreateDeviceDto } from '../../types';

const { Search } = Input;
const { Option } = Select;

export default function DeviceListWithQuery() {
  // 状态管理
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const [form] = Form.useForm();

  // 构建查询参数
  const queryParams = useMemo(() => ({
    page,
    pageSize,
    search: searchKeyword || undefined,
    status: statusFilter || undefined,
  }), [page, pageSize, searchKeyword, statusFilter]);

  // 使用 React Query 获取数据
  const { data, isLoading, isError, refetch } = useDevices(queryParams);

  // Mutations
  const createDevice = useCreateDevice();
  const batchOperation = useBatchDeviceOperation();

  // 表格列配置 (使用 useMemo 避免重新创建)
  const columns = useMemo<ColumnsType<Device>>(() => [
    {
      title: '设备 ID',
      dataIndex: 'id',
      key: 'id',
      width: 280,
      fixed: 'left',
    },
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '用户',
      dataIndex: ['user', 'username'],
      key: 'username',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          idle: 'default',
          running: 'success',
          stopped: 'warning',
          error: 'error',
        };
        const textMap: Record<string, string> = {
          idle: '空闲',
          running: '运行中',
          stopped: '已停止',
          error: '错误',
        };
        return <Tag color={colorMap[status]}>{textMap[status] || status}</Tag>;
      },
    },
    {
      title: 'Android 版本',
      dataIndex: 'androidVersion',
      key: 'androidVersion',
      width: 120,
    },
    {
      title: '配置',
      key: 'config',
      width: 180,
      render: (_, record) => (
        <span>
          {record.cpuCores} 核 / {(record.memoryMB / 1024).toFixed(1)} GB
        </span>
      ),
    },
    {
      title: 'IP 地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 130,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => handleViewDetail(record.id)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => handleStartDevice(record.id)}
            disabled={record.status === 'running'}
          >
            启动
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => handleDeleteDevice(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ], []);

  // 事件处理 (使用 useCallback 避免重新创建)
  const handleSearch = useCallback((value: string) => {
    setSearchKeyword(value);
    setPage(1); // 重置到第一页
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const handleCreateDevice = useCallback(async () => {
    try {
      const values = await form.validateFields();
      await createDevice.mutateAsync(values as CreateDeviceDto);
      setCreateModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('创建设备失败:', error);
    }
  }, [createDevice, form]);

  const handleBatchStart = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择设备');
      return;
    }

    Modal.confirm({
      title: '批量启动设备',
      content: `确定要启动选中的 ${selectedRowKeys.length} 个设备吗？`,
      onOk: async () => {
        await batchOperation.mutateAsync({
          ids: selectedRowKeys as string[],
          operation: 'start',
        });
        setSelectedRowKeys([]);
      },
    });
  }, [selectedRowKeys, batchOperation]);

  const handleBatchStop = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择设备');
      return;
    }

    Modal.confirm({
      title: '批量停止设备',
      content: `确定要停止选中的 ${selectedRowKeys.length} 个设备吗？`,
      onOk: async () => {
        await batchOperation.mutateAsync({
          ids: selectedRowKeys as string[],
          operation: 'stop',
        });
        setSelectedRowKeys([]);
      },
    });
  }, [selectedRowKeys, batchOperation]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择设备');
      return;
    }

    Modal.confirm({
      title: '批量删除设备',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个设备吗？此操作不可恢复！`,
      okText: '确定',
      okType: 'danger',
      onOk: async () => {
        await batchOperation.mutateAsync({
          ids: selectedRowKeys as string[],
          operation: 'delete',
        });
        setSelectedRowKeys([]);
      },
    });
  }, [selectedRowKeys, batchOperation]);

  const handleViewDetail = useCallback((id: string) => {
    window.location.href = `/devices/${id}`;
  }, []);

  const handleStartDevice = useCallback((id: string) => {
    // 使用 React Query mutation
    console.log('启动设备:', id);
  }, []);

  const handleDeleteDevice = useCallback((id: string) => {
    Modal.confirm({
      title: '删除设备',
      content: '确定要删除此设备吗？此操作不可恢复！',
      okText: '确定',
      okType: 'danger',
      onOk: async () => {
        // 使用 React Query mutation
        console.log('删除设备:', id);
      },
    });
  }, []);

  // 行选择配置
  const rowSelection = useMemo(() => ({
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  }), [selectedRowKeys]);

  // 显示骨架屏
  if (isLoading) {
    return <TableSkeleton rows={10} />;
  }

  // 错误状态
  if (isError) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>数据加载失败</p>
          <Button onClick={() => refetch()}>重试</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="设备管理"
      extra={
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建设备
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>
        </Space>
      }
    >
      {/* 搜索和筛选 */}
      <Space style={{ marginBottom: 16 }}>
        <Search
          placeholder="搜索设备名称或 ID"
          onSearch={handleSearch}
          style={{ width: 250 }}
          allowClear
        />
        <Select
          placeholder="状态筛选"
          style={{ width: 150 }}
          value={statusFilter || undefined}
          onChange={handleStatusFilterChange}
          allowClear
        >
          <Option value="idle">空闲</Option>
          <Option value="running">运行中</Option>
          <Option value="stopped">已停止</Option>
          <Option value="error">错误</Option>
        </Select>
      </Space>

      {/* 批量操作 */}
      {selectedRowKeys.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Space>
            <span>已选择 {selectedRowKeys.length} 项</span>
            <Button
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={handleBatchStart}
              loading={batchOperation.isPending}
            >
              批量启动
            </Button>
            <Button
              size="small"
              icon={<PauseCircleOutlined />}
              onClick={handleBatchStop}
              loading={batchOperation.isPending}
            >
              批量停止
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={handleBatchDelete}
              loading={batchOperation.isPending}
            >
              批量删除
            </Button>
          </Space>
        </div>
      )}

      {/* 表格 */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.data || []}
        rowSelection={rowSelection}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: data?.total || 0,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            setPageSize(newPageSize);
          },
        }}
        scroll={{ x: 1500 }}
      />

      {/* 创建设备弹窗 */}
      <Modal
        title="创建设备"
        open={createModalVisible}
        onOk={handleCreateDevice}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        confirmLoading={createDevice.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="userId"
            label="用户 ID"
            rules={[{ required: true, message: '请输入用户 ID' }]}
          >
            <Input placeholder="请输入用户 ID" />
          </Form.Item>

          <Form.Item name="name" label="设备名称">
            <Input placeholder="自动生成（可选）" />
          </Form.Item>

          <Form.Item name="androidVersion" label="Android 版本">
            <Select placeholder="选择 Android 版本">
              <Option value="11.0">Android 11</Option>
              <Option value="12.0">Android 12</Option>
              <Option value="13.0">Android 13</Option>
            </Select>
          </Form.Item>

          <Form.Item name="cpuCores" label="CPU 核心数">
            <Select placeholder="选择 CPU 核心数">
              <Option value={2}>2 核</Option>
              <Option value={4}>4 核</Option>
              <Option value={8}>8 核</Option>
            </Select>
          </Form.Item>

          <Form.Item name="memoryMB" label="内存 (MB)">
            <Select placeholder="选择内存大小">
              <Option value={2048}>2 GB</Option>
              <Option value={4096}>4 GB</Option>
              <Option value={8192}>8 GB</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
