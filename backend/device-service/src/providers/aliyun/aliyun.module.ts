import { Module } from '@nestjs/common';
import { AliyunProvider } from './aliyun.provider';
import { AliyunProviderV2 } from './aliyun-v2.provider';
import { AliyunEcpClient } from './aliyun-ecp.client';
import { AliyunEcpV2Client } from './aliyun-ecp-v2.client';

/**
 * AliyunModule
 *
 * 阿里云无影云手机 ECP Provider 模块
 *
 * 支持两种SDK版本：
 * - AliyunEcpClient: 旧版 pop-core SDK (2020-08-14 API)
 * - AliyunEcpV2Client: 新版官方 SDK (2023-09-30 API) - 推荐使用
 *
 * 新版API特点：
 * - 实例组模式：创建实例组 → 自动创建实例
 * - 完整的ADB支持 (StartInstanceAdb/StopInstanceAdb)
 * - 监控指标获取 (DescribeMetricLast)
 * - 密钥对管理 (CreateKeyPair/AttachKeyPair)
 * - 截图功能 (CreateScreenshot)
 * - 流协同 (GenerateCoordinationCode)
 *
 * 配置环境变量：
 * - ALIYUN_ACCESS_KEY_ID - 阿里云 AccessKey ID
 * - ALIYUN_ACCESS_KEY_SECRET - 阿里云 AccessKey Secret
 * - ALIYUN_REGION - 阿里云区域（如 cn-hangzhou, ap-southeast-1）
 * - ALIYUN_ECP_ENDPOINT - ECP API端点（可选）
 * - ALIYUN_DEFAULT_OFFICE_SITE_ID - 默认网络ID
 * - ALIYUN_DEFAULT_VSWITCH_ID - 默认虚拟交换机 ID
 * - ALIYUN_DEFAULT_KEY_PAIR_ID - 默认密钥对ID
 * - ALIYUN_DEFAULT_IMAGE_ID - 默认镜像 ID
 *
 * 注意：
 * - WebRTC Token 有效期只有 30 秒，需要频繁刷新
 * - ADB 连接需要先调用 StartInstanceAdb 开启
 * - 使用 ALIYUN_SDK_VERSION=v2 启用新版SDK（默认使用旧版保持兼容）
 */
@Module({
  providers: [
    // 旧版客户端（兼容 2020-08-14 API）
    AliyunEcpClient,
    // 新版客户端（推荐 2023-09-30 API）
    AliyunEcpV2Client,
    // 旧版Provider - 使用旧版客户端
    AliyunProvider,
    // 新版Provider - 使用新版客户端，支持实例组模式
    AliyunProviderV2,
  ],
  exports: [
    // 两个版本的Provider都导出，由DeviceProviderFactory决定使用哪个
    AliyunProvider,
    AliyunProviderV2,
    // 客户端也导出，供其他服务直接使用
    AliyunEcpClient,
    AliyunEcpV2Client,
  ],
})
export class AliyunModule {}
