#!/usr/bin/env python3
"""
分析后端所有API端点
扫描所有Controller文件，提取API路径、HTTP方法、权限等信息
"""

import re
import json
from pathlib import Path
from typing import Dict, List, Set
from collections import defaultdict

class BackendAPIAnalyzer:
    def __init__(self, backend_dir: str):
        self.backend_dir = Path(backend_dir)
        self.apis = []
        self.services = {}

    def extract_decorator_value(self, line: str, decorator: str) -> str:
        """提取装饰器的值"""
        patterns = [
            rf'@{decorator}\(["\']([^"\']+)["\']\)',  # @Controller('users')
            rf'@{decorator}\(`([^`]+)`\)',              # @Controller(`users`)
            rf'@{decorator}\(\)',                       # @Controller()
        ]

        for pattern in patterns:
            match = re.search(pattern, line)
            if match:
                return match.group(1) if len(match.groups()) > 0 else ''
        return ''

    def extract_http_method(self, line: str) -> tuple:
        """提取HTTP方法和路径"""
        http_methods = ['Get', 'Post', 'Put', 'Delete', 'Patch', 'All', 'Options', 'Head']

        for method in http_methods:
            patterns = [
                rf'@{method}\(["\']([^"\']+)["\']\)',   # @Get('users')
                rf'@{method}\(`([^`]+)`\)',              # @Get(`users`)
                rf'@{method}\(\)',                       # @Get()
            ]

            for pattern in patterns:
                match = re.search(pattern, line)
                if match:
                    path = match.group(1) if len(match.groups()) > 0 else ''
                    return method.upper(), path

        return None, None

    def extract_permissions(self, lines: List[str], start_idx: int) -> List[str]:
        """提取权限装饰器"""
        permissions = []

        # 向前查找10行，寻找权限装饰器
        for i in range(max(0, start_idx - 10), start_idx):
            line = lines[i].strip()

            # @RequirePermissions
            if '@RequirePermissions' in line or '@Permissions' in line:
                perm_match = re.findall(r'["\']([^"\']+)["\']', line)
                permissions.extend(perm_match)

            # @RequirePermission
            if '@RequirePermission' in line:
                perm_match = re.search(r'["\']([^"\']+)["\']', line)
                if perm_match:
                    permissions.append(perm_match.group(1))

        return permissions

    def extract_guards(self, lines: List[str], start_idx: int) -> List[str]:
        """提取守卫装饰器"""
        guards = []

        for i in range(max(0, start_idx - 10), start_idx):
            line = lines[i].strip()

            if '@UseGuards' in line:
                guard_match = re.findall(r'(\w+Guard)', line)
                guards.extend(guard_match)

        return guards

    def parse_controller_file(self, file_path: Path, service_name: str):
        """解析单个Controller文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')

            # 提取Controller路径
            controller_path = ''
            for line in lines:
                if '@Controller' in line:
                    controller_path = self.extract_decorator_value(line, 'Controller')
                    break

            # 提取API版本
            api_version = ''
            for line in lines:
                if '@ApiVersion' in line:
                    api_version = self.extract_decorator_value(line, 'ApiVersion')
                    break

            # 提取所有HTTP方法
            for idx, line in enumerate(lines):
                method, path = self.extract_http_method(line)

                if method:
                    # 提取方法名
                    func_match = re.search(r'async\s+(\w+)\(|(\w+)\(', lines[idx + 1] if idx + 1 < len(lines) else '')
                    func_name = func_match.group(1) or func_match.group(2) if func_match else 'unknown'

                    # 组合完整路径
                    full_path = self.build_full_path(controller_path, path, api_version)

                    # 提取权限和守卫
                    permissions = self.extract_permissions(lines, idx)
                    guards = self.extract_guards(lines, idx)

                    self.apis.append({
                        'service': service_name,
                        'controller': file_path.stem,
                        'path': full_path,
                        'method': method,
                        'function': func_name,
                        'permissions': permissions,
                        'guards': guards,
                        'file': str(file_path.relative_to(self.backend_dir))
                    })

        except Exception as e:
            print(f"Error parsing {file_path}: {e}")

    def build_full_path(self, controller_path: str, method_path: str, api_version: str = '') -> str:
        """构建完整的API路径"""
        parts = []

        if api_version:
            parts.append(f'v{api_version}')

        if controller_path:
            parts.append(controller_path)

        if method_path:
            parts.append(method_path)

        # 处理参数占位符
        path = '/'.join(parts) if parts else '/'

        # 标准化路径
        if not path.startswith('/'):
            path = '/' + path

        # 清理多余的斜杠
        path = re.sub(r'/+', '/', path)

        return path

    def scan_all_services(self):
        """扫描所有服务"""
        services = [
            'api-gateway',
            'user-service',
            'device-service',
            'app-service',
            'billing-service',
            'notification-service',
            'sms-receive-service',
            'proxy-service'
        ]

        for service in services:
            service_dir = self.backend_dir / service
            if not service_dir.exists():
                continue

            print(f"Scanning {service}...")
            controller_files = list(service_dir.glob('**/*.controller.ts'))
            controller_files = [f for f in controller_files if 'node_modules' not in str(f) and 'dist' not in str(f)]

            for controller_file in controller_files:
                self.parse_controller_file(controller_file, service)

            self.services[service] = len([api for api in self.apis if api['service'] == service])

    def generate_summary(self) -> Dict:
        """生成统计摘要"""
        summary = {
            'total_apis': len(self.apis),
            'by_service': {},
            'by_method': defaultdict(int),
            'with_auth': 0,
            'with_permissions': 0,
            'public_apis': 0
        }

        for api in self.apis:
            # 按服务统计
            service = api['service']
            if service not in summary['by_service']:
                summary['by_service'][service] = {
                    'total': 0,
                    'by_method': defaultdict(int)
                }

            summary['by_service'][service]['total'] += 1
            summary['by_service'][service]['by_method'][api['method']] += 1

            # 按HTTP方法统计
            summary['by_method'][api['method']] += 1

            # 统计认证和权限
            has_jwt_guard = 'JwtAuthGuard' in api['guards']
            has_permissions = len(api['permissions']) > 0

            if has_jwt_guard:
                summary['with_auth'] += 1

            if has_permissions:
                summary['with_permissions'] += 1

            if not has_jwt_guard and not has_permissions:
                summary['public_apis'] += 1

        # 转换defaultdict为普通dict
        summary['by_method'] = dict(summary['by_method'])
        for service in summary['by_service']:
            summary['by_service'][service]['by_method'] = dict(summary['by_service'][service]['by_method'])

        return summary

    def export_to_json(self, output_file: str):
        """导出为JSON"""
        summary = self.generate_summary()

        output = {
            'summary': summary,
            'apis': sorted(self.apis, key=lambda x: (x['service'], x['path']))
        }

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        print(f"\n✅ Exported to {output_file}")

    def print_summary(self):
        """打印摘要"""
        summary = self.generate_summary()

        print("\n" + "="*80)
        print("📊 后端API统计摘要")
        print("="*80)

        print(f"\n总API数量: {summary['total_apis']}")
        print(f"需要认证: {summary['with_auth']}")
        print(f"需要权限: {summary['with_permissions']}")
        print(f"公开API: {summary['public_apis']}")

        print("\n按服务统计:")
        print("-" * 80)
        for service, stats in sorted(summary['by_service'].items()):
            print(f"  {service:30s} {stats['total']:4d} APIs")
            for method, count in sorted(stats['by_method'].items()):
                print(f"    {method:10s} {count:4d}")

        print("\n按HTTP方法统计:")
        print("-" * 80)
        for method, count in sorted(summary['by_method'].items(), key=lambda x: -x[1]):
            print(f"  {method:10s} {count:4d}")

        print("\n" + "="*80)

def main():
    backend_dir = '/home/eric/next-cloudphone/backend'
    output_file = '/home/eric/next-cloudphone/BACKEND_API_ANALYSIS.json'

    analyzer = BackendAPIAnalyzer(backend_dir)

    print("🔍 开始扫描后端API...")
    analyzer.scan_all_services()

    analyzer.print_summary()
    analyzer.export_to_json(output_file)

    print(f"\n✅ 分析完成！共发现 {len(analyzer.apis)} 个API端点")

if __name__ == '__main__':
    main()
