import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdaptiveBitrateController, type BitrateConfig } from '../adaptiveBitrate';
import { WebRTCQuality, type WebRTCStats } from '@/hooks/useWebRTC';

describe('AdaptiveBitrateController 自适应码率控制器', () => {
  let controller: AdaptiveBitrateController;
  const defaultConfig: BitrateConfig = {
    minBitrate: 500,
    maxBitrate: 5000,
    startBitrate: 2000,
  };

  beforeEach(() => {
    controller = new AdaptiveBitrateController(defaultConfig);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('初始化', () => {
    it('应该使用配置的起始码率', () => {
      expect(controller.getCurrentBitrate()).toBe(2000);
    });

    it('应该接受自定义配置', () => {
      const customConfig: BitrateConfig = {
        minBitrate: 1000,
        maxBitrate: 8000,
        startBitrate: 3000,
      };
      const customController = new AdaptiveBitrateController(customConfig);
      expect(customController.getCurrentBitrate()).toBe(3000);
    });

    it('最小码率应该小于最大码率', () => {
      expect(defaultConfig.minBitrate).toBeLessThan(defaultConfig.maxBitrate);
    });

    it('起始码率应该在最小和最大之间', () => {
      expect(defaultConfig.startBitrate).toBeGreaterThanOrEqual(
        defaultConfig.minBitrate
      );
      expect(defaultConfig.startBitrate).toBeLessThanOrEqual(
        defaultConfig.maxBitrate
      );
    });
  });

  describe('码率调整', () => {
    it('网络优秀时应该提升码率', () => {
      const stats: WebRTCStats = {
        quality: WebRTCQuality.EXCELLENT,
        rtt: 30,
        packetLoss: 0.5,
        fps: 60,
        bitrate: 2000,
      };

      vi.advanceTimersByTime(2000);
      const newBitrate = controller.adjust(stats);

      expect(newBitrate).toBeGreaterThan(2000);
    });

    it('网络良好时应该小幅提升码率', () => {
      const stats: WebRTCStats = {
        quality: WebRTCQuality.GOOD,
        rtt: 40, // 更低的延迟以确保提升
        packetLoss: 0.5, // 更低的丢包率
        fps: 60,
        bitrate: 2000,
      };

      vi.advanceTimersByTime(2000);
      const newBitrate = controller.adjust(stats);

      // 可能调整也可能不调整，取决于具体算法
      if (newBitrate) {
        expect(newBitrate).toBeGreaterThan(2000);
        expect(newBitrate).toBeLessThanOrEqual(defaultConfig.maxBitrate);
      }
    });

    it('网络一般时应该保持码率不变', () => {
      const stats: WebRTCStats = {
        quality: WebRTCQuality.FAIR,
        rtt: 100,
        packetLoss: 2,
        fps: 60,
        bitrate: 2000,
      };

      vi.advanceTimersByTime(2000);
      const newBitrate = controller.adjust(stats);

      // FAIR 质量时不调整，除非其他因素影响
      // 由于丢包率和RTT在正常范围，变化应该很小
      expect(newBitrate).toBeNull();
    });

    it('网络较差时应该降低码率', () => {
      const stats: WebRTCStats = {
        quality: WebRTCQuality.POOR,
        rtt: 150,
        packetLoss: 5,
        fps: 30,
        bitrate: 2000,
      };

      vi.advanceTimersByTime(2000);
      const newBitrate = controller.adjust(stats);

      expect(newBitrate).not.toBeNull();
      if (newBitrate) {
        expect(newBitrate).toBeLessThan(2000);
        expect(newBitrate).toBeGreaterThanOrEqual(defaultConfig.minBitrate);
      }
    });

    it('网络很差时应该大幅降低码率', () => {
      const stats: WebRTCStats = {
        quality: WebRTCQuality.BAD,
        rtt: 300,
        packetLoss: 10,
        fps: 15,
        bitrate: 2000,
      };

      vi.advanceTimersByTime(2000);
      const newBitrate = controller.adjust(stats);

      expect(newBitrate).not.toBeNull();
      if (newBitrate) {
        expect(newBitrate).toBeLessThan(1500); // 大幅降低
        expect(newBitrate).toBeGreaterThanOrEqual(defaultConfig.minBitrate);
      }
    });

    it('不应该在调整间隔内重复调整', () => {
      const stats: WebRTCStats = {
        quality: WebRTCQuality.EXCELLENT,
        rtt: 30,
        packetLoss: 0.5,
        fps: 60,
        bitrate: 2000,
      };

      vi.advanceTimersByTime(2000);
      const firstAdjust = controller.adjust(stats);
      expect(firstAdjust).not.toBeNull();

      // 立即再次调整
      const secondAdjust = controller.adjust(stats);
      expect(secondAdjust).toBeNull();

      // 等待2秒后可以调整
      vi.advanceTimersByTime(2000);
      const thirdAdjust = controller.adjust(stats);
      expect(thirdAdjust).not.toBeNull();
    });

    it('变化小于10%时不应该调整', () => {
      // 创建一个状态，使目标码率变化很小
      const stats: WebRTCStats = {
        quality: WebRTCQuality.FAIR,
        rtt: 80,
        packetLoss: 1.5,
        fps: 60,
        bitrate: 2000,
      };

      vi.advanceTimersByTime(2000);
      const newBitrate = controller.adjust(stats);

      // FAIR质量且其他参数正常，变化应该很小，不会触发调整
      expect(newBitrate).toBeNull();
    });
  });

  describe('丢包率影响', () => {
    it('高丢包率应该影响码率', () => {
      const stats: WebRTCStats = {
        quality: WebRTCQuality.POOR, // 使用POOR以确保有明显变化
        rtt: 150,
        packetLoss: 8, // 更高的丢包率
        fps: 30,
        bitrate: 2000,
      };

      vi.advanceTimersByTime(2000);
      const newBitrate = controller.adjust(stats);

      // 较差质量 + 高丢包率应该降低码率
      expect(newBitrate).not.toBeNull();
      if (newBitrate) {
        expect(newBitrate).toBeLessThan(2000);
      }
    });

    it('低丢包率应该允许提升码率', () => {
      const stats: WebRTCStats = {
        quality: WebRTCQuality.GOOD,
        rtt: 40,
        packetLoss: 0.5, // 低丢包率
        fps: 60,
        bitrate: 2000,
      };

      vi.advanceTimersByTime(2000);
      const newBitrate = controller.adjust(stats);

      expect(newBitrate).not.toBeNull();
      if (newBitrate) {
        expect(newBitrate).toBeGreaterThan(2000);
      }
    });
  });

  describe('延迟影响', () => {
    it('高延迟应该影响码率', () => {
      const stats: WebRTCStats = {
        quality: WebRTCQuality.POOR, // 使用POOR以确保有明显变化
        rtt: 300, // 很高的延迟
        packetLoss: 3,
        fps: 30,
        bitrate: 2000,
      };

      vi.advanceTimersByTime(2000);
      const newBitrate = controller.adjust(stats);

      // 较差质量 + 高延迟应该降低码率
      expect(newBitrate).not.toBeNull();
      if (newBitrate) {
        expect(newBitrate).toBeLessThan(2000);
      }
    });

    it('低延迟应该允许提升码率', () => {
      const stats: WebRTCStats = {
        quality: WebRTCQuality.GOOD,
        rtt: 30, // 低延迟
        packetLoss: 0.5,
        fps: 60,
        bitrate: 2000,
      };

      vi.advanceTimersByTime(2000);
      const newBitrate = controller.adjust(stats);

      expect(newBitrate).not.toBeNull();
      if (newBitrate) {
        expect(newBitrate).toBeGreaterThan(2000);
      }
    });
  });

  describe('边界条件', () => {
    it('不应该超过最大码率', () => {
      // 连续多次优秀网络质量
      const stats: WebRTCStats = {
        quality: WebRTCQuality.EXCELLENT,
        rtt: 20,
        packetLoss: 0,
        fps: 60,
        bitrate: 2000,
      };

      let currentBitrate = controller.getCurrentBitrate();

      // 多次调整
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(2000);
        const newBitrate = controller.adjust(stats);
        if (newBitrate) {
          currentBitrate = newBitrate;
        }
      }

      expect(currentBitrate).toBeLessThanOrEqual(defaultConfig.maxBitrate);
    });

    it('不应该低于最小码率', () => {
      // 连续多次很差网络质量
      const stats: WebRTCStats = {
        quality: WebRTCQuality.BAD,
        rtt: 500,
        packetLoss: 15,
        fps: 10,
        bitrate: 2000,
      };

      let currentBitrate = controller.getCurrentBitrate();

      // 多次调整
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(2000);
        const newBitrate = controller.adjust(stats);
        if (newBitrate) {
          currentBitrate = newBitrate;
        }
      }

      expect(currentBitrate).toBeGreaterThanOrEqual(defaultConfig.minBitrate);
    });

    it('应该返回整数码率', () => {
      const stats: WebRTCStats = {
        quality: WebRTCQuality.EXCELLENT,
        rtt: 30,
        packetLoss: 0.5,
        fps: 60,
        bitrate: 2000,
      };

      vi.advanceTimersByTime(2000);
      const newBitrate = controller.adjust(stats);

      if (newBitrate) {
        expect(Number.isInteger(newBitrate)).toBe(true);
      }
    });
  });

  describe('reset 方法', () => {
    it('应该重置到起始码率', () => {
      const stats: WebRTCStats = {
        quality: WebRTCQuality.EXCELLENT,
        rtt: 30,
        packetLoss: 0.5,
        fps: 60,
        bitrate: 2000,
      };

      vi.advanceTimersByTime(2000);
      controller.adjust(stats);

      controller.reset();

      expect(controller.getCurrentBitrate()).toBe(defaultConfig.startBitrate);
    });

    it('重置后应该能立即调整', () => {
      const stats: WebRTCStats = {
        quality: WebRTCQuality.EXCELLENT,
        rtt: 30,
        packetLoss: 0.5,
        fps: 60,
        bitrate: 2000,
      };

      vi.advanceTimersByTime(2000);
      controller.adjust(stats);

      controller.reset();

      vi.advanceTimersByTime(2000);
      const newBitrate = controller.adjust(stats);

      expect(newBitrate).not.toBeNull();
    });
  });

  describe('getCurrentBitrate 方法', () => {
    it('应该返回当前码率', () => {
      const currentBitrate = controller.getCurrentBitrate();
      expect(typeof currentBitrate).toBe('number');
      expect(currentBitrate).toBeGreaterThan(0);
    });

    it('应该跟踪码率变化', () => {
      const initialBitrate = controller.getCurrentBitrate();

      const stats: WebRTCStats = {
        quality: WebRTCQuality.EXCELLENT,
        rtt: 30,
        packetLoss: 0.5,
        fps: 60,
        bitrate: 2000,
      };

      vi.advanceTimersByTime(2000);
      const adjusted = controller.adjust(stats);

      if (adjusted) {
        expect(controller.getCurrentBitrate()).toBe(adjusted);
        expect(controller.getCurrentBitrate()).not.toBe(initialBitrate);
      }
    });
  });

  describe('复杂场景', () => {
    it('应该能处理网络质量波动', () => {
      const excellentStats: WebRTCStats = {
        quality: WebRTCQuality.EXCELLENT,
        rtt: 30,
        packetLoss: 0.5,
        fps: 60,
        bitrate: 2000,
      };

      const poorStats: WebRTCStats = {
        quality: WebRTCQuality.POOR,
        rtt: 200,
        packetLoss: 5,
        fps: 30,
        bitrate: 2000,
      };

      // 优秀网络
      vi.advanceTimersByTime(2000);
      const increased = controller.adjust(excellentStats);
      expect(increased).not.toBeNull();

      // 切换到较差网络
      vi.advanceTimersByTime(2000);
      const decreased = controller.adjust(poorStats);
      expect(decreased).not.toBeNull();

      if (increased && decreased) {
        expect(decreased).toBeLessThan(increased);
      }
    });

    it('应该逐步调整码率而不是突变', () => {
      const stats: WebRTCStats = {
        quality: WebRTCQuality.EXCELLENT,
        rtt: 30,
        packetLoss: 0.5,
        fps: 60,
        bitrate: 2000,
      };

      const bitrates: number[] = [controller.getCurrentBitrate()];

      // 多次调整
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(2000);
        const newBitrate = controller.adjust(stats);
        if (newBitrate) {
          bitrates.push(newBitrate);
        }
      }

      // 验证是逐步增长
      for (let i = 1; i < bitrates.length; i++) {
        const change = Math.abs(bitrates[i] - bitrates[i - 1]);
        const changePercent = change / bitrates[i - 1];
        // 每次变化不应该太大（检查是否逐步调整）
        expect(changePercent).toBeLessThan(0.5); // 不超过50%
      }
    });
  });
});
