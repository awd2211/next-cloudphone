/**
 * 自定义仪表盘示例页面
 *
 * 展示可拖拽、可配置的仪表盘功能
 */

import { useState } from 'react';
import { Button, Card, Statistic, List, Row, Col, Tag, Progress, Space, Typography, theme } from 'antd';
import {
  SettingOutlined,
  UserOutlined,
  MobileOutlined,
  DollarOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { DashboardGrid, DraggableCard, DashboardSettings } from '@/components/CustomDashboard';
import type { DashboardCard } from '@/hooks/useDashboardLayout';

const { Text, Title } = Typography;

/**
 * 渲染不同类型的卡片内容
 */
const renderCardContent = (card: DashboardCard) => {
  switch (card.type) {
    case 'stats':
      return (
        <Row gutter={16}>
          <Col span={12}>
            <Statistic title="总用户数" value={1128} prefix={<UserOutlined />} />
          </Col>
          <Col span={12}>
            <Statistic title="总设备数" value={567} prefix={<MobileOutlined />} />
          </Col>
          <Col span={12}>
            <Statistic
              title="今日收入"
              value={11280}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="元"
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="增长率"
              value={11.28}
              precision={2}
              valueStyle={{ color: '#3f8600' }}
              prefix={<RiseOutlined />}
              suffix="%"
            />
          </Col>
        </Row>
      );

    case 'device-status':
      return (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>运行中</Text>
            <Space>
              <Tag color="success">320</Tag>
              <Progress percent={56} size="small" style={{ width: 200 }} />
            </Space>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>已停止</Text>
            <Space>
              <Tag>180</Tag>
              <Progress percent={32} size="small" status="normal" style={{ width: 200 }} />
            </Space>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>错误</Text>
            <Space>
              <Tag color="error">67</Tag>
              <Progress percent={12} size="small" status="exception" style={{ width: 200 }} />
            </Space>
          </div>
        </Space>
      );

    case 'activities':
      return (
        <List
          size="small"
          dataSource={[
            { icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />, text: '用户 user001 创建了设备', time: '刚刚' },
            { icon: <ClockCircleOutlined style={{ color: '#1890ff' }} />, text: '设备 device123 已启动', time: '2分钟前' },
            { icon: <WarningOutlined style={{ color: '#faad14' }} />, text: '设备 device456 启动失败', time: '5分钟前' },
            { icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />, text: '用户 user002 充值 ¥100', time: '10分钟前' },
          ]}
          renderItem={(item) => (
            <List.Item style={{ padding: '8px 0' }}>
              <List.Item.Meta
                avatar={item.icon}
                title={item.text}
                description={<Text type="secondary" style={{ fontSize: 12 }}>{item.time}</Text>}
              />
            </List.Item>
          )}
        />
      );

    case 'chart':
      return (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text type="secondary">
            📊 图表组件 ({card.config?.chartType || 'default'})
          </Text>
        </div>
      );

    case 'quick-actions':
      return (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Button type="primary" block icon={<MobileOutlined />}>创建设备</Button>
          <Button block icon={<UserOutlined />}>添加用户</Button>
          <Button block icon={<DollarOutlined />}>查看收入</Button>
        </Space>
      );

    case 'health':
      return (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>数据库</Text>
            <Tag color="success">正常</Tag>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>Redis</Text>
            <Tag color="success">正常</Tag>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>RabbitMQ</Text>
            <Tag color="warning">延迟</Tag>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>API 网关</Text>
            <Tag color="success">正常</Tag>
          </div>
        </Space>
      );

    case 'notifications':
      return (
        <List
          size="small"
          dataSource={[
            { title: '系统升级通知', time: '2024-01-15' },
            { title: '服务器维护公告', time: '2024-01-14' },
            { title: '新功能发布', time: '2024-01-13' },
          ]}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta title={item.title} description={item.time} />
            </List.Item>
          )}
        />
      );

    default:
      return <Text type="secondary">未知卡片类型: {card.type}</Text>;
  }
};

/**
 * 自定义仪表盘示例页面
 */
const CustomDashboardExample = () => {
  const { } = theme.useToken();
  const [settingsVisible, setSettingsVisible] = useState(false);

  const {
    layout,
    visibleCards,
    reorderCards,
    toggleCardVisibility,
    setColumns,
    setDraggable,
    resetLayout,
    showAllCards,
    hideAllCards,
  } = useDashboardLayout({
    storageKey: 'example-dashboard-layout',
  });

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题和操作 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0 }}>
            📊 自定义仪表盘示例
          </Title>
          <Text type="secondary">
            拖拽卡片重新排序,点击右上角设置按钮配置显示内容
          </Text>
        </div>

        <Button
          type="primary"
          icon={<SettingOutlined />}
          onClick={() => setSettingsVisible(true)}
        >
          设置仪表盘
        </Button>
      </div>

      {/* 仪表盘网格 */}
      <DashboardGrid
        layout={layout}
        cards={visibleCards}
        onReorder={reorderCards}
        renderCard={(card) => (
          <DraggableCard key={card.id} card={card} draggable={layout.draggable}>
            {renderCardContent(card)}
          </DraggableCard>
        )}
      />

      {/* 设置面板 */}
      <DashboardSettings
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        cards={layout.cards}
        columns={layout.columns}
        draggable={layout.draggable}
        onToggleCard={toggleCardVisibility}
        onSetColumns={setColumns}
        onSetDraggable={setDraggable}
        onReset={resetLayout}
        onShowAll={showAllCards}
        onHideAll={hideAllCards}
      />

      {/* 使用说明 */}
      <Card
        title="💡 使用说明"
        style={{ marginTop: 24, backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>拖拽排序:</Text>
            <div style={{ marginTop: 4, color: '#595959' }}>
              鼠标悬停在卡片标题左侧的 ≡ 图标上,按住鼠标拖动可以重新排列卡片顺序
            </div>
          </div>

          <div>
            <Text strong>显示/隐藏卡片:</Text>
            <div style={{ marginTop: 4, color: '#595959' }}>
              点击右上角"设置仪表盘"按钮,在侧边栏中勾选或取消勾选卡片
            </div>
          </div>

          <div>
            <Text strong>调整列数:</Text>
            <div style={{ marginTop: 4, color: '#595959' }}>
              在设置面板中可以选择 1-4 列的网格布局,适应不同屏幕尺寸
            </div>
          </div>

          <div>
            <Text strong>持久化存储:</Text>
            <div style={{ marginTop: 4, color: '#595959' }}>
              所有配置自动保存到 LocalStorage,刷新页面后仍然保持
            </div>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default CustomDashboardExample;
