import { Module } from '@nestjs/common';
import { AliyunProvider } from './aliyun.provider';
import { AliyunEcpClient } from './aliyun-ecp.client';

/**
 * AliyunModule
 *
 * 阿里云无影云手机 ECP Provider 模块
 *
 * 使用新版官方 SDK (2023-09-30 API):
 * - AliyunEcpClient: 新版官方 SDK (@alicloud/eds-aic20230930)
 * - AliyunProvider: 基于新版 SDK 的 Provider 实现
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
 */
@Module({
  providers: [
    // 新版客户端（2023-09-30 API）
    AliyunEcpClient,
    // 新版Provider - 使用新版客户端，支持实例组模式
    AliyunProvider,
  ],
  exports: [
    // 导出 Provider 供 DeviceProviderFactory 使用
    AliyunProvider,
    // 导出客户端供其他服务直接使用
    AliyunEcpClient,
  ],
})
export class AliyunModule {}
