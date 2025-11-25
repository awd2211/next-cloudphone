/**
 * 各代理提供商的字段配置
 *
 * 每个提供商定义其专用的配置字段，包括：
 * - 字段名称、类型、标签
 * - 验证规则（必填、格式）
 * - 提示信息、占位符
 * - 默认值
 */

import type { ProviderFieldsConfig } from './types';

export const providerFieldsConfig: ProviderFieldsConfig = {
  // ==================== IPIDEA 配置 ====================
  ipidea: [
    {
      name: 'apiKey',
      label: 'AppKey (API 密钥)',
      type: 'password',
      required: true,
      placeholder: '例如: Ie0avNTR7Tfqcz1vU9',
      tooltip: 'IPIDEA 控制台 → API 管理 → AppKey',
    },
    {
      name: 'username',
      label: '代理认证用户名',
      type: 'text',
      required: true,
      placeholder: '例如: user123456',
      tooltip: 'IPIDEA 控制台 → 代理管理 → 认证账户',
    },
    {
      name: 'password',
      label: '代理认证密码',
      type: 'password',
      required: true,
      placeholder: '例如: pass123456',
      tooltip: 'IPIDEA 控制台 → 代理管理 → 认证账户密码',
    },
    {
      name: 'gateway',
      label: '专属网关地址',
      type: 'text',
      required: true,
      placeholder: '例如: e255c08e04856698.lqz.na.ipidea.online',
      tooltip: 'IPIDEA 控制台 → 代理管理 → 隧道代理 → 专属网关',
      pattern: /^[a-zA-Z0-9]+\.lqz\.na\.ipidea\.online$/,
      patternMessage: '请输入有效的 IPIDEA 网关地址（格式：xxx.lqz.na.ipidea.online）',
    },
    {
      name: 'port',
      label: '端口',
      type: 'select',
      required: true,
      defaultValue: 2336,
      tooltip: '推荐使用新版端口 2336',
      options: [
        { label: '2336 (推荐 - 新版)', value: 2336 },
        { label: '2333 (旧版)', value: 2333 },
      ],
    },
    {
      name: 'apiUrl',
      label: 'API 地址',
      type: 'url',
      required: true,
      defaultValue: 'https://api.ipidea.net',
      placeholder: 'https://api.ipidea.net',
      tooltip: 'IPIDEA API 基础地址，通常不需要修改',
    },
    {
      name: 'proxyType',
      label: '代理类型',
      type: 'select',
      required: true,
      defaultValue: 'residential',
      tooltip: '选择代理池类型',
      options: [
        { label: '家宽代理 (Residential)', value: 'residential' },
        { label: '数据中心 (Datacenter)', value: 'datacenter' },
        { label: '移动代理 (Mobile)', value: 'mobile' },
        { label: '自定义 (Custom)', value: 'custom' },
      ],
    },
    // ========== 高级参数（可选）==========
    {
      name: 'defaultRegion',
      label: '默认国家/地区',
      type: 'select',
      required: false,
      defaultValue: '',
      tooltip: '不填默认全球混播，一次一换',
      options: [
        { label: '全球混播 (默认)', value: '' },
        { label: '美国 (US)', value: 'us' },
        { label: '韩国 (KR)', value: 'kr' },
        { label: '日本 (JP)', value: 'jp' },
        { label: '英国 (GB)', value: 'gb' },
        { label: '德国 (DE)', value: 'de' },
        { label: '法国 (FR)', value: 'fr' },
        { label: '加拿大 (CA)', value: 'ca' },
        { label: '澳大利亚 (AU)', value: 'au' },
        { label: '新加坡 (SG)', value: 'sg' },
        { label: '香港 (HK)', value: 'hk' },
        { label: '台湾 (TW)', value: 'tw' },
        { label: '巴西 (BR)', value: 'br' },
        { label: '印度 (IN)', value: 'in' },
        { label: '俄罗斯 (RU)', value: 'ru' },
      ],
    },
    {
      name: 'defaultState',
      label: '默认州/省',
      type: 'text',
      required: false,
      placeholder: '例如: california, florida, newyork',
      tooltip: '部分国家支持指定州，不填默认随机',
    },
    {
      name: 'defaultCity',
      label: '默认城市',
      type: 'text',
      required: false,
      placeholder: '例如: newyork, losangeles, tokyo',
      tooltip: '不填默认随机城市',
    },
    {
      name: 'sessionMode',
      label: '会话模式',
      type: 'select',
      required: false,
      defaultValue: 'rotating',
      tooltip: '选择 IP 轮换方式',
      options: [
        { label: '轮换 IP (每次请求换 IP)', value: 'rotating' },
        { label: '粘性会话 (固定 IP 一段时间)', value: 'sticky' },
      ],
    },
    {
      name: 'sessionDuration',
      label: '会话时长 (分钟)',
      type: 'number',
      required: false,
      defaultValue: 30,
      placeholder: '1-120 分钟',
      tooltip: '粘性会话模式下 IP 保持时间，最长 120 分钟',
      min: 1,
      max: 120,
    },
    {
      name: 'defaultAsn',
      label: '默认 ISP 运营商',
      type: 'text',
      required: false,
      placeholder: '例如: AS33659 (Comcast)',
      tooltip: '指定特定 ISP 运营商，不填默认随机',
    },
  ],

  // ==================== Kookeey (KKOIP) 配置 ====================
  // 代理格式: {gateway}:{port}:{accountId}-{username}:{password}-{country}-{sessionId}-{duration}
  // 示例: gate-hk.kkoip.com:18705:2375007-cfa06e52:24e06433-US-80067216-5m
  kookeey: [
    {
      name: 'accountId',
      label: '账号 ID',
      type: 'text',
      required: true,
      placeholder: '例如: 2375007',
      tooltip: 'Kookeey 控制台 → 账号信息 → 账号 ID',
    },
    {
      name: 'username',
      label: '代理认证用户名',
      type: 'text',
      required: true,
      placeholder: '例如: cfa06e52',
      tooltip: 'Kookeey 控制台 → 代理管理 → 认证用户名',
    },
    {
      name: 'password',
      label: '代理认证密码',
      type: 'password',
      required: true,
      placeholder: '例如: 24e06433',
      tooltip: 'Kookeey 控制台 → 代理管理 → 认证密码',
    },
    {
      name: 'gateway',
      label: '代理网关地址',
      type: 'text',
      required: true,
      placeholder: '例如: gate-hk.kkoip.com',
      tooltip: '代理网关域名，根据地区选择：gate-hk（香港）、gate-us（美国）等',
    },
    {
      name: 'port',
      label: '代理端口',
      type: 'number',
      required: true,
      defaultValue: 18705,
      placeholder: '例如: 18705',
      tooltip: '代理服务端口，通常为 18705',
    },
    {
      name: 'accessId',
      label: 'Developer ID (API认证)',
      type: 'text',
      required: false,
      placeholder: '例如: 12345 (可选)',
      tooltip: 'Kookeey 控制台 → 开发者设置 → Developer ID（仅API调用需要）',
    },
    {
      name: 'token',
      label: 'Developer Token (API认证)',
      type: 'password',
      required: false,
      placeholder: '例如: your-secret-token (可选)',
      tooltip: 'Kookeey 控制台 → 开发者设置 → Developer Token（仅API调用需要）',
    },
    {
      name: 'apiUrl',
      label: 'API 地址',
      type: 'url',
      required: false,
      defaultValue: 'https://kookeey.com',
      placeholder: 'https://kookeey.com',
      tooltip: 'Kookeey API 基础地址（仅API调用需要）',
    },
    {
      name: 'proxyType',
      label: '代理类型',
      type: 'select',
      required: true,
      defaultValue: 'residential',
      tooltip: '选择代理池类型',
      options: [
        { label: '家宽代理 (Residential)', value: 'residential' },
        { label: '数据中心 (Datacenter)', value: 'datacenter' },
        { label: '移动代理 (Mobile)', value: 'mobile' },
      ],
    },
  ],

  // ==================== Bright Data 配置 ====================
  // 官方文档: https://docs.brightdata.com/proxy-networks/config-options
  // 代理端点: brd.superproxy.io:33335
  // 用户名格式: brd-customer-{id}-zone-{zone}-country-{cc}-state-{state}-city-{city}-session-{id}
  // 会话保持: 7分钟空闲超时自动释放
  brightdata: [
    {
      name: 'username',
      label: '用户名',
      type: 'text',
      required: true,
      placeholder: 'brd-customer-xxxxx-zone-residential',
      tooltip: '格式: brd-customer-{customer_id}-zone-{zone_name}，在 Bright Data 控制台获取',
    },
    {
      name: 'password',
      label: '密码',
      type: 'password',
      required: true,
      placeholder: 'your-password',
      tooltip: 'Bright Data 账户密码',
    },
    {
      name: 'zone',
      label: 'Zone (代理池类型)',
      type: 'select',
      required: true,
      defaultValue: 'residential',
      tooltip: '代理池类型决定IP来源和支持的参数',
      options: [
        { label: '住宅代理 (Residential) - 支持全部参数', value: 'residential' },
        { label: '数据中心 (Datacenter) - 仅支持国家', value: 'datacenter' },
        { label: '移动代理 (Mobile) - 支持全部参数+运营商', value: 'mobile' },
        { label: 'ISP 代理 - 仅支持国家', value: 'isp' },
      ],
    },
    {
      name: 'apiKey',
      label: 'API Key (可选)',
      type: 'password',
      required: false,
      placeholder: 'your-api-key',
      tooltip: '用于调用 Bright Data API 获取统计信息，可选',
    },
    {
      name: 'apiUrl',
      label: 'API 地址',
      type: 'url',
      defaultValue: 'https://api.brightdata.com',
      placeholder: 'https://api.brightdata.com',
      tooltip: 'Bright Data API 基础地址',
    },
    // ========== 高级参数 (地理位置定位) ==========
    {
      name: 'defaultCountry',
      label: '默认国家/地区',
      type: 'select',
      required: false,
      tooltip: 'ISO-3166 国家代码，所有代理类型都支持',
      options: [
        { label: '不指定 (随机)', value: '' },
        { label: '🇺🇸 美国 (US)', value: 'us' },
        { label: '🇬🇧 英国 (GB)', value: 'gb' },
        { label: '🇩🇪 德国 (DE)', value: 'de' },
        { label: '🇫🇷 法国 (FR)', value: 'fr' },
        { label: '🇯🇵 日本 (JP)', value: 'jp' },
        { label: '🇰🇷 韩国 (KR)', value: 'kr' },
        { label: '🇨🇳 中国 (CN)', value: 'cn' },
        { label: '🇭🇰 香港 (HK)', value: 'hk' },
        { label: '🇹🇼 台湾 (TW)', value: 'tw' },
        { label: '🇸🇬 新加坡 (SG)', value: 'sg' },
        { label: '🇦🇺 澳大利亚 (AU)', value: 'au' },
        { label: '🇨🇦 加拿大 (CA)', value: 'ca' },
        { label: '🇧🇷 巴西 (BR)', value: 'br' },
        { label: '🇮🇳 印度 (IN)', value: 'in' },
        { label: '🇪🇺 欧盟 (EU)', value: 'eu' },
      ],
    },
    {
      name: 'defaultState',
      label: '默认州/省',
      type: 'text',
      required: false,
      placeholder: 'california',
      tooltip: '仅限美国，需要先选择国家为 US。格式: 州名全拼小写 (如 california, new_york)',
    },
    {
      name: 'defaultCity',
      label: '默认城市',
      type: 'text',
      required: false,
      placeholder: 'los_angeles',
      tooltip: '城市名，无空格用下划线连接 (如 los_angeles, new_york)。仅住宅和移动代理支持',
    },
    {
      name: 'defaultZip',
      label: '默认邮编',
      type: 'text',
      required: false,
      placeholder: '90210',
      tooltip: '5位美国邮编，仅限美国住宅代理',
    },
    {
      name: 'defaultAsn',
      label: '默认 ASN',
      type: 'text',
      required: false,
      placeholder: '7922',
      tooltip: 'ASN 号码，仅住宅代理支持。用于定位特定网络运营商',
    },
    // ========== 会话控制 ==========
    {
      name: 'sessionMode',
      label: '会话模式',
      type: 'select',
      required: false,
      defaultValue: 'rotating',
      tooltip: 'rotating: 每次请求换IP；sticky: 保持同一IP (7分钟空闲超时)',
      options: [
        { label: '轮换模式 (Rotating) - 每次请求换IP', value: 'rotating' },
        { label: '粘性会话 (Sticky) - 保持同一IP', value: 'sticky' },
      ],
    },
  ],

  // ==================== Oxylabs 配置 ====================
  // 代理端点: pr.oxylabs.io:7777 (住宅) / dc.oxylabs.io:8001 (数据中心)
  // 用户名格式: customer-{username}-cc-{country}-st-{state}-city-{city}-sessid-{id}-sesstime-{minutes}
  oxylabs: [
    {
      name: 'username',
      label: '用户名',
      type: 'text',
      required: true,
      placeholder: '例如: john_TFTdL',
      tooltip: 'Oxylabs 账户用户名（不需要 customer- 前缀，系统会自动添加）',
    },
    {
      name: 'password',
      label: '密码',
      type: 'password',
      required: true,
      placeholder: 'your-password',
      tooltip: 'Oxylabs 账户密码',
    },
    {
      name: 'proxyType',
      label: '代理类型',
      type: 'select',
      required: true,
      defaultValue: 'residential',
      tooltip: '选择代理池类型',
      options: [
        { label: '住宅代理 (Residential) - pr.oxylabs.io:7777', value: 'residential' },
        { label: '数据中心 (Datacenter) - dc.oxylabs.io:8001', value: 'datacenter' },
      ],
    },
    {
      name: 'apiKey',
      label: 'API Key (可选)',
      type: 'password',
      required: false,
      placeholder: 'your-api-key',
      tooltip: 'Oxylabs Dashboard → API Key（用于获取统计信息）',
    },
    {
      name: 'apiUrl',
      label: 'API 地址',
      type: 'url',
      required: false,
      defaultValue: 'https://realtime.oxylabs.io',
      placeholder: 'https://realtime.oxylabs.io',
      tooltip: 'Oxylabs API 地址（用于获取统计信息）',
    },
    // ========== 高级参数（可选）==========
    {
      name: 'defaultCountry',
      label: '默认国家/地区',
      type: 'select',
      required: false,
      defaultValue: '',
      tooltip: '不填默认全球随机，支持195个国家',
      options: [
        { label: '全球随机 (默认)', value: '' },
        { label: '美国 (US)', value: 'US' },
        { label: '英国 (GB)', value: 'GB' },
        { label: '德国 (DE)', value: 'DE' },
        { label: '法国 (FR)', value: 'FR' },
        { label: '加拿大 (CA)', value: 'CA' },
        { label: '澳大利亚 (AU)', value: 'AU' },
        { label: '日本 (JP)', value: 'JP' },
        { label: '韩国 (KR)', value: 'KR' },
        { label: '新加坡 (SG)', value: 'SG' },
        { label: '巴西 (BR)', value: 'BR' },
        { label: '印度 (IN)', value: 'IN' },
        { label: '墨西哥 (MX)', value: 'MX' },
        { label: '意大利 (IT)', value: 'IT' },
        { label: '西班牙 (ES)', value: 'ES' },
        { label: '荷兰 (NL)', value: 'NL' },
      ],
    },
    {
      name: 'defaultState',
      label: '默认州/省',
      type: 'text',
      required: false,
      placeholder: '例如: us_california, us_florida',
      tooltip: '美国州代码格式：us_{state}，如 us_california',
    },
    {
      name: 'defaultCity',
      label: '默认城市',
      type: 'text',
      required: false,
      placeholder: '例如: los_angeles, new_york, tokyo',
      tooltip: '城市名用下划线连接，如 los_angeles',
    },
    {
      name: 'sessionMode',
      label: '会话模式',
      type: 'select',
      required: false,
      defaultValue: 'rotating',
      tooltip: '选择 IP 轮换方式',
      options: [
        { label: '轮换 IP (每次请求换 IP)', value: 'rotating' },
        { label: '粘性会话 (固定 IP 一段时间)', value: 'sticky' },
      ],
    },
    {
      name: 'sessionDuration',
      label: '会话时长 (分钟)',
      type: 'number',
      required: false,
      defaultValue: 10,
      placeholder: '1-1440 分钟',
      tooltip: '粘性会话模式下 IP 保持时间，默认10分钟，最长1440分钟（24小时）',
      min: 1,
      max: 1440,
    },
  ],

  // ==================== IPRoyal 配置 ====================
  // 官方文档: https://docs.iproyal.com/proxies/residential/proxy
  // 代理端点: geo.iproyal.com:12321
  // 密码格式: password_country-xx_state-xx_city-xx_session-xxxxxxxx_lifetime-10m
  // 会话ID: 必须8位字母数字
  // 会话时长: 1秒到7天 (1s, 10m, 2h, 1d, 7d)
  iproyal: [
    {
      name: 'username',
      label: '用户名',
      type: 'text',
      required: true,
      placeholder: 'your-username',
      tooltip: 'IPRoyal 账户用户名，在控制台获取',
    },
    {
      name: 'password',
      label: '密码',
      type: 'password',
      required: true,
      placeholder: 'your-password',
      tooltip: 'IPRoyal 账户密码（位置参数会自动追加到密码后面）',
    },
    {
      name: 'apiKey',
      label: 'API Key (可选)',
      type: 'password',
      required: false,
      placeholder: 'your-api-key',
      tooltip: 'API访问需要账户验证或消费超过$200，可选',
    },
    // ========== 高级参数 (地理位置定位) ==========
    {
      name: 'defaultRegion',
      label: '默认大区',
      type: 'select',
      required: false,
      tooltip: '按大区筛选代理IP',
      options: [
        { label: '不指定', value: '' },
        { label: '🌍 欧洲 (Europe)', value: 'europe' },
        { label: '🌎 北美 (North America)', value: 'northamerica' },
        { label: '🌏 亚太 (Asia Pacific)', value: 'asiapacific' },
        { label: '🌎 南美/拉美 (South/Latin America)', value: 'southlatinamerica' },
        { label: '🏜️ 中东 (Middle East)', value: 'middleeast' },
        { label: '🌍 非洲 (Africa)', value: 'africa' },
        { label: '🇦🇪 阿拉伯国家 (Arab States)', value: 'arabstates' },
      ],
    },
    {
      name: 'defaultCountry',
      label: '默认国家/地区',
      type: 'select',
      required: false,
      tooltip: 'ISO-3166 国家代码，支持多选用逗号分隔 (如 us,gb,de)',
      options: [
        { label: '不指定 (随机)', value: '' },
        { label: '🇺🇸 美国 (US)', value: 'us' },
        { label: '🇬🇧 英国 (GB)', value: 'gb' },
        { label: '🇩🇪 德国 (DE)', value: 'de' },
        { label: '🇫🇷 法国 (FR)', value: 'fr' },
        { label: '🇯🇵 日本 (JP)', value: 'jp' },
        { label: '🇰🇷 韩国 (KR)', value: 'kr' },
        { label: '🇨🇳 中国 (CN)', value: 'cn' },
        { label: '🇭🇰 香港 (HK)', value: 'hk' },
        { label: '🇹🇼 台湾 (TW)', value: 'tw' },
        { label: '🇸🇬 新加坡 (SG)', value: 'sg' },
        { label: '🇦🇺 澳大利亚 (AU)', value: 'au' },
        { label: '🇨🇦 加拿大 (CA)', value: 'ca' },
        { label: '🇧🇷 巴西 (BR)', value: 'br' },
        { label: '🇮🇳 印度 (IN)', value: 'in' },
        { label: '🇳🇱 荷兰 (NL)', value: 'nl' },
        { label: '🇮🇹 意大利 (IT)', value: 'it' },
        { label: '🇪🇸 西班牙 (ES)', value: 'es' },
      ],
    },
    {
      name: 'defaultState',
      label: '默认州 (仅限美国)',
      type: 'text',
      required: false,
      placeholder: 'iowa',
      tooltip: '仅限美国，需先选择国家为US。州名全拼小写无空格 (如 iowa, california, newyork)',
    },
    {
      name: 'defaultCity',
      label: '默认城市',
      type: 'text',
      required: false,
      placeholder: 'berlin',
      tooltip: '城市名，小写无空格 (如 berlin, tokyo, losangeles)。需要先指定国家',
    },
    {
      name: 'defaultIsp',
      label: '默认 ISP',
      type: 'text',
      required: false,
      placeholder: 'comcast',
      tooltip: 'ISP名称，小写无空格。需要先指定城市',
    },
    // ========== 会话控制 ==========
    {
      name: 'sessionMode',
      label: '会话模式',
      type: 'select',
      required: false,
      defaultValue: 'rotating',
      tooltip: 'rotating: 每次请求换IP；sticky: 保持同一IP直到lifetime过期',
      options: [
        { label: '轮换模式 (Rotating) - 每次请求换IP', value: 'rotating' },
        { label: '粘性会话 (Sticky) - 保持同一IP', value: 'sticky' },
      ],
    },
    {
      name: 'sessionLifetime',
      label: '会话时长',
      type: 'text',
      required: false,
      defaultValue: '10m',
      placeholder: '10m',
      tooltip: '粘性会话模式下IP保持时间。格式: 数字+单位 (s秒, m分, h时, d天)。范围: 1s-7d，如 30s, 10m, 2h, 1d',
    },
  ],

  // ==================== SmartProxy 配置 ====================
  smartproxy: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'your-api-key',
      tooltip: 'SmartProxy Dashboard → API Key',
    },
    {
      name: 'username',
      label: '用户名',
      type: 'text',
      required: true,
      placeholder: 'customer-username',
      tooltip: 'SmartProxy 账户用户名',
    },
    {
      name: 'password',
      label: '密码',
      type: 'password',
      required: true,
      placeholder: 'your-password',
      tooltip: 'SmartProxy 账户密码',
    },
    {
      name: 'apiUrl',
      label: 'API 地址',
      type: 'url',
      defaultValue: 'https://api.smartproxy.com',
      placeholder: 'https://api.smartproxy.com',
      tooltip: 'SmartProxy API 地址',
    },
  ],
};

/**
 * 获取指定提供商的字段配置
 */
export const getProviderFields = (providerType: string) => {
  return providerFieldsConfig[providerType] || [];
};

/**
 * 获取所有支持的提供商类型
 */
export const getSupportedProviderTypes = () => {
  return Object.keys(providerFieldsConfig);
};
