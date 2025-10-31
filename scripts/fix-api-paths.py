#!/usr/bin/env python3
"""
批量修复前端服务文件中的 API 路径，添加 api/v1 前缀
"""

import os
import re
import shutil
from pathlib import Path
from datetime import datetime

SERVICES_DIR = Path("/home/eric/next-cloudphone/frontend/admin/src/services")
SKIP_FILES = {"payment-admin.ts"}  # 已经修复过的文件

def create_backup(services_dir):
    """创建备份目录"""
    backup_dir = services_dir / f".backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    backup_dir.mkdir(exist_ok=True)
    return backup_dir

def needs_fix(line):
    """检查行是否需要修复"""
    # 匹配 request.get/post/put/delete/patch 后面的路径
    pattern = r"request\.(get|post|put|delete|patch)\s*[<(].*?['\"`](\/.+?)['\"`]"
    match = re.search(pattern, line)

    if not match:
        return False, line

    path = match.group(2)

    # 如果已经有 api/v1 前缀，不需要修复
    if path.startswith('/api/v1'):
        return False, line

    return True, path

def fix_line(line):
    """修复单行的 API 路径"""
    # 匹配各种形式的 request 调用
    patterns = [
        # 单引号
        (r"(request\.(get|post|put|delete|patch)\s*[<(][^)]*?\)\s*\(?)(['\"])(/[^'\"]*?)(['\"])", r"\1\3/api/v1\4\5"),
        # 双引号
        (r'(request\.(get|post|put|delete|patch)\s*[<(][^)]*?\)\s*\(?)(["\'])(/[^"\']*?)(["\'])', r'\1\3/api/v1\4\5'),
        # 反引号
        (r"(request\.(get|post|put|delete|patch)\s*[<(][^)]*?\)\s*\(?)(`)(/[^`]*?)(`)", r"\1\3/api/v1\4\5"),
    ]

    for pattern, replacement in patterns:
        # 只替换不包含 /api/v1 的路径
        if '/api/v1' not in line:
            line = re.sub(pattern, replacement, line)

    # 修复可能的双重前缀
    line = line.replace('/api/v1/api/v1', '/api/v1')

    return line

def process_file(file_path, backup_dir):
    """处理单个文件"""
    print(f"🔨 处理: {file_path.name}")

    # 备份原文件
    shutil.copy2(file_path, backup_dir / file_path.name)

    # 读取文件
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # 修复每一行
    fixed_lines = []
    changes_count = 0

    for i, line in enumerate(lines, 1):
        needs_fixing, _ = needs_fix(line)

        if needs_fixing:
            fixed_line = fix_line(line)
            if fixed_line != line:
                changes_count += 1
                print(f"   行 {i}: 已修复")
            fixed_lines.append(fixed_line)
        else:
            fixed_lines.append(line)

    # 写回文件
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(fixed_lines)

    if changes_count > 0:
        print(f"   ✅ 修复了 {changes_count} 行")
    else:
        print(f"   ⏭️  无需修复")

    return changes_count

def main():
    print("🔧 开始修复前端 API 路径")
    print("=" * 50)
    print()

    # 创建备份目录
    backup_dir = create_backup(SERVICES_DIR)
    print(f"📁 备份目录: {backup_dir}")
    print()

    # 遍历所有服务文件
    total_changes = 0
    processed_files = 0
    skipped_files = 0

    for file_path in sorted(SERVICES_DIR.glob("*.ts")):
        if file_path.name in SKIP_FILES:
            print(f"⏭️  跳过: {file_path.name} (已修复)")
            skipped_files += 1
            continue

        changes = process_file(file_path, backup_dir)
        total_changes += changes
        processed_files += 1
        print()

    # 输出统计
    print("=" * 50)
    print("✨ 修复完成！")
    print()
    print(f"📊 统计信息:")
    print(f"   - 处理文件: {processed_files}")
    print(f"   - 跳过文件: {skipped_files}")
    print(f"   - 总修复数: {total_changes}")
    print()
    print(f"📌 备份文件保存在: {backup_dir}")
    print(f"📌 如需恢复，请执行:")
    print(f"   cp {backup_dir}/* {SERVICES_DIR}/")
    print()

    # 验证
    print("🔍 验证修复结果...")
    remaining = 0
    for file_path in SERVICES_DIR.glob("*.ts"):
        if '.backup_' in str(file_path):
            continue

        with open(file_path, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                needs_fixing, _ = needs_fix(line)
                if needs_fixing:
                    remaining += 1
                    if remaining == 1:
                        print(f"\n未修复的 API 调用:")
                    print(f"   {file_path.name}:{line_num}: {line.strip()[:80]}")
                    if remaining >= 10:
                        print(f"   ... (还有更多)")
                        break

        if remaining >= 10:
            break

    if remaining == 0:
        print("   ✅ 所有 API 路径已正确添加 api/v1 前缀")
    else:
        print(f"\n   ⚠️  还有约 {remaining} 个 API 调用可能需要手动检查")

    print()
    print("🎉 完成！请检查修复结果并测试应用。")

if __name__ == "__main__":
    main()
