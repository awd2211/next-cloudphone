import React, { useState, useMemo } from 'react';
import { Card, Tag, Input, Select, Space, Avatar, Tooltip } from 'antd';
import {
  SearchOutlined,
  UserOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import './AuditLogListVirtual.css';

const { Option } = Select;

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  details: string;
}

/**
 * 审计日志列表 - 虚拟滚动版本
 *
 * 使用 react-window 优化超长列表渲染
 * 适合 10,000+ 条记录的场景
 */
const AuditLogListVirtual: React.FC = () => {
  // 生成大量测试数据
  const generateLogs = (count: number): AuditLog[] => {
    const actions = ['登录', '登出', '创建设备', '删除设备', '修改配额', '查看账单', '导出数据'];
    const resources = ['user', 'device', 'quota', 'billing'];
    const levels: Array<'info' | 'warning' | 'error'> = ['info', 'warning', 'error'];

    return Array.from({ length: count }, (_, i) => ({
      id: `log-${i + 1}`,
      userId: `user-${Math.floor(Math.random() * 100)}`,
      userName: `用户${Math.floor(Math.random() * 100)}`,
      action: actions[Math.floor(Math.random() * actions.length)],
      resourceType: resources[Math.floor(Math.random() * resources.length)],
      resourceId: `resource-${Math.floor(Math.random() * 1000)}`,
      ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0',
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      level: levels[Math.floor(Math.random() * levels.length)],
      details: `操作详情 ${i + 1}`,
    }));
  };

  const [allLogs] = useState<AuditLog[]>(generateLogs(10000)); // 生成 10,000 条日志
  const [searchText, setSearchText] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');

  // 过滤日志
  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      if (levelFilter !== 'all' && log.level !== levelFilter) return false;
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (searchText && !log.userName.includes(searchText) && !log.action.includes(searchText)) {
        return false;
      }
      return true;
    });
  }, [allLogs, searchText, levelFilter, actionFilter]);

  // 级别标签颜色
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'red';
      case 'warning':
        return 'orange';
      default:
        return 'blue';
    }
  };

  // 渲染单个日志行
  const LogRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const log = filteredLogs[index];

    return (
      <div style={style} className="audit-log-row">
        <div className="audit-log-item">
          <div className="log-header">
            <Space size="middle">
              <Avatar icon={<UserOutlined />} size="small" />
              <span className="log-user">{log.userName}</span>
              <Tag color={getLevelColor(log.level)}>{log.level.toUpperCase()}</Tag>
            </Space>
            <span className="log-time">
              <ClockCircleOutlined /> {new Date(log.timestamp).toLocaleString('zh-CN')}
            </span>
          </div>
          <div className="log-content">
            <Space>
              <Tag color="blue">{log.action}</Tag>
              <span>
                {log.resourceType}/{log.resourceId}
              </span>
            </Space>
          </div>
          <div className="log-footer">
            <Tooltip title={log.userAgent}>
              <span className="log-ip">
                <EnvironmentOutlined /> {log.ip}
              </span>
            </Tooltip>
            <span className="log-details">{log.details}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="audit-log-virtual-container">
      <Card
        title="审计日志 (虚拟滚动)"
        extra={
          <Space>
            <Input
              placeholder="搜索用户或操作"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
            />
            <Select value={levelFilter} onChange={setLevelFilter} style={{ width: 120 }}>
              <Option value="all">所有级别</Option>
              <Option value="info">Info</Option>
              <Option value="warning">Warning</Option>
              <Option value="error">Error</Option>
            </Select>
            <Select value={actionFilter} onChange={setActionFilter} style={{ width: 120 }}>
              <Option value="all">所有操作</Option>
              <Option value="登录">登录</Option>
              <Option value="登出">登出</Option>
              <Option value="创建设备">创建设备</Option>
              <Option value="删除设备">删除设备</Option>
            </Select>
          </Space>
        }
      >
        <div className="log-stats">
          <Space size="large">
            <span>
              总记录数: <strong>{allLogs.length.toLocaleString()}</strong>
            </span>
            <span>
              过滤后: <strong>{filteredLogs.length.toLocaleString()}</strong>
            </span>
            <Tag color="green">✅ 虚拟滚动已启用</Tag>
          </Space>
        </div>

        {/* 虚拟滚动列表 */}
        <div className="virtual-list-container">
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                itemCount={filteredLogs.length}
                itemSize={120} // 每行高度 120px
                width={width}
                overscanCount={5} // 预渲染 5 行
              >
                {LogRow}
              </List>
            )}
          </AutoSizer>
        </div>

        <div className="performance-note">
          <Tag color="blue">💡 性能提示</Tag>
          <span>
            虚拟滚动只渲染可见区域的项，即使有 10,000+ 条记录也能流畅滚动。
            传统列表会渲染所有项，导致浏览器卡顿。
          </span>
        </div>
      </Card>
    </div>
  );
};

export default React.memo(AuditLogListVirtual);
