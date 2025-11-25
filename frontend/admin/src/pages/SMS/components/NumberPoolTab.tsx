import { useState, useMemo, useCallback, memo } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Select,
  Input,
  Modal,
  message,
  Tooltip,
  Badge,
  Form,
  InputNumber,
  Switch,
} from 'antd';
import {
  ReloadOutlined,
  DeleteOutlined,
  SearchOutlined,
  EyeOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useNumberPool, useReleaseSMSNumber as useReleaseNumber, type PhoneNumber } from '@/hooks/queries/useSMS';
import { getSMSNumberHistory, requestSMSNumber } from '@/services/sms';
import { getCountries, getProducts, type FiveSimCountry, type FiveSimProduct } from '@/services/fivesim';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

// 使用 PhoneNumber 类型（兼容本地接口）
type VirtualNumber = PhoneNumber & {
  messages?: any[];
};

/**
 * 号码池管理标签页
 *
 * 功能：
 * - 查看所有虚拟号码及状态
 * - 按状态、平台、国家筛选
 * - 取消号码（退款）
 * - 查看号码详情和收到的短信
 */
// ✅ 使用 memo 包装组件，避免不必要的重渲染
const NumberPoolTab: React.FC = memo(() => {
  const [filters, setFilters] = useState({
    status: undefined as string | undefined,
    provider: undefined as string | undefined,
    phone: '',
    page: 1,
    pageSize: 20,
  });
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<VirtualNumber | null>(null);

  // 下单相关状态
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [requestForm] = Form.useForm();
  const [countries, setCountries] = useState<FiveSimCountry[]>([]);
  const [products, setProducts] = useState<Record<string, FiveSimProduct>>({});
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 使用新的 React Query Hooks
  const { data, isLoading, refetch } = useNumberPool({
    page: filters.page,
    limit: filters.pageSize,
    status: filters.status,
    provider: filters.provider,
    phone: filters.phone,
  });

  const releaseMutation = useReleaseNumber();

  // ✅ 使用 useCallback 包装事件处理函数
  const handleCancelNumber = useCallback((record: VirtualNumber) => {
    Modal.confirm({
      title: '确认取消号码',
      content: `确定要取消号码 ${record.phoneNumber} 吗？将申请退款 $${record.cost}`,
      onOk: () => releaseMutation.mutate(record.id),
    });
  }, [releaseMutation]);

  const handleViewDetail = useCallback(async (record: VirtualNumber) => {
    // 查询该号码收到的短信
    try {
      const response = await getSMSNumberHistory(record.id);
      const messages = (response as any).data || [];
      setSelectedNumber({ ...record, messages });
      setDetailModalVisible(true);
    } catch (error) {
      message.error('获取短信详情失败');
    }
  }, []);

  // 加载国家列表
  const loadCountries = useCallback(async () => {
    setLoadingCountries(true);
    try {
      const data = await getCountries();
      setCountries(data);
    } catch (error) {
      message.error('获取国家列表失败');
    } finally {
      setLoadingCountries(false);
    }
  }, []);

  // 加载产品列表
  const loadProducts = useCallback(async (country: string) => {
    setLoadingProducts(true);
    try {
      const data = await getProducts(country);
      setProducts(data || {});
    } catch (error) {
      message.error('获取服务列表失败');
      setProducts({});
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // 打开下单弹窗
  const handleOpenRequestModal = useCallback(() => {
    setRequestModalVisible(true);
    loadCountries();
    requestForm.resetFields();
    setProducts({});
  }, [loadCountries, requestForm]);

  // 国家选择变化
  const handleCountryChange = useCallback((country: string) => {
    requestForm.setFieldValue('service', undefined);
    loadProducts(country);
  }, [loadProducts, requestForm]);

  // 提交下单
  const handleRequestNumber = useCallback(async () => {
    try {
      const values = await requestForm.validateFields();
      setSubmitting(true);

      await requestSMSNumber({
        service: values.service,
        country: values.country,
        deviceId: values.deviceId,
        provider: values.provider || '5sim',
        usePool: values.usePool || false,
      });

      message.success('号码请求成功！');
      setRequestModalVisible(false);
      refetch();
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证失败
        return;
      }
      message.error(error.message || '请求号码失败');
    } finally {
      setSubmitting(false);
    }
  }, [requestForm, refetch]);

  // ✅ 使用 useCallback 缓存辅助函数
  const getStatusConfig = useCallback((status: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      active: { color: 'blue', text: '激活中' },
      waiting_sms: { color: 'orange', text: '等待短信' },
      received: { color: 'success', text: '已接收' },
      cancelled: { color: 'default', text: '已取消' },
      expired: { color: 'error', text: '已过期' },
      failed: { color: 'error', text: '失败' },
    };
    return configs[status] || { color: 'default', text: status };
  }, []);

  // ✅ 使用 useMemo 缓存列定义，避免每次渲染都重新创建
  const columns: ColumnsType<VirtualNumber> = useMemo(() => [
    {
      title: '号码',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      width: 150,
      render: (phone, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{phone}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {record.countryName} ({record.countryCode})
          </div>
        </div>
      ),
    },
    {
      title: '平台',
      dataIndex: 'provider',
      key: 'provider',
      width: 120,
      render: (provider) => <Tag color="blue">{provider}</Tag>,
    },
    {
      title: '服务',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 120,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '成本',
      dataIndex: 'cost',
      key: 'cost',
      width: 100,
      render: (cost) => `$${cost.toFixed(4)}`,
    },
    {
      title: '来源',
      dataIndex: 'fromPool',
      key: 'fromPool',
      width: 100,
      render: (fromPool) => (
        <Badge
          status={fromPool ? 'success' : 'default'}
          text={fromPool ? '号码池' : '实时'}
        />
      ),
    },
    {
      title: '激活时间',
      dataIndex: 'activatedAt',
      key: 'activatedAt',
      width: 180,
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '短信接收时间',
      dataIndex: 'smsReceivedAt',
      key: 'smsReceivedAt',
      width: 180,
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          {['active', 'waiting_sms'].includes(record.status) && (
            <Tooltip title="取消号码">
              <Button
                type="link"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleCancelNumber(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ], [getStatusConfig, handleViewDetail, handleCancelNumber]);

  return (
    <div>
      {/* 筛选区域 */}
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            style={{ width: 150 }}
            placeholder="状态"
            allowClear
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
          >
            <Select.Option value="active">激活中</Select.Option>
            <Select.Option value="waiting_sms">等待短信</Select.Option>
            <Select.Option value="received">已接收</Select.Option>
            <Select.Option value="cancelled">已取消</Select.Option>
            <Select.Option value="expired">已过期</Select.Option>
            <Select.Option value="failed">失败</Select.Option>
          </Select>
          <Select
            style={{ width: 150 }}
            placeholder="平台"
            allowClear
            value={filters.provider}
            onChange={(value) => setFilters({ ...filters, provider: value, page: 1 })}
          >
            <Select.Option value="sms-activate">SMS-Activate</Select.Option>
            <Select.Option value="5sim">5SIM</Select.Option>
            <Select.Option value="smshub">SMS-Hub</Select.Option>
          </Select>
          <Input
            style={{ width: 200 }}
            placeholder="搜索号码"
            prefix={<SearchOutlined />}
            value={filters.phone}
            onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenRequestModal}>
            请求号码
          </Button>
        </Space>
      </div>

      {/* 表格 */}
      <Table
        columns={columns}
        dataSource={data?.data || []}
        rowKey="id"
        loading={isLoading}
        scroll={{ x: 1400 }}
        pagination={{
          current: filters.page,
          pageSize: filters.pageSize,
          total: data?.meta.total || 0,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个号码`,
          onChange: (page, pageSize) => {
            setFilters({ ...filters, page, pageSize });
          },
        }}
      />

      {/* 详情弹窗 */}
      <Modal
        title={`号码详情: ${selectedNumber?.phoneNumber}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedNumber && (
          <div>
            <p><strong>国家：</strong>{selectedNumber.countryName}</p>
            <p><strong>平台：</strong>{selectedNumber.provider}</p>
            <p><strong>服务：</strong>{selectedNumber.serviceName || '-'}</p>
            <p><strong>状态：</strong><Tag color={getStatusConfig(selectedNumber.status).color}>{getStatusConfig(selectedNumber.status).text}</Tag></p>
            <p><strong>成本：</strong>${selectedNumber.cost?.toFixed(4) || '-'}</p>
            <p><strong>设备ID：</strong>{selectedNumber.deviceId || '-'}</p>
            <p><strong>用户ID：</strong>{selectedNumber.userId || '-'}</p>

            <h4 style={{ marginTop: 24 }}>收到的短信：</h4>
            {selectedNumber.messages && selectedNumber.messages.length > 0 ? (
              <ul>
                {selectedNumber.messages.map((msg: any) => (
                  <li key={msg.id}>
                    <div><strong>验证码：</strong><Tag color="blue">{msg.verificationCode}</Tag></div>
                    <div><strong>发送者：</strong>{msg.sender}</div>
                    <div><strong>内容：</strong>{msg.messageText}</div>
                    <div><strong>时间：</strong>{dayjs(msg.receivedAt).format('YYYY-MM-DD HH:mm:ss')}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#999' }}>暂无短信</p>
            )}
          </div>
        )}
      </Modal>

      {/* 请求号码弹窗 */}
      <Modal
        title="请求虚拟号码"
        open={requestModalVisible}
        onOk={handleRequestNumber}
        onCancel={() => setRequestModalVisible(false)}
        confirmLoading={submitting}
        okText="下单"
        cancelText="取消"
        width={500}
      >
        <Form form={requestForm} layout="vertical">
          <Form.Item
            label="平台"
            name="provider"
            initialValue="5sim"
          >
            <Select>
              <Select.Option value="5sim">5SIM</Select.Option>
              <Select.Option value="sms-activate">SMS-Activate</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="国家"
            name="country"
            rules={[{ required: true, message: '请选择国家' }]}
          >
            <Select
              showSearch
              placeholder="选择国家"
              loading={loadingCountries}
              onChange={handleCountryChange}
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {countries.map((c) => (
                <Select.Option key={c.iso} value={c.iso}>
                  {c.name} ({c.iso}) +{c.prefix}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="服务"
            name="service"
            rules={[{ required: true, message: '请选择服务' }]}
          >
            <Select
              showSearch
              placeholder="请先选择国家"
              loading={loadingProducts}
              disabled={Object.keys(products).length === 0}
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {Object.entries(products).map(([name, info]) => (
                <Select.Option key={name} value={name}>
                  {name} - ¥{info.cost?.toFixed(2)} ({info.count}可用)
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="设备ID"
            name="deviceId"
            rules={[{ required: true, message: '请输入设备ID' }]}
          >
            <Input placeholder="输入关联的设备ID" />
          </Form.Item>

          <Form.Item
            label="使用号码池"
            name="usePool"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
});

NumberPoolTab.displayName = 'NumberPoolTab';

export default NumberPoolTab;
