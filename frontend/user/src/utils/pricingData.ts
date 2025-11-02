/**
 * 定价页面数据配置
 */

export const plans = [
  {
    name: '基础版',
    key: 'basic',
    tagline: '适合个人开发者',
    monthlyPrice: 99,
    yearlyPrice: 999,
    discount: '年付享8折',
    features: [
      { name: '设备数量', value: '最多5台' },
      { name: 'CPU核心', value: '2核/设备' },
      { name: '内存', value: '4GB/设备' },
      { name: '存储空间', value: '32GB/设备' },
      { name: '带宽', value: '5Mbps' },
      { name: 'Android版本', value: '7-13' },
      { name: 'API调用次数', value: '10,000次/月' },
      { name: '技术支持', value: '工单支持' },
      { name: '数据备份', value: '手动备份' },
      { name: '服务可用性', value: '99.5%' },
    ],
    highlighted: false,
  },
  {
    name: '标准版',
    key: 'standard',
    tagline: '适合小型团队',
    monthlyPrice: 399,
    yearlyPrice: 3999,
    discount: '年付享8折',
    tag: '热门',
    features: [
      { name: '设备数量', value: '最多20台' },
      { name: 'CPU核心', value: '4核/设备' },
      { name: '内存', value: '8GB/设备' },
      { name: '存储空间', value: '64GB/设备' },
      { name: '带宽', value: '10Mbps' },
      { name: 'Android版本', value: '7-13' },
      { name: 'API调用次数', value: '100,000次/月' },
      { name: '技术支持', value: '邮件+工单支持' },
      { name: '数据备份', value: '自动备份（7天）' },
      { name: '服务可用性', value: '99.9%' },
    ],
    highlighted: true,
  },
  {
    name: '专业版',
    key: 'professional',
    tagline: '适合中型企业',
    monthlyPrice: 999,
    yearlyPrice: 9999,
    discount: '年付享8折',
    features: [
      { name: '设备数量', value: '最多50台' },
      { name: 'CPU核心', value: '8核/设备' },
      { name: '内存', value: '16GB/设备' },
      { name: '存储空间', value: '128GB/设备' },
      { name: '带宽', value: '20Mbps' },
      { name: 'Android版本', value: '7-13' },
      { name: 'API调用次数', value: '1,000,000次/月' },
      { name: '技术支持', value: '电话+邮件+工单' },
      { name: '数据备份', value: '自动备份（30天）' },
      { name: '服务可用性', value: '99.95%' },
    ],
    highlighted: false,
  },
  {
    name: '企业版',
    key: 'enterprise',
    tagline: '适合大型企业',
    monthlyPrice: null,
    yearlyPrice: null,
    customPrice: true,
    tag: '定制',
    features: [
      { name: '设备数量', value: '无限制' },
      { name: 'CPU核心', value: '自定义配置' },
      { name: '内存', value: '自定义配置' },
      { name: '存储空间', value: '自定义配置' },
      { name: '带宽', value: '独享带宽' },
      { name: 'Android版本', value: '全版本支持' },
      { name: 'API调用次数', value: '无限制' },
      { name: '技术支持', value: '7×24专属客户经理' },
      { name: '数据备份', value: '自动备份（90天）' },
      { name: '服务可用性', value: '99.99%' },
    ],
    highlighted: false,
  },
];

export const comparisonData = [
  {
    key: '1',
    feature: '基础功能',
    basic: true,
    standard: true,
    professional: true,
    enterprise: true,
  },
  {
    key: '2',
    feature: '设备远程控制',
    basic: true,
    standard: true,
    professional: true,
    enterprise: true,
  },
  {
    key: '3',
    feature: '屏幕投射',
    basic: true,
    standard: true,
    professional: true,
    enterprise: true,
  },
  {
    key: '4',
    feature: 'ADB调试',
    basic: true,
    standard: true,
    professional: true,
    enterprise: true,
  },
  {
    key: '5',
    feature: '应用安装/卸载',
    basic: true,
    standard: true,
    professional: true,
    enterprise: true,
  },
  {
    key: '6',
    feature: '设备快照备份',
    basic: false,
    standard: true,
    professional: true,
    enterprise: true,
  },
  {
    key: '7',
    feature: '批量操作',
    basic: false,
    standard: '最多10台',
    professional: '最多30台',
    enterprise: '无限制',
  },
  {
    key: '8',
    feature: '设备模板',
    basic: false,
    standard: true,
    professional: true,
    enterprise: true,
  },
  {
    key: '9',
    feature: 'Webhook回调',
    basic: false,
    standard: false,
    professional: true,
    enterprise: true,
  },
  {
    key: '10',
    feature: 'VPN专线接入',
    basic: false,
    standard: false,
    professional: false,
    enterprise: true,
  },
  {
    key: '11',
    feature: '白标定制',
    basic: false,
    standard: false,
    professional: false,
    enterprise: true,
  },
  {
    key: '12',
    feature: '专属部署',
    basic: false,
    standard: false,
    professional: false,
    enterprise: true,
  },
];

export const faqData = [
  {
    question: '可以随时升级或降级套餐吗？',
    answer:
      '可以的。您可以随时升级套餐，系统会自动计算差价。降级套餐需要在当前周期结束后生效，差价部分会按比例退回到您的账户余额。',
  },
  {
    question: '免费试用期有什么限制吗？',
    answer:
      '免费试用期为7天，期间可以创建最多2台设备，功能与标准版相同。试用期结束后需要购买付费套餐才能继续使用。',
  },
  {
    question: '超出套餐限制怎么办？',
    answer:
      '如果设备数量超出套餐限制，系统会提示您升级套餐。API调用次数超限后会按照0.01元/次的标准计费，从账户余额扣除。',
  },
  {
    question: '支持哪些支付方式？',
    answer: '我们支持微信支付、支付宝、银行卡支付。企业客户支持对公转账和发票开具。',
  },
  {
    question: '可以开具发票吗？',
    answer:
      '可以。我们支持开具增值税普通发票和增值税专用发票。您可以在"个人中心 - 发票管理"中申请开票。',
  },
  {
    question: '退款政策是什么？',
    answer:
      '购买后24小时内未创建设备可申请全额退款。使用后按已使用天数扣除费用（扣除2%手续费）后退款。详情请查看退款政策。',
  },
  {
    question: '企业版如何定价？',
    answer:
      '企业版采用定制化定价，根据您的设备数量、配置需求、服务水平等因素综合评估。请联系我们的销售团队获取报价。',
  },
];
