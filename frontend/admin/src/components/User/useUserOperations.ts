import { useCallback } from 'react';
import { Modal, message, type FormInstance } from 'antd';
import type { User, CreateUserDto, UpdateUserDto } from '@/types';
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useToggleUserStatus,
} from '@/hooks/useUsers';
import * as userService from '@/services/user';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import type { EnhancedError } from '@/components/EnhancedErrorAlert';

interface UseUserOperationsProps {
  form: FormInstance;
  editForm: FormInstance;
  balanceForm: FormInstance;
  resetPasswordForm: FormInstance;
  selectedUser: User | null;
  balanceType: 'recharge' | 'deduct';
  selectedRowKeys: string[];
  onCreateModalClose: () => void;
  onEditModalClose: () => void;
  onBalanceModalClose: () => void;
  onResetPasswordModalClose: () => void;
  onSelectionChange: (keys: string[]) => void;
  onBalanceError: (error: EnhancedError | null) => void;
}

export const useUserOperations = ({
  form,
  editForm,
  balanceForm,
  resetPasswordForm,
  selectedUser,
  balanceType,
  selectedRowKeys,
  onCreateModalClose,
  onEditModalClose,
  onBalanceModalClose,
  onResetPasswordModalClose,
  onSelectionChange,
  onBalanceError,
}: UseUserOperationsProps) => {
  // Mutations
  const createMutation = useCreateUser();
  const deleteMutation = useDeleteUser();
  const updateMutation = useUpdateUser();
  const toggleStatusMutation = useToggleUserStatus();
  const { execute: executeBalanceOperation } = useAsyncOperation();

  // 创建用户
  const handleCreate = useCallback(
    async (values: CreateUserDto) => {
      await createMutation.mutateAsync(values);
      onCreateModalClose();
      form.resetFields();
    },
    [createMutation, form, onCreateModalClose]
  );

  // 更新用户
  const handleUpdate = useCallback(
    async (values: UpdateUserDto) => {
      if (!selectedUser) return;
      await updateMutation.mutateAsync({ id: selectedUser.id, data: values });
      onEditModalClose();
      editForm.resetFields();
    },
    [selectedUser, updateMutation, editForm, onEditModalClose]
  );

  // 删除用户
  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  // 更新用户状态
  const handleUpdateStatus = useCallback(
    async (id: string, status: 'active' | 'inactive' | 'banned') => {
      await updateMutation.mutateAsync({ id, data: { status } });
    },
    [updateMutation]
  );

  // 余额操作
  const handleBalanceOperation = useCallback(
    async (values: { amount: number; reason?: string }) => {
      if (!selectedUser) return;

      onBalanceError(null);

      await executeBalanceOperation(
        async () => {
          if (balanceType === 'recharge') {
            await userService.rechargeBalance(selectedUser.id, values.amount);
          } else {
            await userService.deductBalance(
              selectedUser.id,
              values.amount,
              values.reason || '管理员扣减'
            );
          }
        },
        {
          successMessage: balanceType === 'recharge' ? '充值成功' : '扣减成功',
          errorContext: balanceType === 'recharge' ? '余额充值' : '余额扣减',
          showErrorMessage: false,
          onSuccess: () => {
            onBalanceModalClose();
            balanceForm.resetFields();
            // 触发缓存失效
            createMutation.mutate({} as any, {
              onSuccess: () => {},
            });
          },
          onError: (error: any) => {
            const response = error.response?.data;
            onBalanceError({
              message: response?.message || '操作失败',
              userMessage:
                response?.userMessage ||
                (balanceType === 'recharge' ? '充值失败，请稍后重试' : '扣减失败，请稍后重试'),
              code: response?.errorCode || error.response?.status?.toString(),
              requestId: response?.requestId,
              recoverySuggestions: response?.recoverySuggestions || [
                {
                  action: '检查余额',
                  description:
                    balanceType === 'deduct' ? '确认用户余额是否充足' : '确认充值金额是否正确',
                },
                {
                  action: '重试',
                  description: '稍后重试操作',
                },
                {
                  action: '联系技术支持',
                  description: '如果问题持续，请联系技术支持',
                  actionUrl: '/support',
                },
              ],
              retryable: true,
            });
          },
        }
      );
    },
    [
      selectedUser,
      balanceType,
      balanceForm,
      createMutation,
      executeBalanceOperation,
      onBalanceError,
      onBalanceModalClose,
    ]
  );

  // 重置密码
  const handleResetPassword = useCallback(
    async (values: { newPassword: string }) => {
      if (!selectedUser) return;
      try {
        await userService.changePassword(selectedUser.id, {
          oldPassword: '',
          newPassword: values.newPassword,
        });
        message.success('密码重置成功');
        onResetPasswordModalClose();
        resetPasswordForm.resetFields();
      } catch (error: any) {
        message.error(`密码重置失败: ${error.response?.data?.message || error.message}`);
      }
    },
    [selectedUser, resetPasswordForm, onResetPasswordModalClose]
  );

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请至少选择一个用户');
      return;
    }
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个用户吗？此操作不可恢复！`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await Promise.all(selectedRowKeys.map((id) => deleteMutation.mutateAsync(id)));
          message.success(`成功删除 ${selectedRowKeys.length} 个用户`);
          onSelectionChange([]);
        } catch (error: any) {
          message.error(`批量删除失败: ${error.response?.data?.message || error.message}`);
        }
      },
    });
  }, [selectedRowKeys, deleteMutation, onSelectionChange]);

  // 批量修改状态
  const handleBatchUpdateStatus = useCallback(
    async (status: 'active' | 'inactive' | 'banned') => {
      if (selectedRowKeys.length === 0) {
        message.warning('请至少选择一个用户');
        return;
      }
      try {
        await Promise.all(
          selectedRowKeys.map((id) => updateMutation.mutateAsync({ id, data: { status } }))
        );
        message.success(`成功修改 ${selectedRowKeys.length} 个用户状态`);
        onSelectionChange([]);
      } catch (error: any) {
        message.error(`批量修改状态失败: ${error.response?.data?.message || error.message}`);
      }
    },
    [selectedRowKeys, updateMutation, onSelectionChange]
  );

  // 批量分配角色
  const handleBatchAssignRoles = useCallback(
    (roleIds: string[]) => {
      if (selectedRowKeys.length === 0) {
        message.warning('请至少选择一个用户');
        return;
      }
      Modal.confirm({
        title: '确认批量分配角色',
        content: `确定要为选中的 ${selectedRowKeys.length} 个用户分配角色吗？`,
        okText: '确定',
        cancelText: '取消',
        onOk: async () => {
          try {
            await Promise.all(
              selectedRowKeys.map((id) => updateMutation.mutateAsync({ id, data: { roleIds } }))
            );
            message.success(`成功为 ${selectedRowKeys.length} 个用户分配角色`);
            onSelectionChange([]);
          } catch (error: any) {
            message.error(`批量分配角色失败: ${error.response?.data?.message || error.message}`);
          }
        },
      });
    },
    [selectedRowKeys, updateMutation, onSelectionChange]
  );

  return {
    handleCreate,
    handleUpdate,
    handleDelete,
    handleUpdateStatus,
    handleBalanceOperation,
    handleResetPassword,
    handleBatchDelete,
    handleBatchUpdateStatus,
    handleBatchAssignRoles,
  };
};
