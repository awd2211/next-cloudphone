import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDeviceTemplates } from '../useDeviceTemplates';
import * as templateConfig from '@/utils/templateConfig';
import { message } from 'antd';

// Mock antd
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  const mockForm = {
    resetFields: vi.fn(),
    validateFields: vi.fn(),
    setFieldsValue: vi.fn(),
    getFieldsValue: vi.fn(),
  };
  return {
    ...actual,
    Form: {
      useForm: vi.fn(() => [mockForm]),
    },
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock template config
vi.mock('@/utils/templateConfig', async () => {
  const actual = await vi.importActual('@/utils/templateConfig');
  return {
    ...actual,
    calculateStats: vi.fn(),
    generateDefaultPrefix: vi.fn(),
  };
});

describe('useDeviceTemplates Hook', () => {
  const mockTemplates = [
    {
      id: 'template-1',
      name: '基础模板',
      isSystem: true,
      isFavorite: false,
      usageCount: 10,
    },
    {
      id: 'template-2',
      name: '高配模板',
      isSystem: false,
      isFavorite: true,
      usageCount: 5,
    },
  ];

  const mockStats = {
    total: 2,
    system: 1,
    custom: 1,
    favorite: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(templateConfig.calculateStats).mockReturnValue(mockStats as any);
    vi.mocked(templateConfig.generateDefaultPrefix).mockReturnValue('device');
  });

  describe('初始化', () => {
    it('应该初始化所有状态', () => {
      const { result } = renderHook(() => useDeviceTemplates());

      expect(result.current.templates).toEqual([]);
      expect(typeof result.current.loading).toBe('boolean');
      expect(result.current.createModalVisible).toBe(false);
      expect(result.current.useTemplateModalVisible).toBe(false);
      expect(result.current.detailModalVisible).toBe(false);
      expect(result.current.selectedTemplate).toBeNull();
      expect(result.current.form).toBeDefined();
      expect(result.current.useTemplateForm).toBeDefined();
    });
  });

  describe('数据加载', () => {
    it('mount时应该加载模板列表', async () => {
      renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(templateConfig.calculateStats).toHaveBeenCalled();
      });
    });

    it('加载成功应该更新templates', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });
    });
  });

  describe('计算属性', () => {
    it('stats应该通过calculateStats计算', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      expect(result.current.stats).toEqual(mockStats);
    });

    it('未选择模板时isEditing应该为false', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      expect(result.current.isEditing).toBe(false);
    });

    it('选择模板后isEditing应该为true', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      const template = result.current.templates[0];

      act(() => {
        result.current.tableHandlers.onEdit(template);
      });

      expect(result.current.isEditing).toBe(true);
    });
  });

  describe('handleToggleFavorite 切换收藏', () => {
    it('应该切换模板的收藏状态', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      const templateId = result.current.templates[0].id;
      const initialFavorite = result.current.templates[0].isFavorite;

      act(() => {
        result.current.tableHandlers.onToggleFavorite(templateId);
      });

      const updatedTemplate = result.current.templates.find((t: any) => t.id === templateId);
      expect(updatedTemplate?.isFavorite).toBe(!initialFavorite);
    });

    it('切换成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      const templateId = result.current.templates[0].id;

      act(() => {
        result.current.tableHandlers.onToggleFavorite(templateId);
      });

      expect(message.success).toHaveBeenCalledWith('操作成功');
    });
  });

  describe('handleCreate 创建模板', () => {
    it('应该打开创建弹窗', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleCreate();
      });

      expect(result.current.createModalVisible).toBe(true);
    });

    it('应该重置表单', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleCreate();
      });

      expect(result.current.form.resetFields).toHaveBeenCalled();
    });

    it('应该清空selectedTemplate', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      // 先选择一个模板
      act(() => {
        result.current.tableHandlers.onEdit(result.current.templates[0]);
      });

      expect(result.current.selectedTemplate).not.toBeNull();

      // 创建新模板
      act(() => {
        result.current.handleCreate();
      });

      expect(result.current.selectedTemplate).toBeNull();
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useDeviceTemplates());

      const firstHandle = result.current.handleCreate;
      rerender();
      const secondHandle = result.current.handleCreate;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleEdit 编辑模板', () => {
    it('应该设置selectedTemplate', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      const template = result.current.templates[0];

      act(() => {
        result.current.tableHandlers.onEdit(template);
      });

      expect(result.current.selectedTemplate).toEqual(template);
    });

    it('应该打开创建弹窗', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      const template = result.current.templates[0];

      act(() => {
        result.current.tableHandlers.onEdit(template);
      });

      expect(result.current.createModalVisible).toBe(true);
    });

    it('应该设置表单值', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      const template = result.current.templates[0];

      act(() => {
        result.current.tableHandlers.onEdit(template);
      });

      expect(result.current.form.setFieldsValue).toHaveBeenCalledWith(template);
    });
  });

  describe('handleSubmitCreate 提交创建/编辑', () => {
    it('创建模式应该添加新模板', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      vi.mocked(result.current.form.validateFields).mockResolvedValue({
        name: '新模板',
      } as any);

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      const initialCount = result.current.templates.length;

      act(() => {
        result.current.handleCreate();
      });

      await act(async () => {
        await result.current.handleSubmitCreate();
      });

      await waitFor(() => {
        expect(result.current.templates.length).toBe(initialCount + 1);
      });
    });

    it('创建成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      vi.mocked(result.current.form.validateFields).mockResolvedValue({
        name: '新模板',
      } as any);

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleCreate();
      });

      await act(async () => {
        await result.current.handleSubmitCreate();
      });

      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('模板创建成功');
      });
    });

    it('编辑模式应该更新现有模板', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      vi.mocked(result.current.form.validateFields).mockResolvedValue({
        name: '更新后的名称',
      } as any);

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      const templateToEdit = result.current.templates[0];

      act(() => {
        result.current.tableHandlers.onEdit(templateToEdit);
      });

      await act(async () => {
        await result.current.handleSubmitCreate();
      });

      await waitFor(() => {
        const updated = result.current.templates.find((t: any) => t.id === templateToEdit.id);
        expect(updated?.name).toBe('更新后的名称');
      });
    });

    it('编辑成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      vi.mocked(result.current.form.validateFields).mockResolvedValue({
        name: '更新后的名称',
      } as any);

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      const templateToEdit = result.current.templates[0];

      act(() => {
        result.current.tableHandlers.onEdit(templateToEdit);
      });

      await act(async () => {
        await result.current.handleSubmitCreate();
      });

      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('模板更新成功');
      });
    });

    it('提交成功应该关闭弹窗', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      vi.mocked(result.current.form.validateFields).mockResolvedValue({
        name: '新模板',
      } as any);

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleCreate();
      });

      expect(result.current.createModalVisible).toBe(true);

      await act(async () => {
        await result.current.handleSubmitCreate();
      });

      await waitFor(() => {
        expect(result.current.createModalVisible).toBe(false);
      });
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useDeviceTemplates());

      const firstHandle = result.current.handleSubmitCreate;
      rerender();
      const secondHandle = result.current.handleSubmitCreate;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleDelete 删除模板', () => {
    it('删除成功应该从列表中移除', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      const templateId = result.current.templates[0].id;
      const initialCount = result.current.templates.length;

      await act(async () => {
        await result.current.tableHandlers.onDelete(templateId);
      });

      await waitFor(() => {
        expect(result.current.templates.length).toBe(initialCount - 1);
      });

      const deleted = result.current.templates.find((t: any) => t.id === templateId);
      expect(deleted).toBeUndefined();
    });

    it('删除成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      const templateId = result.current.templates[0].id;

      await act(async () => {
        await result.current.tableHandlers.onDelete(templateId);
      });

      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('模板删除成功');
      });
    });
  });

  describe('handleUseTemplate 使用模板', () => {
    it('应该设置selectedTemplate', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      const template = result.current.templates[0];

      act(() => {
        result.current.tableHandlers.onUseTemplate(template);
      });

      expect(result.current.selectedTemplate).toEqual(template);
    });

    it('应该打开使用模板弹窗', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      const template = result.current.templates[0];

      act(() => {
        result.current.tableHandlers.onUseTemplate(template);
      });

      expect(result.current.useTemplateModalVisible).toBe(true);
    });

    it('应该重置并设置useTemplateForm', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      const template = result.current.templates[0];

      act(() => {
        result.current.tableHandlers.onUseTemplate(template);
      });

      expect(result.current.useTemplateForm.resetFields).toHaveBeenCalled();
      expect(result.current.useTemplateForm.setFieldsValue).toHaveBeenCalledWith({
        count: 1,
        namePrefix: 'device',
      });
    });
  });

  describe('handleSubmitUseTemplate 提交批量创建', () => {
    it('创建成功应该更新usageCount', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      vi.mocked(result.current.useTemplateForm.validateFields).mockResolvedValue({
        count: 3,
        namePrefix: 'test',
      } as any);

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      const template = result.current.templates[0];
      const initialUsageCount = template.usageCount;

      act(() => {
        result.current.tableHandlers.onUseTemplate(template);
      });

      await act(async () => {
        await result.current.handleSubmitUseTemplate();
      });

      await waitFor(() => {
        const updated = result.current.templates.find((t: any) => t.id === template.id);
        expect(updated?.usageCount).toBe(initialUsageCount + 3);
      });
    });

    it('创建成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      vi.mocked(result.current.useTemplateForm.validateFields).mockResolvedValue({
        count: 3,
        namePrefix: 'test',
      } as any);

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      const template = result.current.templates[0];

      act(() => {
        result.current.tableHandlers.onUseTemplate(template);
      });

      await act(async () => {
        await result.current.handleSubmitUseTemplate();
      });

      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('成功创建 3 台设备');
      });
    });

    it('创建成功应该关闭弹窗', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      vi.mocked(result.current.useTemplateForm.validateFields).mockResolvedValue({
        count: 1,
        namePrefix: 'test',
      } as any);

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      const template = result.current.templates[0];

      act(() => {
        result.current.tableHandlers.onUseTemplate(template);
      });

      expect(result.current.useTemplateModalVisible).toBe(true);

      await act(async () => {
        await result.current.handleSubmitUseTemplate();
      });

      await waitFor(() => {
        expect(result.current.useTemplateModalVisible).toBe(false);
      });
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useDeviceTemplates());

      const firstHandle = result.current.handleSubmitUseTemplate;
      rerender();
      const secondHandle = result.current.handleSubmitUseTemplate;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleViewDetail 查看详情', () => {
    it('应该设置selectedTemplate', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      const template = result.current.templates[0];

      act(() => {
        result.current.tableHandlers.onViewDetail(template);
      });

      expect(result.current.selectedTemplate).toEqual(template);
    });

    it('应该打开详情弹窗', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      const template = result.current.templates[0];

      act(() => {
        result.current.tableHandlers.onViewDetail(template);
      });

      expect(result.current.detailModalVisible).toBe(true);
    });
  });

  describe('Modal 控制', () => {
    it('hideCreateModal应该关闭创建弹窗', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleCreate();
        result.current.hideCreateModal();
      });

      expect(result.current.createModalVisible).toBe(false);
    });

    it('hideUseTemplateModal应该关闭使用模板弹窗', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.tableHandlers.onUseTemplate(result.current.templates[0]);
        result.current.hideUseTemplateModal();
      });

      expect(result.current.useTemplateModalVisible).toBe(false);
    });

    it('hideDetailModal应该关闭详情弹窗', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.tableHandlers.onViewDetail(result.current.templates[0]);
        result.current.hideDetailModal();
      });

      expect(result.current.detailModalVisible).toBe(false);
    });

    it('Modal控制函数应该是稳定的引用', () => {
      const { result, rerender } = renderHook(() => useDeviceTemplates());

      const firstHideCreate = result.current.hideCreateModal;
      const firstHideUse = result.current.hideUseTemplateModal;
      const firstHideDetail = result.current.hideDetailModal;

      rerender();

      expect(result.current.hideCreateModal).toBe(firstHideCreate);
      expect(result.current.hideUseTemplateModal).toBe(firstHideUse);
      expect(result.current.hideDetailModal).toBe(firstHideDetail);
    });
  });

  describe('tableHandlers', () => {
    it('应该包含所有操作处理器', async () => {
      const { result } = renderHook(() => useDeviceTemplates());

      await waitFor(() => {
        expect(result.current.templates.length).toBeGreaterThan(0);
      });

      expect(result.current.tableHandlers).toHaveProperty('onViewDetail');
      expect(result.current.tableHandlers).toHaveProperty('onToggleFavorite');
      expect(result.current.tableHandlers).toHaveProperty('onUseTemplate');
      expect(result.current.tableHandlers).toHaveProperty('onEdit');
      expect(result.current.tableHandlers).toHaveProperty('onDelete');
    });

    it('应该是稳定的对象引用', () => {
      const { result, rerender } = renderHook(() => useDeviceTemplates());

      const firstHandlers = result.current.tableHandlers;
      rerender();
      const secondHandlers = result.current.tableHandlers;

      expect(firstHandlers).toBe(secondHandlers);
    });
  });
});
