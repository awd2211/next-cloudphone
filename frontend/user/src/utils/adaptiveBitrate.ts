import { WebRTCQuality, WebRTCStats } from '../hooks/useWebRTC';

export interface BitrateConfig {
  minBitrate: number; // kbps
  maxBitrate: number; // kbps
  startBitrate: number; // kbps
}

export class AdaptiveBitrateController {
  private currentBitrate: number;
  private readonly config: BitrateConfig;
  private readonly adjustInterval: number = 2000; // 2 秒调整一次
  private lastAdjustTime: number = 0;

  constructor(config: BitrateConfig) {
    this.config = config;
    this.currentBitrate = config.startBitrate;
  }

  /**
   * 根据网络质量调整码率
   */
  adjust(stats: WebRTCStats): number | null {
    const now = Date.now();
    if (now - this.lastAdjustTime < this.adjustInterval) {
      return null; // 调整间隔未到
    }

    this.lastAdjustTime = now;

    const targetBitrate = this.calculateTargetBitrate(stats);

    if (Math.abs(targetBitrate - this.currentBitrate) > this.currentBitrate * 0.1) {
      // 变化超过 10% 才调整
      console.log(
        `[Bitrate] Adjusting: ${this.currentBitrate} → ${targetBitrate} kbps`
      );
      this.currentBitrate = targetBitrate;
      return targetBitrate;
    }

    return null;
  }

  private calculateTargetBitrate(stats: WebRTCStats): number {
    const { quality, rtt, packetLoss } = stats;

    // 基于质量等级调整
    let targetBitrate = this.currentBitrate;

    switch (quality) {
      case WebRTCQuality.EXCELLENT:
        // 网络优秀,可以提升码率
        targetBitrate = Math.min(this.currentBitrate * 1.2, this.config.maxBitrate);
        break;

      case WebRTCQuality.GOOD:
        // 网络良好,小幅提升
        targetBitrate = Math.min(this.currentBitrate * 1.1, this.config.maxBitrate);
        break;

      case WebRTCQuality.FAIR:
        // 网络一般,保持不变
        break;

      case WebRTCQuality.POOR:
        // 网络较差,降低码率
        targetBitrate = Math.max(this.currentBitrate * 0.8, this.config.minBitrate);
        break;

      case WebRTCQuality.BAD:
        // 网络很差,大幅降低
        targetBitrate = Math.max(this.currentBitrate * 0.6, this.config.minBitrate);
        break;
    }

    // 基于丢包率微调
    if (packetLoss > 5) {
      targetBitrate *= 0.9;
    } else if (packetLoss < 1) {
      targetBitrate *= 1.05;
    }

    // 基于延迟微调
    if (rtt > 200) {
      targetBitrate *= 0.95;
    } else if (rtt < 50) {
      targetBitrate *= 1.02;
    }

    // 限制在范围内
    return Math.max(
      this.config.minBitrate,
      Math.min(Math.round(targetBitrate), this.config.maxBitrate)
    );
  }

  getCurrentBitrate(): number {
    return this.currentBitrate;
  }

  reset(): void {
    this.currentBitrate = this.config.startBitrate;
    this.lastAdjustTime = 0;
  }
}
