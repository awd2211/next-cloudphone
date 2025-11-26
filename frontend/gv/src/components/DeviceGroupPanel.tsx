/**
 * 设备分组面板组件
 *
 * 功能：
 * - 创建、编辑、删除设备分组
 * - 将设备添加到分组
 * - 按分组筛选设备
 * - 分组颜色标识
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Card,
  Tree,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  ColorPicker,
  Empty,
  Badge,
  Tooltip,
  Dropdown,
  Typography,
  Popconfirm,
  message,
} from 'antd';
import type { TreeDataNode, MenuProps } from 'antd';
import type { Color } from 'antd/es/color-picker';
import {
  FolderOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  MobileOutlined,
  TeamOutlined,
  InboxOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useTheme } from '@/contexts/ThemeContext';

const { Text } = Typography;

// 分组数据类型
export interface DeviceGroup {
  id: string;
  name: string;
  color: string;
  deviceCount: number;
  description?: string;
  createdAt: string;
}

interface DeviceGroupPanelProps {
  groups: DeviceGroup[];
  selectedGroupId?: string;
  onSelectGroup: (groupId: string | undefined) => void;
  onCreateGroup: (group: Omit<DeviceGroup, 'id' | 'deviceCount' | 'createdAt'>) => void;
  onEditGroup: (group: DeviceGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  totalDeviceCount: number;
}

// 预设颜色
const PRESET_COLORS = [
  '#1677ff', // 蓝色
  '#52c41a', // 绿色
  '#faad14', // 橙色
  '#722ed1', // 紫色
  '#eb2f96', // 粉色
  '#f5222d', // 红色
  '#13c2c2', // 青色
  '#fa8c16', // 琥珀色
];

const DeviceGroupPanel: React.FC<DeviceGroupPanelProps> = ({
  groups,
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
  totalDeviceCount,
}) => {
  const { isDark } = useTheme();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DeviceGroup | null>(null);
  const [form] = Form.useForm();

  // 打开创建分组弹窗
  const handleOpenCreate = useCallback(() => {
    form.resetFields();
    form.setFieldsValue({ color: PRESET_COLORS[groups.length % PRESET_COLORS.length] });
    setCreateModalVisible(true);
  }, [form, groups.length]);

  // 打开编辑分组弹窗
  const handleOpenEdit = useCallback((group: DeviceGroup) => {
    setEditingGroup(group);
    form.setFieldsValue({
      name: group.name,
      color: group.color,
      description: group.description,
    });
    setEditModalVisible(true);
  }, [form]);

  // 创建分组
  const handleCreate = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const color = typeof values.color === 'string' ? values.color : values.color.toHexString();
      onCreateGroup({
        name: values.name,
        color,
        description: values.description,
      });
      setCreateModalVisible(false);
      form.resetFields();
      message.success('分组创建成功');
    } catch (error) {
      // 表单验证失败
    }
  }, [form, onCreateGroup]);

  // 编辑分组
  const handleEdit = useCallback(async () => {
    if (!editingGroup) return;
    try {
      const values = await form.validateFields();
      const color = typeof values.color === 'string' ? values.color : values.color.toHexString();
      onEditGroup({
        ...editingGroup,
        name: values.name,
        color,
        description: values.description,
      });
      setEditModalVisible(false);
      setEditingGroup(null);
      form.resetFields();
      message.success('分组已更新');
    } catch (error) {
      // 表单验证失败
    }
  }, [form, editingGroup, onEditGroup]);

  // 删除分组
  const handleDelete = useCallback((groupId: string) => {
    onDeleteGroup(groupId);
    if (selectedGroupId === groupId) {
      onSelectGroup(undefined);
    }
    message.success('分组已删除');
  }, [selectedGroupId, onSelectGroup, onDeleteGroup]);

  // 获取分组图标
  const getGroupIcon = (group: DeviceGroup, isSelected: boolean) => {
    return isSelected ? (
      <FolderOpenOutlined style={{ color: group.color }} />
    ) : (
      <FolderOutlined style={{ color: group.color }} />
    );
  };

  // 构建树形数据
  const treeData: TreeDataNode[] = useMemo(() => {
    const data: TreeDataNode[] = [
      {
        key: 'all',
        title: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Space>
              <AppstoreOutlined style={{ color: '#1677ff' }} />
              <span>全部设备</span>
            </Space>
            <Badge count={totalDeviceCount} showZero style={{ backgroundColor: '#1677ff' }} />
          </div>
        ),
        icon: <AppstoreOutlined />,
      },
      {
        key: 'ungrouped',
        title: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Space>
              <InboxOutlined style={{ color: '#999' }} />
              <span style={{ color: '#999' }}>未分组</span>
            </Space>
            <Badge
              count={totalDeviceCount - groups.reduce((sum, g) => sum + g.deviceCount, 0)}
              showZero
              style={{ backgroundColor: '#999' }}
            />
          </div>
        ),
        icon: <InboxOutlined />,
      },
    ];

    // 添加分组
    groups.forEach((group) => {
      const isSelected = selectedGroupId === group.id;

      const menuItems: MenuProps['items'] = [
        {
          key: 'edit',
          icon: <EditOutlined />,
          label: '编辑分组',
          onClick: () => handleOpenEdit(group),
        },
        {
          type: 'divider',
        },
        {
          key: 'delete',
          icon: <DeleteOutlined />,
          label: '删除分组',
          danger: true,
          onClick: () => {
            Modal.confirm({
              title: '删除分组',
              content: `确定要删除分组「${group.name}」吗？设备不会被删除，只会变为未分组状态。`,
              okText: '删除',
              okButtonProps: { danger: true },
              cancelText: '取消',
              onOk: () => handleDelete(group.id),
            });
          },
        },
      ];

      data.push({
        key: group.id,
        title: (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <Space>
              {getGroupIcon(group, isSelected)}
              <span>{group.name}</span>
            </Space>
            <Space size={4}>
              <Badge count={group.deviceCount} showZero style={{ backgroundColor: group.color }} />
              <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                <Button
                  type="text"
                  size="small"
                  icon={<MoreOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Dropdown>
            </Space>
          </div>
        ),
        icon: getGroupIcon(group, isSelected),
      });
    });

    return data;
  }, [groups, selectedGroupId, totalDeviceCount, handleOpenEdit, handleDelete]);

  // 处理选择
  const handleSelect = useCallback(
    (selectedKeys: React.Key[]) => {
      const key = selectedKeys[0];
      if (key === 'all') {
        onSelectGroup(undefined);
      } else if (key === 'ungrouped') {
        onSelectGroup('ungrouped');
      } else if (typeof key === 'string') {
        onSelectGroup(key);
      }
    },
    [onSelectGroup]
  );

  // 获取选中的 key
  const selectedKeys = useMemo(() => {
    if (!selectedGroupId) return ['all'];
    return [selectedGroupId];
  }, [selectedGroupId]);

  return (
    <>
      <Card
        title={
          <Space>
            <TeamOutlined />
            <span>设备分组</span>
          </Space>
        }
        extra={
          <Tooltip title="创建分组">
            <Button type="text" size="small" icon={<PlusOutlined />} onClick={handleOpenCreate} />
          </Tooltip>
        }
        size="small"
        style={{ height: '100%' }}
        styles={{
          body: {
            padding: '8px 0',
            maxHeight: 'calc(100vh - 300px)',
            overflow: 'auto',
          },
        }}
      >
        {groups.length === 0 && !totalDeviceCount ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无设备分组"
            style={{ margin: '24px 0' }}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
              创建分组
            </Button>
          </Empty>
        ) : (
          <Tree
            showIcon={false}
            treeData={treeData}
            selectedKeys={selectedKeys}
            onSelect={handleSelect}
            style={{
              background: 'transparent',
            }}
            blockNode
          />
        )}
      </Card>

      {/* 创建分组弹窗 */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            创建分组
          </Space>
        }
        open={createModalVisible}
        onOk={handleCreate}
        onCancel={() => setCreateModalVisible(false)}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" initialValues={{ color: PRESET_COLORS[0] }}>
          <Form.Item
            label="分组名称"
            name="name"
            rules={[
              { required: true, message: '请输入分组名称' },
              { max: 20, message: '分组名称最多20个字符' },
            ]}
          >
            <Input placeholder="例如：美国区设备、测试设备" prefix={<FolderOutlined />} />
          </Form.Item>

          <Form.Item label="分组颜色" name="color">
            <ColorPicker
              presets={[{ label: '推荐', colors: PRESET_COLORS }]}
              showText
              format="hex"
            />
          </Form.Item>

          <Form.Item label="分组描述" name="description">
            <Input.TextArea
              placeholder="可选：描述这个分组的用途"
              rows={2}
              maxLength={100}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑分组弹窗 */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            编辑分组
          </Space>
        }
        open={editModalVisible}
        onOk={handleEdit}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingGroup(null);
        }}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="分组名称"
            name="name"
            rules={[
              { required: true, message: '请输入分组名称' },
              { max: 20, message: '分组名称最多20个字符' },
            ]}
          >
            <Input placeholder="例如：美国区设备、测试设备" prefix={<FolderOutlined />} />
          </Form.Item>

          <Form.Item label="分组颜色" name="color">
            <ColorPicker
              presets={[{ label: '推荐', colors: PRESET_COLORS }]}
              showText
              format="hex"
            />
          </Form.Item>

          <Form.Item label="分组描述" name="description">
            <Input.TextArea
              placeholder="可选：描述这个分组的用途"
              rows={2}
              maxLength={100}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default DeviceGroupPanel;
