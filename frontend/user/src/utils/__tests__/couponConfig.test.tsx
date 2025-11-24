import { describe, it, expect } from 'vitest';
import {
  couponTypeConfig,
  statusConfig,
  getCouponTypeConfig,
  getUsageRoute,
  getUsageMessage,
} from '../couponConfig';
import { CouponStatus } from '@/services/activity';
import type { Coupon } from '@/services/activity';

describe('couponConfig 工具函数', () => {
  describe('优惠券类型配置', () => {
    it('应该包含所有优惠券类型', () => {
      expect(couponTypeConfig.discount).toBeDefined();
      expect(couponTypeConfig.cash).toBeDefined();
      expect(couponTypeConfig.gift).toBeDefined();
      expect(couponTypeConfig.full_discount).toBeDefined();
    });

    it('折扣券配置应该正确', () => {
      const config = couponTypeConfig.discount;
      expect(config.text).toBe('折扣券');
      expect(config.color).toBe('#ff4d4f');
      expect(config.icon).toBeDefined();
      expect(config.getValueText(85)).toBe('85折');
    });

    it('代金券配置应该正确', () => {
      const config = couponTypeConfig.cash;
      expect(config.text).toBe('代金券');
      expect(config.color).toBe('#faad14');
      expect(config.getValueText(50)).toBe('¥50');
      expect(config.getValueText(100)).toBe('¥100');
    });

    it('礼品券配置应该正确', () => {
      const config = couponTypeConfig.gift;
      expect(config.text).toBe('礼品券');
      expect(config.color).toBe('#52c41a');
      expect(config.getValueText(0, '云手机月卡')).toBe('云手机月卡');
      expect(config.getValueText(0, 'VIP会员')).toBe('VIP会员');
    });

    it('满减券配置应该正确', () => {
      const config = couponTypeConfig.full_discount;
      expect(config.text).toBe('满减券');
      expect(config.color).toBe('#1677ff');
      expect(config.getValueText(20)).toBe('¥20');
    });
  });

  describe('优惠券状态配置', () => {
    it('应该包含所有状态', () => {
      expect(statusConfig[CouponStatus.AVAILABLE]).toBeDefined();
      expect(statusConfig[CouponStatus.USED]).toBeDefined();
      expect(statusConfig[CouponStatus.EXPIRED]).toBeDefined();
    });

    it('可用状态配置应该正确', () => {
      const config = statusConfig[CouponStatus.AVAILABLE];
      expect(config.label).toBe('可用');
      expect(config.color).toBe('success');
      expect(config.icon).toBeDefined();
    });

    it('已使用状态配置应该正确', () => {
      const config = statusConfig[CouponStatus.USED];
      expect(config.label).toBe('已使用');
      expect(config.color).toBe('default');
      expect(config.icon).toBeDefined();
    });

    it('已过期状态配置应该正确', () => {
      const config = statusConfig[CouponStatus.EXPIRED];
      expect(config.label).toBe('已过期');
      expect(config.color).toBe('error');
      expect(config.icon).toBeDefined();
    });
  });

  describe('getCouponTypeConfig', () => {
    it('应该正确获取折扣券配置', () => {
      const coupon: Coupon = {
        id: 1,
        type: 'discount',
        name: '八五折优惠券',
        value: 85,
        status: CouponStatus.AVAILABLE,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const config = getCouponTypeConfig(coupon);
      expect(config.text).toBe('折扣券');
      expect(config.valueText).toBe('85折');
      expect(config.color).toBe('#ff4d4f');
    });

    it('应该正确获取代金券配置', () => {
      const coupon: Coupon = {
        id: 2,
        type: 'cash',
        name: '50元代金券',
        value: 50,
        status: CouponStatus.AVAILABLE,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const config = getCouponTypeConfig(coupon);
      expect(config.text).toBe('代金券');
      expect(config.valueText).toBe('¥50');
      expect(config.color).toBe('#faad14');
    });

    it('应该正确获取礼品券配置', () => {
      const coupon: Coupon = {
        id: 3,
        type: 'gift',
        name: '云手机月卡',
        value: 0,
        status: CouponStatus.AVAILABLE,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const config = getCouponTypeConfig(coupon);
      expect(config.text).toBe('礼品券');
      expect(config.valueText).toBe('云手机月卡');
      expect(config.color).toBe('#52c41a');
    });

    it('应该正确获取满减券配置', () => {
      const coupon: Coupon = {
        id: 4,
        type: 'full_discount',
        name: '满100减20',
        value: 20,
        status: CouponStatus.AVAILABLE,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const config = getCouponTypeConfig(coupon);
      expect(config.text).toBe('满减券');
      expect(config.valueText).toBe('¥20');
      expect(config.color).toBe('#1677ff');
    });
  });

  describe('getUsageRoute', () => {
    it('折扣券应该跳转到套餐页面', () => {
      const coupon: Coupon = {
        id: 1,
        type: 'discount',
        name: '八五折优惠券',
        value: 85,
        status: CouponStatus.AVAILABLE,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const route = getUsageRoute(coupon);
      expect(route.path).toBe('/plans');
      expect(route.state.selectedCoupon).toBe(1);
    });

    it('代金券应该跳转到充值页面', () => {
      const coupon: Coupon = {
        id: 2,
        type: 'cash',
        name: '50元代金券',
        value: 50,
        status: CouponStatus.AVAILABLE,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const route = getUsageRoute(coupon);
      expect(route.path).toBe('/billing/recharge');
      expect(route.state.selectedCoupon).toBe(2);
    });

    it('礼品券应该跳转到套餐页面', () => {
      const coupon: Coupon = {
        id: 3,
        type: 'gift',
        name: '云手机月卡',
        value: 0,
        status: CouponStatus.AVAILABLE,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const route = getUsageRoute(coupon);
      expect(route.path).toBe('/plans');
      expect(route.state.selectedCoupon).toBe(3);
    });

    it('满减券应该跳转到套餐页面', () => {
      const coupon: Coupon = {
        id: 4,
        type: 'full_discount',
        name: '满100减20',
        value: 20,
        status: CouponStatus.AVAILABLE,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const route = getUsageRoute(coupon);
      expect(route.path).toBe('/plans');
      expect(route.state.selectedCoupon).toBe(4);
    });
  });

  describe('getUsageMessage', () => {
    it('折扣券应该返回套餐购买提示', () => {
      const coupon: Coupon = {
        id: 1,
        type: 'discount',
        name: '八五折优惠券',
        value: 85,
        status: CouponStatus.AVAILABLE,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const message = getUsageMessage(coupon);
      expect(message).toBe('已选择优惠券，请选择套餐完成购买');
    });

    it('代金券应该返回充值提示', () => {
      const coupon: Coupon = {
        id: 2,
        type: 'cash',
        name: '50元代金券',
        value: 50,
        status: CouponStatus.AVAILABLE,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const message = getUsageMessage(coupon);
      expect(message).toBe('已选择优惠券，请完成充值');
    });

    it('礼品券应该返回套餐使用提示', () => {
      const coupon: Coupon = {
        id: 3,
        type: 'gift',
        name: '云手机月卡',
        value: 0,
        status: CouponStatus.AVAILABLE,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const message = getUsageMessage(coupon);
      expect(message).toBe('请选择套餐使用优惠券');
    });

    it('满减券应该返回套餐使用提示', () => {
      const coupon: Coupon = {
        id: 4,
        type: 'full_discount',
        name: '满100减20',
        value: 20,
        status: CouponStatus.AVAILABLE,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const message = getUsageMessage(coupon);
      expect(message).toBe('请选择套餐使用优惠券');
    });
  });

  describe('边界情况', () => {
    it('应该处理极大的优惠券金额', () => {
      const config = couponTypeConfig.cash;
      expect(config.getValueText(999999)).toBe('¥999999');
    });

    it('应该处理0折扣', () => {
      const config = couponTypeConfig.discount;
      expect(config.getValueText(0)).toBe('0折');
    });

    it('应该处理10折（无折扣）', () => {
      const config = couponTypeConfig.discount;
      expect(config.getValueText(100)).toBe('100折');
    });

    it('礼品券名称可以为空字符串', () => {
      const config = couponTypeConfig.gift;
      expect(config.getValueText(0, '')).toBe('');
    });
  });
});
