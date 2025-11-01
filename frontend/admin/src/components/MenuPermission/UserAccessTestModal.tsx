/**
 * UserAccessTestModal - 用户访问测试弹窗组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Modal, Space, Input, Button, Divider, Spin, Empty, Tree } from 'antd';
import type { MenuItem } from '@/types';
import { convertToTreeData } from './convertToTreeData';

interface UserAccessTestModalProps {
  visible: boolean;
  testUserId: string;
  testUserMenus: MenuItem[];
  testLoading: boolean;
  onClose: () => void;
  onUserIdChange: (value: string) => void;
  onLoadUserMenus: () => void;
}

/**
 * UserAccessTestModal 组件
 * 测试用户菜单访问权限
 */
export const UserAccessTestModal = memo<UserAccessTestModalProps>(
  ({
    visible,
    testUserId,
    testUserMenus,
    testLoading,
    onClose,
    onUserIdChange,
    onLoadUserMenus,
  }) => {
    return (
      <Modal
        title="测试用户菜单访问"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={700}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Input
              placeholder="输入用户ID"
              value={testUserId}
              onChange={(e) => onUserIdChange(e.target.value)}
              style={{ width: 300 }}
            />
            <Button type="primary" onClick={onLoadUserMenus} loading={testLoading}>
              加载菜单
            </Button>
          </Space>

          <Divider style={{ margin: '16px 0' }} />

          <Spin spinning={testLoading}>
            {testUserMenus.length > 0 ? (
              <div>
                <p>
                  <strong>该用户可访问的菜单：</strong>
                </p>
                <Tree showIcon defaultExpandAll treeData={convertToTreeData(testUserMenus)} />
              </div>
            ) : (
              <Empty description="请输入用户ID并加载" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Spin>
        </Space>
      </Modal>
    );
  }
);

UserAccessTestModal.displayName = 'UserAccessTestModal';
