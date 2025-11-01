/**
 * App Review 工具函数
 */

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小字符串
 */
export const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
