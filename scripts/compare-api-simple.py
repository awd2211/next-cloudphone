#!/usr/bin/env python3
"""
简化版前后端API接口对齐分析工具
"""

import re
from collections import defaultdict
from pathlib import Path

def extract_backend_endpoints(file_path):
    """提取后端API端点"""
    endpoints = []
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 提取所有 #### METHOD path - description 格式的行
    pattern = r'#### (GET|POST|PUT|PATCH|DELETE) (/[^\s]+) - (.+)'
    matches = re.findall(pattern, content)

    for method, path, description in matches:
        endpoints.append({
            'method': method,
            'path': path,
            'description': description.strip()
        })

    return endpoints

def extract_frontend_admin_endpoints(file_path):
    """提取Admin前端API调用（表格格式）"""
    endpoints = []
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 提取表格中的API | METHOD | /path | description |
    pattern = r'\| (GET|POST|PUT|PATCH|DELETE) \| `([^`]+)` \| ([^|]+) \|'
    matches = re.findall(pattern, content)

    for method, path, description in matches:
        endpoints.append({
            'method': method,
            'path': path,
            'description': description.strip(),
            'source': 'admin'
        })

    return endpoints

def extract_frontend_user_endpoints(file_path):
    """提取User前端API调用"""
    endpoints = []
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 提取 - [METHOD] /path 格式
    pattern = r'- \[(GET|POST|PUT|PATCH|DELETE)\]\s+(/[^\s\n]+)'
    matches = re.findall(pattern, content)

    for method, path in matches:
        endpoints.append({
            'method': method,
            'path': path,
            'description': '',
            'source': 'user'
        })

    return endpoints

def normalize_path(path):
    """标准化路径"""
    # 将所有参数占位符统一为 {id}
    path = re.sub(r'\{[^}]+\}', '{id}', path)
    path = re.sub(r':[^/\s]+', '{id}', path)
    return path

def create_endpoint_key(method, path):
    """创建端点唯一键"""
    return f"{method} {normalize_path(path)}"

def compare_endpoints(backend, frontend_admin, frontend_user):
    """对比前后端接口"""
    # 创建索引
    backend_keys = {create_endpoint_key(ep['method'], ep['path']): ep for ep in backend}
    frontend_admin_keys = {create_endpoint_key(ep['method'], ep['path']): ep for ep in frontend_admin}
    frontend_user_keys = {create_endpoint_key(ep['method'], ep['path']): ep for ep in frontend_user}

    # 合并前端
    frontend_all_keys = {**frontend_admin_keys, **frontend_user_keys}

    # 对比
    backend_only = []
    frontend_only = []
    aligned = []

    # 后端独有
    for key, ep in backend_keys.items():
        if key not in frontend_all_keys:
            backend_only.append(ep)
        else:
            aligned.append({
                'backend': ep,
                'frontend': frontend_all_keys[key]
            })

    # 前端独有
    for key, ep in frontend_all_keys.items():
        if key not in backend_keys:
            frontend_only.append(ep)

    return {
        'backend_only': backend_only,
        'frontend_only': frontend_only,
        'aligned': aligned
    }

def generate_simple_report(results, output_file):
    """生成简化报告"""
    report = []

    report.append("# 前后端API接口对齐分析报告\n\n")

    backend_only = results['backend_only']
    frontend_only = results['frontend_only']
    aligned = results['aligned']

    report.append("## 📊 统计摘要\n\n")
    report.append(f"- ✅ **已对齐接口**: {len(aligned)} 个\n")
    report.append(f"- ⚠️ **后端独有** (前端未调用): {len(backend_only)} 个\n")
    report.append(f"- ❌ **前端独有** (后端未实现): {len(frontend_only)} 个\n\n")

    coverage = len(aligned) / (len(aligned) + len(backend_only)) * 100 if (len(aligned) + len(backend_only)) > 0 else 0
    report.append(f"**前端覆盖率**: {coverage:.1f}%\n\n")

    report.append("---\n\n")
    report.append("## 1️⃣ 后端独有接口 (前端未调用)\n\n")
    report.append("这些接口已在后端实现，但前端尚未调用。可能原因:\n")
    report.append("- 新功能尚未前端实现\n")
    report.append("- 内部服务间调用\n")
    report.append("- 管理功能未暴露\n\n")

    # 按服务分组
    backend_by_service = defaultdict(list)
    for ep in backend_only:
        service = infer_service(ep['path'])
        backend_by_service[service].append(ep)

    for service in sorted(backend_by_service.keys()):
        eps = backend_by_service[service]
        report.append(f"### {service} ({len(eps)} 个)\n\n")
        for ep in sorted(eps, key=lambda x: x['path']):
            report.append(f"- `[{ep['method']}] {ep['path']}`\n")
            report.append(f"  - {ep['description']}\n")
        report.append("\n")

    report.append("---\n\n")
    report.append("## 2️⃣ 前端独有调用 (后端未实现) ⚠️ 需要修复\n\n")
    report.append("**这些API调用在前端中使用，但后端没有实现。需要紧急处理！**\n\n")

    # 按服务分组
    frontend_by_service = defaultdict(list)
    for ep in frontend_only:
        service = infer_service(ep['path'])
        frontend_by_service[service].append(ep)

    for service in sorted(frontend_by_service.keys()):
        eps = frontend_by_service[service]
        report.append(f"### {service} ({len(eps)} 个) - {'ADMIN' if eps[0].get('source') == 'admin' else 'USER'}\n\n")
        for ep in sorted(eps, key=lambda x: x['path']):
            report.append(f"- `[{ep['method']}] {ep['path']}`\n")
            if ep.get('description'):
                report.append(f"  - {ep['description']}\n")
        report.append("\n")

    report.append("---\n\n")
    report.append("## 3️⃣ 已对齐接口 (✅ 工作正常)\n\n")

    # 按服务分组统计
    aligned_by_service = defaultdict(int)
    for item in aligned:
        service = infer_service(item['backend']['path'])
        aligned_by_service[service] += 1

    for service in sorted(aligned_by_service.keys()):
        count = aligned_by_service[service]
        report.append(f"- **{service}**: {count} 个接口\n")

    report.append(f"\n总计: {len(aligned)} 个接口前后端完全对齐\n\n")

    # 写入文件
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(''.join(report))

    return {
        'aligned': len(aligned),
        'backend_only': len(backend_only),
        'frontend_only': len(frontend_only)
    }

def infer_service(path):
    """从路径推断服务"""
    if '/auth' in path or '/users' in path or '/roles' in path or '/permissions' in path:
        if '/menu-permissions' in path:
            return '菜单权限服务'
        elif '/field-permissions' in path:
            return '字段权限服务'
        elif '/data-scopes' in path:
            return '数据范围服务'
        elif '/quotas' in path:
            return '配额管理'
        elif '/tickets' in path:
            return '工单系统'
        elif '/audit-logs' in path:
            return '审计日志'
        elif '/api-keys' in path:
            return 'API密钥'
        elif '/cache' in path or '/queue' in path:
            return '缓存队列'
        elif '/roles' in path:
            return '角色管理'
        elif '/permissions' in path:
            return '权限管理'
        return '用户服务'
    elif '/devices' in path:
        if '/lifecycle' in path:
            return '设备生命周期'
        elif '/physical' in path:
            return '物理设备'
        return '设备服务'
    elif '/snapshots' in path:
        return '快照管理'
    elif '/apps' in path:
        return '应用服务'
    elif '/billing' in path or '/payments' in path or '/orders' in path or '/invoices' in path:
        return '计费服务'
    elif '/reports' in path or '/metering' in path:
        return '报表计量'
    elif '/notifications' in path:
        return '通知服务'
    elif '/templates' in path:
        return '模板管理'
    elif '/balance' in path:
        return '余额管理'
    elif '/plans' in path:
        return '套餐管理'
    else:
        return '其他'

def main():
    """主函数"""
    root_dir = Path(__file__).parent.parent

    backend_file = root_dir / 'docs' / 'API_ENDPOINTS_COMPLETE_ANALYSIS.md'
    frontend_admin_file = root_dir / 'FRONTEND_ADMIN_API_ANALYSIS.md'
    frontend_user_file = root_dir / 'FRONTEND_USER_API_ANALYSIS.md'
    output_file = root_dir / 'docs' / 'API_ALIGNMENT_REPORT.md'

    print("🔍 解析后端API端点...")
    backend = extract_backend_endpoints(backend_file)
    print(f"   ✅ 发现 {len(backend)} 个后端端点")

    print("\n🔍 解析Admin前端API调用...")
    frontend_admin = extract_frontend_admin_endpoints(frontend_admin_file)
    print(f"   ✅ 发现 {len(frontend_admin)} 个Admin调用")

    print("\n🔍 解析User前端API调用...")
    frontend_user = extract_frontend_user_endpoints(frontend_user_file)
    print(f"   ✅ 发现 {len(frontend_user)} 个User调用")

    print("\n📊 对比分析中...")
    results = compare_endpoints(backend, frontend_admin, frontend_user)

    print("\n📝 生成报告...")
    stats = generate_simple_report(results, output_file)

    print(f"\n✅ 报告已生成: {output_file}")
    print(f"\n📊 统计结果:")
    print(f"   - ✅ 已对齐: {stats['aligned']}")
    print(f"   - ⚠️  后端独有: {stats['backend_only']}")
    print(f"   - ❌ 前端独有: {stats['frontend_only']}")
    print(f"   - 📈 覆盖率: {stats['aligned'] / (stats['aligned'] + stats['backend_only']) * 100:.1f}%")

if __name__ == '__main__':
    main()
