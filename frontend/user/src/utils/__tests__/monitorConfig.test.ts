import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  formatUptime,
  getProgressStatus,
  getValueColor,
  createChartConfig,
  AUTO_REFRESH_INTERVAL,
  MAX_HISTORY_DATA,
} from '../monitorConfig';

describe('monitorConfig', () => {
  describe('formatBytes', () => {
    it('应该格式化0字节', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('应该格式化字节', () => {
      expect(formatBytes(500)).toBe('500 B');
    });

    it('应该格式化KB', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(2048)).toBe('2 KB');
    });

    it('应该格式化MB', () => {
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(2 * 1024 * 1024)).toBe('2 MB');
    });

    it('应该格式化GB', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2 GB');
    });

    it('应该格式化TB', () => {
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
    });

    it('应该保留两位小数', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1536 * 1024)).toBe('1.5 MB');
    });
  });

  describe('formatUptime', () => {
    it('应该格式化分钟', () => {
      expect(formatUptime(60)).toBe('1分钟');
      expect(formatUptime(300)).toBe('5分钟');
    });

    it('应该格式化小时和分钟', () => {
      expect(formatUptime(3600)).toBe('1小时 0分钟');
      expect(formatUptime(3660)).toBe('1小时 1分钟');
      expect(formatUptime(7200)).toBe('2小时 0分钟');
    });

    it('应该格式化天和小时', () => {
      expect(formatUptime(86400)).toBe('1天 0小时');
      expect(formatUptime(86400 + 3600)).toBe('1天 1小时');
      expect(formatUptime(172800)).toBe('2天 0小时');
    });

    it('应该处理0秒', () => {
      expect(formatUptime(0)).toBe('0分钟');
    });

    it('应该忽略秒数', () => {
      expect(formatUptime(59)).toBe('0分钟');
      expect(formatUptime(119)).toBe('1分钟');
    });
  });

  describe('getProgressStatus', () => {
    it('低于70%应该返回success', () => {
      expect(getProgressStatus(0)).toBe('success');
      expect(getProgressStatus(50)).toBe('success');
      expect(getProgressStatus(69)).toBe('success');
    });

    it('70%-90%之间应该返回normal', () => {
      expect(getProgressStatus(70)).toBe('normal');
      expect(getProgressStatus(80)).toBe('normal');
      expect(getProgressStatus(89)).toBe('normal');
    });

    it('90%及以上应该返回exception', () => {
      expect(getProgressStatus(90)).toBe('exception');
      expect(getProgressStatus(95)).toBe('exception');
      expect(getProgressStatus(100)).toBe('exception');
    });
  });

  describe('getValueColor', () => {
    it('50%以下应该返回绿色', () => {
      expect(getValueColor(0)).toBe('#3f8600');
      expect(getValueColor(30)).toBe('#3f8600');
      expect(getValueColor(50)).toBe('#3f8600');
    });

    it('50%-80%之间应该返回黄色', () => {
      expect(getValueColor(51)).toBe('#faad14');
      expect(getValueColor(70)).toBe('#faad14');
      expect(getValueColor(80)).toBe('#faad14');
    });

    it('80%以上应该返回红色', () => {
      expect(getValueColor(81)).toBe('#cf1322');
      expect(getValueColor(90)).toBe('#cf1322');
      expect(getValueColor(100)).toBe('#cf1322');
    });
  });

  describe('createChartConfig', () => {
    const mockData = [
      { time: '10:00', cpuUsage: 30, memoryUsage: 40 },
      { time: '10:05', cpuUsage: 50, memoryUsage: 60 },
    ];

    it('应该创建CPU使用率图表配置', () => {
      const config = createChartConfig(mockData, 'cpuUsage', '#1890ff', 'CPU');

      expect(config).toHaveProperty('data', mockData);
      expect(config).toHaveProperty('xField', 'time');
      expect(config).toHaveProperty('yField', 'cpuUsage');
      expect(config).toHaveProperty('color', '#1890ff');
      expect(config).toHaveProperty('height', 200);
      expect(config).toHaveProperty('smooth', true);
    });

    it('应该创建内存使用率图表配置', () => {
      const config = createChartConfig(mockData, 'memoryUsage', '#52c41a', '内存');

      expect(config).toHaveProperty('yField', 'memoryUsage');
      expect(config).toHaveProperty('color', '#52c41a');
    });

    it('Y轴应该配置为0-100范围', () => {
      const config = createChartConfig(mockData, 'cpuUsage', '#1890ff', 'CPU');

      expect(config.yAxis).toHaveProperty('min', 0);
      expect(config.yAxis).toHaveProperty('max', 100);
    });

    it('Y轴标签应该显示百分号', () => {
      const config = createChartConfig(mockData, 'cpuUsage', '#1890ff', 'CPU');

      expect(config.yAxis.label.formatter('50')).toBe('50%');
      expect(config.yAxis.label.formatter('100')).toBe('100%');
    });

    it('tooltip应该格式化数值为百分比', () => {
      const config = createChartConfig(mockData, 'cpuUsage', '#1890ff', 'CPU');

      const formatted = config.tooltip.formatter(mockData[0]);
      expect(formatted).toEqual({
        name: 'CPU',
        value: '30.0%',
      });
    });

    it('tooltip应该处理缺失的字段', () => {
      const config = createChartConfig(mockData, 'cpuUsage', '#1890ff', 'CPU');

      const formatted = config.tooltip.formatter({ time: '10:00' } as any);
      expect(formatted).toEqual({
        name: 'CPU',
        value: '0.0%',
      });
    });
  });

  describe('常量', () => {
    it('AUTO_REFRESH_INTERVAL应该是5000毫秒', () => {
      expect(AUTO_REFRESH_INTERVAL).toBe(5000);
    });

    it('MAX_HISTORY_DATA应该是20', () => {
      expect(MAX_HISTORY_DATA).toBe(20);
    });
  });
});
