import React, { useState, useCallback, useEffect } from 'react';
import { Button, Card, Row, Col, Statistic, Tag, Modal, Input, Space, message } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import {
  PlusOutlined,
  CrownOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { CreatePlanModal } from '@/components/Plan';
import { usePlanList } from '@/hooks/usePlanList';
import type { Plan } from '@/types';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';

/**
 * 套餐列表页面（优化版 v2 - 添加 ErrorBoundary + LoadingState + 统计卡片 + 快捷键）
 *
 * 优化点：
 * 1. ✅ 表格列配置提取到 PlanTableColumns hook
 * 2. ✅ 模态框提取为独立组件
 * 3. ✅ 业务逻辑集中在 usePlanList hook
 * 4. ✅ 主组件只负责组合和渲染
 * 5. ✅ ErrorBoundary - 错误边界保护
 * 6. ✅ LoadingState - 统一加载状态
 * 7. ✅ 统计卡片 - 套餐数量统计
 * 8. ✅ 快捷键支持 - Ctrl+K 搜索、Ctrl+N 新建、Ctrl+R 刷新
 */
const PlanList: React.FC = () => {
  // 快速搜索状态
  const [quickSearchVisible, setQuickSearchVisible] = useState(false);
  const [quickSearchValue, setQuickSearchValue] = useState('');

  const {
    plans,
    total,
    isLoading,
    error,
    refetch,
    page,
    pageSize,
    stats,
    searchKeyword,
    handleSearch,
    modalVisible,
    editingPlan,
    form,
    columns,
    setPage,
    setPageSize,
    handleSubmit,
    handleCreate,
    handleModalCancel,
    confirmLoading,
  } = usePlanList();

  // ===== 快捷键支持 =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K 快速搜索
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setQuickSearchVisible(true);
        return;
      }

      // Ctrl+N 创建套餐
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleCreate();
        return;
      }

      // Ctrl+R 刷新列表
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refetch();
        message.info('正在刷新...');
        return;
      }

      // Escape 关闭快速搜索
      if (e.key === 'Escape' && quickSearchVisible) {
        setQuickSearchVisible(false);
        setQuickSearchValue('');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickSearchVisible, refetch, handleCreate]);

  // ===== 快速搜索处理 =====
  const handleQuickSearch = useCallback((value: string) => {
    setQuickSearchValue('');
    setQuickSearchVisible(false);
    if (value.trim()) {
      handleSearch(value.trim());
    }
  }, [handleSearch]);

  return (
    <ErrorBoundary boundaryName="PlanList">
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ marginBottom: 0 }}>
            套餐管理
            <Tag
              icon={<ReloadOutlined spin={isLoading} />}
              color="processing"
              style={{ marginLeft: 12, cursor: 'pointer' }}
              onClick={() => refetch()}
            >
              Ctrl+R 刷新
            </Tag>
          </h2>
          <Space>
            <span style={{ fontSize: 12, color: '#999' }}>
              快捷键：Ctrl+K 搜索 | Ctrl+N 新建
            </span>
          </Space>
        </div>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="套餐总数"
                value={stats.total}
                prefix={<CrownOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="已启用"
                value={stats.active}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="已停用"
                value={stats.inactive}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>

        <Card>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                创建套餐
              </Button>
              {searchKeyword && (
                <Tag closable onClose={() => handleSearch('')}>
                  搜索: {searchKeyword}
                </Tag>
              )}
            </Space>
          </div>

          <LoadingState
            loading={isLoading}
            error={error}
            empty={!isLoading && !error && plans.length === 0}
            onRetry={refetch}
            loadingType="skeleton"
            skeletonRows={5}
            emptyDescription="暂无套餐数据，点击上方按钮创建套餐"
          >
            <AccessibleTable<Plan>
              ariaLabel="套餐列表"
              loadingText="正在加载套餐列表"
              emptyText="暂无套餐数据，点击右上角创建套餐"
              columns={columns}
              dataSource={plans}
              rowKey="id"
              loading={false} // LoadingState 已处理
              pagination={{
                current: page,
                pageSize,
                total,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`,
                onChange: (page, pageSize) => {
                  setPage(page);
                  setPageSize(pageSize);
                },
                pageSizeOptions: ['10', '20', '50', '100', '200'],
              }}
              scroll={{ x: 1200, y: 600 }}
              virtual
            />
          </LoadingState>
        </Card>

        {/* 快速搜索弹窗 */}
        <Modal
          open={quickSearchVisible}
          title="快速搜索套餐"
          footer={null}
          onCancel={() => {
            setQuickSearchVisible(false);
            setQuickSearchValue('');
          }}
          destroyOnClose
        >
          <Input
            placeholder="输入套餐名称进行搜索..."
            prefix={<SearchOutlined />}
            value={quickSearchValue}
            onChange={(e) => setQuickSearchValue(e.target.value)}
            onPressEnter={(e) => handleQuickSearch((e.target as HTMLInputElement).value)}
            autoFocus
            allowClear
          />
          <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
            按 Enter 搜索，按 Escape 关闭
          </div>
        </Modal>

        <CreatePlanModal
          visible={modalVisible}
          form={form}
          editingPlan={editingPlan}
          confirmLoading={confirmLoading}
          onCancel={handleModalCancel}
          onFinish={handleSubmit}
        />
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(PlanList);
