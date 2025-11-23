/**
 * CMS 内容管理 Hooks
 * 提供首页内容和导航内容的获取和缓存
 */
import { useQuery } from '@tanstack/react-query';
import {
  getHomeContents,
  getNavigationContents,
  getContents,
  type HeroContent,
  type FeaturesContent,
  type StatsContent,
  type HowItWorksContent,
  type UseCasesContent,
  type CTABannerContent,
  type FAQContent,
  type SEOContent,
  type HeaderNavContent,
  type FooterNavContent,
} from '@/services/cms';

// 默认数据（用于 API 请求失败时的回退）
const defaultHeroContent: HeroContent = {
  slides: [
    {
      id: 1,
      title: '思维无界',
      subtitle: '云端赋能',
      description: 'CloudPhone.run 为您提供稳定可靠的云端 Android 设备\n随时随地，轻松管理数百台设备，专注核心业务',
      tag: '企业级云手机平台 · 全球领先',
      bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      accentColor: '#d946ef',
    },
  ],
  trustBadges: ['企业级安全', '99.9% 可用性', '7×24 小时支持', 'ISO 27001 认证'],
  ctaButtons: {
    primary: { text: '立即开始', icon: 'RocketOutlined' },
    secondary: { text: '观看演示', icon: 'PlayCircleOutlined' },
  },
};

const defaultStatsContent: StatsContent = {
  stats: [
    { key: 'users', title: '注册用户', value: '10,000+', icon: 'UserOutlined', color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', bgColor: 'rgba(99, 102, 241, 0.1)', description: '活跃用户数' },
    { key: 'devices', title: '在线设备', value: '50,000+', icon: 'MobileOutlined', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', bgColor: 'rgba(16, 185, 129, 0.1)', description: '云端运行中' },
    { key: 'uptime', title: '服务可用性', value: '99.9%', icon: 'CheckCircleOutlined', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', bgColor: 'rgba(245, 158, 11, 0.1)', description: 'SLA 保障' },
    { key: 'companies', title: '企业客户', value: '500+', icon: 'TeamOutlined', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', bgColor: 'rgba(139, 92, 246, 0.1)', description: '遍布全球' },
  ],
  footerText: '实时数据更新，展示 CloudPhone.run 的全球服务规模与可靠性',
};

/**
 * 获取首页所有内容
 */
export function useHomeContent() {
  return useQuery({
    queryKey: ['cms', 'home'],
    queryFn: getHomeContents,
    staleTime: 5 * 60 * 1000, // 5 分钟
    gcTime: 30 * 60 * 1000, // 30 分钟
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * 获取 Hero Banner 内容
 */
export function useHeroContent() {
  const { data, isLoading, error } = useHomeContent();
  return {
    data: data?.hero || defaultHeroContent,
    isLoading,
    error,
  };
}

/**
 * 获取核心功能内容
 */
export function useFeaturesContent() {
  const { data, isLoading, error } = useHomeContent();
  return {
    data: data?.features,
    isLoading,
    error,
  };
}

/**
 * 获取平台统计数据
 */
export function useStatsContent() {
  const { data, isLoading, error } = useHomeContent();
  return {
    data: data?.stats || defaultStatsContent,
    isLoading,
    error,
  };
}

/**
 * 获取使用流程内容
 */
export function useHowItWorksContent() {
  const { data, isLoading, error } = useHomeContent();
  return {
    data: data?.howItWorks,
    isLoading,
    error,
  };
}

/**
 * 获取应用场景内容
 */
export function useUseCasesContent() {
  const { data, isLoading, error } = useHomeContent();
  return {
    data: data?.useCases,
    isLoading,
    error,
  };
}

/**
 * 获取 CTA Banner 内容
 */
export function useCTABannerContent() {
  const { data, isLoading, error } = useHomeContent();
  return {
    data: data?.ctaBanner,
    isLoading,
    error,
  };
}

/**
 * 获取 FAQ 内容
 */
export function useFAQContent() {
  const { data, isLoading, error } = useHomeContent();
  return {
    data: data?.faq,
    isLoading,
    error,
  };
}

/**
 * 获取 SEO 内容
 */
export function useSEOContent() {
  const { data, isLoading, error } = useHomeContent();
  return {
    data: data?.seo,
    isLoading,
    error,
  };
}

/**
 * 获取导航内容（Header + Footer）
 */
export function useNavigationContent() {
  return useQuery({
    queryKey: ['cms', 'navigation'],
    queryFn: getNavigationContents,
    staleTime: 10 * 60 * 1000, // 10 分钟
    gcTime: 60 * 60 * 1000, // 1 小时
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * 获取 Header 导航内容
 */
export function useHeaderNavContent() {
  const { data, isLoading, error } = useNavigationContent();
  return {
    data: data?.header,
    isLoading,
    error,
  };
}

/**
 * 获取 Footer 导航内容
 */
export function useFooterNavContent() {
  const { data, isLoading, error } = useNavigationContent();
  return {
    data: data?.footer,
    isLoading,
    error,
  };
}

/**
 * 获取指定页面和区块的内容
 */
export function usePageContent<T = Record<string, any>>(page: string, section?: string) {
  return useQuery({
    queryKey: ['cms', 'content', page, section],
    queryFn: () => getContents<T>(page, section),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 导出类型
export type {
  HeroContent,
  FeaturesContent,
  StatsContent,
  HowItWorksContent,
  UseCasesContent,
  CTABannerContent,
  FAQContent,
  SEOContent,
  HeaderNavContent,
  FooterNavContent,
};
