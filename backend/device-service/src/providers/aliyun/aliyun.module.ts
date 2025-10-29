import { Module } from "@nestjs/common";
import { AliyunProvider } from "./aliyun.provider";
import { AliyunEcpClient } from "./aliyun-ecp.client";

/**
 * AliyunModule
 *
 * 阿里云国际云手机 ECP Provider 模块
 *
 * Phase 4: 阿里云云手机集成
 *
 * 功能：
 * - 云手机实例创建/销毁
 * - 云手机生命周期管理（启动/停止/重启）
 * - WebRTC 投屏连接信息获取 (Token 30秒有效期)
 * - 设备属性和状态查询
 * - 支持 ADB 连接 (需公网 IP)
 *
 * 依赖：
 * - AliyunEcpClient - 阿里云 ECP SDK 客户端（当前为 mock 实现）
 * - AliyunProvider - 实现 IDeviceProvider 接口
 *
 * 配置：
 * - ALIYUN_ACCESS_KEY_ID - 阿里云 AccessKey ID
 * - ALIYUN_ACCESS_KEY_SECRET - 阿里云 AccessKey Secret
 * - ALIYUN_REGION - 阿里云区域（如 cn-hangzhou, ap-southeast-1）
 * - ALIYUN_DEFAULT_ZONE_ID - 默认可用区 ID
 * - ALIYUN_DEFAULT_IMAGE_ID - 默认镜像 ID
 * - ALIYUN_DEFAULT_SECURITY_GROUP_ID - 默认安全组 ID
 * - ALIYUN_DEFAULT_VSWITCH_ID - 默认虚拟交换机 ID
 *
 * 注意：
 * - WebRTC Token 有效期只有 30 秒，需要频繁刷新
 * - ADB 连接需要公网 IP，需在安全组中放行端口 5555
 */
@Module({
  providers: [
    AliyunEcpClient,
    AliyunProvider,
  ],
  exports: [
    AliyunProvider,
    AliyunEcpClient, // ✅ Export for CloudDeviceTokenService
  ],
})
export class AliyunModule {}
