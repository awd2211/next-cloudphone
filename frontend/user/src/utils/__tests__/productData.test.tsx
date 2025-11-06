import { describe, it, expect } from 'vitest';
import { coreFeatures, useCases, platformStats } from '../productData';

describe('productData 产品数据配置', () => {
  describe('coreFeatures 核心特性', () => {
    it('应该是数组', () => {
      expect(Array.isArray(coreFeatures)).toBe(true);
    });

    it('应该有6个核心特性', () => {
      expect(coreFeatures).toHaveLength(6);
    });

    it('每个特性都应该有完整的字段', () => {
      coreFeatures.forEach((feature) => {
        expect(feature.icon).toBeDefined();
        expect(feature.title).toBeDefined();
        expect(feature.description).toBeDefined();
        expect(feature.tags).toBeDefined();
      });
    });

    it('所有title应该唯一', () => {
      const titles = coreFeatures.map((f) => f.title);
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(titles.length);
    });

    it('所有description都不应该为空', () => {
      coreFeatures.forEach((feature) => {
        expect(feature.description.length).toBeGreaterThan(0);
      });
    });

    it('每个特性都应该有tags数组', () => {
      coreFeatures.forEach((feature) => {
        expect(Array.isArray(feature.tags)).toBe(true);
        expect(feature.tags.length).toBeGreaterThan(0);
      });
    });

    it('应该包含真实Android环境特性', () => {
      const androidFeature = coreFeatures.find((f) =>
        f.title.includes('Android')
      );
      expect(androidFeature).toBeDefined();
      expect(androidFeature?.description).toContain('Redroid');
    });

    it('应该包含弹性云端部署特性', () => {
      const cloudFeature = coreFeatures.find((f) => f.title.includes('云端'));
      expect(cloudFeature).toBeDefined();
    });

    it('应该包含极致性能体验特性', () => {
      const performanceFeature = coreFeatures.find((f) =>
        f.title.includes('性能')
      );
      expect(performanceFeature).toBeDefined();
      expect(performanceFeature?.description).toContain('GPU');
    });

    it('应该包含企业级安全特性', () => {
      const securityFeature = coreFeatures.find((f) => f.title.includes('安全'));
      expect(securityFeature).toBeDefined();
      expect(securityFeature?.description).toContain('加密');
    });

    it('应该包含全球节点覆盖特性', () => {
      const globalFeature = coreFeatures.find((f) => f.title.includes('全球'));
      expect(globalFeature).toBeDefined();
    });

    it('应该包含开放API接口特性', () => {
      const apiFeature = coreFeatures.find((f) => f.title.includes('API'));
      expect(apiFeature).toBeDefined();
      expect(apiFeature?.tags).toContain('RESTful API');
    });

    it('所有icon都应该是React元素', () => {
      coreFeatures.forEach((feature) => {
        expect(typeof feature.icon).toBe('object');
        expect(feature.icon.type).toBeDefined();
      });
    });

    it('每个tags数组都应该有3个标签', () => {
      coreFeatures.forEach((feature) => {
        expect(feature.tags).toHaveLength(3);
      });
    });

    it('所有description长度应该合理', () => {
      coreFeatures.forEach((feature) => {
        expect(feature.description.length).toBeGreaterThan(20);
        expect(feature.description.length).toBeLessThan(200);
      });
    });
  });

  describe('useCases 使用场景', () => {
    it('应该是数组', () => {
      expect(Array.isArray(useCases)).toBe(true);
    });

    it('应该有4个使用场景', () => {
      expect(useCases).toHaveLength(4);
    });

    it('每个场景都应该有完整的字段', () => {
      useCases.forEach((useCase) => {
        expect(useCase.icon).toBeDefined();
        expect(useCase.title).toBeDefined();
        expect(useCase.description).toBeDefined();
        expect(useCase.benefits).toBeDefined();
      });
    });

    it('所有title应该唯一', () => {
      const titles = useCases.map((u) => u.title);
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(titles.length);
    });

    it('每个场景都应该有benefits数组', () => {
      useCases.forEach((useCase) => {
        expect(Array.isArray(useCase.benefits)).toBe(true);
        expect(useCase.benefits.length).toBeGreaterThan(0);
      });
    });

    it('应该包含App自动化测试场景', () => {
      const testCase = useCases.find((u) => u.title.includes('测试'));
      expect(testCase).toBeDefined();
      expect(testCase?.description).toContain('自动化');
    });

    it('应该包含游戏托管代练场景', () => {
      const gameCase = useCases.find((u) => u.title.includes('游戏'));
      expect(gameCase).toBeDefined();
      expect(gameCase?.benefits).toContain('24小时在线');
    });

    it('应该包含移动办公协作场景', () => {
      const officeCase = useCases.find((u) => u.title.includes('办公'));
      expect(officeCase).toBeDefined();
    });

    it('应该包含应用分发测试场景', () => {
      const distributionCase = useCases.find((u) => u.title.includes('分发'));
      expect(distributionCase).toBeDefined();
    });

    it('所有icon都应该是React元素', () => {
      useCases.forEach((useCase) => {
        expect(typeof useCase.icon).toBe('object');
        expect(useCase.icon.type).toBeDefined();
      });
    });

    it('每个benefits数组都应该有3个好处', () => {
      useCases.forEach((useCase) => {
        expect(useCase.benefits).toHaveLength(3);
      });
    });

    it('所有description都不应该为空', () => {
      useCases.forEach((useCase) => {
        expect(useCase.description.length).toBeGreaterThan(0);
      });
    });

    it('所有benefits都不应该为空', () => {
      useCases.forEach((useCase) => {
        useCase.benefits.forEach((benefit) => {
          expect(benefit.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('platformStats 平台统计', () => {
    it('应该是数组', () => {
      expect(Array.isArray(platformStats)).toBe(true);
    });

    it('应该有4个统计项', () => {
      expect(platformStats).toHaveLength(4);
    });

    it('每个统计项都应该有完整的字段', () => {
      platformStats.forEach((stat) => {
        expect(stat.title).toBeDefined();
        expect(stat.value).toBeDefined();
        expect('suffix' in stat).toBe(true);
      });
    });

    it('所有title应该唯一', () => {
      const titles = platformStats.map((s) => s.title);
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(titles.length);
    });

    it('应该包含全球用户统计', () => {
      const userStat = platformStats.find((s) => s.title === '全球用户');
      expect(userStat).toBeDefined();
      expect(userStat?.value).toBe('10000+');
    });

    it('应该包含设备总数统计', () => {
      const deviceStat = platformStats.find((s) => s.title === '设备总数');
      expect(deviceStat).toBeDefined();
      expect(deviceStat?.value).toBe('500000+');
    });

    it('应该包含月活跃度统计', () => {
      const activeStat = platformStats.find((s) => s.title === '月活跃度');
      expect(activeStat).toBeDefined();
      expect(activeStat?.value).toBe('95');
      expect(activeStat?.suffix).toBe('%');
    });

    it('应该包含服务可用性统计', () => {
      const availabilityStat = platformStats.find((s) =>
        s.title.includes('可用性')
      );
      expect(availabilityStat).toBeDefined();
      expect(availabilityStat?.value).toBe('99.95');
      expect(availabilityStat?.suffix).toBe('%');
    });

    it('所有value都应该是字符串', () => {
      platformStats.forEach((stat) => {
        expect(typeof stat.value).toBe('string');
      });
    });

    it('所有suffix都应该是字符串', () => {
      platformStats.forEach((stat) => {
        expect(typeof stat.suffix).toBe('string');
      });
    });

    it('所有title都不应该为空', () => {
      platformStats.forEach((stat) => {
        expect(stat.title.length).toBeGreaterThan(0);
      });
    });

    it('所有value都不应该为空', () => {
      platformStats.forEach((stat) => {
        expect(stat.value.length).toBeGreaterThan(0);
      });
    });
  });

  describe('数据完整性', () => {
    it('coreFeatures和useCases应该组合成完整的产品介绍', () => {
      expect(coreFeatures.length + useCases.length).toBeGreaterThanOrEqual(
        8
      );
    });

    it('所有配置都应该可序列化（排除React元素）', () => {
      expect(() => {
        JSON.stringify({
          coreFeaturesData: coreFeatures.map((f) => ({
            ...f,
            icon: undefined,
          })),
          useCasesData: useCases.map((u) => ({ ...u, icon: undefined })),
          platformStats,
        });
      }).not.toThrow();
    });

    it('platformStats应该展示关键指标', () => {
      const titles = platformStats.map((s) => s.title).join(' ');
      expect(titles).toContain('用户');
      expect(titles).toContain('设备');
    });
  });

  describe('内容质量', () => {
    it('coreFeatures的description应该包含技术关键词', () => {
      const allDescriptions = coreFeatures.map((f) => f.description).join(' ');
      expect(allDescriptions).toContain('Android');
      expect(allDescriptions).toContain('API');
    });

    it('useCases的description应该包含应用场景关键词', () => {
      const allDescriptions = useCases.map((u) => u.description).join(' ');
      expect(allDescriptions).toContain('测试');
      expect(allDescriptions).toContain('自动化');
    });

    it('每个coreFeature都应该有吸引力的标签', () => {
      coreFeatures.forEach((feature) => {
        expect(feature.tags.length).toBeGreaterThan(0);
        feature.tags.forEach((tag) => {
          expect(tag.length).toBeGreaterThan(0);
          expect(tag.length).toBeLessThan(20);
        });
      });
    });

    it('每个useCase都应该有清晰的benefits', () => {
      useCases.forEach((useCase) => {
        expect(useCase.benefits.length).toBeGreaterThan(0);
        useCase.benefits.forEach((benefit) => {
          expect(benefit.length).toBeGreaterThan(0);
          expect(benefit.length).toBeLessThan(50);
        });
      });
    });
  });

  describe('标签和好处', () => {
    it('所有tags都应该简洁', () => {
      coreFeatures.forEach((feature) => {
        feature.tags.forEach((tag) => {
          expect(tag.length).toBeLessThanOrEqual(15);
        });
      });
    });

    it('所有tags都不应该重复（在同一特性内）', () => {
      coreFeatures.forEach((feature) => {
        const uniqueTags = new Set(feature.tags);
        expect(uniqueTags.size).toBe(feature.tags.length);
      });
    });

    it('所有benefits都不应该重复（在同一场景内）', () => {
      useCases.forEach((useCase) => {
        const uniqueBenefits = new Set(useCase.benefits);
        expect(uniqueBenefits.size).toBe(useCase.benefits.length);
      });
    });

    it('benefits应该强调价值而非功能', () => {
      const allBenefits = useCases.flatMap((u) => u.benefits).join(' ');
      // Benefits通常包含具体的数字或效果
      const hasMeaningfulBenefits =
        allBenefits.includes('%') ||
        allBenefits.includes('节省') ||
        allBenefits.includes('支持') ||
        allBenefits.includes('自动') ||
        allBenefits.includes('24') ||
        allBenefits.includes('小时');
      expect(hasMeaningfulBenefits).toBe(true);
    });
  });

  describe('统计数据合理性', () => {
    it('用户数应该是合理的', () => {
      const userStat = platformStats.find((s) => s.title === '全球用户');
      expect(userStat?.value).toMatch(/\d+\+?/);
    });

    it('设备数应该是合理的', () => {
      const deviceStat = platformStats.find((s) => s.title === '设备总数');
      expect(deviceStat?.value).toMatch(/\d+\+?/);
    });

    it('百分比统计应该在合理范围内', () => {
      const percentStats = platformStats.filter((s) => s.suffix === '%');
      percentStats.forEach((stat) => {
        const value = parseFloat(stat.value);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      });
    });

    it('服务可用性应该接近100%', () => {
      const availabilityStat = platformStats.find((s) =>
        s.title.includes('可用性')
      );
      const availability = parseFloat(availabilityStat?.value || '0');
      expect(availability).toBeGreaterThanOrEqual(99);
    });
  });
});
