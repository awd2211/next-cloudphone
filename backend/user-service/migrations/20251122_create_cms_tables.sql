-- 创建 CMS 内容管理系统表
-- 执行: docker compose -f docker-compose.dev.yml exec -T postgres psql -U postgres -d cloudphone_user < backend/user-service/migrations/20251122_create_cms_tables.sql

-- =====================================================
-- 1. site_settings - 网站基础设置表
-- =====================================================
CREATE TABLE IF NOT EXISTS site_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'string', -- string, json, html, number, boolean
    category VARCHAR(50) NOT NULL DEFAULT 'general', -- general, contact, seo, social
    description VARCHAR(500),
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 插入默认设置数据
INSERT INTO site_settings (key, value, type, category, description) VALUES
-- 联系信息
('contact.phone', '400-123-4567', 'string', 'contact', '客服电话'),
('contact.email', 'support@cloudphone.run', 'string', 'contact', '客服邮箱'),
('contact.privacy_email', 'privacy@cloudphone.run', 'string', 'contact', '隐私保护专员邮箱'),
('contact.refund_email', 'refund@cloudphone.run', 'string', 'contact', '退款专员邮箱'),
('contact.sla_email', 'sla@cloudphone.run', 'string', 'contact', 'SLA专员邮箱'),
('contact.wechat', 'CloudPhone_Support', 'string', 'contact', '微信客服号'),
('contact.qq_group', '123456789', 'string', 'contact', 'QQ群号'),
('contact.status_page', 'https://status.cloudphone.run', 'string', 'contact', '状态页URL'),
-- 公司信息
('company.name', '云手机平台', 'string', 'general', '公司名称'),
('company.slogan', '致力于为全球开发者提供最优质的云手机服务', 'string', 'general', '公司口号'),
('company.founded_year', '2020', 'string', 'general', '成立年份'),
-- 办公地址 (JSON 数组)
('company.offices', '[{"city":"北京总部","address":"北京市朝阳区建国路88号SOHO现代城","phone":"010-12345678"},{"city":"上海分公司","address":"上海市浦东新区陆家嘴金融中心","phone":"021-12345678"},{"city":"深圳分公司","address":"深圳市南山区科技园南区","phone":"0755-12345678"}]', 'json', 'contact', '办公地址列表'),
-- SEO 设置
('seo.default_title', 'CloudPhone.run - 企业级云手机平台', 'string', 'seo', '默认页面标题'),
('seo.default_description', '专业的云端Android设备管理平台，支持批量管理、远程控制、自动化操作', 'string', 'seo', '默认页面描述'),
('seo.default_keywords', '云手机,云端Android,远程控制,批量管理,游戏托管', 'string', 'seo', '默认关键词'),
-- 社交链接 (JSON)
('social.links', '{"wechat":"CloudPhone_Official","weibo":"cloudphone_run","github":"cloudphone"}', 'json', 'social', '社交媒体链接')
ON CONFLICT (key) DO NOTHING;

-- 创建更新触发器
CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_site_settings_updated_at ON site_settings;
CREATE TRIGGER trigger_site_settings_updated_at
    BEFORE UPDATE ON site_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_site_settings_updated_at();

-- =====================================================
-- 2. cms_contents - CMS 内容块表
-- =====================================================
CREATE TABLE IF NOT EXISTS cms_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page VARCHAR(100) NOT NULL,        -- home, pricing, about, product, solutions...
    section VARCHAR(100) NOT NULL,     -- hero_banner, features, stats, testimonials...
    title VARCHAR(500),                 -- 内容标题（可选）
    content JSONB NOT NULL,            -- 灵活的 JSON 结构存储内容
    "sortOrder" INT NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),

    -- 唯一约束：同一页面同一区块不重复
    CONSTRAINT uq_cms_contents_page_section UNIQUE (page, section, "sortOrder")
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_cms_contents_page ON cms_contents (page);
CREATE INDEX IF NOT EXISTS idx_cms_contents_section ON cms_contents (section);
CREATE INDEX IF NOT EXISTS idx_cms_contents_active ON cms_contents ("isActive");
CREATE INDEX IF NOT EXISTS idx_cms_contents_page_active ON cms_contents (page, "isActive", "sortOrder");

-- 更新触发器
DROP TRIGGER IF EXISTS trigger_cms_contents_updated_at ON cms_contents;
CREATE TRIGGER trigger_cms_contents_updated_at
    BEFORE UPDATE ON cms_contents
    FOR EACH ROW
    EXECUTE FUNCTION update_site_settings_updated_at();

-- =====================================================
-- 3. job_positions - 招聘职位表
-- =====================================================
CREATE TABLE IF NOT EXISTS job_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    department VARCHAR(100),
    location VARCHAR(200),
    "salaryRange" VARCHAR(100),
    description TEXT,
    requirements TEXT[],
    responsibilities TEXT[],
    tags VARCHAR(50)[],
    "employmentType" VARCHAR(50) DEFAULT 'full-time', -- full-time, part-time, contract, remote
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_job_positions_department ON job_positions (department);
CREATE INDEX IF NOT EXISTS idx_job_positions_active ON job_positions ("isActive");
CREATE INDEX IF NOT EXISTS idx_job_positions_active_sort ON job_positions ("isActive", "sortOrder");

-- 更新触发器
DROP TRIGGER IF EXISTS trigger_job_positions_updated_at ON job_positions;
CREATE TRIGGER trigger_job_positions_updated_at
    BEFORE UPDATE ON job_positions
    FOR EACH ROW
    EXECUTE FUNCTION update_site_settings_updated_at();

-- 插入默认职位数据
INSERT INTO job_positions (title, department, location, "salaryRange", description, requirements, tags, "sortOrder") VALUES
('高级前端工程师', '技术部', '北京 / 上海 / 远程', '25K-40K', '负责云手机平台前端架构设计与开发', ARRAY['5年以上前端开发经验', '精通React/TypeScript', '熟悉前端工程化', '良好的沟通能力'], ARRAY['React', 'TypeScript', 'Ant Design'], 1),
('后端开发工程师', '技术部', '北京 / 上海', '20K-35K', '负责后端服务开发与维护', ARRAY['3年以上后端开发经验', '精通Node.js/NestJS', '熟悉PostgreSQL/Redis', '了解微服务架构'], ARRAY['Node.js', 'NestJS', 'PostgreSQL'], 2),
('DevOps工程师', '技术部', '北京', '25K-40K', '负责平台基础设施和CI/CD', ARRAY['3年以上DevOps经验', '精通Kubernetes/Docker', '熟悉AWS/阿里云', '自动化脚本能力'], ARRAY['Kubernetes', 'Docker', 'CI/CD'], 3),
('产品经理', '产品部', '北京 / 上海', '20K-35K', '负责云手机产品规划与设计', ARRAY['3年以上B端产品经验', '优秀的需求分析能力', '熟悉云服务产品', '良好的沟通协调能力'], ARRAY['B端', '云服务', '产品设计'], 4),
('技术支持工程师', '客服部', '北京 / 远程', '10K-18K', '为客户提供技术支持服务', ARRAY['1年以上技术支持经验', '熟悉Android系统', '良好的问题排查能力', '优秀的服务意识'], ARRAY['技术支持', 'Android', '客户服务'], 5),
('市场运营专员', '市场部', '北京 / 上海', '12K-20K', '负责平台运营推广工作', ARRAY['2年以上运营经验', '熟悉内容营销', '数据分析能力', '创意策划能力'], ARRAY['内容营销', '数据分析', '活动策划'], 6)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. legal_documents - 法律文档表
-- =====================================================
CREATE TABLE IF NOT EXISTS legal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL UNIQUE, -- terms, privacy, refund, sla, security
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,             -- HTML 或 Markdown 内容
    "contentType" VARCHAR(20) NOT NULL DEFAULT 'html', -- html, markdown
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    "effectiveDate" DATE NOT NULL DEFAULT CURRENT_DATE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_legal_documents_type ON legal_documents (type);

-- 更新触发器
DROP TRIGGER IF EXISTS trigger_legal_documents_updated_at ON legal_documents;
CREATE TRIGGER trigger_legal_documents_updated_at
    BEFORE UPDATE ON legal_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_site_settings_updated_at();

-- 插入默认法律文档（简化版本，实际内容需要从前端页面提取）
INSERT INTO legal_documents (type, title, version, "effectiveDate", content) VALUES
('terms', '服务条款', '1.0', '2025-01-15', '<h2>云手机平台服务条款</h2><p>请仔细阅读本服务条款...</p>'),
('privacy', '隐私政策', '1.0', '2025-01-15', '<h2>云手机平台隐私政策</h2><p>我们高度重视用户隐私保护...</p>'),
('refund', '退款政策', '1.0', '2025-01-15', '<h2>退款政策</h2><p>我们理解您的需求可能会发生变化...</p>'),
('sla', '服务水平协议', '1.0', '2025-01-15', '<h2>服务水平协议（SLA）</h2><p>我们承诺为您提供高质量、高可用性的云手机服务...</p>'),
('security', '安全说明', '1.0', '2025-01-15', '<h2>安全说明</h2><p>我们采取多重安全措施保护您的数据...</p>')
ON CONFLICT (type) DO NOTHING;

-- =====================================================
-- 5. case_studies - 客户案例表
-- =====================================================
CREATE TABLE IF NOT EXISTS case_studies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "companyName" VARCHAR(200) NOT NULL,
    industry VARCHAR(100),             -- game, testing, ecommerce, social
    "logoUrl" VARCHAR(500),
    title VARCHAR(300),
    challenge TEXT,
    solution TEXT,
    results JSONB,                     -- 成果数据 [{metric, value, description}]
    testimonial JSONB,                 -- 客户评价 {name, role, content, avatar}
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_case_studies_industry ON case_studies (industry);
CREATE INDEX IF NOT EXISTS idx_case_studies_featured ON case_studies ("isFeatured");
CREATE INDEX IF NOT EXISTS idx_case_studies_active ON case_studies ("isActive");
CREATE INDEX IF NOT EXISTS idx_case_studies_active_sort ON case_studies ("isActive", "sortOrder");

-- 更新触发器
DROP TRIGGER IF EXISTS trigger_case_studies_updated_at ON case_studies;
CREATE TRIGGER trigger_case_studies_updated_at
    BEFORE UPDATE ON case_studies
    FOR EACH ROW
    EXECUTE FUNCTION update_site_settings_updated_at();

-- 插入默认案例数据
INSERT INTO case_studies ("companyName", industry, title, challenge, solution, results, testimonial, "isFeatured", "sortOrder") VALUES
('某头部游戏工作室', 'game', '批量管理300+云手机，游戏运营效率提升300%', '需要同时管理大量设备进行游戏多开和自动化挂机，传统方案成本高、效率低', '采用CloudPhone云手机方案，实现设备批量创建、脚本自动化执行、实时监控', '[{"metric":"运营效率提升","value":"300%","description":"自动化脚本大幅提升效率"},{"metric":"成本降低","value":"60%","description":"告别实体设备采购维护"},{"metric":"设备在线率","value":"99.9%","description":"7x24稳定运行"}]', '{"name":"李经理","role":"运营总监","content":"CloudPhone彻底改变了我们的工作方式，效率提升非常明显。"}', true, 1),
('某知名App开发公司', 'testing', '覆盖20+Android版本，测试周期缩短70%', '需要在多种Android版本上进行兼容性测试，购买实体设备成本太高', '使用CloudPhone快速创建不同版本的测试环境，支持CI/CD集成', '[{"metric":"测试周期","value":"-70%","description":"自动化测试流程"},{"metric":"覆盖版本","value":"20+","description":"Android 8-14全覆盖"},{"metric":"Bug发现率","value":"+40%","description":"更全面的测试覆盖"}]', '{"name":"张工","role":"测试负责人","content":"测试效率大幅提升，Bug发现更及时了。"}', true, 2),
('某电商运营团队', 'ecommerce', '多店铺运营效率提升200%', '需要管理多个电商平台账号，账号切换繁琐，数据容易混乱', '每个店铺独立云手机，数据隔离，支持定时任务和自动化操作', '[{"metric":"运营效率","value":"+200%","description":"批量操作省时省力"},{"metric":"账号安全","value":"0事故","description":"独立环境互不干扰"},{"metric":"订单处理","value":"+150%","description":"自动化抢单下单"}]', '{"name":"王总","role":"电商负责人","content":"多店铺管理变得轻松多了，再也不怕账号关联问题。"}', true, 3),
('某社交媒体MCN', 'social', '管理500+账号矩阵，内容分发效率翻倍', '账号矩阵庞大，内容发布效率低，难以统一管理', '使用CloudPhone构建账号矩阵，定时发布内容，统一监控管理', '[{"metric":"账号管理","value":"500+","description":"统一平台管理"},{"metric":"发布效率","value":"+100%","description":"定时批量发布"},{"metric":"粉丝增长","value":"+80%","description":"更多内容曝光"}]', '{"name":"陈总","role":"MCN负责人","content":"内容分发效率大幅提升，团队工作轻松很多。"}', true, 4)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. pricing_plans - 定价方案表
-- =====================================================
CREATE TABLE IF NOT EXISTS pricing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    "monthlyPrice" DECIMAL(10,2),       -- 月价格，null表示需要定制
    "yearlyPrice" DECIMAL(10,2),        -- 年价格
    "isCustomPrice" BOOLEAN NOT NULL DEFAULT false,
    tag VARCHAR(50),                    -- 推荐标签，如 "热门"
    description TEXT,
    features JSONB NOT NULL,            -- 功能列表 [{name, included, limit}]
    "highlightFeatures" TEXT[],         -- 突出显示的功能
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_pricing_plans_active ON pricing_plans ("isActive");
CREATE INDEX IF NOT EXISTS idx_pricing_plans_active_sort ON pricing_plans ("isActive", "sortOrder");

-- 更新触发器
DROP TRIGGER IF EXISTS trigger_pricing_plans_updated_at ON pricing_plans;
CREATE TRIGGER trigger_pricing_plans_updated_at
    BEFORE UPDATE ON pricing_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_site_settings_updated_at();

-- 插入默认定价方案
INSERT INTO pricing_plans (name, "monthlyPrice", "yearlyPrice", "isCustomPrice", tag, description, features, "highlightFeatures", "sortOrder") VALUES
('基础版', 99, 999, false, null, '适合个人用户和小型团队', '[{"name":"云手机数量","included":true,"limit":"5台"},{"name":"存储空间","included":true,"limit":"50GB"},{"name":"并发连接","included":true,"limit":"5个"},{"name":"技术支持","included":true,"limit":"工单"},{"name":"API访问","included":false},{"name":"专属客服","included":false}]', ARRAY['5台云手机', '50GB存储', '工单支持'], 1),
('标准版', 399, 3999, false, '热门', '适合中小企业', '[{"name":"云手机数量","included":true,"limit":"20台"},{"name":"存储空间","included":true,"limit":"200GB"},{"name":"并发连接","included":true,"limit":"20个"},{"name":"技术支持","included":true,"limit":"工单+邮件"},{"name":"API访问","included":true},{"name":"专属客服","included":false}]', ARRAY['20台云手机', '200GB存储', 'API访问'], 2),
('专业版', 999, 9999, false, null, '适合大型企业', '[{"name":"云手机数量","included":true,"limit":"100台"},{"name":"存储空间","included":true,"limit":"1TB"},{"name":"并发连接","included":true,"limit":"100个"},{"name":"技术支持","included":true,"limit":"电话+工单"},{"name":"API访问","included":true},{"name":"专属客服","included":true}]', ARRAY['100台云手机', '1TB存储', '专属客服'], 3),
('企业版', null, null, true, null, '适合超大规模部署', '[{"name":"云手机数量","included":true,"limit":"不限"},{"name":"存储空间","included":true,"limit":"不限"},{"name":"并发连接","included":true,"limit":"不限"},{"name":"技术支持","included":true,"limit":"7x24专线"},{"name":"API访问","included":true},{"name":"专属客服","included":true},{"name":"定制开发","included":true}]', ARRAY['无限云手机', '无限存储', '定制开发'], 4)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 输出成功信息
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Successfully created CMS tables:';
    RAISE NOTICE '  - site_settings';
    RAISE NOTICE '  - cms_contents';
    RAISE NOTICE '  - job_positions';
    RAISE NOTICE '  - legal_documents';
    RAISE NOTICE '  - case_studies';
    RAISE NOTICE '  - pricing_plans';
END $$;
