/**
 * PostgreSQL 数值类型转换工具
 *
 * TypeORM 将 PostgreSQL decimal 类型返回为字符串以保持精度。
 * 这些工具函数用于在返回给前端之前将数值字符串转换为 JavaScript 数字。
 */

/**
 * 将可能是字符串的数值转换为数字
 * @param value - 可能是字符串或数字的值
 * @returns 转换后的数字
 */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return Number(value);
}

/**
 * 转换对象中指定字段的 decimal 值为数字
 * @param obj - 要转换的对象
 * @param fields - 要转换的字段名数组
 * @returns 转换后的新对象
 */
export function transformDecimalFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fields) {
    if (field in result) {
      (result as any)[field] = toNumber(result[field]);
    }
  }
  return result;
}

/**
 * 转换数组中每个对象的 decimal 字段
 * @param items - 对象数组
 * @param fields - 要转换的字段名数组
 * @returns 转换后的新数组
 */
export function transformDecimalFieldsInArray<T extends Record<string, any>>(
  items: T[],
  fields: (keyof T)[]
): T[] {
  return items.map((item) => transformDecimalFields(item, fields));
}
