import { useState, useEffect } from 'react';
import { Table, Space, Button, Form, message, Popconfirm, Tag, Card, Switch } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useDataScope,
  type DataScope,
  ScopeType,
  type CreateDataScopeDto,
} from '@/hooks/useDataScope';
import { getRoles } from '@/services/role';
import type { Role } from '@/types';
import {
  DataScopeFilterBar,
  CreateEditDataScopeModal,
  DataScopeDetailModal,
  resourceTypes,
} from '@/components/PermissionDataScope';
import dayjs from 'dayjs';

/**
 * 数据范围配置页面
 * 管理角色对不同资源的数据访问范围
 */
const DataScopeConfig = () => {
  const {
    dataScopes,
    scopeTypes,
    loading: hookLoading,
    fetchDataScopes,
    createDataScope,
    updateDataScope,
    deleteDataScope,
    toggleDataScope,
    getScopeDescription,
  } = useDataScope();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingScope, setEditingScope] = useState<DataScope | null>(null);
  const [viewingScope, setViewingScope] = useState<DataScope | null>(null);
  const [form] = Form.useForm();

  // 查询参数
  const [filterRoleId, setFilterRoleId] = useState<string | undefined>();
  const [filterResourceType, setFilterResourceType] = useState<string | undefined>();

  /**
   * 加载数据
   */
  const loadData = async () => {
    setLoading(true);
    try {
      await fetchDataScopes({
        roleId: filterRoleId,
        resourceType: filterResourceType,
        isActive: true,
      });
    } catch (error) {
      message.error('加载数据范围配置失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载角色列表
   */
  const loadRoles = async () => {
    try {
      const res = await getRoles({ page: 1, pageSize: 100 });
      setRoles(res.data);
    } catch (error) {
      message.error('加载角色列表失败');
    }
  };

  useEffect(() => {
    loadData();
    loadRoles();
  }, [filterRoleId, filterResourceType]);

  /**
   * 提交表单
   */
  const handleSubmit = async (values: any) => {
    try {
      if (editingScope) {
        await updateDataScope(editingScope.id, values);
        message.success('更新数据范围配置成功');
      } else {
        await createDataScope(values as CreateDataScopeDto);
        message.success('创建数据范围配置成功');
      }
      setModalVisible(false);
      setEditingScope(null);
      form.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.message || (editingScope ? '更新失败' : '创建失败'));
    }
  };

  /**
   * 编辑
   */
  const handleEdit = (scope: DataScope) => {
    setEditingScope(scope);
    form.setFieldsValue({
      ...scope,
      departmentIds: scope.departmentIds || [],
      includeSubDepartments: scope.includeSubDepartments ?? true,
      priority: scope.priority ?? 100,
    });
    setModalVisible(true);
  };

  /**
   * 删除
   */
  const handleDelete = async (id: string) => {
    try {
      await deleteDataScope(id);
      message.success('删除数据范围配置成功');
      loadData();
    } catch (error) {
      message.error('删除数据范围配置失败');
    }
  };

  /**
   * 切换启用状态
   */
  const handleToggle = async (id: string) => {
    try {
      await toggleDataScope(id);
      message.success('切换状态成功');
      loadData();
    } catch (error) {
      message.error('切换状态失败');
    }
  };

  /**
   * 查看详情
   */
  const handleView = (scope: DataScope) => {
    setViewingScope(scope);
    setDetailModalVisible(true);
  };

  const columns: ColumnsType<DataScope> = [
    {
      title: '角色',
      dataIndex: 'roleId',
      key: 'roleId',
      width: 150,
      render: (roleId: string) => {
        const role = roles.find((r) => r.id === roleId);
        return role?.name || roleId;
      },
    },
    {
      title: '资源类型',
      dataIndex: 'resourceType',
      key: 'resourceType',
      width: 150,
      render: (resourceType: string) => {
        const resource = resourceTypes.find((r) => r.value === resourceType);
        return <Tag color="blue">{resource?.label || resourceType}</Tag>;
      },
    },
    {
      title: '范围类型',
      dataIndex: 'scopeType',
      key: 'scopeType',
      width: 200,
      render: (scopeType: ScopeType, record: DataScope) => {
        const scopeType_ = scopeTypes.find((s) => s.value === scopeType);
        return (
          <div>
            <Tag color="green">{scopeType_?.label || scopeType}</Tag>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              {getScopeDescription(record)}
            </div>
          </div>
        );
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      sorter: (a, b) => (a.priority || 100) - (b.priority || 100),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean, record: DataScope) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggle(record.id)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个配置吗?"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" icon={<DeleteOutlined />} danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <h2>数据范围配置</h2>
        <p style={{ color: '#666', marginBottom: 24 }}>
          配置不同角色对各类资源的数据访问范围，支持全部数据、租户数据、部门数据、本人数据等多种范围类型
        </p>

        <DataScopeFilterBar
          roles={roles}
          filterRoleId={filterRoleId}
          filterResourceType={filterResourceType}
          onRoleChange={setFilterRoleId}
          onResourceTypeChange={setFilterResourceType}
          onCreate={() => {
            setEditingScope(null);
            form.resetFields();
            setModalVisible(true);
          }}
        />

        <Table
          columns={columns}
          dataSource={dataScopes}
          rowKey="id"
          loading={loading || hookLoading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      <CreateEditDataScopeModal
        visible={modalVisible}
        editingScope={editingScope}
        form={form}
        roles={roles}
        scopeTypes={scopeTypes}
        onFinish={handleSubmit}
        onOk={() => form.submit()}
        onCancel={() => {
          setModalVisible(false);
          setEditingScope(null);
          form.resetFields();
        }}
      />

      <DataScopeDetailModal
        visible={detailModalVisible}
        viewingScope={viewingScope}
        roles={roles}
        scopeTypes={scopeTypes}
        getScopeDescription={getScopeDescription}
        onClose={() => setDetailModalVisible(false)}
      />
    </div>
  );
};

export default DataScopeConfig;
