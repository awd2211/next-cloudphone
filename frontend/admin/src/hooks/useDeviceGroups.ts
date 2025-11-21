import { useState, useCallback } from 'react';
import { message, Form } from 'antd';
import { z } from 'zod';
import request from '@/utils/request';
import { useValidatedQuery } from '@/hooks/utils';
import { DeviceGroupSchema } from '@/schemas/api.schemas';

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
  // ✅ 使用 useValidatedQuery 加载设备分组
  const {
    data: groupsData,
    isLoading: loading,
    refetch,
  } = useValidatedQuery({
    queryKey: ['device-groups'],
    queryFn: () => request.get('/devices/groups'),
    schema: z.array(DeviceGroupSchema),
    apiErrorMessage: '加载分组失败',
    fallbackValue: [],
    staleTime: 30 * 1000, // 30秒缓存
  });

  // Wrap refetch to match expected signature
  const loadGroups = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // 模态框和编辑状态
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DeviceGroup | null>(null);
  const [form] = Form.useForm();

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
      } catch (_error) {
        message.error('删除失败');
      }
    },
    [loadGroups]
  );

  return {
    groups: groupsData || [], // ✅ 从响应中提取
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
