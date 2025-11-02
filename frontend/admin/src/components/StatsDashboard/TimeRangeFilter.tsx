import React from 'react';
import { Space, Select, DatePicker } from 'antd';
import { TIME_RANGE_OPTIONS } from './constants';

const { RangePicker } = DatePicker;

interface TimeRangeFilterProps {
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
  onDateRangeChange: (dates: any) => void;
}

export const TimeRangeFilter: React.FC<TimeRangeFilterProps> = React.memo(
  ({ timeRange, onTimeRangeChange, onDateRangeChange }) => {
    return (
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Select
            value={timeRange}
            onChange={onTimeRangeChange}
            style={{ width: 120 }}
            options={TIME_RANGE_OPTIONS}
          />
          <RangePicker onChange={onDateRangeChange} />
        </Space>
      </div>
    );
  }
);

TimeRangeFilter.displayName = 'TimeRangeFilter';
