import { useState, useCallback } from 'react';
import { Form, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import type { NotificationTemplate } from '@/components/NotificationTemplates';

export const useNotificationTemplates = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplate | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 查询模板列表
  const { data, isLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const response = await request.get('/templates', {
        params: {
          limit: 100,
        },
      });
      return response.data;
    },
  });

  // 创建模板
  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      return await request.post('/templates', values);
    },
    onSuccess: () => {
      message.success('模板创建成功');
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: () => {
      message.error('模板创建失败');
    },
  });

  // 更新模板
  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: any }) => {
      return await request.patch(`/templates/${id}`, values);
    },
    onSuccess: () => {
      message.success('模板更新成功');
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      setIsModalVisible(false);
      setEditingTemplate(null);
      form.resetFields();
    },
    onError: () => {
      message.error('模板更新失败');
    },
  });

  // 删除模板
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await request.delete(`/templates/${id}`);
    },
    onSuccess: () => {
      message.success('模板删除成功');
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    },
    onError: () => {
      message.error('模板删除失败');
    },
  });

  // 切换激活状态
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await request.patch(`/templates/${id}/toggle`);
    },
    onSuccess: () => {
      message.success('状态更新成功');
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    },
    onError: () => {
      message.error('状态更新失败');
    },
  });

  const handleCreate = useCallback(() => {
    setEditingTemplate(null);
    form.resetFields();
    setIsModalVisible(true);
  }, [form]);

  const handleEdit = useCallback(
    (record: NotificationTemplate) => {
      setEditingTemplate(record);
      form.setFieldsValue(record);
      setIsModalVisible(true);
    },
    [form]
  );

  const handlePreview = useCallback((record: NotificationTemplate) => {
    setPreviewTemplate(record);
    setPreviewModalVisible(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const handleToggle = useCallback(
    (id: string) => {
      toggleMutation.mutate(id);
    },
    [toggleMutation]
  );

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (editingTemplate) {
        updateMutation.mutate({ id: editingTemplate.id, values });
      } else {
        createMutation.mutate(values);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  }, [editingTemplate, form, createMutation, updateMutation]);

  const handleCancel = useCallback(() => {
    setIsModalVisible(false);
    setEditingTemplate(null);
    form.resetFields();
  }, [form]);

  const handlePreviewCancel = useCallback(() => {
    setPreviewModalVisible(false);
  }, []);

  return {
    data,
    isLoading,
    isModalVisible,
    previewModalVisible,
    editingTemplate,
    previewTemplate,
    form,
    createMutation,
    updateMutation,
    handleCreate,
    handleEdit,
    handlePreview,
    handleDelete,
    handleToggle,
    handleSubmit,
    handleCancel,
    handlePreviewCancel,
  };
};
