/**
 * CMS 内容管理服务
 * 管理官网内容：设置、页面内容、招聘、法律文档、案例、定价等
 */
import request from '@/utils/request';

// ==================== 类型定义 ====================

export interface SiteSetting {
  id: string;
  key: string;
  value: string;
  category: 'general' | 'contact' | 'social' | 'seo' | 'company';
  description?: string;
  valueType: 'string' | 'number' | 'boolean' | 'json';
  createdAt: string;
  updatedAt: string;
}

export interface CmsContent {
  id: string;
  page: string;
  section: string;
  contentKey: string;
  content: Record<string, any>;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface JobPosition {
  id: string;
  title: string;
  department: string;
  location: string;
  salaryRange?: string;
  description: string;
  requirements?: string[];
  responsibilities?: string[];
  tags?: string[];
  employmentType: 'full-time' | 'part-time' | 'contract' | 'intern';
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface LegalDocument {
  id: string;
  type: 'privacy' | 'terms' | 'refund' | 'sla' | 'security';
  title: string;
  content: string;
  contentType: 'html' | 'markdown';
  version: string;
  effectiveDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseStudy {
  id: string;
  clientName: string;
  clientLogo?: string;
  industry: string;
  challenge: string;
  solution: string;
  results?: Record<string, any>;
  testimonial?: Record<string, any>;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PricingFeature {
  name: string;
  limit?: string;
  included: boolean;
}

export interface PricingPlan {
  id: string;
  name: string;
  monthlyPrice?: string;
  yearlyPrice?: string;
  isCustomPrice: boolean;
  tag?: string;
  description: string;
  features: PricingFeature[];
  highlightFeatures?: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ==================== Site Settings ====================

/**
 * 获取所有网站设置（管理接口）
 */
export const getAllSettings = async (): Promise<SiteSetting[]> => {
  return request.get('/cms/settings/all');
};

/**
 * 获取格式化的网站设置
 */
export const getFormattedSettings = async (): Promise<Record<string, any>> => {
  return request.get('/cms/settings');
};

/**
 * 按分类获取设置
 */
export const getSettingsByCategory = async (category: string): Promise<SiteSetting[]> => {
  return request.get(`/cms/settings/category/${category}`);
};

/**
 * 更新单个设置
 */
export const updateSetting = async (key: string, value: string): Promise<SiteSetting> => {
  return request.put(`/cms/settings/${key}`, { value });
};

/**
 * 批量更新设置
 */
export const batchUpdateSettings = async (settings: Record<string, string>): Promise<SiteSetting[]> => {
  return request.put('/cms/settings', { settings });
};

// ==================== CMS Contents ====================

/**
 * 获取所有内容（管理接口）
 */
export const getAllContents = async (): Promise<CmsContent[]> => {
  return request.get('/cms/contents/all');
};

/**
 * 获取页面内容
 */
export const getContents = async (page?: string, section?: string): Promise<CmsContent[]> => {
  const params = new URLSearchParams();
  if (page) params.append('page', page);
  if (section) params.append('section', section);
  return request.get(`/cms/contents?${params.toString()}`);
};

/**
 * 获取单个内容
 */
export const getContentById = async (id: string): Promise<CmsContent> => {
  return request.get(`/cms/contents/${id}`);
};

/**
 * 创建内容
 */
export const createContent = async (data: Partial<CmsContent>): Promise<CmsContent> => {
  return request.post('/cms/contents', data);
};

/**
 * 更新内容
 */
export const updateContent = async (id: string, data: Partial<CmsContent>): Promise<CmsContent> => {
  return request.put(`/cms/contents/${id}`, data);
};

/**
 * 删除内容
 */
export const deleteContent = async (id: string): Promise<void> => {
  return request.delete(`/cms/contents/${id}`);
};

// ==================== Job Positions ====================

/**
 * 获取所有职位（管理接口）
 */
export const getAllJobPositions = async (): Promise<JobPosition[]> => {
  return request.get('/cms/jobs/all');
};

/**
 * 获取单个职位
 */
export const getJobPositionById = async (id: string): Promise<JobPosition> => {
  return request.get(`/cms/jobs/${id}`);
};

/**
 * 创建职位
 */
export const createJobPosition = async (data: Partial<JobPosition>): Promise<JobPosition> => {
  return request.post('/cms/jobs', data);
};

/**
 * 更新职位
 */
export const updateJobPosition = async (id: string, data: Partial<JobPosition>): Promise<JobPosition> => {
  return request.put(`/cms/jobs/${id}`, data);
};

/**
 * 删除职位
 */
export const deleteJobPosition = async (id: string): Promise<void> => {
  return request.delete(`/cms/jobs/${id}`);
};

// ==================== Legal Documents ====================

/**
 * 获取所有法律文档
 */
export const getLegalDocuments = async (): Promise<LegalDocument[]> => {
  return request.get('/cms/legal');
};

/**
 * 获取指定类型法律文档
 */
export const getLegalDocumentByType = async (type: string): Promise<LegalDocument> => {
  return request.get(`/cms/legal/${type}`);
};

/**
 * 更新法律文档
 */
export const updateLegalDocument = async (type: string, data: Partial<LegalDocument>): Promise<LegalDocument> => {
  return request.put(`/cms/legal/${type}`, data);
};

// ==================== Case Studies ====================

/**
 * 获取所有案例（管理接口）
 */
export const getAllCaseStudies = async (): Promise<CaseStudy[]> => {
  return request.get('/cms/cases/all');
};

/**
 * 获取单个案例
 */
export const getCaseStudyById = async (id: string): Promise<CaseStudy> => {
  return request.get(`/cms/cases/${id}`);
};

/**
 * 创建案例
 */
export const createCaseStudy = async (data: Partial<CaseStudy>): Promise<CaseStudy> => {
  return request.post('/cms/cases', data);
};

/**
 * 更新案例
 */
export const updateCaseStudy = async (id: string, data: Partial<CaseStudy>): Promise<CaseStudy> => {
  return request.put(`/cms/cases/${id}`, data);
};

/**
 * 删除案例
 */
export const deleteCaseStudy = async (id: string): Promise<void> => {
  return request.delete(`/cms/cases/${id}`);
};

// ==================== Pricing Plans ====================

/**
 * 获取所有定价方案（管理接口）
 */
export const getAllPricingPlans = async (): Promise<PricingPlan[]> => {
  return request.get('/cms/pricing/all');
};

/**
 * 获取单个定价方案
 */
export const getPricingPlanById = async (id: string): Promise<PricingPlan> => {
  return request.get(`/cms/pricing/${id}`);
};

/**
 * 创建定价方案
 */
export const createPricingPlan = async (data: Partial<PricingPlan>): Promise<PricingPlan> => {
  return request.post('/cms/pricing', data);
};

/**
 * 更新定价方案
 */
export const updatePricingPlan = async (id: string, data: Partial<PricingPlan>): Promise<PricingPlan> => {
  return request.put(`/cms/pricing/${id}`, data);
};

/**
 * 删除定价方案
 */
export const deletePricingPlan = async (id: string): Promise<void> => {
  return request.delete(`/cms/pricing/${id}`);
};
