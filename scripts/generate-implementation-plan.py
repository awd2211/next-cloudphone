#!/usr/bin/env python3
"""
生成接口实现计划
根据前端独有的API调用，生成详细的实现计划
"""

import re
from collections import defaultdict
from pathlib import Path

def extract_frontend_only_apis(report_file):
    """从报告中提取前端独有的API"""
    with open(report_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 找到"前端独有调用"部分
    pattern = r'## 2️⃣ 前端独有调用.*?(?=##|\Z)'
    match = re.search(pattern, content, re.DOTALL)

    if not match:
        return []

    section = match.group(0)

    # 提取所有API调用
    api_pattern = r'- `\[(\w+)\] ([^`]+)`\s*(?:\n  - (.+))?'
    apis = []

    for match in re.finditer(api_pattern, section):
        method = match.group(1)
        path = match.group(2)
        desc = match.group(3).strip() if match.group(3) else ""

        apis.append({
            'method': method,
            'path': path,
            'description': desc
        })

    return apis

def classify_apis(apis):
    """按功能模块分类API"""
    classified = defaultdict(list)

    for api in apis:
        path = api['path']

        # 分类规则
        if '/admin/payments' in path or '/admin/payments' in path:
            module = '支付管理（管理员）'
        elif '/payments' in path or '/billing' in path or '/orders' in path:
            module = '计费支付'
        elif '/data-scopes' in path:
            module = '数据范围管理'
        elif '/field-permissions' in path:
            module = '字段权限管理'
        elif '/menu-permissions' in path:
            module = '菜单权限管理'
        elif '/help' in path:
            module = '帮助中心'
        elif '/export' in path:
            module = '数据导出'
        elif '/api/activities' in path or '/api/coupons' in path:
            module = '营销活动和优惠券'
        elif '/api/referral' in path:
            module = '邀请返利系统'
        elif '/media/sessions' in path:
            module = 'WebRTC媒体服务'
        elif '/events' in path:
            module = '事件溯源查看器'
        elif '/logs/audit' in path:
            module = '审计日志（详细）'
        elif '/provider' in path or '/admin/providers' in path:
            module = '设备提供商管理'
        elif '/scheduler' in path:
            module = '调度服务'
        elif '/failover' in path:
            module = '故障转移管理'
        elif '/state-recovery' in path:
            module = '状态恢复'
        elif '/lifecycle' in path:
            module = '生命周期管理'
        elif '/prometheus' in path or '/monitoring' in path:
            module = 'Prometheus监控'
        elif '/network-policy' in path:
            module = '网络策略'
        elif '/sms' in path:
            module = 'SMS管理'
        elif '/queue' in path:
            module = '队列管理'
        elif '/cache' in path:
            module = '缓存管理'
        elif '/webhooks' in path:
            module = 'Webhook管理'
        elif '/templates' in path:
            module = '模板管理'
        elif '/notifications' in path or '/notification-preferences' in path:
            module = '通知服务'
        elif '/devices' in path:
            module = '设备管理'
        elif '/apps' in path:
            module = '应用管理'
        elif '/users' in path or '/auth' in path:
            module = '用户认证'
        elif '/roles' in path or '/permissions' in path:
            module = '角色权限'
        elif '/quotas' in path:
            module = '配额管理'
        elif '/snapshots' in path:
            module = '快照管理'
        elif '/balance' in path:
            module = '余额管理'
        elif '/plans' in path:
            module = '套餐管理'
        elif '/reports' in path or '/metering' in path or '/statistics' in path:
            module = '报表统计'
        elif '/tickets' in path:
            module = '工单系统'
        else:
            module = '其他/未分类'

        classified[module].append(api)

    return classified

def generate_implementation_plan(classified, output_file):
    """生成实现计划"""
    plan = []

    plan.append("# 前端独有API接口实现计划\n\n")
    plan.append("本文档列出所有需要在后端实现的API接口（前端已调用但后端未实现）。\n\n")

    # 统计
    total = sum(len(apis) for apis in classified.values())
    plan.append(f"## 总览\n\n")
    plan.append(f"- **总计**: {total} 个接口需要实现\n")
    plan.append(f"- **模块数**: {len(classified)} 个功能模块\n\n")

    # 优先级分类
    plan.append("## 优先级分类\n\n")

    p0_modules = [
        '支付管理（管理员）', '计费支付', '用户认证', '设备管理',
        '应用管理', 'WebRTC媒体服务'
    ]
    p1_modules = [
        '数据范围管理', '字段权限管理', '菜单权限管理',
        '营销活动和优惠券', '邀请返利系统', '帮助中心',
        '数据导出', '审计日志（详细）'
    ]

    p0_count = sum(len(classified.get(m, [])) for m in p0_modules)
    p1_count = sum(len(classified.get(m, [])) for m in p1_modules)
    p2_count = total - p0_count - p1_count

    plan.append(f"### 🔴 P0 - 核心功能 ({p0_count} 个)\n")
    plan.append("影响核心业务流程，必须优先实现。\n\n")
    for module in p0_modules:
        if module in classified:
            plan.append(f"- **{module}**: {len(classified[module])} 个接口\n")
    plan.append("\n")

    plan.append(f"### 🟡 P1 - 重要功能 ({p1_count} 个)\n")
    plan.append("影响用户体验和运营效率，应尽快实现。\n\n")
    for module in p1_modules:
        if module in classified:
            plan.append(f"- **{module}**: {len(classified[module])} 个接口\n")
    plan.append("\n")

    plan.append(f"### 🟢 P2 - 增强功能 ({p2_count} 个)\n")
    plan.append("锦上添花的功能，可以延后实现。\n\n")

    # 详细列表
    plan.append("---\n\n")
    plan.append("## 详细实现清单\n\n")

    # 按优先级排序
    all_modules = []
    for module in p0_modules:
        if module in classified:
            all_modules.append((module, 'P0', classified[module]))

    for module in p1_modules:
        if module in classified:
            all_modules.append((module, 'P1', classified[module]))

    for module in sorted(classified.keys()):
        if module not in p0_modules and module not in p1_modules:
            all_modules.append((module, 'P2', classified[module]))

    for idx, (module, priority, apis) in enumerate(all_modules, 1):
        plan.append(f"### {idx}. {module} - {priority} 优先级\n\n")
        plan.append(f"**需要实现**: {len(apis)} 个接口\n\n")

        # 按路径分组
        api_by_resource = defaultdict(list)
        for api in apis:
            # 提取资源名称（去除参数）
            path_parts = api['path'].split('/')
            if len(path_parts) >= 3:
                resource = '/'.join(path_parts[:3])
            else:
                resource = api['path']
            api_by_resource[resource].append(api)

        for resource in sorted(api_by_resource.keys()):
            resource_apis = api_by_resource[resource]
            plan.append(f"#### 资源: `{resource}`\n\n")

            for api in sorted(resource_apis, key=lambda x: (x['method'], x['path'])):
                plan.append(f"- `[{api['method']}] {api['path']}`\n")
                if api.get('description'):
                    plan.append(f"  - 功能: {api['description']}\n")
                # 推断实现方式
                impl_hint = suggest_implementation(api)
                if impl_hint:
                    plan.append(f"  - 实现提示: {impl_hint}\n")

            plan.append("\n")

        plan.append("---\n\n")

    # 写入文件
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(''.join(plan))

    print(f"✅ 实现计划已生成: {output_file}")
    print(f"\n📊 统计:")
    print(f"   - P0 (核心): {p0_count} 个")
    print(f"   - P1 (重要): {p1_count} 个")
    print(f"   - P2 (增强): {p2_count} 个")
    print(f"   - 总计: {total} 个")

def suggest_implementation(api):
    """推断实现提示"""
    path = api['path']
    method = api['method']

    if '/stats' in path or '/statistics' in path:
        return "需要聚合统计数据，使用Redis缓存结果"
    elif '/export' in path:
        return "使用队列异步处理，生成文件后通知用户"
    elif method == 'GET' and '/{id}' in path:
        return "基础CRUD操作，查询数据库返回详情"
    elif method == 'POST' and '/batch' in path:
        return "批量操作，使用事务确保一致性"
    elif '/meta' in path:
        return "返回元数据配置，可使用常量或配置文件"
    elif '/config' in path and method == 'GET':
        return "查询配置表或环境变量"
    elif '/test' in path:
        return "连接测试，验证第三方服务可用性"
    elif method == 'POST' and '/webhook' in path:
        return "异步处理webhook回调，使用RabbitMQ队列"
    elif '/media' in path or '/webrtc' in path:
        return "集成WebRTC服务（media-service），创建会话"
    elif '/help' in path:
        return "内容管理系统，数据库存储文章/FAQ"
    elif '/referral' in path or '/activities' in path:
        return "营销模块，需要事件追踪和奖励计算"
    else:
        return None

def main():
    """主函数"""
    root_dir = Path(__file__).parent.parent

    report_file = root_dir / 'docs' / 'API_ALIGNMENT_REPORT.md'
    output_file = root_dir / 'docs' / 'API_IMPLEMENTATION_PLAN.md'

    print("🔍 从报告中提取前端独有的API...")
    apis = extract_frontend_only_apis(report_file)
    print(f"   ✅ 发现 {len(apis)} 个需要实现的API")

    print("\n📋 按功能模块分类...")
    classified = classify_apis(apis)
    print(f"   ✅ 分为 {len(classified)} 个功能模块")

    print("\n📝 生成实现计划...")
    generate_implementation_plan(classified, output_file)

if __name__ == '__main__':
    main()
