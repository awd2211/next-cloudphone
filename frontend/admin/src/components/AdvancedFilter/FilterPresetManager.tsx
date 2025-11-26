/**
 * 筛选方案管理组件
 *
 * 提供保存、加载、删除筛选方案的 UI
 */

import React, { memo, useState } from 'react';
import {
  Button,

  Modal,
  Input,
  List,
  Space,
  Tag,
  Popconfirm,
  message,
  Empty,
  Typography,
} from 'antd';
import { SEMANTIC, PRIMARY } from '@/theme';
import {
  SaveOutlined,
  FolderOpenOutlined,
  StarOutlined,
  StarFilled,
  DeleteOutlined,

  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { FilterPreset } from '@/hooks/useFilterPresets';

const { Text } = Typography;
const { TextArea } = Input;

export interface FilterPresetManagerProps<T = Record<string, any>> {
  /** 方案列表 */
  presets: FilterPreset<T>[];

  /** 当前激活的方案 ID */
  activePresetId: string | null;

  /** 保存方案回调 */
  onSave: (name: string, description?: string) => void;

  /** 加载方案回调 */
  onLoad: (presetId: string) => void;

  /** 删除方案回调 */
  onDelete: (presetId: string) => void;

  /** 设置默认方案回调 */
  onSetDefault: (presetId: string | null) => void;

  /** 导入方案回调 */
  onImport?: (presets: FilterPreset<T>[]) => void;

  /** 按钮文案 */
  saveText?: string;
  loadText?: string;
}

/**
 * 筛选方案管理组件
 *
 * @example
 * ```tsx
 * <FilterPresetManager
 *   presets={presets}
 *   activePresetId={activePresetId}
 *   onSave={savePreset}
 *   onLoad={loadPreset}
 *   onDelete={deletePreset}
 *   onSetDefault={setDefaultPreset}
 * />
 * ```
 */
export const FilterPresetManager = memo(
  <T extends Record<string, any> = Record<string, any>>({
    presets,
    activePresetId,
    onSave,
    onLoad,
    onDelete,
    onSetDefault,
    onImport,
    saveText = '保存方案',
    loadText = '加载方案',
  }: FilterPresetManagerProps<T>) => {
    const [saveModalVisible, setSaveModalVisible] = useState(false);
    const [loadModalVisible, setLoadModalVisible] = useState(false);
    const [presetName, setPresetName] = useState('');
    const [presetDescription, setPresetDescription] = useState('');

    // 处理保存方案
    const handleSave = () => {
      if (!presetName.trim()) {
        message.warning('请输入方案名称');
        return;
      }

      onSave(presetName.trim(), presetDescription.trim() || undefined);
      message.success(`方案 "${presetName}" 已保存`);

      // 重置表单
      setPresetName('');
      setPresetDescription('');
      setSaveModalVisible(false);
    };

    // 处理加载方案
    const handleLoad = (presetId: string) => {
      const preset = presets.find((p) => p.id === presetId);
      if (preset) {
        onLoad(presetId);
        message.success(`已加载方案 "${preset.name}"`);
        setLoadModalVisible(false);
      }
    };

    // 处理删除方案
    const handleDelete = (presetId: string) => {
      const preset = presets.find((p) => p.id === presetId);
      onDelete(presetId);
      message.success(`方案 "${preset?.name}" 已删除`);
    };

    // 处理设置默认方案
    const handleSetDefault = (presetId: string) => {
      const preset = presets.find((p) => p.id === presetId);
      const isCurrentDefault = preset?.isDefault;

      if (isCurrentDefault) {
        // 取消默认
        onSetDefault(null);
        message.success('已取消默认方案');
      } else {
        // 设置为默认
        onSetDefault(presetId);
        message.success(`"${preset?.name}" 已设为默认方案`);
      }
    };

    // 处理导出方案
    const handleExport = () => {
      if (presets.length === 0) {
        message.warning('暂无方案可导出');
        return;
      }

      try {
        const exportData = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          presets,
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `filter-presets-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        message.success(`已导出 ${presets.length} 个筛选方案`);
      } catch (error) {
        message.error('导出失败,请重试');
        console.error('Export error:', error);
      }
    };

    // 处理导入方案
    const handleImport = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          const text = await file.text();
          const data = JSON.parse(text);

          // 验证数据格式
          if (!data.presets || !Array.isArray(data.presets)) {
            throw new Error('Invalid format');
          }

          // 验证每个方案的必需字段
          const validPresets = data.presets.filter(
            (p: any) => p.id && p.name && p.filters && p.createdAt
          );

          if (validPresets.length === 0) {
            throw new Error('No valid presets found');
          }

          if (onImport) {
            onImport(validPresets);
            message.success(`成功导入 ${validPresets.length} 个筛选方案`);
          } else {
            message.warning('导入功能未启用');
          }
        } catch (error) {
          message.error('导入失败,请检查文件格式');
          console.error('Import error:', error);
        }
      };

      input.click();
    };

    return (
      <Space>
        <Space.Compact>
          {/* 保存方案按钮 */}
          <Button icon={<SaveOutlined />} onClick={() => setSaveModalVisible(true)}>
            {saveText}
          </Button>

          {/* 加载方案按钮 */}
          <Button icon={<FolderOpenOutlined />} onClick={() => setLoadModalVisible(true)}>
            {loadText} {presets.length > 0 && `(${presets.length})`}
          </Button>
        </Space.Compact>

        <Space.Compact>
          {/* 导出方案按钮 */}
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={presets.length === 0}
          >
            导出
          </Button>

          {/* 导入方案按钮 */}
          {onImport && (
            <Button icon={<UploadOutlined />} onClick={handleImport}>
              导入
            </Button>
          )}
        </Space.Compact>

        {/* 保存方案模态框 */}
        <Modal
          title="保存筛选方案"
          open={saveModalVisible}
          onOk={handleSave}
          onCancel={() => setSaveModalVisible(false)}
          okText="保存"
          cancelText="取消"
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>方案名称 *</Text>
              <Input
                placeholder="例如: 活跃用户、本月订单"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                maxLength={50}
                showCount
                style={{ marginTop: 8 }}
              />
            </div>

            <div>
              <Text strong>方案描述</Text>
              <TextArea
                placeholder="(可选) 描述此方案的用途"
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
                rows={3}
                maxLength={200}
                showCount
                style={{ marginTop: 8 }}
              />
            </div>
          </Space>
        </Modal>

        {/* 加载方案模态框 */}
        <Modal
          title="加载筛选方案"
          open={loadModalVisible}
          onCancel={() => setLoadModalVisible(false)}
          footer={null}
          width={600}
        >
          {presets.length === 0 ? (
            <Empty description="暂无保存的筛选方案" />
          ) : (
            <List
              dataSource={presets}
              renderItem={(preset) => (
                <List.Item
                  key={preset.id}
                  style={{
                    padding: '12px 0',
                    backgroundColor:
                      activePresetId === preset.id ? PRIMARY.bg : 'transparent',
                    borderRadius: 4,
                  }}
                  actions={[
                    <Button
                      key="load"
                      type={activePresetId === preset.id ? 'primary' : 'default'}
                      size="small"
                      onClick={() => handleLoad(preset.id)}
                    >
                      {activePresetId === preset.id ? '当前方案' : '加载'}
                    </Button>,
                    <Button
                      key="default"
                      type="text"
                      size="small"
                      icon={preset.isDefault ? <StarFilled /> : <StarOutlined />}
                      onClick={() => handleSetDefault(preset.id)}
                      style={{ color: preset.isDefault ? SEMANTIC.warning.main : undefined }}
                    />,
                    <Popconfirm
                      key="delete"
                      title="确定删除此方案吗?"
                      onConfirm={() => handleDelete(preset.id)}
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                    >
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{preset.name}</span>
                        {preset.isDefault && <Tag color="gold">默认</Tag>}
                        {activePresetId === preset.id && <Tag color="blue">当前</Tag>}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={4}>
                        {preset.description && <Text type="secondary">{preset.description}</Text>}
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          创建于 {new Date(preset.createdAt).toLocaleString('zh-CN')}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Modal>
      </Space>
    );
  }
) as <T extends Record<string, any> = Record<string, any>>(
  props: FilterPresetManagerProps<T>
) => React.ReactElement;

// Display name for React DevTools
(FilterPresetManager as any).displayName = 'FilterPresetManager';
