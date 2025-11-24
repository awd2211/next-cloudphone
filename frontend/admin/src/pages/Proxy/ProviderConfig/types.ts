/**
 * 代理提供商配置表单类型定义
 */

export type ProviderType = 'ipidea' | 'kookeey' | 'brightdata' | 'oxylabs' | 'iproyal' | 'smartproxy';

export type FieldType = 'text' | 'password' | 'number' | 'select' | 'url';

export interface FieldOption {
  label: string;
  value: string | number;
}

export interface FieldConfig {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  placeholder?: string;
  tooltip?: string;
  defaultValue?: any;
  options?: FieldOption[];
  pattern?: RegExp;
  patternMessage?: string;
  min?: number;
  max?: number;
  addonBefore?: string;
  addonAfter?: string;
}

export interface ProviderFieldsConfig {
  [key: string]: FieldConfig[];
}
