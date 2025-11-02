import React from 'react';
import { Card, Space, DatePicker, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { PERIOD_OPTIONS, type PeriodType } from './constants';

const { RangePicker } = DatePicker;

interface AnalyticsFilterBarProps {
  dateRange: [string, string];
  period: PeriodType;
  onDateRangeChange: (dates: [string, string]) => void;
  onPeriodChange: (period: PeriodType) => void;
}

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = React.memo(
  ({ dateRange, period, onDateRangeChange, onPeriodChange }) => {
    const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
      if (dates && dates[0] && dates[1]) {
        onDateRangeChange([
          dates[0].format('YYYY-MM-DD'),
          dates[1].format('YYYY-MM-DD'),
        ]);
      }
    };

    return (
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <RangePicker
            value={[dayjs(dateRange[0]), dayjs(dateRange[1])]}
            onChange={handleDateChange}
          />
          <Select
            value={period}
            onChange={onPeriodChange}
            style={{ width: 120 }}
            options={PERIOD_OPTIONS}
          />
        </Space>
      </Card>
    );
  }
);

AnalyticsFilterBar.displayName = 'AnalyticsFilterBar';
