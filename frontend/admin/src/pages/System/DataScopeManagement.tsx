import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, message, Tag, Form, Alert, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import {
  getAllDataScopes,
  getScopeTypes,
  getDataScopesByRole,
  createDataScope,
  updateDataScope,
  deleteDataScope,
  toggleDataScope,
} from '@/services/dataScope';
import type { DataScope, ScopeType, CreateDataScopeDto, UpdateDataScopeDto } from '@/types';
import {
  DataScopeStatsCards,
  DataScopeToolbar,
  CreateDataScopeModal,
  EditDataScopeModal,
  DataScopeDetailModal,
  getScopeTypeColor,
} from '@/components/DataScope';
import dayjs from 'dayjs';

const DataScopeManagement = () => {
  const [dataScopes, setDataScopes] = useState<DataScope[]>([]);
  const [scopeTypes, setScopeTypes] = useState<Array<{ value: ScopeType; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedScope, setSelectedScope] = useState<DataScope | null>(null);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // 加载范围类型元数据
  const loadScopeTypes = async () => {
    try {
      const res = await getScopeTypes();
      if (res.success) {
        setScopeTypes(res.data);
      }
    } catch (error) {
      message.error('加载范围类型失败');
    }
  };

  // 加载数据范围配置
  const loadDataScopes = async () => {
    setLoading(true);
    try {
      const res = await getAllDataScopes();
      if (res.success) {
        setDataScopes(res.data);
      }
    } catch (error) {
      message.error('加载数据范围配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScopeTypes();
    loadDataScopes();
  }, []);

  // 创建数据范围配置
  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const res = await createDataScope(values as CreateDataScopeDto);
      if (res.success) {
        message.success(res.message || '创建成功');
        createForm.resetFields();
        setCreateModalVisible(false);
        loadDataScopes();
      } else {
        message.error(res.message || '创建失败');
      }
    } catch (error) {
      message.error('创建失败');
    }
  };

  // 编辑数据范围配置
  const handleEdit = async () => {
    if (!selectedScope) return;

    try {
      const values = await editForm.validateFields();
      const res = await updateDataScope(selectedScope.id, values as UpdateDataScopeDto);
      if (res.success) {
        message.success(res.message || '更新成功');
        editForm.resetFields();
        setEditModalVisible(false);
        setSelectedScope(null);
        loadDataScopes();
      } else {
        message.error(res.message || '更新失败');
      }
    } catch (error) {
      message.error('更新失败');
    }
  };

  // 删除数据范围配置
  const handleDelete = async (id: string) => {
    try {
      const res = await deleteDataScope(id);
      if (res.success) {
        message.success(res.message || '删除成功');
        loadDataScopes();
      } else {
        message.error(res.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 启用/禁用
  const handleToggle = async (id: string) => {
    try {
      const res = await toggleDataScope(id);
      if (res.success) {
        message.success(res.message);
        loadDataScopes();
      } else {
        message.error(res.message || '操作失败');
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 打开编辑模态框
  const openEditModal = (record: DataScope) => {
    setSelectedScope(record);
    editForm.setFieldsValue({
      scopeType: record.scopeType,
      description: record.description,
      isActive: record.isActive,
      priority: record.priority,
      includeSubDepartments: record.includeSubDepartments,
    });
    setEditModalVisible(true);
  };

  // 查看详情
  const viewDetail = (record: DataScope) => {
    setSelectedScope(record);
    setDetailModalVisible(true);
  };

  // 统计数据
  const stats = {
    total: dataScopes.length,
    active: dataScopes.filter((s) => s.isActive).length,
    inactive: dataScopes.filter((s) => !s.isActive).length,
    byType: dataScopes.reduce(
      (acc, s) => {
        acc[s.scopeType] = (acc[s.scopeType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };

  // 表格列
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => id.substring(0, 8),
    },
    {
      title: '角色ID',
      dataIndex: 'roleId',
      key: 'roleId',
      width: 120,
      render: (roleId: string) => roleId.substring(0, 8),
    },
    {
      title: '资源类型',
      dataIndex: 'resourceType',
      key: 'resourceType',
      width: 120,
    },
    {
      title: '范围类型',
      dataIndex: 'scopeType',
      key: 'scopeType',
      width: 150,
      render: (type: ScopeType) => {
        const typeObj = scopeTypes.find((t) => t.value === type);
        return <Tag color={getScopeTypeColor(type)}>{typeObj?.label || type}</Tag>;
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      align: 'center' as const,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag
          color={isActive ? 'success' : 'default'}
          icon={isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        >
          {isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (time: string) => dayjs(time).format('MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: DataScope) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => viewDetail(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => handleToggle(record.id)}>
            {record.isActive ? '禁用' : '启用'}
          </Button>
          <Popconfirm
            title="确定删除此数据范围配置？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="数据范围权限管理"
          description="配置角色对不同资源类型的数据访问范围。支持全部数据、租户数据、部门数据、本人数据和自定义范围。"
          type="info"
          showIcon
        />

        <DataScopeStatsCards
          total={stats.total}
          active={stats.active}
          inactive={stats.inactive}
          customCount={stats.byType['custom'] || 0}
        />

        {/* 操作按钮和表格 */}
        <Card>
          <DataScopeToolbar
            onCreate={() => setCreateModalVisible(true)}
            onRefresh={loadDataScopes}
          />

          <Table
            columns={columns}
            dataSource={dataScopes}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20 }}
            scroll={{ x: 1400 }}
          />
        </Card>
      </Space>

      <CreateDataScopeModal
        visible={createModalVisible}
        form={createForm}
        scopeTypes={scopeTypes}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
      />

      <EditDataScopeModal
        visible={editModalVisible}
        form={editForm}
        scopeTypes={scopeTypes}
        onOk={handleEdit}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedScope(null);
          editForm.resetFields();
        }}
      />

      <DataScopeDetailModal
        visible={detailModalVisible}
        selectedScope={selectedScope}
        scopeTypes={scopeTypes}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedScope(null);
        }}
      />
    </div>
  );
};

export default DataScopeManagement;
