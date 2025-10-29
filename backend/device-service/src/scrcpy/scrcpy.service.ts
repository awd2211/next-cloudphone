import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import {
  ScrcpyConfig,
  ScrcpySession,
  ScrcpyProcessInfo,
  ScrcpyProcessStatus,
  ScrcpyVideoCodec,
  ScrcpyAudioCodec,
} from "./scrcpy.types";

/**
 * ScrcpyService
 *
 * 管理 SCRCPY 进程和会话
 *
 * 功能：
 * - 启动/停止 SCRCPY 进程
 * - 管理会话生命周期
 * - 提供 WebSocket 连接信息
 *
 * Phase 2A: 基础实现（单设备）
 * Phase 2B: 优化为多设备并发支持
 */
@Injectable()
export class ScrcpyService {
  private readonly logger = new Logger(ScrcpyService.name);

  /** SCRCPY 可执行文件路径 */
  private readonly scrcpyPath: string;

  /** 会话存储 Map<deviceId, ScrcpySession> */
  private sessions: Map<string, ScrcpySession> = new Map();

  /** 进程存储 Map<deviceId, ChildProcess> */
  private processes: Map<string, ChildProcess> = new Map();

  /** SCRCPY 服务器起始端口 */
  private readonly portStart: number;

  /** WebSocket 服务器地址 */
  private readonly wsHost: string;

  /** WebSocket 服务器端口 */
  private readonly wsPort: number;

  constructor(private configService: ConfigService) {
    this.scrcpyPath = this.configService.get<string>(
      "SCRCPY_PATH",
      "/usr/local/bin/scrcpy",
    );
    this.portStart = this.configService.get<number>("SCRCPY_PORT_START", 27183);
    this.wsHost = this.configService.get<string>("WS_HOST", "localhost");
    this.wsPort = this.configService.get<number>("WS_PORT", 8080);

    this.logger.log(`ScrcpyService initialized: ${this.scrcpyPath}`);
  }

  /**
   * 启动 SCRCPY 会话
   *
   * @param deviceId 设备 ID
   * @param serial 设备序列号 (IP:PORT)
   * @param config SCRCPY 配置
   * @returns 会话信息
   */
  async startSession(
    deviceId: string,
    serial: string,
    config?: Partial<ScrcpyConfig>,
  ): Promise<ScrcpySession> {
    // 检查是否已有会话
    if (this.sessions.has(deviceId)) {
      this.logger.warn(`SCRCPY session already exists for device ${deviceId}`);
      return this.sessions.get(deviceId)!;
    }

    // 分配端口
    const port = this.allocatePort(deviceId);

    // 合并配置
    const fullConfig: ScrcpyConfig = {
      serial,
      videoBitRate: config?.videoBitRate || 8_000_000, // 8 Mbps
      videoCodec: config?.videoCodec || ScrcpyVideoCodec.H264,
      maxSize: config?.maxSize || 1920,
      maxFps: config?.maxFps || 60,
      audioBitRate: config?.audioBitRate || 128_000, // 128 kbps
      audioCodec: config?.audioCodec || ScrcpyAudioCodec.OPUS,
      noAudio: config?.noAudio || false,
      noVideo: config?.noVideo || false,
      showTouches: config?.showTouches || false,
      stayAwake: config?.stayAwake || true,
      turnScreenOff: config?.turnScreenOff || false,
      port,
    };

    // 启动 SCRCPY 进程
    const process = await this.spawnScrcpyProcess(deviceId, fullConfig);

    // 创建会话
    const sessionId = `scrcpy_${deviceId}_${Date.now()}`;
    const session: ScrcpySession = {
      sessionId,
      deviceId,
      serial,
      videoUrl: `ws://${this.wsHost}:${this.wsPort}/scrcpy/${deviceId}/video`,
      audioUrl: fullConfig.noAudio
        ? undefined
        : `ws://${this.wsHost}:${this.wsPort}/scrcpy/${deviceId}/audio`,
      controlUrl: `ws://${this.wsHost}:${this.wsPort}/scrcpy/${deviceId}/control`,
      config: fullConfig,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      processId: process.pid,
    };

    // 保存会话和进程
    this.sessions.set(deviceId, session);
    this.processes.set(deviceId, process);

    this.logger.log(
      `SCRCPY session started for device ${deviceId}, port ${port}, PID ${process.pid}`,
    );

    return session;
  }

  /**
   * 停止 SCRCPY 会话
   *
   * @param deviceId 设备 ID
   */
  async stopSession(deviceId: string): Promise<void> {
    const process = this.processes.get(deviceId);
    if (!process) {
      this.logger.warn(`No SCRCPY session found for device ${deviceId}`);
      return;
    }

    // 杀死进程
    process.kill("SIGTERM");

    // 等待进程退出（最多 5 秒）
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (!process.killed) {
          process.kill("SIGKILL");
        }
        resolve();
      }, 5000);

      process.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    // 清理会话和进程
    this.sessions.delete(deviceId);
    this.processes.delete(deviceId);

    this.logger.log(`SCRCPY session stopped for device ${deviceId}`);
  }

  /**
   * 获取会话信息
   *
   * @param deviceId 设备 ID
   * @returns 会话信息
   */
  getSession(deviceId: string): ScrcpySession | null {
    return this.sessions.get(deviceId) || null;
  }

  /**
   * 获取所有会话
   *
   * @returns 会话列表
   */
  getAllSessions(): ScrcpySession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * 获取进程信息
   *
   * @param deviceId 设备 ID
   * @returns 进程信息
   */
  getProcessInfo(deviceId: string): ScrcpyProcessInfo | null {
    const process = this.processes.get(deviceId);
    const session = this.sessions.get(deviceId);

    if (!process || !session) {
      return null;
    }

    return {
      deviceId,
      pid: process.pid!,
      status: process.killed
        ? ScrcpyProcessStatus.STOPPED
        : ScrcpyProcessStatus.RUNNING,
      startedAt: session.createdAt,
      port: session.config.port!,
    };
  }

  /**
   * 获取 SCRCPY 进程
   *
   * @param deviceId 设备 ID
   * @returns ChildProcess 对象，如果不存在返回 null
   */
  getProcess(deviceId: string): ChildProcess | null {
    return this.processes.get(deviceId) || null;
  }

  /**
   * 检查会话是否存在
   *
   * @param deviceId 设备 ID
   * @returns 是否存在
   */
  hasSession(deviceId: string): boolean {
    return this.sessions.has(deviceId);
  }

  /**
   * 更新会话活跃时间
   *
   * @param deviceId 设备 ID
   */
  updateLastActive(deviceId: string): void {
    const session = this.sessions.get(deviceId);
    if (session) {
      session.lastActiveAt = new Date();
    }
  }

  /**
   * 启动 SCRCPY 进程
   *
   * @param deviceId 设备 ID
   * @param config SCRCPY 配置
   * @returns 子进程
   */
  private async spawnScrcpyProcess(
    deviceId: string,
    config: ScrcpyConfig,
  ): Promise<ChildProcess> {
    const args = this.buildScrcpyArgs(config);

    this.logger.debug(`Starting SCRCPY: ${this.scrcpyPath} ${args.join(" ")}`);

    const process = spawn(this.scrcpyPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    // 监听标准输出
    process.stdout?.on("data", (data) => {
      this.logger.debug(`[SCRCPY ${deviceId}] ${data.toString().trim()}`);
    });

    // 监听标准错误
    process.stderr?.on("data", (data) => {
      this.logger.error(`[SCRCPY ${deviceId}] ${data.toString().trim()}`);
    });

    // 监听进程退出
    process.on("exit", (code, signal) => {
      this.logger.log(
        `[SCRCPY ${deviceId}] Process exited: code=${code}, signal=${signal}`,
      );
      this.sessions.delete(deviceId);
      this.processes.delete(deviceId);
    });

    // 监听错误
    process.on("error", (error) => {
      this.logger.error(`[SCRCPY ${deviceId}] Process error:`, error);
      this.sessions.delete(deviceId);
      this.processes.delete(deviceId);
    });

    // 等待进程启动（简单延迟，实际应该等待端口监听）
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return process;
  }

  /**
   * 构建 SCRCPY 命令行参数
   *
   * @param config SCRCPY 配置
   * @returns 参数数组
   */
  private buildScrcpyArgs(config: ScrcpyConfig): string[] {
    const args: string[] = [];

    // 设备序列号
    args.push("-s", config.serial);

    // 视频配置
    if (!config.noVideo) {
      args.push("--video-bit-rate", config.videoBitRate!.toString());
      args.push("--video-codec", config.videoCodec!);
      if (config.maxSize && config.maxSize > 0) {
        args.push("--max-size", config.maxSize.toString());
      }
      if (config.maxFps && config.maxFps > 0) {
        args.push("--max-fps", config.maxFps.toString());
      }
    } else {
      args.push("--no-video");
    }

    // 音频配置
    if (!config.noAudio) {
      args.push("--audio-bit-rate", config.audioBitRate!.toString());
      args.push("--audio-codec", config.audioCodec!);
    } else {
      args.push("--no-audio");
    }

    // 其他选项
    if (config.showTouches) {
      args.push("--show-touches");
    }
    if (config.stayAwake) {
      args.push("--stay-awake");
    }
    if (config.turnScreenOff) {
      args.push("--turn-screen-off");
    }

    // 端口
    args.push("--port", config.port!.toString());

    // 无窗口模式（服务器模式）
    args.push("--no-display");

    return args;
  }

  /**
   * 分配端口
   *
   * @param deviceId 设备 ID
   * @returns 端口号
   */
  private allocatePort(deviceId: string): number {
    // 简单实现：基于设备 ID 哈希分配端口
    // Phase 2B: 使用端口管理器统一分配
    const hash = this.hashCode(deviceId);
    return this.portStart + (Math.abs(hash) % 1000);
  }

  /**
   * 字符串哈希
   *
   * @param str 字符串
   * @returns 哈希值
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  /**
   * 清理所有会话（服务停止时调用）
   */
  async cleanup(): Promise<void> {
    this.logger.log("Cleaning up all SCRCPY sessions...");

    const deviceIds = Array.from(this.sessions.keys());
    await Promise.all(deviceIds.map((id) => this.stopSession(id)));

    this.logger.log("All SCRCPY sessions cleaned up");
  }
}
