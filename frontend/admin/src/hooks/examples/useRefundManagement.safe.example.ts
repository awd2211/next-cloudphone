// @ts-nocheck
/**
 * useRefundManagement - 重构示例
 *
 * 展示如何使用 useSafeApi + Zod Schema 重构现有 hook
 * 对比原版实现，新版提供：
 * - ✅ 运行时类型验证
 * - ✅ 自动错误处理
 * - ✅ 类型安全的数据访问
 * - ✅ 开发环境下的详细错误日志
 */

import { useState, useCallback } from 'react';
import { message } from 'antd';
import { useSafeApi } from '../useSafeApi';
import { RefundsArraySchema } from '@/schemas/api.schemas';
import {
  getPendingRefunds,
  approveRefund,
  rejectRefund,
  type PaymentDetail,
} from '@/services/payment-admin';

/**
 * 🆕 使用 useSafeApi 的新版本
 */
export const useRefundManagementSafe = () => {
  const [selectedRefund, _setSelectedRefund] = useState<PaymentDetail | null>(null);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [detailModalVisible, _setDetailModalVisible] = useState(false);

  // ✅ 使用 useSafeApi 进行类型安全的数据加载
  const {
    data: refunds,
    loading,
    execute: loadRefunds,
  } = useSafeApi(
    getPendingRefunds,
    RefundsArraySchema, // 🔒 Zod schema 验证
    {
      errorMessage: '加载退款列表失败',
      fallbackValue: [], // 🛡️ 失败时返回空数组，避免 Table 崩溃
      logValidationErrors: true,
    }
  );

  // ✅ 批准退款 - 带验证的异步操作
  const handleApprove = useCallback(
    async (values: { adminNote?: string }) => {
      if (!selectedRefund) return;

      try {
        await approveRefund(selectedRefund.id, values.adminNote);
        message.success('退款已批准');
        setApproveModalVisible(false);
        loadRefunds(); // 重新加载数据
      } catch (_error) {
        message.error('批准退款失败');
      }
    },
    [selectedRefund, loadRefunds]
  );

  // ✅ 拒绝退款
  const handleReject = useCallback(
    async (values: { reason: string; adminNote?: string }) => {
      if (!selectedRefund) return;

      try {
        await rejectRefund(selectedRefund.id, values.reason, values.adminNote);
        message.success('退款已拒绝');
        setRejectModalVisible(false);
        loadRefunds();
      } catch (_error) {
        message.error('拒绝退款失败');
      }
    },
    [selectedRefund, loadRefunds]
  );

  // ... 其他方法保持不变

  return {
    // 🎯 数据类型已被 Zod 验证，确保是数组
    refunds: refunds || [], // TypeScript 知道这是 PaymentDetail[]
    loading,
    selectedRefund,
    approveModalVisible,
    rejectModalVisible,
    detailModalVisible,
    // 操作
    loadRefunds,
    handleApprove,
    handleReject,
    // ... 其他操作
  };
};

// ============ 对比：旧版本 vs 新版本 ============

/**
 * ❌ 旧版本的问题：
 *
 * 1. 无运行时验证
 *    const refunds = await getPendingRefunds();
 *    setRefunds(refunds); // 假设 refunds 是数组，但运行时可能不是
 *
 * 2. 手动错误处理
 *    catch (_error) {
 *      message.error('加载退款列表失败');
 *      setRefunds([]); // 容易忘记重置状态
 *    }
 *
 * 3. 没有类型验证
 *    即使 TypeScript 类型标注为 PaymentDetail[]，
 *    运行时 API 可能返回 null、undefined 或其他类型
 *
 * 4. 调试困难
 *    当数据格式不对时，只看到 "xxx is not a function"，
 *    不知道哪个字段错了
 */

/**
 * ✅ 新版本的优势：
 *
 * 1. 运行时类型验证
 *    useSafeApi(..., RefundsArraySchema)
 *    Zod 会验证每个字段，确保数据结构正确
 *
 * 2. 自动错误处理
 *    fallbackValue: [] 确保失败时返回安全的默认值
 *    无需在 catch 中手动设置
 *
 * 3. 详细的错误日志 (开发环境)
 *    console.error('API响应验证失败:', {
 *      response,
 *      errors: validationResult.error.errors,
 *    });
 *    清楚地知道哪个字段验证失败
 *
 * 4. TypeScript 类型推导
 *    refunds 的类型自动从 RefundsArraySchema 推导
 *    无需手动标注类型
 */

// ============ 性能影响分析 ============

/**
 * Zod 验证的性能开销：
 *
 * - 小型数组 (< 100条): ~1-5ms (可忽略)
 * - 中型数组 (100-1000条): ~10-50ms (可接受)
 * - 大型数组 (> 1000条): ~100ms+ (考虑优化)
 *
 * 优化策略：
 * 1. 生产环境可以使用 schema.parse() 的缓存版本
 * 2. 对于超大数据集，只验证前N条 + 抽样验证
 * 3. 使用 z.lazy() 进行惰性验证
 */

// ============ 最佳实践建议 ============

/**
 * 1. 何时使用 useSafeApi：
 *    ✅ 数组数据（Table、List组件的 dataSource）
 *    ✅ 关键业务数据（支付、订单、用户信息）
 *    ✅ 容易出错的API（第三方API、不稳定的后端）
 *    ❌ 简单的布尔值、字符串返回值
 *    ❌ 性能敏感的高频调用
 *
 * 2. Schema 设计原则：
 *    - 必需字段用 required
 *    - 可选字段用 .optional()
 *    - 使用 .nullable() 处理可能为 null 的字段
 *    - 为枚举值使用 z.enum() 提供类型安全
 *
 * 3. 错误处理策略：
 *    - 使用 fallbackValue 提供安全的默认值
 *    - errorMessage 要明确具体的操作
 *    - 开发环境启用 logValidationErrors
 *    - 生产环境集成 Sentry 等监控工具
 */
