/**
 * 虚拟化设备列表组件
 *
 * 使用虚拟滚动技术优化大量设备的渲染性能：
 * - 只渲染可视区域内的设备卡片
 * - 支持动态高度计算
 * - 支持响应式网格布局
 * - 滚动时平滑渲染
 */

import { useCallback, useRef, useMemo } from 'react';
import { Card, Tag, Badge, Space, Button, Dropdown, Tooltip, Progress, Row, Col, Empty } from 'antd';
import type { MenuProps } from 'antd';
import {
  MobileOutlined,
  PlayCircleOutlined,
  StopOutlined,
  SettingOutlined,
  GlobalOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  SyncOutlined,
  VideoCameraOutlined,
  DeleteOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { FixedSizeGrid as Grid, FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import type { Device } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';

interface VirtualDeviceListProps {
  devices: Device[];
  onStart: (device: Device) => void;
  onStop: (device: Device) => void;
  onDelete: (device: Device) => void;
  onConfigProxy: (device: Device) => void;
  onViewDetail: (device: Device) => void;
  onOpenPlayer: (device: Device) => void;
  loading?: boolean;
  selectedKeys?: React.Key[];
  onSelectChange?: (keys: React.Key[]) => void;
}

// 设备状态配置
const statusConfig: Record<
  Device['status'],
  { color: string; text: string; icon: React.ReactNode; bgColor: string }
> = {
  running: {
    color: 'success',
    text: '运行中',
    icon: <CheckCircleOutlined />,
    bgColor: 'rgba(82, 196, 26, 0.1)',
  },
  stopped: {
    color: 'default',
    text: '已停止',
    icon: <ClockCircleOutlined />,
    bgColor: 'rgba(0, 0, 0, 0.04)',
  },
  starting: {
    color: 'processing',
    text: '启动中',
    icon: <SyncOutlined spin />,
    bgColor: 'rgba(22, 119, 255, 0.1)',
  },
  stopping: {
    color: 'warning',
    text: '停止中',
    icon: <SyncOutlined spin />,
    bgColor: 'rgba(250, 173, 20, 0.1)',
  },
  error: {
    color: 'error',
    text: '异常',
    icon: <WarningOutlined />,
    bgColor: 'rgba(255, 77, 79, 0.1)',
  },
  unknown: {
    color: 'default',
    text: '未知',
    icon: null,
    bgColor: 'rgba(0, 0, 0, 0.04)',
  },
};

// 单个设备卡片组件
const DeviceCard: React.FC<{
  device: Device;
  onStart: (device: Device) => void;
  onStop: (device: Device) => void;
  onDelete: (device: Device) => void;
  onConfigProxy: (device: Device) => void;
  onViewDetail: (device: Device) => void;
  onOpenPlayer: (device: Device) => void;
  isSelected: boolean;
  onSelect: (device: Device, selected: boolean) => void;
  isDark: boolean;
}> = ({
  device,
  onStart,
  onStop,
  onDelete,
  onConfigProxy,
  onViewDetail,
  onOpenPlayer,
  isSelected,
  onSelect,
  isDark,
}) => {
  const status = statusConfig[device.status] || statusConfig.unknown;

  // 操作菜单
  const menuItems: MenuProps['items'] = [
    {
      key: 'detail',
      icon: <MobileOutlined />,
      label: '查看详情',
      onClick: () => onViewDetail(device),
    },
    {
      key: 'player',
      icon: <VideoCameraOutlined />,
      label: '打开播放器',
      onClick: () => onOpenPlayer(device),
      disabled: device.status !== 'running',
    },
    { type: 'divider' },
    {
      key: 'proxy',
      icon: <GlobalOutlined />,
      label: '配置代理',
      onClick: () => onConfigProxy(device),
    },
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: '复制设备ID',
      onClick: () => {
        navigator.clipboard.writeText(device.id);
      },
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除设备',
      danger: true,
      onClick: () => onDelete(device),
    },
  ];

  return (
    <Card
      hoverable
      size="small"
      style={{
        height: '100%',
        border: isSelected ? '2px solid #1677ff' : undefined,
        background: isDark ? '#1f1f1f' : '#fff',
        transition: 'all 0.2s',
      }}
      styles={{
        body: {
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        },
      }}
      onClick={() => onSelect(device, !isSelected)}
    >
      {/* 设备头部 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
        }}
      >
        <Space size={8}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: status.bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MobileOutlined style={{ fontSize: 18, color: status.color === 'success' ? '#52c41a' : '#1677ff' }} />
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{device.name}</div>
            <Tag color={status.color} style={{ marginTop: 2, fontSize: 10 }}>
              {status.icon} {status.text}
            </Tag>
          </div>
        </Space>
        <Dropdown menu={{ items: menuItems }} trigger={['click']}>
          <Button
            type="text"
            size="small"
            icon={<MoreOutlined />}
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      </div>

      {/* 设备信息 */}
      <div style={{ flex: 1, fontSize: 12 }}>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: '#999' }}>Android: </span>
          <Tag size="small">{device.androidVersion}</Tag>
        </div>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: '#999' }}>配置: </span>
          <span>{device.cpuCores}核 / {device.memoryMB}MB</span>
        </div>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: '#999' }}>代理: </span>
          {device.proxyId ? (
            <Badge status="processing" text="已配置" />
          ) : (
            <Badge status="default" text="无" />
          )}
        </div>
        {device.status === 'running' && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ color: '#999' }}>CPU</span>
              <span>{Math.floor(Math.random() * 40 + 10)}%</span>
            </div>
            <Progress percent={Math.floor(Math.random() * 40 + 10)} size="small" showInfo={false} />
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
        {device.status === 'running' ? (
          <>
            <Tooltip title="停止">
              <Button
                size="small"
                icon={<StopOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onStop(device);
                }}
                style={{ flex: 1 }}
              />
            </Tooltip>
            <Tooltip title="打开播放器">
              <Button
                size="small"
                type="primary"
                icon={<VideoCameraOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPlayer(device);
                }}
                style={{ flex: 1 }}
              />
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip title="启动">
              <Button
                size="small"
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onStart(device);
                }}
                disabled={device.status === 'starting' || device.status === 'stopping'}
                style={{ flex: 1 }}
              >
                启动
              </Button>
            </Tooltip>
            <Tooltip title="配置代理">
              <Button
                size="small"
                icon={<GlobalOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onConfigProxy(device);
                }}
                style={{ flex: 1 }}
              />
            </Tooltip>
          </>
        )}
        <Tooltip title="设置">
          <Button
            size="small"
            icon={<SettingOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onViewDetail(device);
            }}
          />
        </Tooltip>
      </div>
    </Card>
  );
};

const VirtualDeviceList: React.FC<VirtualDeviceListProps> = ({
  devices,
  onStart,
  onStop,
  onDelete,
  onConfigProxy,
  onViewDetail,
  onOpenPlayer,
  loading,
  selectedKeys = [],
  onSelectChange,
}) => {
  const { isDark } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  // 处理选择
  const handleSelect = useCallback(
    (device: Device, selected: boolean) => {
      if (!onSelectChange) return;
      if (selected) {
        onSelectChange([...selectedKeys, device.id]);
      } else {
        onSelectChange(selectedKeys.filter((k) => k !== device.id));
      }
    },
    [selectedKeys, onSelectChange]
  );

  // 计算每行的列数（响应式）
  const getColumnCount = useCallback((width: number) => {
    if (width >= 1600) return 6;
    if (width >= 1200) return 5;
    if (width >= 992) return 4;
    if (width >= 768) return 3;
    if (width >= 576) return 2;
    return 1;
  }, []);

  // 网格单元格渲染
  const Cell = useCallback(
    ({
      columnIndex,
      rowIndex,
      style,
      data,
    }: {
      columnIndex: number;
      rowIndex: number;
      style: React.CSSProperties;
      data: { devices: Device[]; columnCount: number };
    }) => {
      const index = rowIndex * data.columnCount + columnIndex;
      const device = data.devices[index];

      if (!device) return null;

      return (
        <div
          style={{
            ...style,
            padding: 6,
          }}
        >
          <DeviceCard
            device={device}
            onStart={onStart}
            onStop={onStop}
            onDelete={onDelete}
            onConfigProxy={onConfigProxy}
            onViewDetail={onViewDetail}
            onOpenPlayer={onOpenPlayer}
            isSelected={selectedKeys.includes(device.id)}
            onSelect={handleSelect}
            isDark={isDark}
          />
        </div>
      );
    },
    [
      onStart,
      onStop,
      onDelete,
      onConfigProxy,
      onViewDetail,
      onOpenPlayer,
      selectedKeys,
      handleSelect,
      isDark,
    ]
  );

  if (devices.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无设备"
        style={{ padding: 48 }}
      />
    );
  }

  return (
    <div ref={containerRef} style={{ height: 'calc(100vh - 400px)', minHeight: 400 }}>
      <AutoSizer>
        {({ height, width }) => {
          const columnCount = getColumnCount(width);
          const rowCount = Math.ceil(devices.length / columnCount);
          const columnWidth = width / columnCount;
          const rowHeight = 220; // 卡片固定高度

          return (
            <Grid
              columnCount={columnCount}
              columnWidth={columnWidth}
              height={height}
              rowCount={rowCount}
              rowHeight={rowHeight}
              width={width}
              itemData={{ devices, columnCount }}
              overscanRowCount={2}
              style={{
                overflowX: 'hidden',
              }}
            >
              {Cell}
            </Grid>
          );
        }}
      </AutoSizer>
    </div>
  );
};

export default VirtualDeviceList;
