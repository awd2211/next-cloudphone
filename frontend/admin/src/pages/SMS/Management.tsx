import { useState, useCallback } from 'react';
import { Card, Table, Form, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import {
  SMSStatsCards,
  SMSSearchBar,
  useSMSColumns,
  SendSMSModal,
  SMSDetailDrawer,
  type SMSRecord,
} from '@/components/SMS';

/**
 * SMS 管理页面（优化版 - 使用 React Query）
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 使用 useCallback 优化事件处理函数
 * 3. ✅ 组件拆分 - 提取 SMSStatsCards, SMSSearchBar, SendSMSModal, SMSDetailDrawer
 * 4. ✅ 提取表格列定义到 hook
 * 5. ✅ 提取常量和类型
 */
const SMSManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useState({
    status: undefined as string | undefined,
    provider: undefined as string | undefined,
    phone: '',
    dateRange: null as any,
    page: 1,
    limit: 10,
  });
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SMSRecord | null>(null);
  const [sendForm] = Form.useForm();
  const queryClient = useQueryClient();

  // 查询 SMS 记录
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sms-records', searchParams],
    queryFn: async () => {
      const params: any = {
        page: searchParams.page,
        limit: searchParams.limit,
      };

      if (searchParams.status) params.status = searchParams.status;
      if (searchParams.provider) params.provider = searchParams.provider;
      if (searchParams.phone) params.phone = searchParams.phone;
      if (searchParams.dateRange) {
        params.startDate = searchParams.dateRange[0].toISOString();
        params.endDate = searchParams.dateRange[1].toISOString();
      }

      const response = await request.get('/sms', { params });
      return response;
    },
  });

  // 查询统计数据
  const { data: stats } = useQuery({
    queryKey: ['sms-stats'],
    queryFn: async () => {
      const response = await request.get('/sms/stats');
      return response;
    },
  });

  // 发送 SMS
  const sendMutation = useMutation({
    mutationFn: async (values: any) => {
      return await request.post('/sms/send', values);
    },
    onSuccess: () => {
      message.success('短信发送成功');
      setSendModalVisible(false);
      sendForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['sms-records'] });
      queryClient.invalidateQueries({ queryKey: ['sms-stats'] });
    },
    onError: () => {
      message.error('短信发送失败');
    },
  });

  // ✅ useCallback 优化事件处理函数
  const handleViewDetail = useCallback((record: SMSRecord) => {
    setSelectedRecord(record);
    setDetailDrawerVisible(true);
  }, []);

  const handleSearch = useCallback(() => {
    setSearchParams({ ...searchParams, page: 1 });
  }, [searchParams]);

  const handleReset = useCallback(() => {
    setSearchParams({
      status: undefined,
      provider: undefined,
      phone: '',
      dateRange: null,
      page: 1,
      limit: 10,
    });
  }, []);

  const handleSend = useCallback(() => {
    sendForm.validateFields().then((values) => {
      sendMutation.mutate(values);
    });
  }, [sendForm, sendMutation]);

  // ✅ 使用提取的表格列定义 hook
  const columns = useSMSColumns({ onViewDetail: handleViewDetail });

  return (
    <div>
      {/* 统计卡片 */}
      <SMSStatsCards
        today={stats?.today || 0}
        thisMonth={stats?.thisMonth || 0}
        successRate={stats?.successRate || 0}
        total={stats?.total || 0}
      />

      {/* 搜索区域 */}
      <SMSSearchBar
        phone={searchParams.phone}
        status={searchParams.status}
        provider={searchParams.provider}
        dateRange={searchParams.dateRange}
        onPhoneChange={(value) =>
          setSearchParams({ ...searchParams, phone: value })
        }
        onStatusChange={(value) =>
          setSearchParams({ ...searchParams, status: value })
        }
        onProviderChange={(value) =>
          setSearchParams({ ...searchParams, provider: value })
        }
        onDateRangeChange={(dates) =>
          setSearchParams({ ...searchParams, dateRange: dates })
        }
        onSearch={handleSearch}
        onReset={handleReset}
        onSendClick={() => setSendModalVisible(true)}
      />

      {/* 表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1200 }}
          pagination={{
            current: searchParams.page,
            pageSize: searchParams.limit,
            total: data?.meta?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setSearchParams({ ...searchParams, page, limit: pageSize });
            },
          }}
        />
      </Card>

      {/* 发送短信弹窗 */}
      <SendSMSModal
        visible={sendModalVisible}
        loading={sendMutation.isPending}
        form={sendForm}
        onOk={handleSend}
        onCancel={() => setSendModalVisible(false)}
      />

      {/* 详情抽屉 */}
      <SMSDetailDrawer
        visible={detailDrawerVisible}
        record={selectedRecord}
        onClose={() => setDetailDrawerVisible(false)}
      />
    </div>
  );
};

export default SMSManagement;

