/**
 * CMS 内容管理服务
 * 用于获取官网动态内容：设置、职位、法律文档、案例、定价等
 */
import request from '@/utils/request';

// ==================== 类型定义 ====================

export interface SiteSettings {
  company: {
    name: string;
    slogan: string;
    founded_year: string;
    offices: Array<{
      city: string;
      address: string;
      phone: string;
    }>;
  };
  contact: {
    phone: string;
    email: string;
    wechat: string;
    qq_group: string;
    privacy_email: string;
    refund_email: string;
    sla_email: string;
    status_page: string;
  };
  seo: {
    default_title: string;
    default_description: string;
    default_keywords: string;
  };
  social: {
    links: Record<string, string>;
  };
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
}

export interface LegalDocument {
  id: string;
  type: 'privacy' | 'terms' | 'refund' | 'sla' | 'security';
  title: string;
  content: string;
  contentType: 'html' | 'markdown';
  version: string;
  effectiveDate?: string;
}

export interface CaseStudy {
  id: string;
  companyName: string;  // API 返回字段
  logoUrl?: string;     // API 返回字段
  title: string;        // 案例标题
  industry: string;
  challenge: string;
  solution: string;
  results?: Record<string, any> | Array<{ metric: string; value: string; description?: string }>;
  testimonial?: {
    quote: string;
    author: string;
    title: string;
  };
  isFeatured?: boolean;
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
}

// ==================== API 方法 ====================

/**
 * 获取网站设置
 */
export const getSiteSettings = async (): Promise<SiteSettings> => {
  return request.get('/cms/settings');
};

/**
 * 获取招聘职位列表
 */
export const getJobPositions = async (): Promise<JobPosition[]> => {
  return request.get('/cms/jobs');
};

/**
 * 获取单个招聘职位
 */
export const getJobPositionById = async (id: string): Promise<JobPosition> => {
  return request.get(`/cms/jobs/${id}`);
};

/**
 * 获取所有法律文档
 */
export const getLegalDocuments = async (): Promise<LegalDocument[]> => {
  return request.get('/cms/legal');
};

/**
 * 获取指定类型的法律文档
 */
export const getLegalDocument = async (type: string): Promise<LegalDocument> => {
  return request.get(`/cms/legal/${type}`);
};

/**
 * 获取客户案例列表
 */
export const getCaseStudies = async (featured?: boolean): Promise<CaseStudy[]> => {
  const params = featured ? '?featured=true' : '';
  return request.get(`/cms/cases${params}`);
};

/**
 * 获取单个客户案例
 */
export const getCaseStudyById = async (id: string): Promise<CaseStudy> => {
  return request.get(`/cms/cases/${id}`);
};

/**
 * 获取定价方案列表
 */
export const getPricingPlans = async (): Promise<PricingPlan[]> => {
  return request.get('/cms/pricing');
};

/**
 * 获取单个定价方案
 */
export const getPricingPlanById = async (id: string): Promise<PricingPlan> => {
  return request.get(`/cms/pricing/${id}`);
};
