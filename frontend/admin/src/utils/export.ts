import * as XLSX from 'xlsx';

/**
 * 导出数据到Excel
 * @param data 要导出的数据
 * @param filename 文件名（不含扩展名）
 * @param sheetName 工作表名称
 */
export const exportToExcel = <T = any>(
  data: T[],
  filename: string,
  sheetName: string = 'Sheet1'
) => {
  // 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(data);

  // 创建工作簿
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // 导出文件
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * 导出数据到CSV
 * @param data 要导出的数据
 * @param filename 文件名（不含扩展名）
 */
export const exportToCSV = <T = any>(data: T[], filename: string) => {
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
};
