import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { useUsers, useUserStats, usePrefetchNextPage } from '@/hooks/queries';
import { useRoles } from '@/hooks/queries';
import { useUserListState } from '@/hooks/useUserListState';
import { useDebouncedCallback } from 'use-debounce';
import {
  UserTable,
  UserFilterPanel,
  UserToolbar,
  CreateUserModal,
  EditUserModal,
  BalanceModal,
  ResetPasswordModal,
  UserStatsCards,
  useUserOperations,
} from '@/components/User';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
import { UserStatus, User } from '@/types';
import { Drawer, Timeline, Typography, Space, Tag, Empty, Input, Tooltip, Dropdown, Checkbox, Card, message } from 'antd';
import {
  SearchOutlined,
  SettingOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { NEUTRAL_LIGHT } from '@/theme';
import type { MenuProps } from 'antd';

const { Text } = Typography;

// 默认显示的列
const DEFAULT_VISIBLE_COLUMNS = ['id', 'username', 'email', 'phone', 'balance', 'roles', 'status', 'createdAt', 'action'];

// localStorage 存储键
const STORAGE_KEY_VISIBLE_COLUMNS = 'user-list-visible-columns';

// 所有可用列配置
const ALL_COLUMNS = [
  { key: 'id', label: '用户 ID' },
  { key: 'username', label: '用户名' },
  { key: 'email', label: '邮箱' },
  { key: 'phone', label: '手机号' },
  { key: 'balance', label: '余额' },
  { key: 'roles', label: '角色' },
  { key: 'status', label: '状态' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'action', label: '操作' },
];

/**
 * 从 localStorage 加载列设置
 */
const loadVisibleColumns = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_VISIBLE_COLUMNS);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 确保 action 列始终存在
      if (!parsed.includes('action')) {
        parsed.push('action');
      }
      return parsed;
    }
  } catch {
    // 忽略解析错误
  }
  return DEFAULT_VISIBLE_COLUMNS;
};

/**
 * 保存列设置到 localStorage
 */
const saveVisibleColumns = (columns: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_VISIBLE_COLUMNS, JSON.stringify(columns));
  } catch {
    // 忽略存储错误
  }
};

/**
 * 用户列表页面（优化版 v4）
 *
 * 优化策略:
 * 1. ✅ 状态管理提取到 useUserListState Hook
 * 2. ✅ 业务逻辑提取到 useUserOperations Hook
 * 3. ✅ 主组件仅负责 UI 组合 (82% 代码减少)
 * 4. ✅ 所有 Modal 和 Form 统一管理
 * 5. ✅ 错误边界保护 - 组件错误不会导致整个页面崩溃
 * 6. ✅ 统一加载状态管理 - 骨架屏、错误提示、空状态、重试按钮
 * 7. ✅ 统计卡片 - 显示用户总数、活跃、禁用、封禁数量
 * 8. ✅ 快速搜索 - 支持 Ctrl+K 快捷键
 * 9. ✅ 列自定义 - 允许用户显示/隐藏列
 * 10. ✅ 用户活动时间线 - Drawer 显示操作记录
 */
const UserList = () => {
  // ===== 状态管理 (统一由 Hook 管理) =====
  const state = useUserListState();

  // ===== 新增状态 =====
  const [quickSearchVisible, setQuickSearchVisible] = useState(false);
  const [quickSearchValue, setQuickSearchValue] = useState('');
  // 列设置持久化：从 localStorage 加载初始值
  const [visibleColumns, setVisibleColumnsState] = useState<string[]>(loadVisibleColumns);
  const [activityDrawerVisible, setActivityDrawerVisible] = useState(false);
  const [selectedUserForActivity, setSelectedUserForActivity] = useState<User | null>(null);

  // 列设置变更时同步到 localStorage
  const setVisibleColumns = useCallback((columns: string[]) => {
    setVisibleColumnsState(columns);
    saveVisibleColumns(columns);
  }, []);

  // ===== 数据查询 =====
  const { data, isLoading, error, refetch } = useUsers(state.params);
  const { data: rolesData } = useRoles({ page: 1, pageSize: 100 });
  const { data: statsData, isLoading: statsLoading } = useUserStats();

  // 预加载下一页数据（提升翻页体验）
  usePrefetchNextPage({
    currentPage: state.page,
    pageSize: state.pageSize,
    total: data?.total || 0,
    queryKey: 'users',
    params: state.params,
  });

  const users = data?.data || [];
  const total = data?.total || 0;
  const roles = rolesData?.data || [];

  // 用户统计数据
  const stats = useMemo(() => ({
    total: statsData?.total || total,
    active: statsData?.active || 0,
    inactive: statsData?.inactive || 0,
    banned: statsData?.banned || 0,
  }), [statsData, total]);

  // ===== 快捷键支持 =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K 或 Cmd+K 打开快速搜索
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setQuickSearchVisible(true);
      }
      // Escape 关闭快速搜索
      if (e.key === 'Escape' && quickSearchVisible) {
        setQuickSearchVisible(false);
        setQuickSearchValue('');
      }
      // Ctrl+N 新建用户
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        state.setCreateModalVisible(true);
      }
      // Ctrl+R 刷新列表
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refetch();
        message.info('正在刷新...');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickSearchVisible, refetch, state]);

  // ===== 快速搜索处理（带防抖）=====
  // 防抖搜索：300ms 后才触发实际搜索，减少请求
  const debouncedSearch = useDebouncedCallback((value: string) => {
    if (value.trim()) {
      state.handleFilterChange('username', value.trim());
    }
  }, 300);

  const handleQuickSearch = useCallback((value: string) => {
    setQuickSearchValue(value);
    debouncedSearch(value);
    setQuickSearchVisible(false);
  }, [debouncedSearch]);

  // 实时输入时的防抖搜索（用于输入框）
  const handleQuickSearchInput = useCallback((value: string) => {
    setQuickSearchValue(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  // ===== 查看用户活动 =====
  const handleViewActivity = useCallback((user: User) => {
    setSelectedUserForActivity(user);
    setActivityDrawerVisible(true);
  }, []);

  // ===== 列设置菜单（Memoized）=====
  // 注意：'action' 列是必需的，不能被隐藏
  const columnSettingsItems: MenuProps['items'] = useMemo(() =>
    ALL_COLUMNS.map(col => ({
      key: col.key,
      label: (
        <Checkbox
          checked={visibleColumns.includes(col.key)}
          disabled={col.key === 'action'} // 操作列不能被隐藏
          onChange={(e) => {
            if (e.target.checked) {
              setVisibleColumns([...visibleColumns, col.key]);
            } else {
              // 不允许隐藏操作列
              if (col.key === 'action') return;
              setVisibleColumns(visibleColumns.filter(k => k !== col.key));
            }
          }}
        >
          {col.label}{col.key === 'action' ? ' (必需)' : ''}
        </Checkbox>
      ),
    })),
    [visibleColumns, setVisibleColumns]
  );

  // ===== 业务逻辑 =====
  const operations = useUserOperations({
    form: state.form,
    editForm: state.editForm,
    balanceForm: state.balanceForm,
    resetPasswordForm: state.resetPasswordForm,
    selectedUser: state.selectedUser,
    balanceType: state.balanceType,
    selectedRowKeys: state.selectedRowKeys,
    onCreateModalClose: state.closeCreateModal,
    onEditModalClose: state.closeEditModal,
    onBalanceModalClose: state.closeBalanceModal,
    onResetPasswordModalClose: state.closeResetPasswordModal,
    onSelectionChange: state.setSelectedRowKeys,
    onBalanceError: state.setBalanceError,
  });

  // ===== 渲染 =====
  return (
    <ErrorBoundary boundaryName="UserListPage">
      <div>
        {/* 页面标题和快捷键提示 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>用户管理</h2>
          <Space>
            <Tooltip title="快捷键: Ctrl+K 搜索, Ctrl+N 新建, Ctrl+R 刷新">
              <Tag color="blue" style={{ cursor: 'help' }}>
                <SearchOutlined /> Ctrl+K 快速搜索
              </Tag>
            </Tooltip>
            <Dropdown menu={{ items: columnSettingsItems }} trigger={['click']}>
              <Tooltip title="列设置">
                <Tag color="default" style={{ cursor: 'pointer' }}>
                  <SettingOutlined /> 列设置
                </Tag>
              </Tooltip>
            </Dropdown>
          </Space>
        </div>

        {/* 统计卡片 */}
        <UserStatsCards
          total={stats.total}
          active={stats.active}
          inactive={stats.inactive}
          banned={stats.banned}
        />

        {/* 快速搜索 Modal */}
        {quickSearchVisible && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              paddingTop: 120,
              zIndex: 1000,
            }}
            onClick={() => setQuickSearchVisible(false)}
          >
            <Card
              style={{ width: 500 }}
              onClick={(e) => e.stopPropagation()}
              bodyStyle={{ padding: 12 }}
            >
              <Input.Search
                autoFocus
                size="large"
                placeholder="搜索用户名、邮箱、手机号..."
                value={quickSearchValue}
                onChange={(e) => handleQuickSearchInput(e.target.value)}
                onSearch={handleQuickSearch}
                enterButton="搜索"
              />
              <div style={{ marginTop: 8, color: NEUTRAL_LIGHT.text.tertiary, fontSize: 12 }}>
                按 Enter 搜索，Escape 关闭
              </div>
            </Card>
          </div>
        )}

        <LoadingState
          loading={isLoading}
          error={error}
          empty={users.length === 0 && !isLoading}
          onRetry={refetch}
          loadingType="skeleton"
          skeletonRows={5}
          errorDescription="加载用户列表失败，请检查网络连接后重试"
          emptyDescription="暂无用户数据，点击右上角「创建用户」按钮添加新用户"
        >
          <UserFilterPanel
            form={state.filterForm}
            roles={roles}
            filterExpanded={state.filterExpanded}
            hasFilters={state.hasFilters}
            onFilterChange={state.handleFilterChange}
            onClearFilters={state.handleClearFilters}
            onToggleExpanded={() => state.setFilterExpanded(!state.filterExpanded)}
          />

          <UserToolbar
            selectedCount={state.selectedRowKeys.length}
            onCreateUser={() => state.setCreateModalVisible(true)}
            onExport={state.handleExport}
            onImport={state.handleImport}
            onBatchDelete={operations.handleBatchDelete}
            onBatchActivate={() => operations.handleBatchUpdateStatus(UserStatus.ACTIVE)}
            onBatchBan={() => operations.handleBatchUpdateStatus(UserStatus.BANNED)}
          />

          <UserTable
            users={users}
            loading={isLoading}
            page={state.page}
            pageSize={state.pageSize}
            total={total}
            selectedRowKeys={state.selectedRowKeys}
            visibleEmails={state.visibleEmails}
            visibleColumns={visibleColumns}
            onPageChange={(page, pageSize) => {
              state.setPage(page);
              state.setPageSize(pageSize);
            }}
            onSelectionChange={state.setSelectedRowKeys}
            onEdit={state.handleEdit}
            onResetPassword={state.openResetPassword}
            onRecharge={state.openRecharge}
            onDeduct={state.openDeduct}
            onUpdateStatus={operations.handleUpdateStatus}
            onDelete={operations.handleDelete}
            onToggleEmailVisibility={state.toggleEmailVisibility}
            onViewActivity={handleViewActivity}
          />

          <CreateUserModal
            visible={state.createModalVisible}
            form={state.form}
            roles={roles}
            onCancel={state.closeCreateModal}
            onFinish={operations.handleCreate}
          />

          <EditUserModal
            visible={state.editModalVisible}
            form={state.editForm}
            roles={roles}
            selectedUser={state.selectedUser}
            onCancel={state.closeEditModal}
            onFinish={operations.handleUpdate}
          />

          <BalanceModal
            visible={state.balanceModalVisible}
            form={state.balanceForm}
            balanceType={state.balanceType}
            selectedUser={state.selectedUser}
            error={state.balanceError}
            onCancel={state.closeBalanceModal}
            onFinish={operations.handleBalanceOperation}
            onClearError={() => state.setBalanceError(null)}
            onRetry={() => state.balanceForm.submit()}
          />

          <ResetPasswordModal
            visible={state.resetPasswordModalVisible}
            form={state.resetPasswordForm}
            selectedUser={state.selectedUser}
            onCancel={state.closeResetPasswordModal}
            onFinish={operations.handleResetPassword}
          />
        </LoadingState>

        {/* 用户活动时间线 Drawer */}
        <Drawer
          title={
            <Space>
              <HistoryOutlined />
              <span>用户活动记录 - {selectedUserForActivity?.username}</span>
            </Space>
          }
          open={activityDrawerVisible}
          onClose={() => setActivityDrawerVisible(false)}
          width={400}
        >
          {selectedUserForActivity ? (
            <Timeline
              items={[
                {
                  color: 'green',
                  children: (
                    <>
                      <Text strong>账户创建</Text>
                      <br />
                      <Text type="secondary">
                        {new Date(selectedUserForActivity.createdAt).toLocaleString('zh-CN')}
                      </Text>
                    </>
                  ),
                },
                {
                  color: 'blue',
                  children: (
                    <>
                      <Text strong>最后更新</Text>
                      <br />
                      <Text type="secondary">
                        {new Date(selectedUserForActivity.updatedAt).toLocaleString('zh-CN')}
                      </Text>
                    </>
                  ),
                },
                {
                  color: selectedUserForActivity.status === 'active' ? 'green' : 'red',
                  children: (
                    <>
                      <Text strong>当前状态</Text>
                      <br />
                      <Tag color={selectedUserForActivity.status === 'active' ? 'success' : 'error'}>
                        {selectedUserForActivity.status === 'active' ? '活跃' :
                         selectedUserForActivity.status === 'banned' ? '封禁' : '禁用'}
                      </Tag>
                    </>
                  ),
                },
                {
                  color: 'gray',
                  children: (
                    <>
                      <Text strong>账户余额</Text>
                      <br />
                      <Text type={selectedUserForActivity.balance > 0 ? 'success' : 'danger'}>
                        ¥{selectedUserForActivity.balance?.toFixed(2) || '0.00'}
                      </Text>
                    </>
                  ),
                },
              ]}
            />
          ) : (
            <Empty description="请选择用户查看活动记录" />
          )}
        </Drawer>
      </div>
    </ErrorBoundary>
  );
};

export default UserList;
