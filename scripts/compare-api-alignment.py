#!/usr/bin/env python3
"""
前后端API对齐分析
对比前端调用、Gateway路由和后端实现，找出不一致的地方
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Set
from collections import defaultdict

class APIAlignmentAnalyzer:
    def __init__(self):
        self.gateway_routes = set()
        self.backend_apis = {}
        self.frontend_admin_calls = set()
        self.frontend_user_calls = set()

        self.missing_gateway_routes = set()
        self.missing_backend_impl = set()
        self.unexposed_backend_apis = set()
        self.frontend_only_calls = set()

    def load_gateway_routes(self, file_path: str):
        """加载Gateway路由"""
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for route in data['all_routes']:
            # 标准化路由
            route = self.normalize_path(route)
            self.gateway_routes.add(route)

        print(f"✅ 加载了 {len(self.gateway_routes)} 个Gateway路由")

    def load_backend_apis(self, file_path: str):
        """加载后端API"""
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for api in data['apis']:
            path = self.normalize_path(api['path'])
            service = api['service']

            if service not in self.backend_apis:
                self.backend_apis[service] = set()

            self.backend_apis[service].add(path)

        total = sum(len(apis) for apis in self.backend_apis.values())
        print(f"✅ 加载了 {total} 个后端API")

    def load_frontend_calls(self, admin_file: str, user_file: str):
        """加载前端API调用"""
        # Admin
        with open(admin_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for endpoint in data['endpoints']:
            path = self.normalize_path(endpoint)
            self.frontend_admin_calls.add(path)

        print(f"✅ 加载了 {len(self.frontend_admin_calls)} 个Admin前端调用")

        # User
        with open(user_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for endpoint in data['endpoints']:
            path = self.normalize_path(endpoint)
            self.frontend_user_calls.add(path)

        print(f"✅ 加载了 {len(self.frontend_user_calls)} 个User前端调用")

    def normalize_path(self, path: str) -> str:
        """标准化路径"""
        # 移除前导/后导斜杠
        path = path.strip('/')

        # 移除/*通配符
        if path.endswith('/*'):
            path = path[:-2]

        # 标准化参数占位符
        path = re.sub(r':[\w-]+', ':id', path)
        path = re.sub(r'\{[\w-]+\}', ':id', path)
        path = re.sub(r'\$\{[^}]+\}', ':id', path)

        return path

    def match_route(self, frontend_path: str, gateway_routes: Set[str]) -> bool:
        """匹配路由（支持通配符）"""
        frontend_path = self.normalize_path(frontend_path)

        # 精确匹配
        if frontend_path in gateway_routes:
            return True

        # 前缀匹配（通配符路由）
        parts = frontend_path.split('/')
        for i in range(len(parts), 0, -1):
            prefix = '/'.join(parts[:i])
            if prefix in gateway_routes:
                return True

        return False

    def analyze_alignment(self):
        """分析对齐情况"""
        print("\n" + "="*80)
        print("🔍 开始分析API对齐情况...")
        print("="*80)

        all_frontend_calls = self.frontend_admin_calls | self.frontend_user_calls

        # 1. 前端调用但Gateway没有路由
        print("\n1️⃣ 检查前端调用但Gateway缺少的路由...")
        for call in all_frontend_calls:
            if not self.match_route(call, self.gateway_routes):
                self.missing_gateway_routes.add(call)

        print(f"   发现 {len(self.missing_gateway_routes)} 个缺失的Gateway路由")

        # 2. Gateway有但后端可能没实现的
        # 注意：这个需要更智能的匹配，因为后端API路径可能不同
        # 暂时跳过这个检查

        print("\n✅ 分析完成")

    def generate_report(self) -> Dict:
        """生成报告"""
        report = {
            'summary': {
                'gateway_routes': len(self.gateway_routes),
                'backend_apis': sum(len(apis) for apis in self.backend_apis.values()),
                'frontend_admin_calls': len(self.frontend_admin_calls),
                'frontend_user_calls': len(self.frontend_user_calls),
                'missing_gateway_routes': len(self.missing_gateway_routes),
            },
            'missing_gateway_routes': sorted(list(self.missing_gateway_routes)),
            'gateway_routes': sorted(list(self.gateway_routes)),
            'backend_apis_by_service': {
                service: sorted(list(apis))
                for service, apis in self.backend_apis.items()
            },
            'frontend_admin_calls': sorted(list(self.frontend_admin_calls)),
            'frontend_user_calls': sorted(list(self.frontend_user_calls)),
        }

        return report

    def print_report(self):
        """打印报告"""
        report = self.generate_report()

        print("\n" + "="*80)
        print("📊 API对齐分析报告")
        print("="*80)

        print("\n📈 统计摘要:")
        print("-" * 80)
        print(f"  Gateway路由数:        {report['summary']['gateway_routes']}")
        print(f"  后端API总数:          {report['summary']['backend_apis']}")
        print(f"  Admin前端调用:        {report['summary']['frontend_admin_calls']}")
        print(f"  User前端调用:         {report['summary']['frontend_user_calls']}")
        print(f"  缺失Gateway路由:      {report['summary']['missing_gateway_routes']}")

        if report['missing_gateway_routes']:
            print("\n⚠️ 前端调用但Gateway缺失的路由:")
            print("-" * 80)
            for route in report['missing_gateway_routes'][:20]:
                print(f"  ❌ /{route}")

            if len(report['missing_gateway_routes']) > 20:
                print(f"  ... 还有 {len(report['missing_gateway_routes']) - 20} 个路由")

        print("\n" + "="*80)

    def export_report(self, output_file: str):
        """导出报告"""
        report = self.generate_report()

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        print(f"\n✅ 报告已导出到 {output_file}")

def main():
    analyzer = APIAlignmentAnalyzer()

    # 加载数据
    analyzer.load_gateway_routes('/home/eric/next-cloudphone/GATEWAY_ROUTES_MAPPING.json')
    analyzer.load_backend_apis('/home/eric/next-cloudphone/BACKEND_API_ANALYSIS.json')
    analyzer.load_frontend_calls(
        '/home/eric/next-cloudphone/FRONTEND_ADMIN_API_CALLS.json',
        '/home/eric/next-cloudphone/FRONTEND_USER_API_CALLS.json'
    )

    # 分析对齐情况
    analyzer.analyze_alignment()

    # 生成报告
    analyzer.print_report()
    analyzer.export_report('/home/eric/next-cloudphone/API_ALIGNMENT_REPORT.json')

    print("\n✅ 所有分析完成！")

if __name__ == '__main__':
    main()
