import { memo, useMemo } from 'react';
import { Modal, Card, Row, Col, Statistic, Table, Tag } from 'antd';
import {
  TeamOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { DataScope } from '@/hooks/useDataScope';
import type { Role } from '@/types';
import { resourceTypes } from './constants';

interface DataScopeStatisticsModalProps {
  visible: boolean;
  dataScopes: DataScope[];
  roles: Role[];
  onClose: () => void;
}

export const DataScopeStatisticsModal = memo<DataScopeStatisticsModalProps>(
  ({ visible, dataScopes, roles, onClose }) => {
    // 统计数据
    const statistics = useMemo(() => {
      const totalConfigs = dataScopes.length;
      const activeConfigs = dataScopes.filter((s) => s.isActive).length;
      const inactiveConfigs = totalConfigs - activeConfigs;

      // 按角色统计
      const roleStats = roles.map((role) => {
        const configs = dataScopes.filter((s) => s.roleId === role.id);
        return {
          roleId: role.id,
          roleName: role.name,
          total: configs.length,
          active: configs.filter((s) => s.isActive).length,
        };
      });

      // 按资源类型统计
      const resourceStats = resourceTypes.map((resource) => {
        const configs = dataScopes.filter((s) => s.resourceType === resource.value);
        return {
          resourceType: resource.value,
          resourceLabel: resource.label,
          total: configs.length,
          active: configs.filter((s) => s.isActive).length,
        };
      });

      // 按范围类型统计
      const scopeTypeStats = dataScopes.reduce(
        (acc, scope) => {
          const type = scope.scopeType;
          if (!acc[type]) {
            acc[type] = { total: 0, active: 0 };
          }
          acc[type].total += 1;
          if (scope.isActive) acc[type].active += 1;
          return acc;
        },
        {} as Record<string, { total: number; active: number }>
      );

      return {
        totalConfigs,
        activeConfigs,
        inactiveConfigs,
        roleStats: roleStats.filter((r) => r.total > 0), // 只显示有配置的角色
        resourceStats,
        scopeTypeStats,
      };
    }, [dataScopes, roles]);

    // 角色统计表格列
    const roleColumns = [
      {
        title: '角色名称',
        dataIndex: 'roleName',
        key: 'roleName',
      },
      {
        title: '配置总数',
        dataIndex: 'total',
        key: 'total',
        sorter: (a: any, b: any) => a.total - b.total,
      },
      {
        title: '启用配置',
        dataIndex: 'active',
        key: 'active',
        render: (active: number) => <Tag color="green">{active}</Tag>,
        sorter: (a: any, b: any) => a.active - b.active,
      },
      {
        title: '禁用配置',
        key: 'inactive',
        render: (record: any) => <Tag color="red">{record.total - record.active}</Tag>,
        sorter: (a: any, b: any) => (a.total - a.active) - (b.total - b.active),
      },
    ];

    // 资源类型统计表格列
    const resourceColumns = [
      {
        title: '资源类型',
        dataIndex: 'resourceLabel',
        key: 'resourceLabel',
      },
      {
        title: '配置总数',
        dataIndex: 'total',
        key: 'total',
        sorter: (a: any, b: any) => a.total - b.total,
      },
      {
        title: '启用配置',
        dataIndex: 'active',
        key: 'active',
        render: (active: number) => <Tag color="green">{active}</Tag>,
        sorter: (a: any, b: any) => a.active - b.active,
      },
    ];

    return (
      <Modal
        title="数据范围配置统计概览"
        open={visible}
        onCancel={onClose}
        width={900}
        footer={null}
      >
        {/* 总体统计 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="配置总数"
                value={statistics.totalConfigs}
                prefix={<AppstoreOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="启用配置"
                value={statistics.activeConfigs}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="禁用配置"
                value={statistics.inactiveConfigs}
                valueStyle={{ color: '#cf1322' }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 按角色统计 */}
        <Card title="按角色统计" style={{ marginBottom: 16 }} size="small">
          <Table
            dataSource={statistics.roleStats}
            columns={roleColumns}
            rowKey="roleId"
            pagination={{ pageSize: 5, showSizeChanger: false }}
            size="small"
          />
        </Card>

        {/* 按资源类型统计 */}
        <Card title="按资源类型统计" size="small">
          <Table
            dataSource={statistics.resourceStats}
            columns={resourceColumns}
            rowKey="resourceType"
            pagination={false}
            size="small"
          />
        </Card>

        {/* 按范围类型统计 */}
        <Card title="按范围类型统计" style={{ marginTop: 16 }} size="small">
          <Row gutter={16}>
            {Object.entries(statistics.scopeTypeStats).map(([type, stats]) => (
              <Col span={8} key={type}>
                <Statistic
                  title={type.toUpperCase()}
                  value={stats.total}
                  suffix={<span style={{ fontSize: 14 }}>/ {stats.active} 启用</span>}
                />
              </Col>
            ))}
          </Row>
        </Card>
      </Modal>
    );
  }
);

DataScopeStatisticsModal.displayName = 'DataScopeStatisticsModal';
