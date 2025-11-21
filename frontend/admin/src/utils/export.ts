/**
 * ✅ XLSX 导出工具（优化版 - 懒加载）
 *
 * XLSX 库体积约 800KB，按需加载可显著减少首屏包体积
 * 只在用户真正点击导出按钮时才加载 XLSX 库
 *
 * 优化前: XLSX 直接打包到 main bundle (800KB)
 * 优化后: XLSX 独立 chunk，首次导出时才加载
 */

// ✅ 懒加载 XLSX 库
const loadXLSX = async () => {
  const XLSX = await import('xlsx');
  return XLSX;
};

/**
 * 导出数据到Excel（懒加载版本）
 * @param data 要导出的数据
 * @param filename 文件名（不含扩展名）
 * @param sheetName 工作表名称
 */
export const exportToExcel = async <T = any>(
  data: T[],
  filename: string,
  sheetName: string = 'Sheet1'
) => {
  try {
    // ✅ 按需加载 XLSX 库（首次加载约 800KB）
    // 这是动态 import，不是 API 调用，无需 useSafeApi
    // eslint-disable-next-line local/no-unsafe-array-assignment
    const XLSX = await loadXLSX();

    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 导出文件
    XLSX.writeFile(workbook, `${filename}.xlsx`);

    return { success: true };
  } catch (_error) {
    console.error('[Export] Failed to load XLSX library:', error);
    return {
      success: false,
      error: 'Excel 导出库加载失败，请刷新后重试',
    };
  }
};

/**
 * 导出数据到CSV（懒加载版本）
 * @param data 要导出的数据
 * @param filename 文件名（不含扩展名）
 */
export const exportToCSV = async <T = any>(data: T[], filename: string) => {
  try {
    // ✅ 按需加载 XLSX 库
    const XLSX = await loadXLSX();

    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 转换为CSV
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    // 创建Blob
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });

    // 创建下载链接
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 清理URL
    setTimeout(() => URL.revokeObjectURL(url), 100);

    return { success: true };
  } catch (_error) {
    console.error('[Export] Failed to load XLSX library:', error);
    return {
      success: false,
      error: 'CSV 导出库加载失败，请刷新后重试',
    };
  }
};

/**
 * ✅ 使用示例：
 *
 * // BEFORE: 同步调用
 * exportToExcel(data, 'users');
 *
 * // AFTER: 异步调用（支持加载状态）
 * const handleExport = async () => {
 *   message.loading('正在准备导出...');
 *   const result = await exportToExcel(data, 'users');
 *
 *   if (result.success) {
 *     message.success('导出成功');
 *   } else {
 *     message.error(result.error);
 *   }
 * };
 */
