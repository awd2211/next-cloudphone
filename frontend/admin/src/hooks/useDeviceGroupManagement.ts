import { useDeviceGroups } from './useDeviceGroups';
import { useBatchOperation } from './useBatchOperation';
import { useDeviceGroupTableColumns } from '@/components/DeviceGroup/DeviceGroupTableColumns';

/**
 * 设备分组管理业务逻辑
 *
 * 整合设备分组管理和批量操作功能
 */
export const useDeviceGroupManagement = () => {
  // 分组管理
  const {
    groups,
    loading,
    modalVisible,
    editingGroup,
    form,
    openModal,
    handleSubmit,
    handleDelete,
    setModalVisible,
  } = useDeviceGroups();

  // 批量操作
  const {
    batchOpVisible,
    selectedGroup,
    batchProgress,
    batchForm,
    openBatchOperation,
    handleBatchOperation,
    setBatchOpVisible,
  } = useBatchOperation();

  // 表格列配置
  const columns = useDeviceGroupTableColumns({
    onBatchOperation: openBatchOperation,
    onEdit: openModal,
    onDelete: handleDelete,
  });

  return {
    // 分组数据
    groups,
    loading,

    // 分组管理模态框
    modalVisible,
    editingGroup: !!editingGroup,
    form,
    setModalVisible,
    openModal,
    handleSubmit,

    // 批量操作模态框
    batchOpVisible,
    selectedGroup,
    batchProgress,
    batchForm,
    setBatchOpVisible,
    handleBatchOperation,

    // 表格列
    columns,
  };
};
