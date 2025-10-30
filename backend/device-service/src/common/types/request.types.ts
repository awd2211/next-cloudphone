import { Request } from 'express';

/**
 * 扩展的 Request 接口，包含用户信息
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username?: string;
    email?: string;
    [key: string]: any;
  };
}
