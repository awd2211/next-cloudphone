#!/usr/bin/env python3
"""
分析API Gateway路由映射
提取gateway暴露给前端的所有路由及其对应的后端服务
"""

import re
import json
from pathlib import Path
from typing import Dict, List

class GatewayRouteAnalyzer:
    def __init__(self):
        self.routes = []

    def parse_proxy_controller(self, file_path: str):
        """解析proxy.controller.ts文件"""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')

        current_route = None
        current_service = None
        is_public = False

        for i, line in enumerate(lines):
            stripped = line.strip()

            # 检查是否是公开路由
            if '@Public()' in stripped:
                is_public = True
                continue

            # 检查是否有UseGuards
            if '@UseGuards(JwtAuthGuard)' in stripped:
                is_public = False
                continue

            # 查找@All装饰器
            if '@All' in stripped:
                # 提取路由模式
                match = re.search(r'@All\(["\']([^"\']+)["\']\)', stripped)
                if match:
                    route_pattern = match.group(1)

                    # 查找下一行的函数名和handleProxy调用
                    func_name = 'unknown'
                    target_service = None

                    for j in range(i + 1, min(i + 5, len(lines))):
                        next_line = lines[j].strip()

                        # 提取函数名
                        if 'async' in next_line and '(' in next_line:
                            func_match = re.search(r'async\s+(\w+)\(', next_line)
                            if func_match:
                                func_name = func_match.group(1)

                        # 提取目标服务
                        if "this.handleProxy('" in next_line or 'this.handleProxy("' in next_line:
                            service_match = re.search(r'handleProxy\(["\']([^"\']+)["\']', next_line)
                            if service_match:
                                target_service = service_match.group(1)
                                break

                    if target_service:
                        # 将路由模式转换为实际路径
                        if '*path' in route_pattern:
                            base_route = route_pattern.replace('/*path', '')
                            is_wildcard = True
                        else:
                            base_route = route_pattern
                            is_wildcard = False

                        self.routes.append({
                            'pattern': route_pattern,
                            'route': base_route,
                            'wildcard': is_wildcard,
                            'service': target_service,
                            'public': is_public,
                            'function': func_name
                        })

                        # 重置public状态
                        is_public = False

    def generate_service_mapping(self) -> Dict:
        """生成服务映射"""
        mapping = {
            'user-service': [],
            'device-service': [],
            'app-service': [],
            'billing-service': [],
            'notification-service': [],
            'sms-receive-service': [],
            'proxy-service': [],
            'media-service': [],
        }

        service_name_map = {
            'users': 'user-service',
            'devices': 'device-service',
            'apps': 'app-service',
            'billing': 'billing-service',
            'notifications': 'notification-service',
            'sms-receive-service': 'sms-receive-service',
            'proxy-service': 'proxy-service',
            'media': 'media-service',
            'scheduler': 'device-service',  # scheduler现在是device-service的一部分
        }

        for route in self.routes:
            service_key = service_name_map.get(route['service'], route['service'])

            if service_key in mapping:
                mapping[service_key].append({
                    'route': route['route'],
                    'wildcard': route['wildcard'],
                    'public': route['public']
                })

        return mapping

    def generate_route_list(self) -> List[str]:
        """生成路由列表（供前端参考）"""
        route_list = set()

        for route in self.routes:
            if route['wildcard']:
                # 通配符路由添加基础路径
                route_list.add(route['route'])
                route_list.add(f"{route['route']}/*")
            else:
                route_list.add(route['route'])

        return sorted(route_list)

    def print_summary(self):
        """打印摘要"""
        print("\n" + "="*80)
        print("📋 API Gateway 路由映射摘要")
        print("="*80)

        mapping = self.generate_service_mapping()

        print(f"\n总路由数: {len(self.routes)}")
        print(f"公开路由: {sum(1 for r in self.routes if r['public'])}")
        print(f"需要认证: {sum(1 for r in self.routes if not r['public'])}")

        print("\n按服务分组:")
        print("-" * 80)
        for service, routes in sorted(mapping.items()):
            if routes:
                print(f"\n{service} ({len(routes)} 路由):")
                for route in sorted(routes, key=lambda x: x['route']):
                    public_mark = "🔓" if route['public'] else "🔒"
                    wildcard_mark = "/*" if route['wildcard'] else ""
                    print(f"  {public_mark} {route['route']}{wildcard_mark}")

        print("\n" + "="*80)

    def export_to_json(self, output_file: str):
        """导出为JSON"""
        mapping = self.generate_service_mapping()
        route_list = self.generate_route_list()

        output = {
            'summary': {
                'total_routes': len(self.routes),
                'public_routes': sum(1 for r in self.routes if r['public']),
                'authenticated_routes': sum(1 for r in self.routes if not r['public']),
            },
            'service_mapping': mapping,
            'all_routes': route_list,
            'routes_detail': sorted(self.routes, key=lambda x: x['route'])
        }

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        print(f"\n✅ 导出到 {output_file}")

def main():
    proxy_controller = '/home/eric/next-cloudphone/backend/api-gateway/src/proxy/proxy.controller.ts'
    output_file = '/home/eric/next-cloudphone/GATEWAY_ROUTES_MAPPING.json'

    analyzer = GatewayRouteAnalyzer()

    print("🔍 解析API Gateway路由配置...")
    analyzer.parse_proxy_controller(proxy_controller)

    analyzer.print_summary()
    analyzer.export_to_json(output_file)

    print(f"\n✅ 分析完成！共发现 {len(analyzer.routes)} 个Gateway路由")

if __name__ == '__main__':
    main()
