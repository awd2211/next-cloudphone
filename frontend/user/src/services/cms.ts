/**
 * CMS 内容管理服务
 * 用于获取官网动态内容：设置、职位、法律文档、案例、定价、页面内容块等
 */
import request from '@/utils/request';

// ==================== 页面内容块类型定义 ====================

export interface CmsContent<T = Record<string, any>> {
  id: string;
  page: string;
  section: string;
  title: string;
  content: T;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Hero Banner 类型
export interface HeroSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  tag: string;
  bgGradient: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export interface HeroContent {
  slides: HeroSlide[];
  trustBadges: string[];
  ctaButtons: {
    primary: { text: string; icon: string };
    secondary: { text: string; icon: string };
  };
}

// Features 类型
export interface Feature {
  icon: string;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  gradient: string;
}

export interface FeaturesContent {
  sectionTitle: string;
  sectionSubtitle: string;
  sectionTag: string;
  features: Feature[];
  cta: {
    title: string;
    subtitle: string;
    badges: string[];
  };
}

// Stats 类型
export interface StatItem {
  key: string;
  title: string;
  value: string;
  icon: string;
  color: string;
  gradient: string;
  bgColor: string;
  description: string;
}

export interface StatsContent {
  stats: StatItem[];
  footerText: string;
}

// How It Works 类型
export interface HowItWorksStep {
  icon: string;
  title: string;
  description: string;
  time: string;
  color: string;
}

export interface HowItWorksContent {
  sectionTitle: string;
  sectionSubtitle: string;
  steps: HowItWorksStep[];
}

// Use Cases 类型
export interface UseCase {
  icon: string;
  title: string;
  description: string;
  users: string;
  color: string;
  bgColor: string;
}

export interface UseCasesContent {
  sectionTitle: string;
  sectionSubtitle: string;
  cases: UseCase[];
}

// CTA Banner 类型
export interface CTABannerContent {
  tag: string;
  title: string;
  highlightText: string;
  titleSuffix: string;
  description: string;
  primaryButton: { text: string; icon: string; link: string };
  secondaryButton: { text: string; icon: string; link: string };
  trustBadges: string[];
}

// Navigation 类型
export interface NavMenuItem {
  icon: string;
  title: string;
  desc: string;
  color: string;
  path: string;
}

export interface NavMenuColumn {
  title: string;
  color: string;
  items: NavMenuItem[];
}

export interface HeaderNavContent {
  brandInfo: { name: string; slogan: string; logoText: string };
  menuItems: { key: string; label: string }[];
  // 复杂下拉菜单保持代码控制
  productMenu?: { title: string; columns: NavMenuColumn[] };
  helpMenu?: { title: string; columns: NavMenuColumn[]; quickLinks: { text: string; path: string }[] };
}

export interface FooterLink {
  label: string;
  path: string;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export interface FooterNavContent {
  brandInfo: { name: string; slogan: string; description: string };
  sections: FooterSection[];
  socialLinks: { icon: string; name: string; url: string }[];
  contactInfo: { phone: string; email: string; wechat: string; serviceHours: string };
  copyright: { text: string; links: FooterLink[] };
}

// FAQ 类型
export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQContent {
  sectionTitle: string;
  sectionSubtitle: string;
  items: FAQItem[];
}

// SEO 类型
export interface SEOContent {
  title: string;
  description: string;
  keywords: string;
  url: string;
}

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

// ==================== 页面内容块 API ====================

/**
 * 获取页面内容块
 * @param page 页面标识 (如 'home', 'global')
 * @param section 区块标识 (如 'hero', 'features')
 */
export const getContents = async <T = Record<string, any>>(
  page?: string,
  section?: string
): Promise<CmsContent<T>[]> => {
  const params = new URLSearchParams();
  if (page) params.append('page', page);
  if (section) params.append('section', section);
  const queryString = params.toString();
  return request.get(`/cms/contents${queryString ? `?${queryString}` : ''}`);
};

/**
 * 获取单个页面内容块
 */
export const getContentById = async <T = Record<string, any>>(id: string): Promise<CmsContent<T>> => {
  return request.get(`/cms/contents/${id}`);
};

/**
 * 获取首页所有内容块
 */
export const getHomeContents = async (): Promise<{
  hero?: HeroContent;
  features?: FeaturesContent;
  stats?: StatsContent;
  howItWorks?: HowItWorksContent;
  useCases?: UseCasesContent;
  ctaBanner?: CTABannerContent;
  faq?: FAQContent;
  seo?: SEOContent;
}> => {
  const contents = await getContents('home');
  const result: Record<string, any> = {};

  for (const content of contents) {
    // 将 section 名称转换为 camelCase
    const key = content.section.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    result[key] = content.content;
  }

  return result;
};

/**
 * 获取全局导航内容
 */
export const getNavigationContents = async (): Promise<{
  header?: HeaderNavContent;
  footer?: FooterNavContent;
}> => {
  const contents = await getContents('global');
  const result: Record<string, any> = {};

  for (const content of contents) {
    if (content.section === 'header-nav') {
      result.header = content.content;
    } else if (content.section === 'footer-nav') {
      result.footer = content.content;
    }
  }

  return result;
};
