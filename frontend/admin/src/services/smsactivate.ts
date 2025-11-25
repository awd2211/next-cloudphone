/**
 * SMS-Activate 高级功能 API
 * 提供 SMS-Activate 特有功能的前端调用
 */
import { api } from '@/utils/api';

// ============================================
// 类型定义
// ============================================

/** SMS-Activate 国家信息 */
export interface SmsActivateCountry {
  id: number;
  rus: string;
  eng: string;
  chn: string;
  visible: boolean;
  retry: boolean;
  rent: boolean;
  multiService: boolean;
}

/** SMS-Activate 热门国家 */
export interface SmsActivateTopCountry {
  country: number;
  count: number;
  price: number;
  retail_price: number;
}

/** SMS-Activate 当前激活 */
export interface SmsActivateCurrentActivation {
  activationId: string;
  phoneNumber: string;
  activationCost: string;
  activationStatus: string;
  smsCode: string | null;
  smsText: string | null;
  activationTime: string;
  canGetAnotherSms: boolean;
  countryCode: string;
  serviceCode: string;
}

/** SMS-Activate 租赁短信 */
export interface SmsActivateRentSms {
  phoneFrom: string;
  text: string;
  date: string;
}

/** SMS-Activate 租赁状态 */
export interface SmsActivateRentStatus {
  status: string;
  quantity: number;
  values: SmsActivateRentSms[];
}

/** SMS-Activate 租赁列表项 */
export interface SmsActivateRentItem {
  id: number;
  phone: string;
  status: string;
  endDate: string;
}

/** SMS-Activate 余额和返现 */
export interface SmsActivateBalanceAndCashBack {
  balance: number;
  cashBack: number;
  currency: string;
}

/** SMS-Activate 完整短信 */
export interface SmsActivateFullSms {
  code: string | null;
  fullSms: string | null;
}

/** SMS-Activate 价格信息 */
export interface SmsActivatePriceInfo {
  [countryId: string]: {
    [serviceCode: string]: {
      cost: number;
      count: number;
    };
  };
}

/** SMS-Activate 号码可用状态 */
export interface SmsActivateNumbersStatus {
  [serviceCode: string]: number;
}

/** SMS-Activate 租赁服务和国家 */
export interface SmsActivateRentServicesAndCountries {
  countries: {
    [countryId: string]: {
      name: string;
      count: number;
    };
  };
  operators: {
    [countryId: string]: string[];
  };
  services: {
    [serviceCode: string]: string;
  };
}

/** 获取号码请求参数 */
export interface GetNumberParams {
  service: string;
  country?: number;
  operator?: string;
  forward?: boolean;
  phoneException?: string;
}

/** 多服务号码请求参数 */
export interface MultiServiceNumberParams {
  services: string[];
  country?: number;
  operator?: string;
  forward?: string[];
  phoneException?: string;
}

/** 租赁号码请求参数 */
export interface RentNumberParams {
  service: string;
  country?: number;
  hours?: number;
  operator?: string;
  webhookUrl?: string;
}

/** 通用成功响应 */
export interface SuccessResponse {
  success: boolean;
  message: string;
  data?: any;
}

/** 服务代码映射 */
export interface ServiceMapping {
  mapping: Record<string, string>;
}

// ============================================
// 账户相关 API
// ============================================

/** 获取余额 */
export const getBalance = (): Promise<{ balance: number; currency: string }> =>
  api.get('/sms/sms-activate/balance');

/** 获取余额和返现 */
export const getBalanceAndCashBack = (): Promise<SmsActivateBalanceAndCashBack> =>
  api.get('/sms/sms-activate/balance-cashback');

// ============================================
// 国家和运营商 API
// ============================================

/** 获取国家列表 */
export const getCountries = (): Promise<SmsActivateCountry[]> =>
  api.get('/sms/sms-activate/countries');

/** 获取可用号码数量 */
export const getNumbersStatus = (params?: {
  country?: number;
  operator?: string;
}): Promise<SmsActivateNumbersStatus> =>
  api.get('/sms/sms-activate/numbers-status', { params });

/** 获取热门国家 */
export const getTopCountriesByService = (params: {
  service: string;
  freePrice?: boolean;
}): Promise<SmsActivateTopCountry[]> =>
  api.get('/sms/sms-activate/top-countries', { params });

// ============================================
// 号码获取 API
// ============================================

/** 获取虚拟号码 */
export const getNumber = (data: GetNumberParams): Promise<{
  activationId: string;
  phoneNumber: string;
  cost: number;
}> =>
  api.post('/sms/sms-activate/number', data);

/** 获取多服务号码 */
export const getMultiServiceNumber = (data: MultiServiceNumberParams): Promise<{
  id: number;
  phone: string;
  activation: Record<string, { id: number; service: string }>;
}> =>
  api.post('/sms/sms-activate/multi-service-number', data);

/** 获取额外服务 */
export const getAdditionalService = (data: {
  service: string;
  parentActivationId: string;
}): Promise<{
  activationId: string;
  phoneNumber: string;
  cost: number;
}> =>
  api.post('/sms/sms-activate/additional-service', data);

// ============================================
// 激活状态管理 API
// ============================================

/** 获取激活状态 */
export const getStatus = (activationId: string): Promise<{
  status: string;
  code: string | null;
  message?: string;
}> =>
  api.get(`/sms/sms-activate/activations/${activationId}/status`);

/** 获取完整短信 */
export const getFullSms = (activationId: string): Promise<SmsActivateFullSms> =>
  api.get(`/sms/sms-activate/activations/${activationId}/full-sms`);

/** 设置激活状态 */
export const setStatus = (data: {
  activationId: string;
  status: 1 | 3 | 6 | 8;
}): Promise<SuccessResponse> =>
  api.post('/sms/sms-activate/activations/set-status', data);

/** 完成激活 */
export const finishActivation = (activationId: string): Promise<SuccessResponse> =>
  api.post(`/sms/sms-activate/activations/${activationId}/finish`);

/** 取消激活 */
export const cancelActivation = (activationId: string): Promise<SuccessResponse> =>
  api.post(`/sms/sms-activate/activations/${activationId}/cancel`);

/** 请求重发短信 */
export const requestResend = (activationId: string): Promise<SuccessResponse> =>
  api.post(`/sms/sms-activate/activations/${activationId}/resend`);

/** 获取当前激活列表 */
export const getCurrentActivations = (): Promise<SmsActivateCurrentActivation[]> =>
  api.get('/sms/sms-activate/activations/current');

// ============================================
// 定价 API
// ============================================

/** 获取价格 */
export const getPrices = (params?: {
  service?: string;
  country?: number;
}): Promise<SmsActivatePriceInfo> =>
  api.get('/sms/sms-activate/prices', { params });

/** 获取服务和成本 */
export const getServicesAndCost = (country?: number): Promise<SmsActivatePriceInfo> =>
  api.get('/sms/sms-activate/services-cost', { params: { country } });

// ============================================
// 租赁管理 API
// ============================================

/** 获取租赁支持的服务和国家 */
export const getRentServicesAndCountries = (params?: {
  time?: number;
  operator?: string;
  country?: number;
}): Promise<SmsActivateRentServicesAndCountries> =>
  api.get('/sms/sms-activate/rent/services-countries', { params });

/** 租赁号码 */
export const rentNumber = (data: RentNumberParams): Promise<{
  activationId: string;
  phoneNumber: string;
  cost: number;
}> =>
  api.post('/sms/sms-activate/rent', data);

/** 获取租赁状态 */
export const getRentStatus = (rentId: string): Promise<SmsActivateRentStatus> =>
  api.get(`/sms/sms-activate/rent/${rentId}/status`);

/** 设置租赁状态 */
export const setRentStatus = (data: {
  rentId: string;
  status: 1 | 2;
}): Promise<SuccessResponse> =>
  api.post('/sms/sms-activate/rent/set-status', data);

/** 完成租赁 */
export const finishRent = (rentId: string): Promise<SuccessResponse> =>
  api.post(`/sms/sms-activate/rent/${rentId}/finish`);

/** 取消租赁 */
export const cancelRent = (rentId: string): Promise<SuccessResponse> =>
  api.post(`/sms/sms-activate/rent/${rentId}/cancel`);

/** 获取租赁列表 */
export const getRentList = (): Promise<SmsActivateRentItem[]> =>
  api.get('/sms/sms-activate/rent/list');

// ============================================
// 其他 API
// ============================================

/** 获取 QIWI 充值信息 */
export const getQiwiRequisites = (): Promise<{
  wallet: string;
  comment: string;
}> =>
  api.get('/sms/sms-activate/qiwi-requisites');

/** 获取服务代码映射 */
export const getServiceMapping = (): Promise<ServiceMapping> =>
  api.get('/sms/sms-activate/service-mapping');

/** 清除缓存 */
export const clearCache = (): Promise<SuccessResponse> =>
  api.post('/sms/sms-activate/cache/clear');

/** 健康检查 */
export const healthCheck = (): Promise<{
  healthy: boolean;
  provider: string;
  timestamp: string;
}> =>
  api.get('/sms/sms-activate/health');

// ============================================
// 导出所有
// ============================================

export default {
  // 账户
  getBalance,
  getBalanceAndCashBack,
  // 国家和运营商
  getCountries,
  getNumbersStatus,
  getTopCountriesByService,
  // 号码获取
  getNumber,
  getMultiServiceNumber,
  getAdditionalService,
  // 激活管理
  getStatus,
  getFullSms,
  setStatus,
  finishActivation,
  cancelActivation,
  requestResend,
  getCurrentActivations,
  // 定价
  getPrices,
  getServicesAndCost,
  // 租赁管理
  getRentServicesAndCountries,
  rentNumber,
  getRentStatus,
  setRentStatus,
  finishRent,
  cancelRent,
  getRentList,
  // 其他
  getQiwiRequisites,
  getServiceMapping,
  clearCache,
  healthCheck,
};
