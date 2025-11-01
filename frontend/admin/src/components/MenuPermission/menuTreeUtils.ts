/**
 * Menu Tree 工具函数
 * 提供菜单树相关的转换和查找功能
 */
import type { MenuItem } from '@/types';

/**
 * 递归过滤菜单
 */
export const filterMenusByName = (items: MenuItem[], keyword: string): MenuItem[] => {
  const filtered: MenuItem[] = [];

  items.forEach((item) => {
    const match =
      item.name.toLowerCase().includes(keyword.toLowerCase()) ||
      item.path.toLowerCase().includes(keyword.toLowerCase());

    let children: MenuItem[] = [];
    if (item.children) {
      children = filterMenusByName(item.children, keyword);
    }

    if (match || children.length > 0) {
      filtered.push({
        ...item,
        children: children.length > 0 ? children : item.children,
      });
    }
  });

  return filtered;
};

/**
 * 获取所有父节点的key
 */
export const getAllParentKeys = (items: MenuItem[], parentKeys: string[] = []): string[] => {
  const keys = [...parentKeys];

  items.forEach((item) => {
    keys.push(item.id);
    if (item.children) {
      keys.push(...getAllParentKeys(item.children, []));
    }
  });

  return keys;
};

/**
 * 递归查找菜单
 */
export const findMenuById = (items: MenuItem[], id: string): MenuItem | null => {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findMenuById(item.children, id);
      if (found) return found;
    }
  }
  return null;
};

/**
 * 统计菜单数量
 */
export const countMenus = (items: MenuItem[]): number => {
  let count = items.length;
  items.forEach((item) => {
    if (item.children) {
      count += countMenus(item.children);
    }
  });
  return count;
};
