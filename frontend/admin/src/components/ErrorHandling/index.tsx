/**
 * 错误处理和用户反馈组件库
 */

export { default as ErrorBoundary } from './ErrorBoundary';
export { default as LoadingState } from '../Feedback/LoadingState';

// 导出错误处理工具
export {
  handleError,
  normalizeError,
  classifyError,
  createErrorHandler,
  queryErrorHandler,
  formSubmitErrorHandler,
  ErrorType,
  type AppError,
  type ErrorHandlerConfig,
} from '@/utils/errorHandling';
