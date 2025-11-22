/**
 * Notification Templates React Query Hooks
 *
 * 基于 @/services/notificationTemplate
 * 使用 React Query + Zod 进行数据获取和验证
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, message } from 'antd';
import * as notificationTemplateService from '@/services/notificationTemplate';
import type {
  NotificationTemplate,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  PaginationParams,
} from '@/types';

/**
 * Query Keys
 */
export const notificationTemplateKeys = {
  all: ['notificationTemplates'] as const,
  lists: () => [...notificationTemplateKeys.all, 'list'] as const,
  list: (params?: PaginationParams & { type?: string; isActive?: boolean }) =>
    [...notificationTemplateKeys.lists(), params] as const,
  details: () => [...notificationTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...notificationTemplateKeys.details(), id] as const,
  versions: (templateId: string) => [...notificationTemplateKeys.all, 'versions', templateId] as const,
  variables: (type?: string) => [...notificationTemplateKeys.all, 'variables', type] as const,
};

/**
 * 获取通知模板列表
 */
export const useNotificationTemplateList = (
  params?: PaginationParams & { type?: string; isActive?: boolean }
) => {
  return useQuery({
    queryKey: notificationTemplateKeys.list(params),
    queryFn: () => notificationTemplateService.getNotificationTemplates(params),
    staleTime: 30 * 1000, // 30秒
  });
};

/**
 * 获取单个通知模板详情
 */
export const useNotificationTemplate = (id: string) => {
  return useQuery({
    queryKey: notificationTemplateKeys.detail(id),
    queryFn: () => notificationTemplateService.getNotificationTemplate(id),
    enabled: !!id,
  });
};

/**
 * 获取模板版本历史
 */
export const useTemplateVersions = (templateId: string) => {
  return useQuery({
    queryKey: notificationTemplateKeys.versions(templateId),
    queryFn: () => notificationTemplateService.getTemplateVersions(templateId),
    enabled: !!templateId,
  });
};

/**
 * 获取可用变量
 */
export const useAvailableVariables = (type?: string) => {
  return useQuery({
    queryKey: notificationTemplateKeys.variables(type),
    queryFn: () => notificationTemplateService.getAvailableVariables(type),
    staleTime: 5 * 60 * 1000, // 5分钟
  });
};

/**
 * 创建通知模板 Mutation
 */
export const useCreateNotificationTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateNotificationTemplateDto) =>
      notificationTemplateService.createNotificationTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationTemplateKeys.lists() });
      message.success('模板创建成功');
    },
    onError: () => {
      message.error('模板创建失败');
    },
  });
};

/**
 * 更新通知模板 Mutation
 */
export const useUpdateNotificationTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNotificationTemplateDto }) =>
      notificationTemplateService.updateNotificationTemplate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: notificationTemplateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationTemplateKeys.detail(id) });
      message.success('模板更新成功');
    },
    onError: () => {
      message.error('模板更新失败');
    },
  });
};

/**
 * 删除通知模板 Mutation
 */
export const useDeleteNotificationTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationTemplateService.deleteNotificationTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationTemplateKeys.lists() });
      message.success('模板删除成功');
    },
    onError: () => {
      message.error('模板删除失败');
    },
  });
};

/**
 * 切换模板激活状态 Mutation
 */
export const useToggleNotificationTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      notificationTemplateService.toggleNotificationTemplate(id, isActive),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: notificationTemplateKeys.lists() });
      message.success(`模板已${isActive ? '激活' : '停用'}`);
    },
    onError: () => {
      message.error('操作失败');
    },
  });
};

/**
 * 测试发送通知模板 Mutation
 */
export const useTestNotificationTemplate = () => {
  return useMutation({
    mutationFn: (data: {
      templateId: string;
      recipient: string;
      variables: Record<string, any>;
    }) => notificationTemplateService.testNotificationTemplate(data),
    onSuccess: () => {
      message.success('测试消息已发送');
    },
    onError: () => {
      message.error('发送失败');
    },
  });
};

/**
 * 回滚模板版本 Mutation
 */
export const useRevertTemplateVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, versionId }: { templateId: string; versionId: string }) =>
      notificationTemplateService.revertTemplateVersion(templateId, versionId),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: notificationTemplateKeys.detail(templateId) });
      queryClient.invalidateQueries({ queryKey: notificationTemplateKeys.versions(templateId) });
      message.success('版本回滚成功');
    },
    onError: () => {
      message.error('回滚失败');
    },
  });
};

/**
 * 预览模板 Mutation
 */
export const usePreviewTemplate = () => {
  return useMutation({
    mutationFn: ({ templateId, variables }: { templateId: string; variables: Record<string, any> }) =>
      notificationTemplateService.previewTemplate(templateId, variables),
    onError: () => {
      message.error('预览失败');
    },
  });
};

/**
 * 组合 Hook - 用于通知模板列表页面
 * 提供完整的 CRUD 功能和状态管理
 */
export const useNotificationTemplates = (
  params?: PaginationParams & { type?: string; isActive?: boolean }
) => {
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplate | null>(null);

  // 查询
  const { data, isLoading } = useNotificationTemplateList(params);

  // Mutations
  const createMutation = useCreateNotificationTemplate();
  const updateMutation = useUpdateNotificationTemplate();
  const deleteMutation = useDeleteNotificationTemplate();
  const toggleMutation = useToggleNotificationTemplate();

  // Handlers
  const handleCreate = useCallback(() => {
    setEditingTemplate(null);
    form.resetFields();
    form.setFieldsValue({ language: 'zh-CN', isActive: true, channels: ['websocket'] });
    setIsModalVisible(true);
  }, [form]);

  const handleEdit = useCallback(
    (template: NotificationTemplate) => {
      setEditingTemplate(template);
      form.setFieldsValue({
        code: template.code,
        name: template.name,
        type: template.type,
        language: template.language,
        channels: template.channels,
        title: template.title,
        body: template.body,
        contentFormat: template.contentFormat || 'plain',
        emailTemplate: template.emailTemplate,
        smsTemplate: template.smsTemplate,
        description: template.description,
        isActive: template.isActive,
      });
      setIsModalVisible(true);
    },
    [form]
  );

  const handlePreview = useCallback((template: NotificationTemplate) => {
    setPreviewTemplate(template);
    setPreviewModalVisible(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const handleToggle = useCallback(
    (id: string, isActive: boolean) => {
      toggleMutation.mutate({ id, isActive });
    },
    [toggleMutation]
  );

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();

      if (editingTemplate) {
        const data: UpdateNotificationTemplateDto = {
          name: values.name,
          title: values.title,
          body: values.body,
          contentFormat: values.contentFormat,
          emailTemplate: values.emailTemplate,
          smsTemplate: values.smsTemplate,
          channels: values.channels,
          description: values.description,
          isActive: values.isActive,
        };
        await updateMutation.mutateAsync({ id: editingTemplate.id, data });
      } else {
        const data: CreateNotificationTemplateDto = {
          code: values.code,
          name: values.name,
          type: values.type,
          language: values.language,
          channels: values.channels,
          title: values.title,
          body: values.body,
          contentFormat: values.contentFormat || 'plain',
          emailTemplate: values.emailTemplate,
          smsTemplate: values.smsTemplate,
          description: values.description,
          isActive: values.isActive,
        };
        await createMutation.mutateAsync(data);
      }

      setIsModalVisible(false);
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      // Error messages handled by mutations
    }
  }, [form, editingTemplate, createMutation, updateMutation]);

  const handleCancel = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const handlePreviewCancel = useCallback(() => {
    setPreviewModalVisible(false);
  }, []);

  return {
    // Data
    data: data?.data,
    total: data?.total,
    isLoading,

    // Modal state
    isModalVisible,
    previewModalVisible,
    editingTemplate,
    previewTemplate,

    // Form
    form,

    // Mutations
    createMutation,
    updateMutation,
    deleteMutation,
    toggleMutation,

    // Handlers
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
