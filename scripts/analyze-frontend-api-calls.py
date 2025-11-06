#!/usr/bin/env python3
"""
分析前端API调用
扫描前端代码中的所有API调用
"""

import re
import json
from pathlib import Path
from typing import Dict, List, Set
from collections import defaultdict

class FrontendAPIAnalyzer:
    def __init__(self, frontend_dir: str, app_name: str):
        self.frontend_dir = Path(frontend_dir)
        self.app_name = app_name
        self.api_calls = []
        self.endpoints = set()

    def extract_api_calls(self, file_path: Path):
        """提取文件中的API调用"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # 提取各种API调用模式
            patterns = [
                # axios.get('/api/...')
                r'axios\.(get|post|put|delete|patch)\s*\(\s*["`\']([^"`\']+)["`\']',
                # api.get('/api/...')
                r'api\.(get|post|put|delete|patch)\s*\(\s*["`\']([^"`\']+)["`\']',
                # request.get('/api/...')
                r'request\.(get|post|put|delete|patch)\s*\(\s*["`\']([^"`\']+)["`\']',
                # fetch('/api/...')
                r'fetch\s*\(\s*["`\']([^"`\']+)["`\']',
                # 模板字符串 `/api/${...}`
                r'["`\']([/\w\-{}$]+/[/\w\-{}$:]+)["`\']',
            ]

            for pattern in patterns:
                matches = re.finditer(pattern, content)
                for match in matches:
                    groups = match.groups()

                    # 根据不同的pattern提取method和path
                    if len(groups) == 2 and groups[0] in ['get', 'post', 'put', 'delete', 'patch']:
                        method = groups[0].upper()
                        path = groups[1]
                    elif len(groups) == 1:
                        # fetch或模板字符串
                        method = 'GET'
                        path = groups[0]
                    else:
                        continue

                    # 清理路径
                    path = self.clean_path(path)

                    # 只保留以/开头的路径
                    if path and path.startswith('/'):
                        # 跳过静态资源
                        if any(ext in path for ext in ['.js', '.css', '.png', '.jpg', '.svg', '.ico']):
                            continue

                        # 跳过外部URL
                        if 'http://' in path or 'https://' in path:
                            continue

                        self.api_calls.append({
                            'file': str(file_path.relative_to(self.frontend_dir)),
                            'method': method,
                            'path': path,
                            'line': content[:match.start()].count('\n') + 1
                        })

                        self.endpoints.add(path)

        except Exception as e:
            print(f"Error parsing {file_path}: {e}")

    def clean_path(self, path: str) -> str:
        """清理路径，移除查询参数和锚点"""
        # 移除查询参数
        if '?' in path:
            path = path.split('?')[0]

        # 移除锚点
        if '#' in path:
            path = path.split('#')[0]

        # 移除模板变量${...}和:id等参数
        path = re.sub(r'\$\{[^}]+\}', ':id', path)
        path = re.sub(r'/\d+', '/:id', path)

        # 标准化路径
        path = path.strip()

        return path

    def scan_all_files(self):
        """扫描所有文件"""
        print(f"Scanning {self.app_name}...")

        # 扫描src目录
        src_dir = self.frontend_dir / 'src'
        if not src_dir.exists():
            print(f"Warning: {src_dir} not found")
            return

        # 扫描所有TypeScript和TypeScript React文件
        files = list(src_dir.glob('**/*.ts')) + list(src_dir.glob('**/*.tsx'))
        files = [f for f in files if 'node_modules' not in str(f)]

        print(f"Found {len(files)} files to scan")

        for file in files:
            self.extract_api_calls(file)

    def generate_summary(self) -> Dict:
        """生成统计摘要"""
        summary = {
            'total_calls': len(self.api_calls),
            'unique_endpoints': len(self.endpoints),
            'by_method': defaultdict(int),
            'by_service': defaultdict(int)
        }

        for call in self.api_calls:
            summary['by_method'][call['method']] += 1

            # 根据路径前缀分类服务
            path = call['path']
            if path.startswith('/auth'):
                summary['by_service']['auth'] += 1
            elif path.startswith('/users'):
                summary['by_service']['users'] += 1
            elif path.startswith('/devices'):
                summary['by_service']['devices'] += 1
            elif path.startswith('/apps'):
                summary['by_service']['apps'] += 1
            elif path.startswith('/billing') or path.startswith('/payments') or path.startswith('/plans') or path.startswith('/invoices'):
                summary['by_service']['billing'] += 1
            elif path.startswith('/notifications') or path.startswith('/templates'):
                summary['by_service']['notifications'] += 1
            else:
                summary['by_service']['other'] += 1

        summary['by_method'] = dict(summary['by_method'])
        summary['by_service'] = dict(summary['by_service'])

        return summary

    def print_summary(self):
        """打印摘要"""
        summary = self.generate_summary()

        print("\n" + "="*80)
        print(f"📊 {self.app_name} API调用统计")
        print("="*80)

        print(f"\n总API调用: {summary['total_calls']}")
        print(f"唯一端点: {summary['unique_endpoints']}")

        print("\n按HTTP方法:")
        print("-" * 80)
        for method, count in sorted(summary['by_method'].items()):
            print(f"  {method:10s} {count:5d}")

        print("\n按服务分类:")
        print("-" * 80)
        for service, count in sorted(summary['by_service'].items(), key=lambda x: -x[1]):
            print(f"  {service:20s} {count:5d}")

        print("\n" + "="*80)

    def export_to_json(self, output_file: str):
        """导出为JSON"""
        summary = self.generate_summary()

        output = {
            'app': self.app_name,
            'summary': summary,
            'endpoints': sorted(list(self.endpoints)),
            'calls': sorted(self.api_calls, key=lambda x: x['path'])
        }

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        print(f"\n✅ 导出到 {output_file}")

def main():
    # 分析admin前端
    admin_dir = '/home/eric/next-cloudphone/frontend/admin'
    admin_output = '/home/eric/next-cloudphone/FRONTEND_ADMIN_API_CALLS.json'

    admin_analyzer = FrontendAPIAnalyzer(admin_dir, 'admin')
    admin_analyzer.scan_all_files()
    admin_analyzer.print_summary()
    admin_analyzer.export_to_json(admin_output)

    # 分析user前端
    user_dir = '/home/eric/next-cloudphone/frontend/user'
    user_output = '/home/eric/next-cloudphone/FRONTEND_USER_API_CALLS.json'

    user_analyzer = FrontendAPIAnalyzer(user_dir, 'user')
    user_analyzer.scan_all_files()
    user_analyzer.print_summary()
    user_analyzer.export_to_json(user_output)

    print(f"\n✅ 分析完成！")
    print(f"   Admin: {len(admin_analyzer.api_calls)} 个API调用")
    print(f"   User: {len(user_analyzer.api_calls)} 个API调用")

if __name__ == '__main__':
    main()
