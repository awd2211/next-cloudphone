import { Device } from '@/types';
import dayjs from 'dayjs';
import { message } from 'antd';
import { exportToExcel, exportToCSV } from './export';
import { STATUS_CONFIG } from '@/components/Device';

/**
 * 设备导出工具函数
 */

/**
 * 将设备数据转换为导出格式
 */
export const transformDevicesForExport = (devices: Device[]) => {
  return devices.map((device) => ({
    设备ID: device.id,
    设备名称: device.name,
    状态: STATUS_CONFIG[device.status as keyof typeof STATUS_CONFIG]?.text || device.status,
    Android版本: device.androidVersion,
    CPU核心数: device.cpuCores,
    '内存(MB)': device.memoryMB,
    '存储(MB)': device.storageMB,
    IP地址: device.ipAddress || '-',
    VNC端口: device.vncPort || '-',
    创建时间: dayjs(device.createdAt).format('YYYY-MM-DD HH:mm:ss'),
  }));
};

/**
 * 导出设备列表为 Excel
 */
export const exportDevicesAsExcel = (devices: Device[]) => {
  const exportData = transformDevicesForExport(devices);
  exportToExcel(exportData, '设备列表');
  message.success('导出成功');
};

/**
 * 导出设备列表为 CSV
 */
export const exportDevicesAsCSV = (devices: Device[]) => {
  const exportData = transformDevicesForExport(devices);
  exportToCSV(exportData, '设备列表');
  message.success('导出成功');
};

/**
 * 导出设备列表为 JSON
 */
export const exportDevicesAsJSON = (devices: Device[]) => {
  const exportData = transformDevicesForExport(devices);
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  const exportFileDefaultName = `设备列表_${dayjs().format('YYYYMMDD_HHmmss')}.json`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();

  message.success('导出成功');
};
