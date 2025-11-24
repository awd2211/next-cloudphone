import request from '@/utils/request';

/**
 * 5sim 高级功能 API 服务
 *
 * 提供 5sim 特有的高级功能接口调用
 */

/**
 * 订单查询参数接口
 */
export interface FiveSimOrderQueryParams {
  category?: 'activation' | 'hosting';
  limit?: number;
  offset?: number;
  order?: 'id' | 'date';
  reverse?: boolean;
}

/**
 * 订单响应接口
 */
export interface FiveSimOrder {
  id: number;
  phone: string;
  product: string;
  country?: string;
  operator: string;
  price: number;
  status: string;
  created_at: string;
  expires?: string;
  sms?: Array<{
    code: string;
    text: string;
    date: string;
  }>;
}

/**
 * 支付记录接口
 */
export interface FiveSimPayment {
  id: number;
  type: string;
  provider: string;
  amount: number;
  balance: number;
  created_at: string;
}

/**
 * 短信消息接口
 */
export interface FiveSimSmsMessage {
  id: number;
  created_at: string;
  date: string;
  sender: string;
  text: string;
  code: string;
}

/**
 * 国家接口
 */
export interface FiveSimCountry {
  name: string;
  iso: string;
  prefix: string;
}

/**
 * 运营商接口
 */
export interface FiveSimOperator {
  name: string;
  prices: Record<string, number>;
}

/**
 * 租用号码请求接口
 */
export interface RentNumberRequest {
  service: string;
  country: string;
  hours?: number;
}

/**
 * 租用号码响应接口
 */
export interface RentNumberResponse {
  activationId: string;
  phoneNumber: string;
  country: string;
  cost: number;
  expiresAt?: string;
}

/**
 * 重用号码请求接口
 */
export interface ReuseNumberRequest {
  product: string;
  phoneNumber: string;
}

/**
 * 获取订单列表
 */
export async function getOrders(params?: FiveSimOrderQueryParams): Promise<FiveSimOrder[]> {
  return request.get('/sms/5sim/orders', { params });
}

/**
 * 获取支付历史
 */
export async function getPayments(): Promise<FiveSimPayment[]> {
  return request.get('/sms/5sim/payments');
}

/**
 * 获取短信收件箱
 */
export async function getSmsInbox(orderId: string): Promise<FiveSimSmsMessage[]> {
  return request.get(`/sms/5sim/orders/${orderId}/inbox`);
}

/**
 * 获取价格上限
 */
export async function getMaxPrices(): Promise<Record<string, any>> {
  return request.get('/sms/5sim/max-prices');
}

/**
 * 租用号码（长期）
 */
export async function rentNumber(data: RentNumberRequest): Promise<RentNumberResponse> {
  return request.post('/sms/5sim/rent', data);
}

/**
 * 获取支持的国家列表
 */
export async function getCountries(): Promise<FiveSimCountry[]> {
  return request.get('/sms/5sim/countries');
}

/**
 * 获取指定国家的运营商列表
 */
export async function getOperators(country: string): Promise<FiveSimOperator[]> {
  return request.get(`/sms/5sim/countries/${country}/operators`);
}

/**
 * 标记号码为不可用
 */
export async function banNumber(orderId: string): Promise<{ success: boolean; message: string }> {
  return request.post(`/sms/5sim/orders/${orderId}/ban`);
}

/**
 * 重用之前的号码
 */
export async function reuseNumber(data: ReuseNumberRequest): Promise<RentNumberResponse> {
  return request.post('/sms/5sim/reuse', data);
}

/**
 * 清除5sim适配器缓存（管理员功能）
 */
export async function clearCache(): Promise<{ success: boolean; message: string }> {
  return request.post('/sms/5sim/cache/clear');
}
