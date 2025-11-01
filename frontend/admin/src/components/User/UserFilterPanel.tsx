/**
 * UserFilterPanel - 用户筛选面板组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Card, Form, Input, Select, InputNumber, DatePicker, Row, Col, Space, Button, Tag } from 'antd';
import { FilterOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';

interface Role {
  id: string;
  name: string;
}

interface UserFilterPanelProps {
  form: FormInstance;
  roles: Role[];
  filterExpanded: boolean;
  hasFilters: boolean;
  onFilterChange: (field: string, value: any) => void;
  onClearFilters: () => void;
  onToggleExpanded: () => void;
}

/**
 * UserFilterPanel 组件
 * 提供用户列表的筛选功能
 */
export const UserFilterPanel = memo<UserFilterPanelProps>(
  ({ form, roles, filterExpanded, hasFilters, onFilterChange, onClearFilters, onToggleExpanded }) => {
    return (
      <Card
        size="small"
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <FilterOutlined />
            <span>筛选条件</span>
            {hasFilters && <Tag color="blue">已应用筛选</Tag>}
          </Space>
        }
        extra={
          <Space>
            {hasFilters && (
              <Button size="small" onClick={onClearFilters}>
                清空
              </Button>
            )}
            <Button
              type="text"
              size="small"
              icon={filterExpanded ? <UpOutlined /> : <DownOutlined />}
              onClick={onToggleExpanded}
            >
              {filterExpanded ? '收起' : '展开'}
            </Button>
          </Space>
        }
      >
        {filterExpanded && (
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item label="用户名" name="username">
                  <Input
                    placeholder="模糊搜索用户名"
                    allowClear
                    onChange={(e) => onFilterChange('username', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="邮箱" name="email">
                  <Input
                    placeholder="模糊搜索邮箱"
                    allowClear
                    onChange={(e) => onFilterChange('email', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="手机号" name="phone">
                  <Input
                    placeholder="模糊搜索手机号"
                    allowClear
                    onChange={(e) => onFilterChange('phone', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="状态" name="status">
                  <Select
                    placeholder="选择状态"
                    allowClear
                    onChange={(value) => onFilterChange('status', value)}
                    options={[
                      { label: '正常', value: 'active' },
                      { label: '未激活', value: 'inactive' },
                      { label: '已封禁', value: 'banned' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item label="角色" name="roleId">
                  <Select
                    placeholder="选择角色"
                    allowClear
                    onChange={(value) => onFilterChange('roleId', value)}
                    options={roles.map((role) => ({
                      label: role.name,
                      value: role.id,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="最小余额" name="minBalance">
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="最小余额"
                    min={0}
                    precision={2}
                    onChange={(value) => onFilterChange('minBalance', value)}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="最大余额" name="maxBalance">
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="最大余额"
                    min={0}
                    precision={2}
                    onChange={(value) => onFilterChange('maxBalance', value)}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="注册时间" name="dateRange">
                  <DatePicker.RangePicker
                    style={{ width: '100%' }}
                    onChange={(dates) => {
                      if (dates) {
                        onFilterChange('startDate', dates[0]?.format('YYYY-MM-DD'));
                        onFilterChange('endDate', dates[1]?.format('YYYY-MM-DD'));
                      } else {
                        onFilterChange('startDate', undefined);
                        onFilterChange('endDate', undefined);
                      }
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}
      </Card>
    );
  }
);

UserFilterPanel.displayName = 'UserFilterPanel';
