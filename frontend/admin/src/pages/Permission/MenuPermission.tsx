import { useState, useEffect } from 'react';
import {
  Card,
  Tree,
  Space,
  Button,
  Modal,
  Input,
  message,
  Tag,
  Alert,
  Row,
  Col,
  Descriptions,
  Statistic,
  Spin,
  Empty,
  Divider,
  Badge,
  Tooltip,
} from 'antd';
import {
  ReloadOutlined,
  ClearOutlined,
  FireOutlined,
  ExportOutlined,
  SearchOutlined,
  InfoCircleOutlined,
  AppstoreOutlined,
  LockOutlined,
  UserOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { MenuItem, MenuCacheStats } from '@/types';
import {
  getAllMenus,
  getUserMenus,
  getCacheStats,
  refreshUserCache,
  clearAllCache,
  warmupCache,
  exportCacheData,
} from '@/services/menu';
import dayjs from 'dayjs';

const { Search } = Input;

/**
 * 菜单权限管理页面
 * 用于查看和管理系统菜单结构及其权限配置
 */
const MenuPermission = () => {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [filteredMenus, setFilteredMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  // 缓存管理相关
  const [cacheStats, setCacheStats] = useState<MenuCacheStats | null>(null);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);

  // 用户访问测试
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [testUserId, setTestUserId] = useState('');
  const [testUserMenus, setTestUserMenus] = useState<MenuItem[]>([]);
  const [testLoading, setTestLoading] = useState(false);

  /**
   * 初始化加载
   */
  useEffect(() => {
    loadMenus();
    loadCacheStats();
  }, []);

  /**
   * 搜索过滤
   */
  useEffect(() => {
    if (searchValue) {
      const filtered = filterMenusByName(menus, searchValue);
      setFilteredMenus(filtered);

      // 自动展开包含搜索结果的节点
      const keys = getAllParentKeys(filtered);
      setExpandedKeys(keys);
      setAutoExpandParent(true);
    } else {
      setFilteredMenus(menus);
    }
  }, [searchValue, menus]);

  /**
   * 加载所有菜单
   */
  const loadMenus = async () => {
    setLoading(true);
    try {
      const data = await getAllMenus();
      setMenus(data);
      setFilteredMenus(data);

      // 默认展开第一层
      const firstLevelKeys = data.map(item => item.id);
      setExpandedKeys(firstLevelKeys);
    } catch (error: any) {
      message.error(error.message || '加载菜单失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载缓存统计
   */
  const loadCacheStats = async () => {
    try {
      const stats = await getCacheStats();
      setCacheStats(stats);
    } catch (error: any) {
      console.error('加载缓存统计失败:', error);
    }
  };

  /**
   * 递归过滤菜单
   */
  const filterMenusByName = (items: MenuItem[], keyword: string): MenuItem[] => {
    const filtered: MenuItem[] = [];

    items.forEach(item => {
      const match = item.name.toLowerCase().includes(keyword.toLowerCase()) ||
                    item.path.toLowerCase().includes(keyword.toLowerCase());

      let children: MenuItem[] = [];
      if (item.children) {
        children = filterMenusByName(item.children, keyword);
      }

      if (match || children.length > 0) {
        filtered.push({
          ...item,
          children: children.length > 0 ? children : item.children,
        });
      }
    });

    return filtered;
  };

  /**
   * 获取所有父节点的key
   */
  const getAllParentKeys = (items: MenuItem[], parentKeys: string[] = []): string[] => {
    const keys = [...parentKeys];

    items.forEach(item => {
      keys.push(item.id);
      if (item.children) {
        keys.push(...getAllParentKeys(item.children, []));
      }
    });

    return keys;
  };

  /**
   * 转换菜单为Tree节点
   */
  const convertToTreeData = (items: MenuItem[]): DataNode[] => {
    return items.map(item => {
      const hasChildren = item.children && item.children.length > 0;
      const icon = getMenuIcon(item.icon);

      return {
        key: item.id,
        title: (
          <Space>
            {icon}
            <span style={{ fontWeight: hasChildren ? 600 : 400 }}>
              {item.name}
            </span>
            {item.permission && (
              <Tag color="blue" style={{ fontSize: 11 }}>
                <LockOutlined style={{ fontSize: 10, marginRight: 2 }} />
                {item.permission}
              </Tag>
            )}
            {!item.permission && (
              <Tag color="default" style={{ fontSize: 11 }}>
                公开
              </Tag>
            )}
            <span style={{ fontSize: 12, color: '#999' }}>
              {item.path}
            </span>
          </Space>
        ),
        children: item.children ? convertToTreeData(item.children) : undefined,
      };
    });
  };

  /**
   * 获取菜单图标
   */
  const getMenuIcon = (iconName?: string) => {
    if (!iconName) return <AppstoreOutlined style={{ fontSize: 14, color: '#1890ff' }} />;

    const iconMap: Record<string, React.ReactNode> = {
      'DashboardOutlined': <DashboardOutlined style={{ fontSize: 14, color: '#1890ff' }} />,
      'AppstoreOutlined': <AppstoreOutlined style={{ fontSize: 14, color: '#52c41a' }} />,
      'UserOutlined': <UserOutlined style={{ fontSize: 14, color: '#722ed1' }} />,
      'default': <AppstoreOutlined style={{ fontSize: 14, color: '#1890ff' }} />,
    };

    return iconMap[iconName] || iconMap['default'];
  };

  /**
   * 菜单节点选择
   */
  const handleMenuSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      const menuId = selectedKeys[0] as string;
      const menu = findMenuById(menus, menuId);
      setSelectedMenu(menu);
    }
  };

  /**
   * 递归查找菜单
   */
  const findMenuById = (items: MenuItem[], id: string): MenuItem | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findMenuById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  /**
   * 展开/折叠所有节点
   */
  const handleExpandAll = () => {
    const allKeys = getAllParentKeys(menus);
    setExpandedKeys(allKeys);
  };

  const handleCollapseAll = () => {
    setExpandedKeys([]);
  };

  /**
   * 刷新用户缓存
   */
  const handleRefreshCache = async (userId?: string) => {
    if (!userId) {
      Modal.confirm({
        title: '刷新缓存',
        content: (
          <div>
            <p>请输入要刷新缓存的用户ID：</p>
            <Input
              placeholder="用户ID"
              onChange={(e) => setTestUserId(e.target.value)}
            />
          </div>
        ),
        onOk: async () => {
          if (!testUserId) {
            message.warning('请输入用户ID');
            return;
          }
          await executeRefreshCache(testUserId);
        },
      });
      return;
    }
    await executeRefreshCache(userId);
  };

  const executeRefreshCache = async (userId: string) => {
    setCacheLoading(true);
    try {
      const result = await refreshUserCache(userId);
      message.success(result.message || '刷新成功');
      await loadCacheStats();
    } catch (error: any) {
      message.error(error.message || '刷新缓存失败');
    } finally {
      setCacheLoading(false);
    }
  };

  /**
   * 清空所有缓存
   */
  const handleClearAllCache = () => {
    Modal.confirm({
      title: '清空所有缓存',
      content: '确定要清空所有用户的权限缓存吗？这将影响系统性能，建议在非高峰期操作。',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setCacheLoading(true);
        try {
          const result = await clearAllCache();
          message.success(`${result.message}，已清理 ${result.clearedCount} 条缓存`);
          await loadCacheStats();
        } catch (error: any) {
          message.error(error.message || '清空缓存失败');
        } finally {
          setCacheLoading(false);
        }
      },
    });
  };

  /**
   * 预热缓存
   */
  const handleWarmupCache = async () => {
    Modal.confirm({
      title: '预热缓存',
      content: '为活跃用户预加载权限数据，提升系统响应速度。默认预热最近100个活跃用户。',
      okText: '开始预热',
      cancelText: '取消',
      onOk: async () => {
        setCacheLoading(true);
        try {
          const result = await warmupCache(100);
          message.success(`${result.message}，已预热 ${result.warmedUpCount} 个用户`);
          await loadCacheStats();
        } catch (error: any) {
          message.error(error.message || '预热缓存失败');
        } finally {
          setCacheLoading(false);
        }
      },
    });
  };

  /**
   * 导出缓存数据
   */
  const handleExportCache = async () => {
    setCacheLoading(true);
    try {
      const data = await exportCacheData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `menu-cache-${dayjs().format('YYYYMMDD-HHmmss')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error: any) {
      message.error(error.message || '导出失败');
    } finally {
      setCacheLoading(false);
    }
  };

  /**
   * 测试用户菜单访问
   */
  const handleTestUserAccess = () => {
    setTestModalVisible(true);
    setTestUserId('');
    setTestUserMenus([]);
  };

  const handleLoadUserMenus = async () => {
    if (!testUserId) {
      message.warning('请输入用户ID');
      return;
    }

    setTestLoading(true);
    try {
      const data = await getUserMenus(testUserId);
      setTestUserMenus(data);
      message.success('加载成功');
    } catch (error: any) {
      message.error(error.message || '加载失败');
      setTestUserMenus([]);
    } finally {
      setTestLoading(false);
    }
  };

  /**
   * 统计菜单数量
   */
  const countMenus = (items: MenuItem[]): number => {
    let count = items.length;
    items.forEach(item => {
      if (item.children) {
        count += countMenus(item.children);
      }
    });
    return count;
  };

  const totalMenuCount = countMenus(menus);
  const menusWithPermission = menus.filter(m => m.permission || (m.children?.some(c => c.permission))).length;

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题和说明 */}
      <Card bordered={false}>
        <h2 style={{ marginBottom: 16 }}>
          <AppstoreOutlined style={{ marginRight: 8 }} />
          菜单权限管理
        </h2>
        <Alert
          message="系统说明"
          description={
            <div>
              <p>📋 当前为<strong>只读模式</strong>，可以查看菜单结构和权限配置，但不支持直接编辑。</p>
              <p>🔧 菜单结构当前在后端代码中定义，完整的CRUD功能需要后端实现数据库持久化。</p>
              <p>✨ 您可以：查看菜单树、测试用户访问权限、管理权限缓存。</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 统计信息 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="菜单总数"
                value={totalMenuCount}
                prefix={<AppstoreOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="需要权限"
                value={menusWithPermission}
                prefix={<LockOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="公开菜单"
                value={totalMenuCount - menusWithPermission}
                prefix={<InfoCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="缓存命中率"
                value={cacheStats?.hitRate || 0}
                suffix="%"
                precision={1}
                prefix={<DashboardOutlined />}
                valueStyle={{ color: cacheStats && cacheStats.hitRate > 80 ? '#52c41a' : '#faad14' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 主内容区 */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        {/* 左侧：菜单树 */}
        <Col span={15}>
          <Card
            title="菜单结构"
            extra={
              <Space>
                <Search
                  placeholder="搜索菜单名称或路径"
                  allowClear
                  style={{ width: 250 }}
                  onChange={(e) => setSearchValue(e.target.value)}
                  prefix={<SearchOutlined />}
                />
                <Button size="small" onClick={handleExpandAll}>
                  展开全部
                </Button>
                <Button size="small" onClick={handleCollapseAll}>
                  折叠全部
                </Button>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={loadMenus}
                  loading={loading}
                >
                  刷新
                </Button>
              </Space>
            }
          >
            <Spin spinning={loading}>
              {filteredMenus.length > 0 ? (
                <Tree
                  showIcon
                  expandedKeys={expandedKeys}
                  autoExpandParent={autoExpandParent}
                  onExpand={(keys) => {
                    setExpandedKeys(keys as string[]);
                    setAutoExpandParent(false);
                  }}
                  onSelect={handleMenuSelect}
                  treeData={convertToTreeData(filteredMenus)}
                  style={{ fontSize: 14 }}
                />
              ) : (
                <Empty description="暂无菜单数据" />
              )}
            </Spin>
          </Card>
        </Col>

        {/* 右侧：详情面板 */}
        <Col span={9}>
          <Card title="菜单详情" style={{ marginBottom: 16 }}>
            {selectedMenu ? (
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="菜单名称">
                  {selectedMenu.name}
                </Descriptions.Item>
                <Descriptions.Item label="路由路径">
                  <code>{selectedMenu.path}</code>
                </Descriptions.Item>
                <Descriptions.Item label="权限代码">
                  {selectedMenu.permission ? (
                    <Tag color="blue">{selectedMenu.permission}</Tag>
                  ) : (
                    <Tag color="default">无需权限（公开）</Tag>
                  )}
                </Descriptions.Item>
                {selectedMenu.icon && (
                  <Descriptions.Item label="图标">
                    {selectedMenu.icon}
                  </Descriptions.Item>
                )}
                {selectedMenu.component && (
                  <Descriptions.Item label="组件">
                    <code>{selectedMenu.component}</code>
                  </Descriptions.Item>
                )}
                {selectedMenu.children && (
                  <Descriptions.Item label="子菜单">
                    {selectedMenu.children.length} 个
                  </Descriptions.Item>
                )}
                {selectedMenu.meta && (
                  <Descriptions.Item label="元数据">
                    <pre style={{ fontSize: 12, margin: 0, maxHeight: 200, overflow: 'auto' }}>
                      {JSON.stringify(selectedMenu.meta, null, 2)}
                    </pre>
                  </Descriptions.Item>
                )}
              </Descriptions>
            ) : (
              <Empty description="请从左侧选择菜单项查看详情" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>

          {/* 快捷操作 */}
          <Card title="快捷操作">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                block
                icon={<UserOutlined />}
                onClick={handleTestUserAccess}
              >
                测试用户菜单访问
              </Button>
              <Button
                block
                icon={<DashboardOutlined />}
                onClick={() => setStatsModalVisible(true)}
              >
                查看缓存统计详情
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 缓存管理 */}
      <Card title="缓存管理" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="已缓存用户"
              value={cacheStats?.totalCached || 0}
              prefix={<UserOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="活跃用户"
              value={cacheStats?.activeUsers || 0}
              prefix={<Badge status="processing" />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="缓存大小"
              value={cacheStats?.cacheSize || 0}
              suffix="KB"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="平均加载时间"
              value={cacheStats?.avgLoadTime || 0}
              suffix="ms"
              precision={0}
            />
          </Col>
        </Row>

        <Divider />

        <Space wrap>
          <Tooltip title="刷新指定用户的权限缓存">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => handleRefreshCache()}
              loading={cacheLoading}
            >
              刷新用户缓存
            </Button>
          </Tooltip>

          <Tooltip title="清空所有缓存，建议在非高峰期操作">
            <Button
              danger
              icon={<ClearOutlined />}
              onClick={handleClearAllCache}
              loading={cacheLoading}
            >
              清空所有缓存
            </Button>
          </Tooltip>

          <Tooltip title="为活跃用户预加载权限数据">
            <Button
              type="primary"
              icon={<FireOutlined />}
              onClick={handleWarmupCache}
              loading={cacheLoading}
            >
              预热缓存
            </Button>
          </Tooltip>

          <Tooltip title="导出缓存数据为JSON文件">
            <Button
              icon={<ExportOutlined />}
              onClick={handleExportCache}
              loading={cacheLoading}
            >
              导出缓存数据
            </Button>
          </Tooltip>
        </Space>
      </Card>

      {/* 用户访问测试弹窗 */}
      <Modal
        title="测试用户菜单访问"
        open={testModalVisible}
        onCancel={() => setTestModalVisible(false)}
        footer={null}
        width={700}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Input
              placeholder="输入用户ID"
              value={testUserId}
              onChange={(e) => setTestUserId(e.target.value)}
              style={{ width: 300 }}
            />
            <Button
              type="primary"
              onClick={handleLoadUserMenus}
              loading={testLoading}
            >
              加载菜单
            </Button>
          </Space>

          <Divider style={{ margin: '16px 0' }} />

          <Spin spinning={testLoading}>
            {testUserMenus.length > 0 ? (
              <div>
                <p><strong>该用户可访问的菜单：</strong></p>
                <Tree
                  showIcon
                  defaultExpandAll
                  treeData={convertToTreeData(testUserMenus)}
                />
              </div>
            ) : (
              <Empty description="请输入用户ID并加载" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Spin>
        </Space>
      </Modal>

      {/* 缓存统计详情弹窗 */}
      <Modal
        title="缓存统计详情"
        open={statsModalVisible}
        onCancel={() => setStatsModalVisible(false)}
        footer={null}
        width={600}
      >
        {cacheStats ? (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="已缓存用户数">
              {cacheStats.totalCached}
            </Descriptions.Item>
            <Descriptions.Item label="活跃用户数">
              {cacheStats.activeUsers}
            </Descriptions.Item>
            <Descriptions.Item label="缓存命中率">
              <Badge
                status={cacheStats.hitRate > 80 ? 'success' : 'warning'}
                text={`${cacheStats.hitRate.toFixed(2)}%`}
              />
            </Descriptions.Item>
            <Descriptions.Item label="缓存未命中率">
              {cacheStats.missRate.toFixed(2)}%
            </Descriptions.Item>
            <Descriptions.Item label="平均加载时间">
              {cacheStats.avgLoadTime.toFixed(0)} ms
            </Descriptions.Item>
            <Descriptions.Item label="缓存大小">
              {cacheStats.cacheSize} KB
            </Descriptions.Item>
            <Descriptions.Item label="运行时间">
              {Math.floor(cacheStats.uptime / 3600)} 小时 {Math.floor((cacheStats.uptime % 3600) / 60)} 分钟
            </Descriptions.Item>
            {cacheStats.lastClearTime && (
              <Descriptions.Item label="上次清理时间">
                {dayjs(cacheStats.lastClearTime).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            )}
          </Descriptions>
        ) : (
          <Empty description="暂无缓存统计数据" />
        )}
      </Modal>
    </div>
  );
};

export default MenuPermission;
