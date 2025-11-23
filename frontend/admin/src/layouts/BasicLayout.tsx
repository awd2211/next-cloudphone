import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Drawer } from 'antd';
import NotificationCenter from '@/components/NotificationCenter';
import { smartPrefetch, prefetchMultipleRoutes } from '@/config/prefetchRoutes';
import { GlobalSearchModal, useGlobalSearch } from '@/components/GlobalSearch';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { useTheme } from '@/hooks/useTheme';
import { clearPermissionCache } from '@/hooks/usePermission';
import { clearMenuCache } from '@/hooks/useMenu';
import {
  DashboardOutlined,
  MobileOutlined,
  UserOutlined,
  AppstoreOutlined,
  LogoutOutlined,
  ShoppingOutlined,
  GoldOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  SafetyOutlined,
  
  MenuOutlined,
  WalletOutlined,
  CustomerServiceOutlined,
  
  ApiOutlined,
  PieChartOutlined,
  DashboardFilled,
  SettingOutlined,
  BellOutlined,
  
  MessageOutlined,
  AccountBookOutlined,
  TransactionOutlined,
  FileTextOutlined,
  DollarOutlined,
  UnorderedListOutlined,
  MoneyCollectOutlined,
  ExceptionOutlined,
  LinkOutlined,
  ControlOutlined,
  LockOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  EyeOutlined,
  ProfileOutlined,
  FileProtectOutlined,
  ThunderboltOutlined,
  SyncOutlined,
  LineChartOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;

const BasicLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // ==================== 全局快捷键支持 ====================

  // ==================== 全局搜索 (Cmd+K) ====================
  const { visible: searchVisible, close: closeSearch } = useGlobalSearch();

  // ==================== 主题切换 ====================
  const { mode, actualTheme, setMode, toggleTheme } = useTheme();

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ==================== 导航预加载功能 ====================

  // 初始化时预加载常用路由数据
  useEffect(() => {
    // 延迟执行，避免阻塞初始渲染
    const timer = setTimeout(() => {
      // 预加载最常访问的页面
      prefetchMultipleRoutes(['/admin/dashboard', '/admin/business/devices', '/admin/business/users']).catch((error) => {
        console.warn('Failed to prefetch common routes:', error);
      });
    }, 1000); // 1 秒后开始预加载

    return () => clearTimeout(timer);
  }, []);

  // 路由变化时触发智能预加载
  useEffect(() => {
    // 延迟执行，避免影响页面切换性能
    const timer = setTimeout(() => {
      smartPrefetch(location.pathname).catch((error) => {
        console.warn('Failed to smart prefetch:', error);
      });
    }, 500); // 页面加载后 0.5 秒开始预加载相关页面

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // ==================== 优化后的菜单分类 ====================
  // 分为 6 大模块：总览、业务管理、运营管理、财务管理、运维管理、系统管理
  // 路由格式：/admin/{模块}/{功能}/{子功能}
  const menuItems: MenuProps['items'] = [
    // ==================== 1. 总览 ====================
    {
      key: '/admin/dashboard',
      icon: <DashboardOutlined />,
      label: '工作台',
      onClick: () => navigate('/admin/dashboard'),
    },
    {
      key: 'data-overview',
      icon: <PieChartOutlined />,
      label: '数据总览',
      children: [
        {
          key: '/admin/overview/analytics',
          icon: <PieChartOutlined />,
          label: '数据分析',
          onClick: () => navigate('/admin/overview/analytics'),
        },
        {
          key: '/admin/overview/stats',
          icon: <LineChartOutlined />,
          label: '统计仪表板',
          onClick: () => navigate('/admin/overview/stats'),
        },
        {
          key: '/admin/overview/reports/revenue',
          icon: <DollarOutlined />,
          label: '收入报表',
          onClick: () => navigate('/admin/overview/reports/revenue'),
        },
      ],
    },

    // ==================== 2. 业务管理 ====================
    {
      type: 'divider',
    },
    {
      key: 'business-title',
      type: 'group',
      label: '业务管理',
    },
    {
      key: 'devices-menu',
      icon: <MobileOutlined />,
      label: '设备中心',
      children: [
        {
          key: '/admin/business/devices',
          icon: <MobileOutlined />,
          label: '设备列表',
          onClick: () => navigate('/admin/business/devices'),
        },
        {
          key: '/admin/business/devices/groups',
          icon: <TeamOutlined />,
          label: '设备分组',
          onClick: () => navigate('/admin/business/devices/groups'),
        },
        {
          key: '/admin/business/devices/templates',
          icon: <AppstoreOutlined />,
          label: '设备模板',
          onClick: () => navigate('/admin/business/devices/templates'),
        },
        {
          key: '/admin/business/devices/snapshots',
          icon: <CreditCardOutlined />,
          label: '设备快照',
          onClick: () => navigate('/admin/business/devices/snapshots'),
        },
        {
          key: '/admin/business/devices/physical',
          icon: <SettingOutlined />,
          label: '物理设备',
          onClick: () => navigate('/admin/business/devices/physical'),
        },
      ],
    },
    {
      key: '/admin/business/apps',
      icon: <AppstoreOutlined />,
      label: '应用市场',
      onClick: () => navigate('/admin/business/apps'),
    },
    {
      key: 'users-menu',
      icon: <UserOutlined />,
      label: '用户中心',
      children: [
        {
          key: '/admin/business/users',
          icon: <UserOutlined />,
          label: '用户列表',
          onClick: () => navigate('/admin/business/users'),
        },
        {
          key: '/admin/business/users/quotas',
          icon: <DashboardFilled />,
          label: '配额管理',
          onClick: () => navigate('/admin/business/users/quotas'),
        },
      ],
    },

    // ==================== 3. 运营管理 ====================
    {
      type: 'divider',
    },
    {
      key: 'operation-title',
      type: 'group',
      label: '运营管理',
    },
    {
      key: 'commerce-menu',
      icon: <ShoppingOutlined />,
      label: '商业运营',
      children: [
        {
          key: '/admin/operations/orders',
          icon: <ShoppingOutlined />,
          label: '订单管理',
          onClick: () => navigate('/admin/operations/orders'),
        },
        {
          key: '/admin/operations/plans',
          icon: <GoldOutlined />,
          label: '套餐管理',
          onClick: () => navigate('/admin/operations/plans'),
        },
        {
          key: '/admin/operations/usage',
          icon: <ClockCircleOutlined />,
          label: '使用记录',
          onClick: () => navigate('/admin/operations/usage'),
        },
      ],
    },
    {
      key: '/admin/operations/tickets',
      icon: <CustomerServiceOutlined />,
      label: '工单服务',
      onClick: () => navigate('/admin/operations/tickets'),
    },
    {
      key: 'livechat-menu',
      icon: <MessageOutlined />,
      label: '在线客服',
      children: [
        {
          key: '/admin/operations/livechat/conversations',
          icon: <MessageOutlined />,
          label: '会话监控',
          onClick: () => navigate('/admin/operations/livechat/conversations'),
        },
        {
          key: '/admin/operations/livechat/agents',
          icon: <CustomerServiceOutlined />,
          label: '客服管理',
          onClick: () => navigate('/admin/operations/livechat/agents'),
        },
        {
          key: '/admin/operations/livechat/groups',
          icon: <TeamOutlined />,
          label: '客服分组',
          onClick: () => navigate('/admin/operations/livechat/groups'),
        },
        {
          key: '/admin/operations/livechat/queues',
          icon: <ControlOutlined />,
          label: '排队配置',
          onClick: () => navigate('/admin/operations/livechat/queues'),
        },
        {
          key: '/admin/operations/livechat/canned-responses',
          icon: <ThunderboltOutlined />,
          label: '快捷回复',
          onClick: () => navigate('/admin/operations/livechat/canned-responses'),
        },
        {
          key: '/admin/operations/livechat/sensitive-words',
          icon: <SafetyCertificateOutlined />,
          label: '敏感词管理',
          onClick: () => navigate('/admin/operations/livechat/sensitive-words'),
        },
        {
          key: '/admin/operations/livechat/analytics',
          icon: <BarChartOutlined />,
          label: '数据统计',
          onClick: () => navigate('/admin/operations/livechat/analytics'),
        },
      ],
    },

    // ==================== 4. 财务管理 ====================
    {
      type: 'divider',
    },
    {
      key: 'finance-title',
      type: 'group',
      label: '财务管理',
    },
    {
      key: 'billing-menu',
      icon: <WalletOutlined />,
      label: '账务中心',
      children: [
        {
          key: '/admin/finance/billing/balance',
          icon: <AccountBookOutlined />,
          label: '余额概览',
          onClick: () => navigate('/admin/finance/billing/balance'),
        },
        {
          key: '/admin/finance/billing/transactions',
          icon: <TransactionOutlined />,
          label: '交易记录',
          onClick: () => navigate('/admin/finance/billing/transactions'),
        },
        {
          key: '/admin/finance/billing/invoices',
          icon: <FileTextOutlined />,
          label: '账单发票',
          onClick: () => navigate('/admin/finance/billing/invoices'),
        },
      ],
    },
    {
      key: 'payments-menu',
      icon: <CreditCardOutlined />,
      label: '支付中心',
      children: [
        {
          key: '/admin/finance/payments/dashboard',
          icon: <PieChartOutlined />,
          label: '支付概览',
          onClick: () => navigate('/admin/finance/payments/dashboard'),
        },
        {
          key: '/admin/finance/payments',
          icon: <UnorderedListOutlined />,
          label: '支付记录',
          onClick: () => navigate('/admin/finance/payments'),
        },
        {
          key: '/admin/finance/payments/refunds',
          icon: <MoneyCollectOutlined />,
          label: '退款管理',
          onClick: () => navigate('/admin/finance/payments/refunds'),
        },
        {
          key: '/admin/finance/payments/exceptions',
          icon: <ExceptionOutlined />,
          label: '异常监控',
          onClick: () => navigate('/admin/finance/payments/exceptions'),
        },
        {
          key: '/admin/finance/payments/webhooks',
          icon: <LinkOutlined />,
          label: 'Webhook 日志',
          onClick: () => navigate('/admin/finance/payments/webhooks'),
        },
        {
          key: '/admin/finance/payments/config',
          icon: <ControlOutlined />,
          label: '支付配置',
          onClick: () => navigate('/admin/finance/payments/config'),
        },
      ],
    },

    // ==================== 5. 运维管理 ====================
    {
      type: 'divider',
    },
    {
      key: 'devops-title',
      type: 'group',
      label: '运维管理',
    },
    {
      key: 'device-ops-menu',
      icon: <ThunderboltOutlined />,
      label: '设备运维',
      children: [
        {
          key: '/admin/devops/devices/lifecycle',
          icon: <ClockCircleOutlined />,
          label: '生命周期',
          onClick: () => navigate('/admin/devops/devices/lifecycle'),
        },
        {
          key: '/admin/devops/devices/failover',
          icon: <ThunderboltOutlined />,
          label: '故障转移',
          onClick: () => navigate('/admin/devops/devices/failover'),
        },
        {
          key: '/admin/devops/devices/state-recovery',
          icon: <SyncOutlined />,
          label: '状态恢复',
          onClick: () => navigate('/admin/devops/devices/state-recovery'),
        },
      ],
    },
    {
      key: 'service-ops-menu',
      icon: <GlobalOutlined />,
      label: '服务运维',
      children: [
        {
          key: '/admin/devops/proxy',
          icon: <GlobalOutlined />,
          label: '代理监控',
          onClick: () => navigate('/admin/devops/proxy'),
        },
        {
          key: '/admin/devops/proxy/providers',
          icon: <SettingOutlined />,
          label: '代理配置',
          onClick: () => navigate('/admin/devops/proxy/providers'),
        },
        {
          key: '/admin/devops/sms',
          icon: <MessageOutlined />,
          label: 'SMS 监控',
          onClick: () => navigate('/admin/devops/sms'),
        },
        {
          key: '/admin/devops/sms/providers',
          icon: <SettingOutlined />,
          label: 'SMS 配置',
          onClick: () => navigate('/admin/devops/sms/providers'),
        },
      ],
    },

    // ==================== 6. 系统管理 ====================
    {
      type: 'divider',
    },
    {
      key: 'system-title',
      type: 'group',
      label: '系统管理',
    },
    {
      key: 'access-control-menu',
      icon: <SafetyOutlined />,
      label: '访问控制',
      children: [
        {
          key: '/admin/system/access/roles',
          icon: <TeamOutlined />,
          label: '角色管理',
          onClick: () => navigate('/admin/system/access/roles'),
        },
        {
          key: '/admin/system/access/permissions',
          icon: <LockOutlined />,
          label: '权限管理',
          onClick: () => navigate('/admin/system/access/permissions'),
        },
        {
          key: '/admin/system/access/data-scope',
          icon: <EyeOutlined />,
          label: '数据范围',
          onClick: () => navigate('/admin/system/access/data-scope'),
        },
        {
          key: '/admin/system/access/field-permission',
          icon: <FileProtectOutlined />,
          label: '字段权限',
          onClick: () => navigate('/admin/system/access/field-permission'),
        },
      ],
    },
    {
      key: 'system-config-menu',
      icon: <SettingOutlined />,
      label: '系统配置',
      children: [
        {
          key: '/admin/system/config/settings',
          icon: <SettingOutlined />,
          label: '基础设置',
          onClick: () => navigate('/admin/system/config/settings'),
        },
        {
          key: '/admin/system/config/notifications/templates',
          icon: <BellOutlined />,
          label: '通知模板',
          onClick: () => navigate('/admin/system/config/notifications/templates'),
        },
        {
          key: '/admin/system/config/api-keys',
          icon: <ApiOutlined />,
          label: 'API 密钥',
          onClick: () => navigate('/admin/system/config/api-keys'),
        },
      ],
    },
    {
      key: '/admin/system/logs/audit',
      icon: <ProfileOutlined />,
      label: '审计日志',
      onClick: () => navigate('/admin/system/logs/audit'),
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => {
        navigate('/admin/profile');
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        // 清理全局缓存，防止内存泄漏
        clearPermissionCache();
        clearMenuCache();
        // 清理本地存储
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
        navigate('/login');
      },
    },
  ];

  // 侧边栏内容
  const sidebarContent = (
    <>
      <div
        style={{
          height: 32,
          margin: 16,
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
        }}
      >
        {!collapsed ? '云手机平台' : '云'}
      </div>
      <Menu
        theme="dark"
        defaultSelectedKeys={['/admin/dashboard']}
        selectedKeys={[location.pathname]}
        mode="inline"
        items={menuItems}
        onClick={() => isMobile && setMobileDrawerVisible(false)}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 桌面端侧边栏 */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          breakpoint="lg"
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
          }}
        >
          {sidebarContent}
        </Sider>
      )}

      {/* 移动端抽屉侧边栏 */}
      {isMobile && (
        <Drawer
          placement="left"
          onClose={() => setMobileDrawerVisible(false)}
          open={mobileDrawerVisible}
          styles={{ body: { padding: 0, background: actualTheme === 'dark' ? '#1f1f1f' : '#001529' } }}
          width={200}
        >
          {sidebarContent}
        </Drawer>
      )}

      <Layout style={{ marginLeft: isMobile ? 0 : collapsed ? 80 : 200 }}>
        <Header
          style={{
            padding: isMobile ? '0 16px' : '0 24px',
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {isMobile && (
            <MenuOutlined
              style={{ fontSize: 20, cursor: 'pointer' }}
              onClick={() => setMobileDrawerVisible(true)}
            />
          )}
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <NotificationCenter />
            <ThemeSwitch
              mode={mode}
              actualTheme={actualTheme}
              onModeChange={setMode}
              onToggle={toggleTheme}
              variant="dropdown"
            />
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: isMobile ? '16px 8px' : '24px 16px',
            padding: isMobile ? 16 : 24,
            background: '#fff',
            minHeight: 'calc(100vh - 64px)',
            overflow: 'initial',
          }}
        >
          <Outlet />
        </Content>
      </Layout>

      {/* 全局搜索模态框 (Cmd+K) */}
      <GlobalSearchModal visible={searchVisible} onClose={closeSearch} />
    </Layout>
  );
};

export default BasicLayout;
