/**
 * 消息文本常量
 */

// 通用消息
export const MESSAGES = {
  // 成功消息
  SUCCESS: {
    CREATE: '创建成功',
    UPDATE: '更新成功',
    DELETE: '删除成功',
    SAVE: '保存成功',
    SUBMIT: '提交成功',
    UPLOAD: '上传成功',
    DOWNLOAD: '下载成功',
    COPY: '复制成功',
    SEND: '发送成功',
  },

  // 错误消息
  ERROR: {
    CREATE: '创建失败',
    UPDATE: '更新失败',
    DELETE: '删除失败',
    SAVE: '保存失败',
    SUBMIT: '提交失败',
    UPLOAD: '上传失败',
    DOWNLOAD: '下载失败',
    LOAD: '加载失败',
    NETWORK: '网络错误，请检查网络连接',
    TIMEOUT: '请求超时，请稍后再试',
    UNAUTHORIZED: '未授权，请重新登录',
    FORBIDDEN: '没有权限访问此资源',
    NOT_FOUND: '请求的资源不存在',
    SERVER_ERROR: '服务器内部错误',
    UNKNOWN: '未知错误',
  },

  // 警告消息
  WARNING: {
    SELECT_ITEM: '请先选择项目',
    UNSAVED_CHANGES: '有未保存的更改',
    CONFIRM_DELETE: '确定要删除吗？此操作不可恢复！',
    CONFIRM_LOGOUT: '确定要退出登录吗？',
    FILE_TOO_LARGE: '文件大小超过限制',
    INVALID_FORMAT: '文件格式不正确',
  },

  // 信息消息
  INFO: {
    LOADING: '加载中...',
    PROCESSING: '处理中...',
    SAVING: '保存中...',
    UPLOADING: '上传中...',
    DOWNLOADING: '下载中...',
    NO_DATA: '暂无数据',
    EMPTY_LIST: '列表为空',
  },

  // 表单验证
  VALIDATION: {
    REQUIRED: '此字段为必填项',
    EMAIL: '请输入有效的邮箱地址',
    PHONE: '请输入有效的手机号码',
    PASSWORD: '密码长度至少为 8 位',
    PASSWORD_MISMATCH: '两次输入的密码不一致',
    MIN_LENGTH: (min: number) => `最少输入 ${min} 个字符`,
    MAX_LENGTH: (max: number) => `最多输入 ${max} 个字符`,
    MIN_VALUE: (min: number) => `最小值为 ${min}`,
    MAX_VALUE: (max: number) => `最大值为 ${max}`,
  },
} as const;

// 设备相关消息
export const DEVICE_MESSAGES = {
  START_SUCCESS: '设备启动成功',
  START_FAILED: '设备启动失败',
  STOP_SUCCESS: '设备停止成功',
  STOP_FAILED: '设备停止失败',
  DELETE_CONFIRM: '确定要删除此设备吗？此操作不可恢复！',
  BATCH_START_CONFIRM: (count: number) => `确定要启动选中的 ${count} 个设备吗？`,
  BATCH_STOP_CONFIRM: (count: number) => `确定要停止选中的 ${count} 个设备吗？`,
  BATCH_DELETE_CONFIRM: (count: number) => `确定要删除选中的 ${count} 个设备吗？此操作不可恢复！`,
} as const;

// 用户相关消息
export const USER_MESSAGES = {
  BAN_CONFIRM: '确定要封禁此用户吗？',
  UNBAN_CONFIRM: '确定要解封此用户吗？',
  RECHARGE_SUCCESS: '充值成功',
  DEDUCT_SUCCESS: '扣款成功',
  PASSWORD_RESET_SUCCESS: '密码重置成功',
} as const;
