import { Module } from "@nestjs/common";
import { HuaweiProvider } from "./huawei.provider";
import { HuaweiCphClient } from "./huawei-cph.client";

/**
 * HuaweiModule
 *
 * 华为云手机 CPH Provider 模块
 *
 * Phase 3: 华为云手机集成
 *
 * 功能：
 * - 云手机实例创建/销毁
 * - 云手机生命周期管理（启动/停止/重启）
 * - WebRTC 投屏连接信息获取
 * - 设备属性和状态查询
 *
 * 依赖：
 * - HuaweiCphClient - 华为 CPH SDK 客户端（当前为 mock 实现）
 * - HuaweiProvider - 实现 IDeviceProvider 接口
 *
 * 配置：
 * - HUAWEI_ACCESS_KEY - 华为云 AK
 * - HUAWEI_SECRET_KEY - 华为云 SK
 * - HUAWEI_REGION - 华为云区域（如 cn-north-4）
 * - HUAWEI_PROJECT_ID - 华为云项目 ID
 * - HUAWEI_DEFAULT_IMAGE_ID - 默认镜像 ID
 * - HUAWEI_DEFAULT_SERVER_ID - 默认服务器 ID
 */
@Module({
  providers: [
    HuaweiCphClient,
    HuaweiProvider,
  ],
  exports: [
    HuaweiProvider,
    HuaweiCphClient, // ✅ Export for CloudDeviceTokenService
  ],
})
export class HuaweiModule {}
