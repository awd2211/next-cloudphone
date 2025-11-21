/**
 * MSW Handlers Index
 * 导出所有 API handlers
 */
import { authHandlers } from './auth';
import { userHandlers } from './user';

export const handlers = [...authHandlers, ...userHandlers];
