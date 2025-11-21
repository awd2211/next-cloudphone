import { useState, useCallback } from 'react';
import { Card, Form } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import {
  SMSStatsCards,
  SMSSearchBar,
  useSMSColumns,
  SendSMSModal,
  SMSDetailDrawer,
  type SMSRecord,
} from '@/components/SMS';
import {
  useSMSList,
  useSMSStats,
  useSendSMS,
} from '@/hooks/queries/useSMS';

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

  // 使用自定义 React Query Hooks
  const { data, isLoading } = useSMSList({
    page: searchParams.page,
    limit: searchParams.limit,
    status: searchParams.status,
    provider: searchParams.provider,
    phone: searchParams.phone,
    startDate: searchParams.dateRange?.[0]?.toISOString(),
    endDate: searchParams.dateRange?.[1]?.toISOString(),
  });
  const { data: stats } = useSMSStats(); // 自动30秒刷新
  const sendMutation = useSendSMS();

  // 监听发送成功，关闭弹窗并重置表单
  const handleSendSuccess = useCallback(() => {
    setSendModalVisible(false);
    sendForm.resetFields();
  }, [sendForm]);

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
      sendMutation.mutate(values, {
        onSuccess: handleSendSuccess,
      });
    });
  }, [sendForm, sendMutation, handleSendSuccess]);

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
        <AccessibleTable<SMSRecord>
          ariaLabel="短信记录列表"
          loadingText="正在加载短信记录"
          emptyText="暂无短信记录"
          columns={columns}
          dataSource={(data?.data || []) as unknown as readonly SMSRecord[]}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1200, y: 600 }}
          virtual
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
            pageSizeOptions: ['10', '20', '50', '100', '200'],
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

