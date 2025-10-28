/**
 * 时间和延迟相关常量
 */

// 请求超时
export const REQUEST_TIMEOUT = 10000; // 10秒

// 慢请求警告阈值
export const SLOW_REQUEST_THRESHOLD = 3000; // 3秒

// 轮询间隔
export const DEVICE_STATUS_POLL_INTERVAL = 5000; // 5秒
export const NOTIFICATION_POLL_INTERVAL = 30000; // 30秒

// 防抖延迟
export const SEARCH_DEBOUNCE_DELAY = 500; // 500ms
export const RESIZE_DEBOUNCE_DELAY = 200; // 200ms

// 重试延迟
export const RETRY_BASE_DELAY = 1000; // 1秒
export const RETRY_MAX_DELAY = 30000; // 30秒

// 缓存时间
export const CACHE_STALE_TIME = 30000; // 30秒
export const CACHE_GC_TIME = 300000; // 5分钟

// Toast 显示时间
export const SUCCESS_MESSAGE_DURATION = 2; // 2秒
export const ERROR_MESSAGE_DURATION = 3; // 3秒
export const WARNING_MESSAGE_DURATION = 3; // 3秒
