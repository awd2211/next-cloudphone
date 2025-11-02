import React from 'react';
import { Card, Row, Col, Select, Input, DatePicker } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { ACTION_OPTIONS, RESOURCE_OPTIONS } from './constants';

const { Search } = Input;
const { RangePicker } = DatePicker;

interface LogsAuditFilterBarProps {
  onSearch: (value: string) => void;
  onActionChange: (value: string | undefined) => void;
  onResourceChange: (value: string | undefined) => void;
  onDateRangeChange: (dates: any) => void;
}

export const LogsAuditFilterBar: React.FC<LogsAuditFilterBarProps> = React.memo(
  ({ onSearch, onActionChange, onResourceChange, onDateRangeChange }) => {
    return (
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Search
              placeholder="搜索用户名/IP/路径"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={onSearch}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="操作类型"
              style={{ width: '100%' }}
              allowClear
              onChange={onActionChange}
            >
              {ACTION_OPTIONS.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="资源类型"
              style={{ width: '100%' }}
              allowClear
              onChange={onResourceChange}
            >
              {RESOURCE_OPTIONS.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={10}>
            <RangePicker
              style={{ width: '100%' }}
              showTime
              placeholder={['开始时间', '结束时间']}
              onChange={onDateRangeChange}
            />
          </Col>
        </Row>
      </Card>
    );
  }
);

LogsAuditFilterBar.displayName = 'LogsAuditFilterBar';
