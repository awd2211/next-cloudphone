import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Form,
  message,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { Quota, CreateQuotaDto, UpdateQuotaDto, QuotaAlert, QuotaStatistics } from '@/types';
import * as quotaService from '@/services/quota';
import {
  QuotaStatusTag,
  QuotaUsageProgress,
  QuotaActions,
  QuotaAlertPanel,
  QuotaStatisticsRow,
  CreateQuotaModal,
  EditQuotaModal,
  QuotaDetailDrawer,
} from '@/components/Quota';

const QuotaList: React.FC = () => {
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedQuota, setSelectedQuota] = useState<Quota | null>(null);
  const [alerts, setAlerts] = useState<QuotaAlert[]>([]);
  const [statistics, setStatistics] = useState<QuotaStatistics | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // 加载配额列表
  const loadQuotas = useCallback(async () => {
    setLoading(true);
    try {
      // 这里需要一个获取所有配额的API,暂时使用模拟数据
      // 实际应该有一个 GET /quotas 接口
      const mockQuotas: Quota[] = [];
      setQuotas(mockQuotas);
    } catch (error) {
      message.error('加载配额列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载配额告警
  const loadAlerts = useCallback(async () => {
    try {
      const result = await quotaService.getQuotaAlerts(80);
      if (result.success && result.data) {
        setAlerts(result.data);
      }
    } catch (error) {
      console.error('加载配额告警失败:', error);
    }
  }, []);

  useEffect(() => {
    loadQuotas();
    loadAlerts();
    // 每30秒刷新一次告警
    const alertInterval = setInterval(loadAlerts, 30000);
    return () => clearInterval(alertInterval);
  }, [loadQuotas, loadAlerts]);

  // 创建配额
  const handleCreateQuota = useCallback(
    async (values: CreateQuotaDto) => {
      try {
        const result = await quotaService.createQuota(values);
        if (result.success) {
          message.success('创建配额成功');
          setCreateModalVisible(false);
          form.resetFields();
          loadQuotas();
        } else {
          message.error(result.message || '创建配额失败');
        }
      } catch (error) {
        message.error('创建配额失败');
        console.error(error);
      }
    },
    [form, loadQuotas]
  );

  // 更新配额
  const handleUpdateQuota = useCallback(
    async (values: UpdateQuotaDto) => {
      if (!selectedQuota) return;
      try {
        const result = await quotaService.updateQuota(selectedQuota.id, values);
        if (result.success) {
          message.success('更新配额成功');
          setEditModalVisible(false);
          editForm.resetFields();
          loadQuotas();
        } else {
          message.error(result.message || '更新配额失败');
        }
      } catch (error) {
        message.error('更新配额失败');
        console.error(error);
      }
    },
    [selectedQuota, editForm, loadQuotas]
  );

  // 查看配额详情
  const handleViewDetail = useCallback(async (record: Quota) => {
    setSelectedQuota(record);
    setSelectedUserId(record.userId);
    setDetailDrawerVisible(true);

    // 加载使用统计
    try {
      const result = await quotaService.getUsageStats(record.userId);
      if (result.success && result.data) {
        setStatistics(result.data);
      }
    } catch (error) {
      console.error('加载使用统计失败:', error);
    }
  }, []);

  // 编辑配额
  const handleEdit = useCallback(
    (record: Quota) => {
      setSelectedQuota(record);
      editForm.setFieldsValue({
        limits: record.limits,
        autoRenew: record.autoRenew,
      });
      setEditModalVisible(true);
    },
    [editForm]
  );


  // 表格列配置
  const columns = useMemo(
    () => [
      {
        title: '用户ID',
        dataIndex: 'userId',
        key: 'userId',
        width: 200,
        ellipsis: true,
      },
      {
        title: '设备配额',
        key: 'devices',
        width: 180,
        render: (record: Quota) => (
          <QuotaUsageProgress
            used={record.usage.currentDevices}
            total={record.limits.maxDevices}
            showException
          />
        ),
      },
      {
        title: 'CPU 配额',
        key: 'cpu',
        width: 180,
        render: (record: Quota) => (
          <QuotaUsageProgress
            used={record.usage.usedCpuCores}
            total={record.limits.totalCpuCores}
            unit="核"
            showException={false}
          />
        ),
      },
      {
        title: '内存配额',
        key: 'memory',
        width: 180,
        render: (record: Quota) => (
          <QuotaUsageProgress
            used={record.usage.usedMemoryGB}
            total={record.limits.totalMemoryGB}
            unit="GB"
            showException={false}
          />
        ),
      },
      {
        title: '存储配额',
        key: 'storage',
        width: 180,
        render: (record: Quota) => (
          <QuotaUsageProgress
            used={record.usage.usedStorageGB}
            total={record.limits.totalStorageGB}
            unit="GB"
            showException={false}
          />
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: string) => <QuotaStatusTag status={status} />,
      },
      {
        title: '操作',
        key: 'actions',
        width: 150,
        fixed: 'right' as const,
        render: (record: Quota) => (
          <QuotaActions
            onEdit={() => handleEdit(record)}
            onDetail={() => handleViewDetail(record)}
          />
        ),
      },
    ],
    [handleEdit, handleViewDetail]
  );


  return (
    <div>
      {/* 配额告警面板 */}
      <QuotaAlertPanel alerts={alerts} />

      {/* 统计卡片 */}
      <QuotaStatisticsRow quotas={quotas} alerts={alerts} />

      {/* 配额列表 */}
      <Card
        title="配额管理"
        extra={
          <Space>
            <Tooltip title="刷新">
              <Button icon={<ReloadOutlined />} onClick={loadQuotas} />
            </Tooltip>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              创建配额
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={quotas}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条`,
            showSizeChanger: true,
          }}
        />
      </Card>

      {/* 创建配额模态框 */}
      <CreateQuotaModal
        visible={createModalVisible}
        form={form}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onFinish={handleCreateQuota}
      />

      {/* 编辑配额模态框 */}
      <EditQuotaModal
        visible={editModalVisible}
        form={editForm}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
        }}
        onFinish={handleUpdateQuota}
      />

      {/* 配额详情抽屉 */}
      <QuotaDetailDrawer
        visible={detailDrawerVisible}
        quota={selectedQuota}
        statistics={statistics}
        onClose={() => {
          setDetailDrawerVisible(false);
          setStatistics(null);
        }}
      />
    </div>
  );
};

export default React.memo(QuotaList);
