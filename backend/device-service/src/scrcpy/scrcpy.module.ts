import { Module, OnModuleDestroy } from "@nestjs/common";
import { ScrcpyService } from "./scrcpy.service";
import { ScrcpyGateway } from "./scrcpy.gateway";

/**
 * ScrcpyModule
 *
 * SCRCPY 屏幕镜像模块
 *
 * 功能：
 * - 管理 SCRCPY 进程
 * - 提供 WebSocket 流连接
 * - 支持触控输入控制
 *
 * 依赖：
 * - 需要安装 scrcpy 命令行工具
 * - 需要配置 SCRCPY_PATH 环境变量
 */
@Module({
  providers: [ScrcpyService, ScrcpyGateway],
  exports: [ScrcpyService, ScrcpyGateway],
})
export class ScrcpyModule implements OnModuleDestroy {
  constructor(private scrcpyService: ScrcpyService) {}

  /**
   * 模块销毁时清理所有 SCRCPY 会话
   */
  async onModuleDestroy() {
    await this.scrcpyService.cleanup();
  }
}
