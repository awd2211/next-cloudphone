import React from 'react';
import {
  AlipayCircleOutlined,
  WechatOutlined,
  CreditCardOutlined,
  BankOutlined,
} from '@ant-design/icons';
import type { FormInstance, GlobalToken } from 'antd';

/**
 * 支付方式配置文件
 *
 * 优化点:
 * 1. ✅ 集中管理支付方式类型配置（图标、颜色、名称）
 * 2. ✅ 动态表单字段配置（支付宝、微信、银行卡、信用卡）
 * 3. ✅ 表单验证规则统一管理
 * 4. ✅ 工具函数提取（图标、类型名称、默认标记）
 */

// ===== 支付方式类型定义 =====
export type PaymentType = 'alipay' | 'wechat' | 'bank_card' | 'credit_card';

export interface PaymentMethod {
  id: string;
  type: PaymentType;
  account?: string;
  cardNumber?: string;
  cardHolder?: string;
  bankName?: string;
  isDefault: boolean;
  createdAt: string;
}

// ===== 支付方式类型配置 =====
export interface PaymentTypeConfig {
  icon: React.ReactNode;
  color: string;
  displayName: string;
}

/**
 * 获取支付方式类型配置（支持主题 token）
 */
export const getPaymentTypeConfigWithToken = (token?: GlobalToken): Record<PaymentType, PaymentTypeConfig> => ({
  alipay: {
    icon: <AlipayCircleOutlined />,
    color: token?.colorPrimary || '#1677ff',
    displayName: '支付宝',
  },
  wechat: {
    icon: <WechatOutlined />,
    color: '#07c160', // 微信品牌色保持不变
    displayName: '微信支付',
  },
  bank_card: {
    icon: <BankOutlined />,
    color: token?.colorWarning || '#faad14',
    displayName: '银行卡',
  },
  credit_card: {
    icon: <CreditCardOutlined />,
    color: token?.purple || '#722ed1',
    displayName: '信用卡',
  },
});

/**
 * 支付方式类型配置（兼容旧代码）
 */
export const paymentTypeConfig = getPaymentTypeConfigWithToken();

// ===== 动态表单字段配置 =====
export interface FormFieldConfig {
  name: string;
  label: string;
  placeholder?: string;
  rules?: any[];
  inputType?: 'input' | 'alert' | 'select';
  alertMessage?: string;
  alertDescription?: string;
  options?: { label: string; value: string }[];
}

export const formFieldsByType: Record<PaymentType, FormFieldConfig[]> = {
  alipay: [
    {
      name: 'account',
      label: '支付宝账号',
      placeholder: '请输入支付宝账号（手机号或邮箱）',
      rules: [
        { required: true, message: '请输入支付宝账号' },
        { min: 5, message: '账号长度至少5位' },
      ],
      inputType: 'input',
    },
  ],
  wechat: [
    {
      name: 'wechatAlert',
      label: '',
      inputType: 'alert',
      alertMessage: '微信支付绑定',
      alertDescription: '请使用微信扫描下方二维码完成绑定',
    },
  ],
  bank_card: [
    {
      name: 'cardNumber',
      label: '卡号',
      placeholder: '请输入银行卡号',
      rules: [
        { required: true, message: '请输入银行卡号' },
        { pattern: /^\d{16,19}$/, message: '请输入16-19位卡号' },
      ],
      inputType: 'input',
    },
    {
      name: 'cardHolder',
      label: '持卡人姓名',
      placeholder: '请输入持卡人姓名',
      rules: [
        { required: true, message: '请输入持卡人姓名' },
        { min: 2, message: '姓名至少2个字符' },
      ],
      inputType: 'input',
    },
    {
      name: 'bankName',
      label: '开户银行',
      placeholder: '请选择开户银行',
      rules: [{ required: true, message: '请选择开户银行' }],
      inputType: 'select',
      options: [
        { label: '中国工商银行', value: 'ICBC' },
        { label: '中国建设银行', value: 'CCB' },
        { label: '中国农业银行', value: 'ABC' },
        { label: '中国银行', value: 'BOC' },
        { label: '交通银行', value: 'BOCOM' },
        { label: '招商银行', value: 'CMB' },
      ],
    },
  ],
  credit_card: [
    {
      name: 'cardNumber',
      label: '信用卡号',
      placeholder: '请输入信用卡号',
      rules: [
        { required: true, message: '请输入信用卡号' },
        { pattern: /^\d{16}$/, message: '请输入16位信用卡号' },
      ],
      inputType: 'input',
    },
    {
      name: 'cardHolder',
      label: '持卡人姓名',
      placeholder: '请输入持卡人姓名',
      rules: [
        { required: true, message: '请输入持卡人姓名' },
        { min: 2, message: '姓名至少2个字符' },
      ],
      inputType: 'input',
    },
    {
      name: 'cvv',
      label: 'CVV码',
      placeholder: '请输入3位CVV安全码',
      rules: [
        { required: true, message: '请输入CVV码' },
        { pattern: /^\d{3}$/, message: '请输入3位CVV码' },
      ],
      inputType: 'input',
    },
    {
      name: 'expiryDate',
      label: '有效期',
      placeholder: 'MM/YY',
      rules: [
        { required: true, message: '请输入有效期' },
        { pattern: /^(0[1-9]|1[0-2])\/\d{2}$/, message: '格式：MM/YY' },
      ],
      inputType: 'input',
    },
  ],
};

// ===== 支付方式选项配置 =====
export const paymentTypeOptions = [
  { label: '支付宝', value: 'alipay' },
  { label: '微信支付', value: 'wechat' },
  { label: '银行卡', value: 'bank_card' },
  { label: '信用卡', value: 'credit_card' },
];

// ===== 安全提示配置 =====
export const securityAlertConfig = {
  message: '支付信息安全保护',
  description: '您的支付信息已加密存储，平台不会保存您的完整卡号和密码信息。',
  type: 'info' as const,
  showIcon: true,
};

// ===== 使用指南配置 =====
export const usageGuideItems = [
  '添加支付方式后，可在充值、支付等场景中使用',
  '您可以设置一个默认支付方式，系统将优先使用默认方式',
  '如需修改支付信息，请先删除后重新添加',
  '删除支付方式不会影响已完成的交易记录',
];

// ===== 工具函数 =====

/**
 * 获取支付方式图标
 */
export const getPaymentIcon = (type: PaymentType): React.ReactNode => {
  return paymentTypeConfig[type]?.icon || <CreditCardOutlined />;
};

/**
 * 获取支付方式名称
 */
export const getPaymentTypeName = (type: PaymentType): string => {
  return paymentTypeConfig[type]?.displayName || '未知支付方式';
};

/**
 * 获取支付方式颜色
 */
export const getPaymentColor = (type: PaymentType, token?: GlobalToken): string => {
  const config = token ? getPaymentTypeConfigWithToken(token) : paymentTypeConfig;
  return config[type]?.color || '#000000';
};

/**
 * 格式化支付方式显示信息
 */
export const formatPaymentDisplay = (payment: PaymentMethod): string => {
  const typeName = getPaymentTypeName(payment.type);

  if (payment.type === 'alipay') {
    return `${typeName} (${maskAccount(payment.account || '')})`;
  }

  if (payment.type === 'wechat') {
    return `${typeName}`;
  }

  if (payment.type === 'bank_card' || payment.type === 'credit_card') {
    return `${typeName} (${maskCardNumber(payment.cardNumber || '')})`;
  }

  return typeName;
};

/**
 * 遮罩账号（显示前3后4位）
 */
export const maskAccount = (account: string): string => {
  if (account.length <= 7) return account;
  const start = account.slice(0, 3);
  const end = account.slice(-4);
  return `${start}****${end}`;
};

/**
 * 遮罩卡号（显示后4位）
 */
export const maskCardNumber = (cardNumber: string): string => {
  if (cardNumber.length <= 4) return cardNumber;
  return `**** **** **** ${cardNumber.slice(-4)}`;
};

/**
 * 获取默认标签配置
 */
export const getDefaultTag = (isDefault: boolean) => {
  return isDefault
    ? { color: 'green', text: '默认' }
    : undefined;
};

/**
 * 根据支付类型获取表单字段配置
 */
export const getFormFieldsByType = (type: PaymentType | undefined): FormFieldConfig[] => {
  if (!type) return [];
  return formFieldsByType[type] || [];
};

/**
 * 验证支付方式表单
 */
export const validatePaymentForm = async (
  form: FormInstance,
  _type: PaymentType
): Promise<boolean> => {
  try {
    await form.validateFields();
    return true;
  } catch (error) {
    return false;
  }
};
