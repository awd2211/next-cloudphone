-- CMS Contents 初始化数据
-- 用于填充首页各区块的可配置内容

-- 清理旧数据以确保更新生效
DELETE FROM cms_contents WHERE page IN ('home', 'global');

-- ==================== Hero Banner Slides ====================
INSERT INTO cms_contents (id, page, section, title, content, "sortOrder", "isActive")
VALUES
  (
    gen_random_uuid(),
    'home',
    'hero',
    '思维无界 云端赋能',
    '{
      "slides": [
        {
          "id": 1,
          "title": "思维无界",
          "subtitle": "云端赋能",
          "description": "CloudPhone.run 为您提供稳定可靠的云端 Android 设备\n随时随地，轻松管理数百台设备，专注核心业务",
          "tag": "企业级云手机平台 · 全球领先",
          "bgGradient": "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          "primaryColor": "#6366f1",
          "secondaryColor": "#8b5cf6",
          "accentColor": "#d946ef"
        },
        {
          "id": 2,
          "title": "安全可靠",
          "subtitle": "稳定高效",
          "description": "99.9% SLA 保障，企业级数据安全\n全球多地域部署，毫秒级响应速度",
          "tag": "银行级安全 · ISO 27001 认证",
          "bgGradient": "linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #0c4a6e 100%)",
          "primaryColor": "#0ea5e9",
          "secondaryColor": "#06b6d4",
          "accentColor": "#22d3ee"
        },
        {
          "id": 3,
          "title": "极致性能",
          "subtitle": "智能调度",
          "description": "强大的 GPU 加速，流畅的云端体验\nAI 智能资源调度，成本降低 50%",
          "tag": "高性能计算 · 智能优化",
          "bgGradient": "linear-gradient(135deg, #4c1d95 0%, #5b21b6 50%, #4c1d95 100%)",
          "primaryColor": "#a855f7",
          "secondaryColor": "#c084fc",
          "accentColor": "#e879f9"
        },
        {
          "id": 4,
          "title": "开箱即用",
          "subtitle": "快速部署",
          "description": "一键创建云设备，30秒完成部署\n丰富的 API 接口，快速集成到您的业务",
          "tag": "极简部署 · 开发者友好",
          "bgGradient": "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #064e3b 100%)",
          "primaryColor": "#10b981",
          "secondaryColor": "#34d399",
          "accentColor": "#6ee7b7"
        }
      ],
      "trustBadges": ["企业级安全", "99.9% 可用性", "7×24 小时支持", "ISO 27001 认证"],
      "ctaButtons": {
        "primary": { "text": "立即开始", "icon": "RocketOutlined" },
        "secondary": { "text": "观看演示", "icon": "PlayCircleOutlined" }
      }
    }',
    1,
    true
  )
ON CONFLICT DO NOTHING;

-- ==================== Core Features ====================
INSERT INTO cms_contents (id, page, section, title, content, "sortOrder", "isActive")
VALUES
  (
    gen_random_uuid(),
    'home',
    'features',
    '核心功能特性',
    '{
      "sectionTitle": "为什么选择 CloudPhone.run",
      "sectionSubtitle": "企业级云手机解决方案，助力您的业务快速增长",
      "sectionTag": "核心优势",
      "features": [
        {
          "icon": "ThunderboltOutlined",
          "title": "极致性能",
          "description": "基于 Docker 容器化技术，真实 Android 环境，流畅运行各类应用，响应速度提升 300%",
          "color": "#6366f1",
          "bgColor": "rgba(99, 102, 241, 0.1)",
          "gradient": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
        },
        {
          "icon": "SafetyOutlined",
          "title": "企业级安全",
          "description": "数据隔离存储，端到端加密传输，通过 ISO 27001 认证，7×24 小时实时监控保障",
          "color": "#10b981",
          "bgColor": "rgba(16, 185, 129, 0.1)",
          "gradient": "linear-gradient(135deg, #10b981 0%, #059669 100%)"
        },
        {
          "icon": "DollarOutlined",
          "title": "灵活计费",
          "description": "按需付费，无隐藏费用，多种套餐选择，成本降低 60%，性价比行业领先",
          "color": "#f59e0b",
          "bgColor": "rgba(245, 158, 11, 0.1)",
          "gradient": "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
        },
        {
          "icon": "ApiOutlined",
          "title": "完善 API",
          "description": "提供 REST API 和 WebSocket 实时通信，支持主流编程语言 SDK，轻松集成",
          "color": "#8b5cf6",
          "bgColor": "rgba(139, 92, 246, 0.1)",
          "gradient": "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
        },
        {
          "icon": "ClusterOutlined",
          "title": "批量管理",
          "description": "支持批量操作，图形化管理界面，一键部署应用，管理效率提升 500%",
          "color": "#06b6d4",
          "bgColor": "rgba(6, 182, 212, 0.1)",
          "gradient": "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)"
        },
        {
          "icon": "CloudServerOutlined",
          "title": "弹性伸缩",
          "description": "自动扩容缩容，无需关心基础设施，专注业务核心逻辑，支持全球多地域部署",
          "color": "#ec4899",
          "bgColor": "rgba(236, 72, 153, 0.1)",
          "gradient": "linear-gradient(135deg, #ec4899 0%, #db2777 100%)"
        }
      ],
      "cta": {
        "title": "还在犹豫？立即体验",
        "subtitle": "免费试用 14 天，无需信用卡，随时取消",
        "badges": ["无需信用卡", "即刻开通", "专属技术支持"]
      }
    }',
    2,
    true
  )
ON CONFLICT DO NOTHING;

-- ==================== Platform Stats ====================
INSERT INTO cms_contents (id, page, section, title, content, "sortOrder", "isActive")
VALUES
  (
    gen_random_uuid(),
    'home',
    'stats',
    '平台统计数据',
    '{
      "stats": [
        {
          "key": "users",
          "title": "注册用户",
          "value": "10,000+",
          "icon": "UserOutlined",
          "color": "#6366f1",
          "gradient": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          "bgColor": "rgba(99, 102, 241, 0.1)",
          "description": "活跃用户数"
        },
        {
          "key": "devices",
          "title": "在线设备",
          "value": "50,000+",
          "icon": "MobileOutlined",
          "color": "#10b981",
          "gradient": "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          "bgColor": "rgba(16, 185, 129, 0.1)",
          "description": "云端运行中"
        },
        {
          "key": "uptime",
          "title": "服务可用性",
          "value": "99.9%",
          "icon": "CheckCircleOutlined",
          "color": "#f59e0b",
          "gradient": "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          "bgColor": "rgba(245, 158, 11, 0.1)",
          "description": "SLA 保障"
        },
        {
          "key": "companies",
          "title": "企业客户",
          "value": "500+",
          "icon": "TeamOutlined",
          "color": "#8b5cf6",
          "gradient": "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
          "bgColor": "rgba(139, 92, 246, 0.1)",
          "description": "遍布全球"
        }
      ],
      "footerText": "实时数据更新，展示 CloudPhone.run 的全球服务规模与可靠性"
    }',
    3,
    true
  )
ON CONFLICT DO NOTHING;

-- ==================== How It Works ====================
INSERT INTO cms_contents (id, page, section, title, content, "sortOrder", "isActive")
VALUES
  (
    gen_random_uuid(),
    'home',
    'how-it-works',
    '使用流程',
    '{
      "sectionTitle": "如何开始",
      "sectionSubtitle": "只需3步，快速体验云手机服务",
      "steps": [
        {
          "icon": "UserAddOutlined",
          "title": "注册账号",
          "description": "快速注册，1分钟完成",
          "time": "1 分钟",
          "color": "#1890ff"
        },
        {
          "icon": "ShoppingOutlined",
          "title": "选择套餐",
          "description": "灵活套餐，按需选择",
          "time": "30 秒",
          "color": "#52c41a"
        },
        {
          "icon": "MobileOutlined",
          "title": "创建设备",
          "description": "一键创建，即刻使用",
          "time": "10 秒",
          "color": "#faad14"
        }
      ]
    }',
    4,
    true
  )
ON CONFLICT DO NOTHING;

-- ==================== Use Cases ====================
INSERT INTO cms_contents (id, page, section, title, content, "sortOrder", "isActive")
VALUES
  (
    gen_random_uuid(),
    'home',
    'use-cases',
    '应用场景',
    '{
      "sectionTitle": "应用场景",
      "sectionSubtitle": "多种场景，一站式解决",
      "cases": [
        {
          "icon": "TrophyOutlined",
          "title": "游戏托管",
          "description": "24/7 自动挂机，多开运行，降低设备成本",
          "users": "3000+ 游戏工作室",
          "color": "#ef4444",
          "bgColor": "rgba(239, 68, 68, 0.1)",
          "path": "/solutions/gaming-hosting"
        },
        {
          "icon": "ExperimentOutlined",
          "title": "应用测试",
          "description": "兼容性测试、性能测试、自动化测试",
          "users": "500+ 开发团队",
          "color": "#3b82f6",
          "bgColor": "rgba(59, 130, 246, 0.1)",
          "path": "/solutions/app-testing"
        },
        {
          "icon": "ShoppingOutlined",
          "title": "电商运营",
          "description": "多账号管理、自动化运营、数据采集",
          "users": "2000+ 电商卖家",
          "color": "#ec4899",
          "bgColor": "rgba(236, 72, 153, 0.1)",
          "path": "/solutions/ecommerce-operations"
        },
        {
          "icon": "WechatOutlined",
          "title": "社交媒体",
          "description": "账号矩阵、内容发布、粉丝运营",
          "users": "1500+ 营销团队",
          "color": "#10b981",
          "bgColor": "rgba(16, 185, 129, 0.1)",
          "path": "/solutions/social-media"
        }
      ]
    }',
    5,
    true
  )
ON CONFLICT DO NOTHING;

-- ==================== CTA Banner ====================
INSERT INTO cms_contents (id, page, section, title, content, "sortOrder", "isActive")
VALUES
  (
    gen_random_uuid(),
    'home',
    'cta-banner',
    'CTA 横幅',
    '{
      "tag": "立即行动",
      "title": "准备好体验",
      "highlightText": "未来的云手机服务",
      "titleSuffix": "了吗？",
      "description": "加入 10,000+ 企业客户，享受 CloudPhone.run 提供的企业级云手机服务\n免费试用 14 天，无需信用卡",
      "primaryButton": { "text": "免费开始使用", "icon": "RocketOutlined", "link": "/login" },
      "secondaryButton": { "text": "联系销售", "icon": "MessageOutlined", "link": "/help" },
      "trustBadges": ["✓ 14 天免费试用", "✓ 无需信用卡", "✓ 随时取消", "✓ 即刻开通"]
    }',
    6,
    true
  )
ON CONFLICT DO NOTHING;

-- ==================== Pricing Section ====================
INSERT INTO cms_contents (id, page, section, title, content, "sortOrder", "isActive")
VALUES
  (
    gen_random_uuid(),
    'home',
    'pricing-section',
    '定价区块标题',
    '{
      "title": "选择适合您的套餐",
      "subtitle": "灵活的套餐选择，按需付费，无隐藏费用"
    }',
    5,
    true
  )
ON CONFLICT DO NOTHING;

-- ==================== Navigation - Header ====================
INSERT INTO cms_contents (id, page, section, title, content, "sortOrder", "isActive")
VALUES
  (
    gen_random_uuid(),
    'global',
    'header-nav',
    '顶部导航菜单',
    '{
      "brandInfo": {
        "name": "CloudPhone.run",
        "slogan": "Cloud Phone Platform",
        "logoText": "U"
      },
      "menuItems": [
        { "key": "/", "label": "首页" },
        { "key": "/pricing", "label": "价格" },
        { "key": "/about", "label": "关于" }
      ],
      "productMenu": {
        "title": "产品",
        "columns": [
          {
            "title": "核心功能",
            "color": "#6366f1",
            "items": [
              { "icon": "MobileOutlined", "title": "云手机管理", "desc": "一键创建、远程控制", "color": "#6366f1", "path": "/products/cloud-device-management" },
              { "icon": "AppstoreOutlined", "title": "应用市场", "desc": "海量应用一键安装", "color": "#10b981", "path": "/products/app-market" },
              { "icon": "RobotOutlined", "title": "自动化工具", "desc": "脚本录制、任务调度", "color": "#f59e0b", "path": "/products/automation-tools" },
              { "icon": "ApiOutlined", "title": "开放 API", "desc": "RESTful API 集成", "color": "#8b5cf6", "path": "/products/open-api" }
            ]
          },
          {
            "title": "行业方案",
            "color": "#ef4444",
            "items": [
              { "icon": "TrophyOutlined", "title": "游戏托管", "desc": "24/7 挂机、多开", "color": "#ef4444", "path": "/solutions/gaming-hosting" },
              { "icon": "ExperimentOutlined", "title": "应用测试", "desc": "兼容性、性能测试", "color": "#3b82f6", "path": "/solutions/app-testing" },
              { "icon": "ShoppingOutlined", "title": "电商运营", "desc": "多账号管理、自动化", "color": "#ec4899", "path": "/solutions/ecommerce-operations" },
              { "icon": "WechatOutlined", "title": "社交媒体", "desc": "账号矩阵、内容发布", "color": "#10b981", "path": "/solutions/social-media" }
            ]
          },
          {
            "title": "增值服务",
            "color": "#06b6d4",
            "items": [
              { "icon": "WifiOutlined", "title": "家宽代理", "desc": "真实家宽IP代理服务", "color": "#06b6d4", "path": "/products/residential-proxy" },
              { "icon": "PhoneOutlined", "title": "短信接收", "desc": "全球短信验证码接收", "color": "#8b5cf6", "path": "/products/sms-reception" }
            ]
          },
          {
            "title": "产品优势",
            "color": "#f59e0b",
            "items": [
              { "icon": "ThunderboltOutlined", "title": "高可用保障", "desc": "99.9% SLA 保障", "color": "#f59e0b", "path": "/product#advantages" },
              { "icon": "ExpandAltOutlined", "title": "弹性扩展", "desc": "秒级扩容、无上限", "color": "#6366f1", "path": "/product#advantages" },
              { "icon": "DollarOutlined", "title": "成本优化", "desc": "低至 ¥0.5/小时", "color": "#10b981", "path": "/pricing" },
              { "icon": "CustomerServiceOutlined", "title": "技术支持", "desc": "7×24 小时响应", "color": "#8b5cf6", "path": "/contact" }
            ]
          }
        ]
      },
      "helpMenu": {
        "title": "帮助",
        "columns": [
          {
            "title": "快速入口",
            "color": "#1890ff",
            "items": [
              { "icon": "FileTextOutlined", "title": "帮助文档", "desc": "详细的产品使用文档", "color": "#1890ff", "path": "/help/articles" },
              { "icon": "QuestionCircleOutlined", "title": "常见问题", "desc": "快速找到问题答案", "color": "#52c41a", "path": "/help/faqs" },
              { "icon": "PlayCircleOutlined", "title": "视频教程", "desc": "通过视频学习功能", "color": "#faad14", "path": "/help/tutorials" }
            ]
          },
          {
            "title": "获取支持",
            "color": "#722ed1",
            "items": [
              { "icon": "FormOutlined", "title": "提交工单", "desc": "获得专业技术支持", "color": "#722ed1", "path": "/tickets" },
              { "icon": "CustomerServiceOutlined", "title": "在线客服", "desc": "7×24 小时在线支持", "color": "#eb2f96", "path": "/contact" },
              { "icon": "BookOutlined", "title": "开发者文档", "desc": "API 接口使用指南", "color": "#13c2c2", "path": "/docs" }
            ]
          }
        ],
        "quickLinks": [
          { "text": "帮助中心首页", "path": "/help" },
          { "text": "新手入门指南", "path": "/help/getting-started" },
          { "text": "API 文档", "path": "/docs/api" },
          { "text": "查看所有文章", "path": "/help/articles" }
        ]
      }
    }',
    1,
    true
  )
ON CONFLICT DO NOTHING;

-- ==================== Navigation - Footer ====================
INSERT INTO cms_contents (id, page, section, title, content, "sortOrder", "isActive")
VALUES
  (
    gen_random_uuid(),
    'global',
    'footer-nav',
    '页脚导航',
    '{
      "brandInfo": {
        "name": "CloudPhone.run",
        "slogan": "Cloud Phone Platform",
        "description": "CloudPhone.run 致力于为全球企业提供稳定可靠的云端 Android 设备服务，助力业务创新与增长。"
      },
      "sections": [
        {
          "title": "产品",
          "links": [
            { "label": "产品介绍", "path": "/product" },
            { "label": "价格方案", "path": "/pricing" },
            { "label": "应用市场", "path": "/app-market" },
            { "label": "设备模板", "path": "/device-templates" }
          ]
        },
        {
          "title": "开发者",
          "links": [
            { "label": "API 文档", "path": "/help/api" },
            { "label": "使用教程", "path": "/help/tutorials" },
            { "label": "SDK 下载", "path": "/help/sdk" },
            { "label": "开发者社区", "path": "/help/community" }
          ]
        },
        {
          "title": "公司",
          "links": [
            { "label": "关于我们", "path": "/about" },
            { "label": "帮助中心", "path": "/help" },
            { "label": "联系我们", "path": "/contact" },
            { "label": "加入我们", "path": "/careers" }
          ]
        },
        {
          "title": "法律",
          "links": [
            { "label": "服务条款", "path": "/legal/terms" },
            { "label": "隐私政策", "path": "/legal/privacy" },
            { "label": "服务协议", "path": "/legal/sla" },
            { "label": "安全保障", "path": "/legal/security" }
          ]
        }
      ],
      "socialLinks": [
        { "icon": "GithubOutlined", "name": "GitHub", "url": "#" },
        { "icon": "TwitterOutlined", "name": "Twitter", "url": "#" },
        { "icon": "LinkedinOutlined", "name": "LinkedIn", "url": "#" },
        { "icon": "WechatOutlined", "name": "WeChat", "url": "#" }
      ],
      "contactInfo": {
        "phone": "400-123-4567",
        "email": "support@ultrathink.com",
        "wechat": "CloudPhone.run_Support",
        "serviceHours": "7×24 小时"
      },
      "copyright": {
        "text": "© 2025 CloudPhone.run. All rights reserved.",
        "links": [
          { "label": "ICP备案号", "path": "/legal/icp" },
          { "label": "营业执照", "path": "/legal/license" }
        ]
      }
    }',
    2,
    true
  )
ON CONFLICT DO NOTHING;

-- ==================== FAQ ====================
INSERT INTO cms_contents (id, page, section, title, content, "sortOrder", "isActive")
VALUES
  (
    gen_random_uuid(),
    'home',
    'faq',
    '常见问题',
    '{
      "sectionTitle": "常见问题",
      "sectionSubtitle": "快速找到您需要的答案",
      "items": [
        {
          "question": "CloudPhone.run 是什么？",
          "answer": "CloudPhone.run 是一个企业级云手机平台，提供云端 Android 设备服务。您可以通过我们的平台创建、管理和使用云端手机，无需购买实体设备。"
        },
        {
          "question": "如何开始使用？",
          "answer": "只需三步：1. 注册账号 2. 选择适合的套餐 3. 一键创建云设备。整个过程只需要几分钟即可完成。"
        },
        {
          "question": "支持哪些付款方式？",
          "answer": "我们支持支付宝、微信支付、银联卡、信用卡等多种支付方式。企业客户还可以选择对公转账。"
        },
        {
          "question": "数据安全如何保障？",
          "answer": "我们采用银行级安全标准，数据传输使用 TLS 1.3 加密，存储采用 AES-256 加密。平台已通过 ISO 27001 信息安全认证。"
        },
        {
          "question": "是否提供技术支持？",
          "answer": "是的，我们提供 7×24 小时技术支持。您可以通过在线客服、工单系统或电话联系我们的技术团队。"
        },
        {
          "question": "可以免费试用吗？",
          "answer": "是的，新用户可以免费试用 14 天，无需绑定信用卡。试用期间可以体验所有功能。"
        }
      ]
    }',
    7,
    true
  )
ON CONFLICT DO NOTHING;

-- ==================== SEO 配置 ====================
INSERT INTO cms_contents (id, page, section, title, content, "sortOrder", "isActive")
VALUES
  (
    gen_random_uuid(),
    'home',
    'seo',
    'SEO 配置',
    '{
      "title": "CloudPhone.run - 企业级云手机平台",
      "description": "CloudPhone.run 提供稳定高效的云端 Android 设备服务，支持应用测试、自动化运营、游戏多开等场景。思维无界，云端赋能。",
      "keywords": "云手机,云端Android,应用测试,自动化运营,游戏多开,移动设备云,云测试平台,CloudPhone.run",
      "url": "https://cloudphone.run"
    }',
    0,
    true
  )
ON CONFLICT DO NOTHING;

-- 验证插入结果
SELECT page, section, title, "isActive" FROM cms_contents ORDER BY page, "sortOrder";
