/**
 * 批量编辑示例页面
 *
 * 展示批量编辑功能的使用
 */

import { useState } from 'react';
import { Card, Table, Button, Space, Tag, message, Typography } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useBatchEdit } from '@/hooks/useBatchEdit';
import { BatchEditModal } from '@/components/BatchEdit';
import type { EditField } from '@/hooks/useBatchEdit';

const { Title, Text, Paragraph } = Typography;

/**
 * 用户数据接口
 */
interface User {
  id: number;
  username: string;
  email: string;
  status: 'active' | 'inactive' | 'banned';
  role: 'admin' | 'manager' | 'user';
  vip: boolean;
}

/**
 * 模拟用户数据
 */
const INITIAL_USERS: User[] = [
  { id: 1, username: 'user001', email: 'user001@example.com', status: 'active', role: 'user', vip: false },
  { id: 2, username: 'user002', email: 'user002@example.com', status: 'active', role: 'user', vip: true },
  { id: 3, username: 'user003', email: 'user003@example.com', status: 'inactive', role: 'user', vip: false },
  { id: 4, username: 'user004', email: 'user004@example.com', status: 'active', role: 'manager', vip: true },
  { id: 5, username: 'user005', email: 'user005@example.com', status: 'banned', role: 'user', vip: false },
  { id: 6, username: 'user006', email: 'user006@example.com', status: 'active', role: 'user', vip: false },
  { id: 7, username: 'user007', email: 'user007@example.com', status: 'inactive', role: 'user', vip: true },
];

/**
 * 可编辑字段配置
 */
const EDIT_FIELDS: EditField<User>[] = [
  {
    name: 'status',
    label: '状态',
    type: 'select',
    options: [
      { label: '活跃', value: 'active' },
      { label: '未激活', value: 'inactive' },
      { label: '已封禁', value: 'banned' },
    ],
    placeholder: '选择状态',
  },
  {
    name: 'role',
    label: '角色',
    type: 'select',
    options: [
      { label: '管理员', value: 'admin' },
      { label: '经理', value: 'manager' },
      { label: '普通用户', value: 'user' },
    ],
    placeholder: '选择角色',
  },
  {
    name: 'vip',
    label: 'VIP 状态',
    type: 'boolean',
    defaultValue: false,
  },
];

/**
 * 批量编辑示例页面
 */
const BatchEditExample = () => {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  // 批量编辑 Hook
  const batchEdit = useBatchEdit<User>({
    fields: EDIT_FIELDS,
    onBatchEdit: async (ids, updates) => {
      // 模拟 API 调用延迟
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 更新本地数据
      setUsers((prev) =>
        prev.map((user) =>
          ids.includes(user.id) ? { ...user, ...updates } : user
        )
      );
    },
    onSuccess: () => {
      message.success(`成功编辑 ${selectedRowKeys.length} 个用户`);
      setSelectedRowKeys([]);
    },
    onError: (error) => {
      message.error(`批量编辑失败: ${error.message}`);
    },
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
        const textMap: Record<string, string> = {
          active: '活跃',
          inactive: '未激活',
          banned: '已封禁',
        };
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>;
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
        const textMap: Record<string, string> = {
          admin: '管理员',
          manager: '经理',
          user: '普通用户',
        };
        return <Tag color={colorMap[role]}>{textMap[role]}</Tag>;
      },
    },
    {
      title: 'VIP',
      dataIndex: 'vip',
      key: 'vip',
      render: (vip: boolean) => (
        <Tag color={vip ? 'gold' : 'default'}>{vip ? '是' : '否'}</Tag>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题 */}
        <div>
          <Title level={2}>✏️ 批量编辑示例</Title>
          <Paragraph>
            选择多个用户,点击"批量编辑"按钮可以同时修改多个用户的属性
          </Paragraph>
        </div>

        {/* 用户列表 */}
        <Card
          title={`用户列表 (${users.length} 个用户)`}
          extra={
            <Button
              type="primary"
              icon={<EditOutlined />}
              disabled={selectedRowKeys.length === 0}
              onClick={() => batchEdit.open(selectedRowKeys)}
            >
              批量编辑 {selectedRowKeys.length > 0 && `(${selectedRowKeys.length})`}
            </Button>
          }
        >
          <Table
            rowKey="id"
            columns={columns}
            dataSource={users}
            pagination={{ pageSize: 10 }}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys as number[]),
              selections: [
                Table.SELECTION_ALL,
                Table.SELECTION_INVERT,
                Table.SELECTION_NONE,
                {
                  key: 'select-active',
                  text: '选择活跃用户',
                  onSelect: () => {
                    const activeIds = users
                      .filter((u) => u.status === 'active')
                      .map((u) => u.id);
                    setSelectedRowKeys(activeIds);
                  },
                },
                {
                  key: 'select-vip',
                  text: '选择 VIP 用户',
                  onSelect: () => {
                    const vipIds = users.filter((u) => u.vip).map((u) => u.id);
                    setSelectedRowKeys(vipIds);
                  },
                },
              ],
            }}
          />
        </Card>

        {/* 批量编辑模态框 */}
        <BatchEditModal
          visible={batchEdit.visible}
          onClose={batchEdit.close}
          count={selectedRowKeys.length}
          fields={batchEdit.fields}
          values={batchEdit.values}
          onValueChange={batchEdit.setValue}
          onSubmit={batchEdit.submit}
          submitting={batchEdit.submitting}
        />

        {/* 使用说明 */}
        <Card
          title="💡 使用说明"
          style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>1. 选择要编辑的项:</Text>
              <div style={{ marginTop: 4, color: '#595959' }}>
                点击表格左侧的复选框选择一个或多个用户,也可以使用表格上方的快捷选择
              </div>
            </div>

            <div>
              <Text strong>2. 打开批量编辑:</Text>
              <div style={{ marginTop: 4, color: '#595959' }}>
                选择用户后,点击"批量编辑"按钮打开编辑模态框
              </div>
            </div>

            <div>
              <Text strong>3. 修改字段:</Text>
              <div style={{ marginTop: 4, color: '#595959' }}>
                在模态框中修改要更新的字段,<strong>未填写的字段不会被修改</strong>
              </div>
            </div>

            <div>
              <Text strong>4. 提交更新:</Text>
              <div style={{ marginTop: 4, color: '#595959' }}>
                点击"确认编辑"按钮,所有选中的用户都会被更新
              </div>
            </div>

            <div>
              <Text strong>5. 应用场景:</Text>
              <div style={{ marginTop: 4, color: '#595959' }}>
                • 批量修改用户状态 (激活/禁用)
                <br />
                • 批量调整用户角色
                <br />
                • 批量开启/关闭 VIP 权限
                <br />• 任何需要批量修改数据的场景
              </div>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default BatchEditExample;
