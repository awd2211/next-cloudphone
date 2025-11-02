import { useState, useEffect, useCallback } from 'react';
import { message, Form } from 'antd';
import request from '@/utils/request';

export interface DeviceGroup {
  id: string;
  name: string;
  description?: string;
  deviceCount: number;
  tags?: string[];
  createdAt: string;
}

interface UseDeviceGroupsReturn {
  // 数据状态
  groups: DeviceGroup[];
  loading: boolean;

  // Modal 状态
  modalVisible: boolean;
  editingGroup: DeviceGroup | null;
  form: ReturnType<typeof Form.useForm>[0];

  // 操作方法
  loadGroups: () => Promise<void>;
  openModal: (group?: DeviceGroup) => void;
  handleSubmit: () => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  setModalVisible: (visible: boolean) => void;
}

/**
 * 设备分组管理 Hook
 * 封装设备分组的 CRUD 操作
 */
export const useDeviceGroups = (): UseDeviceGroupsReturn => {
  const [groups, setGroups] = useState<DeviceGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DeviceGroup | null>(null);
  const [form] = Form.useForm();

  // 加载分组列表
  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request.get('/devices/groups');
      setGroups(res);
    } catch (error) {
      message.error('加载分组失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // 打开 Modal
  const openModal = useCallback(
    (group?: DeviceGroup) => {
      if (group) {
        setEditingGroup(group);
        form.setFieldsValue({
          name: group.name,
          description: group.description,
          tags: group.tags,
        });
      } else {
        setEditingGroup(null);
        form.resetFields();
      }
      setModalVisible(true);
    },
    [form]
  );

  // 提交表单（创建或更新）
  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (editingGroup) {
        await request.put(`/devices/groups/${editingGroup.id}`, values);
        message.success('分组更新成功');
      } else {
        await request.post('/devices/groups', values);
        message.success('分组创建成功');
      }
      setModalVisible(false);
      loadGroups();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error('操作失败');
    }
  }, [editingGroup, form, loadGroups]);

  // 删除分组
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await request.delete(`/devices/groups/${id}`);
        message.success('分组删除成功');
        loadGroups();
      } catch (error) {
        message.error('删除失败');
      }
    },
    [loadGroups]
  );

  return {
    groups,
    loading,
    modalVisible,
    editingGroup,
    form,
    loadGroups,
    openModal,
    handleSubmit,
    handleDelete,
    setModalVisible,
  };
};
