import React, { memo, useState, useCallback } from 'react';
import {
  Space,
  Button,
  Dropdown,
  Tooltip,
  Badge,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  PlusOutlined,
  ScanOutlined,
  SettingOutlined,
  AppstoreOutlined,
  FileExcelOutlined,
  ThunderboltOutlined,
  DownOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { QuickRegisterWizard, type RegisterDeviceValues } from './QuickRegisterWizard';
import { CsvImportModal, type CsvDeviceRow } from './CsvImportModal';
import { DeviceTemplateManager, type DeviceTemplate } from './DeviceTemplateManager';

interface PhysicalDeviceToolbarProps {
  onScanNetwork?: () => void;
  onManualRegister?: () => void;
  onRefresh?: () => void;
  onDeviceCreated?: () => void;
  isLoading?: boolean;
  selectedCount?: number;
  onBatchAction?: (action: string) => void;
}

/**
 * 物理设备管理工具栏
 *
 * 功能：
 * 1. 快速注册向导入口
 * 2. CSV 批量导入入口
 * 3. 模板管理入口
 * 4. 网络扫描
 * 5. 批量操作菜单
 */
export const PhysicalDeviceToolbar = memo<PhysicalDeviceToolbarProps>(
  ({
    onScanNetwork,
    onManualRegister,
    onRefresh,
    onDeviceCreated,
    isLoading = false,
    selectedCount = 0,
    onBatchAction,
  }) => {
    const [showWizard, setShowWizard] = useState(false);
    const [showCsvImport, setShowCsvImport] = useState(false);
    const [showTemplateManager, setShowTemplateManager] = useState(false);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [wizardLoading, setWizardLoading] = useState(false);

    // 快速注册完成回调
    const handleWizardFinish = useCallback(
      async (values: RegisterDeviceValues) => {
        setWizardLoading(true);
        try {
          console.log('注册设备:', values);
          // TODO: 调用 API 注册设备
          // await api.physicalDevices.register(values);
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 模拟 API
          message.success('设备注册成功');
          onDeviceCreated?.();
          setShowWizard(false);
        } catch (error) {
          message.error('设备注册失败');
        } finally {
          setWizardLoading(false);
        }
      },
      [onDeviceCreated]
    );

    // CSV 导入回调
    const handleCsvImport = useCallback(
      async (devices: CsvDeviceRow[]) => {
        console.log('导入设备:', devices);
        // TODO: 调用 API 批量导入
        // await api.physicalDevices.batchImport(devices);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 模拟 API
        message.success(`成功导入 ${devices.length} 台设备`);
        onDeviceCreated?.();
        return { success: devices.length, failed: 0 };
      },
      [onDeviceCreated]
    );

    // 选择模板后的回调
    const handleSelectTemplate = useCallback((template: DeviceTemplate) => {
      console.log('选择模板:', template);
      setShowTemplateSelector(false);
      setShowWizard(true);
      message.info(`已应用模板: ${template.name}`);
    }, []);

    // 添加设备菜单
    const addDeviceMenuItems: MenuProps['items'] = [
      {
        key: 'quick-register',
        icon: <ThunderboltOutlined />,
        label: '快速注册向导',
        onClick: () => setShowWizard(true),
      },
      {
        key: 'use-template',
        icon: <AppstoreOutlined />,
        label: '从模板创建',
        onClick: () => setShowTemplateSelector(true),
      },
      {
        type: 'divider',
      },
      {
        key: 'scan-network',
        icon: <ScanOutlined />,
        label: '扫描网络设备',
        onClick: onScanNetwork,
      },
      {
        key: 'csv-import',
        icon: <FileExcelOutlined />,
        label: 'CSV 批量导入',
        onClick: () => setShowCsvImport(true),
      },
    ];

    // 批量操作菜单
    const batchActionMenuItems: MenuProps['items'] = [
      {
        key: 'connect-all',
        label: '批量连接',
        onClick: () => onBatchAction?.('connect'),
      },
      {
        key: 'disconnect-all',
        label: '批量断开',
        onClick: () => onBatchAction?.('disconnect'),
      },
      {
        key: 'health-check',
        label: '健康检查',
        onClick: () => onBatchAction?.('health-check'),
      },
      {
        type: 'divider',
      },
      {
        key: 'delete-all',
        label: '批量删除',
        danger: true,
        onClick: () => onBatchAction?.('delete'),
      },
    ];

    return (
      <>
        <Space style={{ marginBottom: '16px' }} wrap>
          {/* 添加设备下拉菜单 */}
          <Dropdown menu={{ items: addDeviceMenuItems }} trigger={['click']}>
            <Button type="primary" icon={<PlusOutlined />}>
              添加设备 <DownOutlined />
            </Button>
          </Dropdown>

          {/* 模板管理 */}
          <Tooltip title="管理设备模板">
            <Button
              icon={<AppstoreOutlined />}
              onClick={() => setShowTemplateManager(true)}
            >
              模板管理
            </Button>
          </Tooltip>

          {/* 刷新按钮 */}
          {onRefresh && (
            <Tooltip title="刷新设备列表">
              <Button
                icon={<ReloadOutlined spin={isLoading} />}
                onClick={onRefresh}
                loading={isLoading}
              >
                刷新
              </Button>
            </Tooltip>
          )}

          {/* 批量操作（有选中时显示） */}
          {selectedCount > 0 && (
            <Dropdown menu={{ items: batchActionMenuItems }} trigger={['click']}>
              <Badge count={selectedCount} size="small" offset={[-5, 0]}>
                <Button icon={<SettingOutlined />}>
                  批量操作 <DownOutlined />
                </Button>
              </Badge>
            </Dropdown>
          )}
        </Space>

        {/* 快速注册向导 */}
        <QuickRegisterWizard
          visible={showWizard}
          onCancel={() => setShowWizard(false)}
          onFinish={handleWizardFinish}
          isLoading={wizardLoading}
        />

        {/* CSV 导入模态框 */}
        <CsvImportModal
          visible={showCsvImport}
          onCancel={() => setShowCsvImport(false)}
          onImport={handleCsvImport}
        />

        {/* 模板管理器 */}
        <DeviceTemplateManager
          visible={showTemplateManager}
          onCancel={() => setShowTemplateManager(false)}
        />

        {/* 模板选择器（选择模式） */}
        <DeviceTemplateManager
          visible={showTemplateSelector}
          onCancel={() => setShowTemplateSelector(false)}
          onSelectTemplate={handleSelectTemplate}
          selectionMode
        />
      </>
    );
  }
);

PhysicalDeviceToolbar.displayName = 'PhysicalDeviceToolbar';
