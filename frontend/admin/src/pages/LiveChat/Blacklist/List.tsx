/**
 * 黑名单管理页面
 *
 * 功能:
 * - 黑名单列表展示
 * - 添加/编辑/撤销/删除黑名单
 * - 批量导入
 * - 统计数据展示
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  message,
  Tooltip,
  Row,
  Col,
  Statistic,
  Select,
  Input,
  Form,
  DatePicker,
  Switch,
  Popconfirm,
  Typography,
  Descriptions,
  Drawer,
  Badge,
} from 'antd';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
import {
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  StopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  GlobalOutlined,
  MobileOutlined,
  UserOutlined,
  EyeOutlined,
  ImportOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  searchBlacklist,
  createBlacklist,
  updateBlacklist,
  revokeBlacklist,
  deleteBlacklist,
  getBlacklistStats,
  type Blacklist,
  type BlacklistType,
  type BlacklistStatus,
  type SearchBlacklistParams,
} from '@/services/blacklist';
import { SEMANTIC, NEUTRAL_LIGHT } from '@/theme';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

const BlacklistPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  // 状态
  const [searchParams, setSearchParams] = useState<SearchBlacklistParams>({ page: 1, limit: 20 });
  const [modalVisible, setModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Blacklist | null>(null);
  const [selectedItem, setSelectedItem] = useState<Blacklist | null>(null);
  const [isPermanent, setIsPermanent] = useState(false);

  // 获取黑名单列表
  const { data: result, isLoading, error, refetch } = useQuery({
    queryKey: ['blacklist', searchParams],
    queryFn: () => searchBlacklist(searchParams),
  });

  // 获取统计
  const { data: stats } = useQuery({
    queryKey: ['blacklist-stats'],
    queryFn: getBlacklistStats,
  });

  // 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refetch();
        message.info('正在刷新...');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleCreate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createBlacklist,
    onSuccess: () => {
      message.success('添加成功');
      setModalVisible(false);
      form.resetFields();
      setIsPermanent(false);
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
      queryClient.invalidateQueries({ queryKey: ['blacklist-stats'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || '添加失败'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateBlacklist(id, data),
    onSuccess: () => {
      message.success('更新成功');
      setModalVisible(false);
      form.resetFields();
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || '更新失败'),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => revokeBlacklist(id, reason),
    onSuccess: () => {
      message.success('已撤销');
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
      queryClient.invalidateQueries({ queryKey: ['blacklist-stats'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || '撤销失败'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBlacklist,
    onSuccess: () => {
      message.success('已删除');
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
      queryClient.invalidateQueries({ queryKey: ['blacklist-stats'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || '删除失败'),
  });

  // 处理函数
  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setIsPermanent(false);
    setModalVisible(true);
  };

  const handleEdit = (item: Blacklist) => {
    setEditingItem(item);
    form.setFieldsValue({
      ...item,
      expiresAt: item.expiresAt ? dayjs(item.expiresAt) : undefined,
    });
    setIsPermanent(item.isPermanent);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        isPermanent,
        expiresAt: isPermanent ? undefined : values.expiresAt?.toISOString(),
      };

      if (editingItem) {
        updateMutation.mutate({ id: editingItem.id, data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      // 表单验证失败
    }
  };

  // 类型图标
  const getTypeIcon = (type: BlacklistType) => {
    const icons: Record<BlacklistType, React.ReactNode> = {
      ip: <GlobalOutlined />,
      device: <MobileOutlined />,
      user: <UserOutlined />,
      fingerprint: <EyeOutlined />,
    };
    return icons[type];
  };

  // 类型标签
  const renderTypeTag = (type: BlacklistType) => {
    const config: Record<BlacklistType, { color: string; text: string }> = {
      ip: { color: 'blue', text: 'IP 地址' },
      device: { color: 'purple', text: '设备' },
      user: { color: 'orange', text: '用户' },
      fingerprint: { color: 'cyan', text: '指纹' },
    };
    const c = config[type];
    return <Tag icon={getTypeIcon(type)} color={c.color}>{c.text}</Tag>;
  };

  // 状态标签
  const renderStatusTag = (status: BlacklistStatus) => {
    const config: Record<BlacklistStatus, { color: string; text: string; icon: React.ReactNode }> = {
      active: { color: 'error', text: '生效中', icon: <StopOutlined /> },
      expired: { color: 'default', text: '已过期', icon: <CloseCircleOutlined /> },
      revoked: { color: 'success', text: '已撤销', icon: <CheckCircleOutlined /> },
    };
    const c = config[status];
    return <Tag icon={c.icon} color={c.color}>{c.text}</Tag>;
  };

  // 表格列
  const columns: ColumnsType<Blacklist> = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      filters: [
        { text: 'IP 地址', value: 'ip' },
        { text: '设备', value: 'device' },
        { text: '用户', value: 'user' },
        { text: '指纹', value: 'fingerprint' },
      ],
      render: renderTypeTag,
    },
    {
      title: '封禁值',
      dataIndex: 'value',
      key: 'value',
      ellipsis: true,
      render: (value) => (
        <Tooltip title={value}>
          <Text copyable style={{ maxWidth: 200 }}>{value}</Text>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: renderStatusTag,
    },
    {
      title: '封禁时长',
      key: 'duration',
      width: 120,
      render: (_, record) => {
        if (record.isPermanent) {
          return <Tag color="red">永久</Tag>;
        }
        if (record.expiresAt) {
          const isExpired = new Date(record.expiresAt) < new Date();
          return (
            <Tooltip title={dayjs(record.expiresAt).format('YYYY-MM-DD HH:mm')}>
              <Tag color={isExpired ? 'default' : 'orange'}>
                {isExpired ? '已过期' : dayjs(record.expiresAt).fromNow()}
              </Tag>
            </Tooltip>
          );
        }
        return '-';
      },
    },
    {
      title: '拦截次数',
      dataIndex: 'blockCount',
      key: 'blockCount',
      width: 100,
      sorter: true,
      render: (count) => <Badge count={count} showZero overflowCount={9999} style={{ backgroundColor: count > 0 ? SEMANTIC.error.main : NEUTRAL_LIGHT.border.primary }} />,
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (reason) => reason || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      sorter: true,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="详情">
            <Button type="text" icon={<EyeOutlined />} onClick={() => { setSelectedItem(record); setDetailDrawerVisible(true); }} />
          </Tooltip>
          {record.status === 'active' && (
            <>
              <Tooltip title="编辑">
                <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
              </Tooltip>
              <Popconfirm
                title="确认撤销此封禁？"
                onConfirm={() => revokeMutation.mutate({ id: record.id })}
              >
                <Tooltip title="撤销">
                  <Button type="text" icon={<CheckCircleOutlined />} />
                </Tooltip>
              </Popconfirm>
            </>
          )}
          <Popconfirm
            title="确认删除？"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Tooltip title="删除">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ErrorBoundary boundaryName="BlacklistPage">
      <div>
        <h2>
          <StopOutlined style={{ marginRight: 8 }} />
          黑名单管理
          <Tag icon={<ReloadOutlined spin={isLoading} />} color="processing" style={{ marginLeft: 12, cursor: 'pointer' }} onClick={() => refetch()}>
            Ctrl+R 刷新
          </Tag>
        </h2>

        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="生效中" value={stats?.total || 0} valueStyle={{ color: SEMANTIC.error.main }} prefix={<StopOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="IP 封禁" value={stats?.byType?.ip || 0} prefix={<GlobalOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="设备封禁" value={stats?.byType?.device || 0} prefix={<MobileOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="总拦截次数" value={stats?.totalBlocks || 0} valueStyle={{ color: SEMANTIC.warning.main }} prefix={<ExclamationCircleOutlined />} />
            </Card>
          </Col>
        </Row>

        <Card>
          <Space style={{ marginBottom: 16 }}>
            <Input.Search
              placeholder="搜索封禁值"
              allowClear
              style={{ width: 200 }}
              onSearch={(value) => setSearchParams((prev) => ({ ...prev, keyword: value, page: 1 }))}
            />
            <Select
              placeholder="类型"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => setSearchParams((prev) => ({ ...prev, type: value, page: 1 }))}
            >
              <Option value="ip">IP 地址</Option>
              <Option value="device">设备</Option>
              <Option value="user">用户</Option>
              <Option value="fingerprint">指纹</Option>
            </Select>
            <Select
              placeholder="状态"
              allowClear
              style={{ width: 100 }}
              onChange={(value) => setSearchParams((prev) => ({ ...prev, status: value, page: 1 }))}
            >
              <Option value="active">生效中</Option>
              <Option value="expired">已过期</Option>
              <Option value="revoked">已撤销</Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>添加封禁</Button>
          </Space>

          <LoadingState
            loading={isLoading}
            error={error}
            empty={!isLoading && !error && (result?.items.length || 0) === 0}
            onRetry={refetch}
            loadingType="skeleton"
            skeletonRows={5}
            emptyDescription="暂无黑名单记录"
          >
            <Table
              columns={columns}
              dataSource={result?.items || []}
              rowKey="id"
              scroll={{ x: 1200 }}
              pagination={{
                current: searchParams.page,
                pageSize: searchParams.limit,
                total: result?.total || 0,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条`,
                onChange: (page, pageSize) => setSearchParams((prev) => ({ ...prev, page, limit: pageSize })),
              }}
            />
          </LoadingState>
        </Card>

        {/* 新建/编辑弹窗 */}
        <Modal
          title={editingItem ? '编辑封禁' : '添加封禁'}
          open={modalVisible}
          onCancel={() => { setModalVisible(false); setEditingItem(null); form.resetFields(); }}
          onOk={handleSubmit}
          confirmLoading={createMutation.isPending || updateMutation.isPending}
        >
          <Form form={form} layout="vertical">
            <Form.Item name="type" label="封禁类型" rules={[{ required: true, message: '请选择类型' }]}>
              <Select placeholder="选择封禁类型" disabled={!!editingItem}>
                <Option value="ip"><GlobalOutlined /> IP 地址</Option>
                <Option value="device"><MobileOutlined /> 设备</Option>
                <Option value="user"><UserOutlined /> 用户</Option>
                <Option value="fingerprint"><EyeOutlined /> 浏览器指纹</Option>
              </Select>
            </Form.Item>
            <Form.Item name="value" label="封禁值" rules={[{ required: true, message: '请输入封禁值' }]}>
              <Input placeholder="IP 地址 / 设备ID / 用户ID / 指纹" disabled={!!editingItem} />
            </Form.Item>
            <Form.Item name="reason" label="封禁原因">
              <TextArea rows={2} placeholder="输入封禁原因（可选）" />
            </Form.Item>
            <Form.Item label="永久封禁">
              <Switch checked={isPermanent} onChange={setIsPermanent} />
            </Form.Item>
            {!isPermanent && (
              <Form.Item name="expiresAt" label="过期时间" rules={[{ required: !isPermanent, message: '请选择过期时间' }]}>
                <DatePicker showTime style={{ width: '100%' }} placeholder="选择过期时间" disabledDate={(current) => current && current < dayjs().startOf('day')} />
              </Form.Item>
            )}
          </Form>
        </Modal>

        {/* 详情抽屉 */}
        <Drawer
          title="封禁详情"
          placement="right"
          width={480}
          open={detailDrawerVisible}
          onClose={() => { setDetailDrawerVisible(false); setSelectedItem(null); }}
        >
          {selectedItem && (
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="类型">{renderTypeTag(selectedItem.type)}</Descriptions.Item>
              <Descriptions.Item label="封禁值"><Text copyable>{selectedItem.value}</Text></Descriptions.Item>
              <Descriptions.Item label="状态">{renderStatusTag(selectedItem.status)}</Descriptions.Item>
              <Descriptions.Item label="封禁时长">{selectedItem.isPermanent ? '永久' : selectedItem.expiresAt ? dayjs(selectedItem.expiresAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
              <Descriptions.Item label="原因">{selectedItem.reason || '-'}</Descriptions.Item>
              <Descriptions.Item label="拦截次数">{selectedItem.blockCount}</Descriptions.Item>
              <Descriptions.Item label="最后拦截">{selectedItem.lastBlockedAt ? dayjs(selectedItem.lastBlockedAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{dayjs(selectedItem.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
              {selectedItem.status === 'revoked' && (
                <>
                  <Descriptions.Item label="撤销时间">{selectedItem.revokedAt ? dayjs(selectedItem.revokedAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
                  <Descriptions.Item label="撤销原因">{selectedItem.revokeReason || '-'}</Descriptions.Item>
                </>
              )}
              {selectedItem.metadata && (
                <Descriptions.Item label="元数据">
                  <pre style={{ fontSize: 12 }}>{JSON.stringify(selectedItem.metadata, null, 2)}</pre>
                </Descriptions.Item>
              )}
            </Descriptions>
          )}
        </Drawer>
      </div>
    </ErrorBoundary>
  );
};

export default BlacklistPage;
