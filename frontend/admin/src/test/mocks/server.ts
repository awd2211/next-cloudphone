/**
 * MSW (Mock Service Worker) 服务器配置
 *
 * 用于在测试环境中拦截 HTTP 请求并返回模拟数据
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// 创建 MSW server
export const server = setupServer(...handlers);
