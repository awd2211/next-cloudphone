import React from 'react';
import { Card, Button, Space } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import CreateTicketModal from '@/components/CreateTicketModal';
import { StatsCards, FilterBar, TicketTable } from '@/components/TicketList';
import { useTicketList } from '@/hooks/useTicketList';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

/**
 * 工单列表页面（优化版）
 *
 * 优化点：
 * 1. ✅ 使用自定义 hook 管理所有业务逻辑
 * 2. ✅ 页面组件只负责布局和 UI 组合
 * 3. ✅ 所有子组件使用 React.memo 优化
 * 4. ✅ 表格列定义提取到配置文件
 * 5. ✅ 筛选器组件化
 * 6. ✅ 查询参数统一管理
 * 7. ✅ 代码从 379 行减少到 ~95 行
 */
const TicketList: React.FC = () => {
  const {
    loading,
    tickets,
    total,
    stats,
    createModalVisible,
    query,
    handleSearch,
    handleStatusChange,
    handleTypeChange,
    handlePriorityChange,
    handlePageChange,
    handleRefresh,
    openCreateModal,
    closeCreateModal,
    handleCreateSuccess,
    goToDetail,
  } = useTicketList();

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      <StatsCards stats={stats} />

      {/* 主卡片 */}
      <Card
        title="我的工单"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              新建工单
            </Button>
          </Space>
        }
      >
        {/* 筛选器 */}
        <FilterBar
          status={query.status}
          type={query.type}
          priority={query.priority}
          onSearch={handleSearch}
          onStatusChange={handleStatusChange}
          onTypeChange={handleTypeChange}
          onPriorityChange={handlePriorityChange}
        />

        {/* 工单列表 */}
        <TicketTable
          tickets={tickets}
          loading={loading}
          total={total}
          page={query.page}
          pageSize={query.pageSize}
          onPageChange={handlePageChange}
          onViewDetail={goToDetail}
          onCreateTicket={openCreateModal}
        />
      </Card>

      {/* 创建工单 Modal */}
      <CreateTicketModal
        visible={createModalVisible}
        onCancel={closeCreateModal}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default TicketList;
