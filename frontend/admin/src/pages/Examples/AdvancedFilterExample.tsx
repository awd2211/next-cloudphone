/**
 * 高级筛选器示例页面
 *
 * 展示筛选方案保存、加载、管理功能
 */

import { Card, Form, Input, Select, DatePicker, Button, Space, Table, Tag, Typography } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useFilterPresets } from '@/hooks/useFilterPresets';
import { FilterPresetManager } from '@/components/AdvancedFilter';
import type { FilterPreset } from '@/hooks/useFilterPresets';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

/**
 * 筛选条件接口
 */
interface UserFilters {
  username?: string;
  email?: string;
  status?: string;
  role?: string;
  dateRange?: [string, string] | null;
}

/**
 * 默认筛选方案
 */
const DEFAULT_PRESETS: FilterPreset<UserFilters>[] = [
  {
    id: 'preset_active_users',
    name: '活跃用户',
    description: '状态为 active 的所有用户',
    filters: { status: 'active' },
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'preset_admin_users',
    name: '管理员用户',
    description: '角色为 admin 的用户',
    filters: { role: 'admin' },
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

/**
 * 模拟用户数据
 */
const MOCK_USERS = [
  { id: 1, username: 'admin', email: 'admin@example.com', status: 'active', role: 'admin' },
  { id: 2, username: 'user001', email: 'user001@example.com', status: 'active', role: 'user' },
  { id: 3, username: 'user002', email: 'user002@example.com', status: 'inactive', role: 'user' },
  { id: 4, username: 'manager', email: 'manager@example.com', status: 'active', role: 'manager' },
  { id: 5, username: 'user003', email: 'user003@example.com', status: 'banned', role: 'user' },
];

/**
 * 高级筛选器示例页面
 */
const AdvancedFilterExample = () => {
  const {
    filters,
    setFilters,
    presets,
    activePresetId,
    savePreset,
    loadPreset,
    deletePreset,
    setDefaultPreset,
    resetFilters,
  } = useFilterPresets<UserFilters>({
    storageKey: 'example-user-filters',
    initialFilters: {},
    defaultPresets: DEFAULT_PRESETS,
  });

  // 应用筛选 (实际项目中应该调用 API)
  const filteredUsers = MOCK_USERS.filter((user) => {
    if (filters.username && !user.username.includes(filters.username)) return false;
    if (filters.email && !user.email.includes(filters.email)) return false;
    if (filters.status && user.status !== filters.status) return false;
    if (filters.role && user.role !== filters.role) return false;
    return true;
  });

  // 表格列配置
  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          active: 'success',
          inactive: 'default',
          banned: 'error',
        };
        return <Tag color={colorMap[status]}>{status}</Tag>;
      },
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const colorMap: Record<string, string> = {
          admin: 'purple',
          manager: 'blue',
          user: 'default',
        };
        return <Tag color={colorMap[role]}>{role}</Tag>;
      },
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题 */}
        <div>
          <Title level={2}>🔍 高级筛选器示例</Title>
          <Paragraph>
            设置筛选条件后,点击"保存方案"可以保存当前条件,下次点击"加载方案"即可快速应用
          </Paragraph>
        </div>

        {/* 筛选条件卡片 */}
        <Card title="筛选条件" extra={
          <FilterPresetManager
            presets={presets}
            activePresetId={activePresetId}
            onSave={savePreset}
            onLoad={loadPreset}
            onDelete={deletePreset}
            onSetDefault={setDefaultPreset}
          />
        }>
          <Form layout="inline" style={{ marginBottom: 16 }}>
            <Form.Item label="用户名">
              <Input
                placeholder="搜索用户名"
                value={filters.username}
                onChange={(e) => setFilters({ ...filters, username: e.target.value })}
                allowClear
              />
            </Form.Item>

            <Form.Item label="邮箱">
              <Input
                placeholder="搜索邮箱"
                value={filters.email}
                onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                allowClear
              />
            </Form.Item>

            <Form.Item label="状态">
              <Select
                placeholder="选择状态"
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value })}
                allowClear
                style={{ width: 150 }}
                options={[
                  { label: '活跃', value: 'active' },
                  { label: '未激活', value: 'inactive' },
                  { label: '已封禁', value: 'banned' },
                ]}
              />
            </Form.Item>

            <Form.Item label="角色">
              <Select
                placeholder="选择角色"
                value={filters.role}
                onChange={(value) => setFilters({ ...filters, role: value })}
                allowClear
                style={{ width: 150 }}
                options={[
                  { label: '管理员', value: 'admin' },
                  { label: '经理', value: 'manager' },
                  { label: '普通用户', value: 'user' },
                ]}
              />
            </Form.Item>

            <Form.Item>
              <Button icon={<ReloadOutlined />} onClick={resetFilters}>
                重置
              </Button>
            </Form.Item>
          </Form>

          {/* 当前筛选方案提示 */}
          {activePresetId && (
            <div style={{ padding: '8px 12px', backgroundColor: '#f0f5ff', borderRadius: 4 }}>
              <Text type="secondary">
                当前使用方案:{' '}
                <Text strong>
                  {presets.find((p) => p.id === activePresetId)?.name}
                </Text>
              </Text>
            </div>
          )}
        </Card>

        {/* 筛选结果表格 */}
        <Card title={`筛选结果 (${filteredUsers.length} 条)`}>
          <Table
            columns={columns}
            dataSource={filteredUsers}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Card>

        {/* 使用说明 */}
        <Card
          title="💡 使用说明"
          style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>1. 保存筛选方案:</Text>
              <div style={{ marginTop: 4, color: '#595959' }}>
                设置筛选条件后,点击"保存方案"按钮,输入方案名称和描述 (可选),即可保存当前筛选条件
              </div>
            </div>

            <div>
              <Text strong>2. 加载筛选方案:</Text>
              <div style={{ marginTop: 4, color: '#595959' }}>
                点击"加载方案"按钮,从列表中选择要使用的方案,点击"加载"即可应用该方案的筛选条件
              </div>
            </div>

            <div>
              <Text strong>3. 设置默认方案:</Text>
              <div style={{ marginTop: 4, color: '#595959' }}>
                在方案列表中点击 ⭐ 图标可以将方案设为默认,下次进入页面时会自动应用默认方案
              </div>
            </div>

            <div>
              <Text strong>4. 删除方案:</Text>
              <div style={{ marginTop: 4, color: '#595959' }}>
                在方案列表中点击删除图标可以删除不需要的方案
              </div>
            </div>

            <div>
              <Text strong>5. 持久化存储:</Text>
              <div style={{ marginTop: 4, color: '#595959' }}>
                所有方案保存在 LocalStorage,刷新页面后仍然存在
              </div>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default AdvancedFilterExample;
