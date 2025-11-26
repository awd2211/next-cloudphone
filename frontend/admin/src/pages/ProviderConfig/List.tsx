import { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  message,
  Popconfirm,
  Tooltip,
  Input,
  Select,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  StarOutlined,
  StarFilled,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/utils/request';
import type { ColumnsType } from 'antd/es/table';
import { SEMANTIC } from '@/theme';

const { Search } = Input;
const { Option } = Select;

// 云手机提供商类型枚举（物理设备在设备中心单独管理）
const PROVIDER_TYPES = {
  redroid: 'Redroid',
  huawei_cph: '华为云手机',
  aliyun_ecp: '阿里云手机',
};

// 云手机提供商类型颜色映射
const PROVIDER_TYPE_COLORS: Record<string, string> = {
  redroid: 'blue',
  huawei_cph: 'orange',
  aliyun_ecp: 'purple',
};

// 测试状态颜色映射
const TEST_STATUS_COLORS: Record<string, string> = {
  success: 'success',
  failed: 'error',
  unknown: 'default',
};

interface ProviderConfig {
  id: string;
  name: string;
  providerType: string;
  tenantId: string | null;
  enabled: boolean;
  priority: number;
  maxDevices: number;
  config: Record<string, any>;
  description: string | null;
  isDefault: boolean;
  lastTestedAt: string | null;
  testStatus: string | null;
  testMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  data: ProviderConfig[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function ProviderConfigList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 筛选状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [providerTypeFilter, setProviderTypeFilter] = useState<string>('');
  const [enabledFilter, setEnabledFilter] = useState<string>('');

  // 构建查询参数
  const queryParams = useMemo(() => {
    const params: any = { page, pageSize };
    if (providerTypeFilter) params.providerType = providerTypeFilter;
    if (enabledFilter !== '') params.enabled = enabledFilter === 'true';
    return params;
  }, [page, pageSize, providerTypeFilter, enabledFilter]);

  // 获取配置列表
  const { data: listData, isLoading } = useQuery<ListResponse>({
    queryKey: ['providerConfigs', queryParams],
    queryFn: async () => {
      const { data } = await axios.get('/admin/providers/configs', { params: queryParams });
      return data;
    },
  });

  // 删除配置
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/admin/providers/configs/${id}`);
    },
    onSuccess: () => {
      message.success('配置删除成功');
      queryClient.invalidateQueries({ queryKey: ['providerConfigs'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  // 测试连接
  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.post(`/admin/providers/configs/${id}/test`);
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        message.success(`连接测试成功 (${data.details.latency}ms)`);
      } else {
        message.error(`连接测试失败: ${data.message}`);
      }
      queryClient.invalidateQueries({ queryKey: ['providerConfigs'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '测试失败');
    },
  });

  // 设置为默认
  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.post(`/admin/providers/configs/${id}/set-default`);
    },
    onSuccess: () => {
      message.success('已设置为默认配置');
      queryClient.invalidateQueries({ queryKey: ['providerConfigs'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '设置失败');
    },
  });

  // 表格列定义
  const columns: ColumnsType<ProviderConfig> = [
    {
      title: '配置名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text, record) => (
        <Space>
          {text}
          {record.isDefault && (
            <Tooltip title="默认配置">
              <StarFilled style={{ color: SEMANTIC.warning.main }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '提供商类型',
      dataIndex: 'providerType',
      key: 'providerType',
      width: 120,
      render: (type) => (
        <Tag color={PROVIDER_TYPE_COLORS[type] || 'default'}>
          {PROVIDER_TYPES[type as keyof typeof PROVIDER_TYPES] || type}
        </Tag>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <Badge
          status={record.enabled ? 'success' : 'default'}
          text={record.enabled ? '启用' : '禁用'}
        />
      ),
    },
    {
      title: '测试状态',
      dataIndex: 'testStatus',
      key: 'testStatus',
      width: 120,
      render: (status, record) => {
        if (!status) return <Tag color="default">未测试</Tag>;
        const color = TEST_STATUS_COLORS[status];
        const icon =
          status === 'success' ? (
            <CheckCircleOutlined />
          ) : status === 'failed' ? (
            <CloseCircleOutlined />
          ) : null;
        return (
          <Tooltip title={record.testMessage}>
            <Tag color={color} icon={icon}>
              {status === 'success' ? '成功' : status === 'failed' ? '失败' : '未知'}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      sorter: (a, b) => a.priority - b.priority,
    },
    {
      title: '最大设备数',
      dataIndex: 'maxDevices',
      key: 'maxDevices',
      width: 100,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '最后测试时间',
      dataIndex: 'lastTestedAt',
      key: 'lastTestedAt',
      width: 180,
      render: (time) => (time ? new Date(time).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/provider-configs/edit/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="测试连接">
            <Button
              type="link"
              size="small"
              icon={<SyncOutlined />}
              loading={testMutation.isPending}
              onClick={() => testMutation.mutate(record.id)}
            />
          </Tooltip>
          {!record.isDefault && (
            <Tooltip title="设为默认">
              <Button
                type="link"
                size="small"
                icon={<StarOutlined />}
                onClick={() => setDefaultMutation.mutate(record.id)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="确认删除"
            description="确定要删除这个配置吗？"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deleteMutation.isPending}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 筛选栏 */}
        <Space wrap>
          <Select
            style={{ width: 150 }}
            placeholder="提供商类型"
            allowClear
            value={providerTypeFilter || undefined}
            onChange={(value) => setProviderTypeFilter(value || '')}
          >
            {Object.entries(PROVIDER_TYPES).map(([key, label]) => (
              <Option key={key} value={key}>
                {label}
              </Option>
            ))}
          </Select>
          <Select
            style={{ width: 120 }}
            placeholder="状态"
            allowClear
            value={enabledFilter || undefined}
            onChange={(value) => setEnabledFilter(value || '')}
          >
            <Option value="true">启用</Option>
            <Option value="false">禁用</Option>
          </Select>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/provider-configs/create')}
          >
            新建配置
          </Button>
        </Space>

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={listData?.data || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: pageSize,
            total: listData?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (newPage, newPageSize) => {
              setPage(newPage);
              setPageSize(newPageSize);
            },
          }}
          scroll={{ x: 1200 }}
        />
      </Space>
    </Card>
  );
}
