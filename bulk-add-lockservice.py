#!/usr/bin/env python3
"""
Bulk add lockService injection to TypeScript service files
"""
import re
import sys

def add_lockservice_to_constructor(content: str, file_path: str) -> str:
    """Add lockService parameter to constructor if not already present"""

    # Check if already has lockService
    if 'lockService' in content and 'DistributedLockService' in content:
        print(f"  ✅ Already has lockService")
        return None

    # Find constructor
    constructor_pattern = r'(constructor\s*\([^)]*)'
    match = re.search(constructor_pattern, content, re.DOTALL)

    if not match:
        print(f"  ⚠️  No constructor found")
        return None

    constructor_text = match.group(1)

    # Check if constructor is empty
    if constructor_text.strip().endswith('('):
        # Empty constructor
        new_constructor = constructor_text + '\n    private readonly lockService: DistributedLockService, // ✅ K8s cluster safety\n  '
    else:
        # Has parameters, add as last parameter
        new_constructor = constructor_text + ',\n    private readonly lockService: DistributedLockService, // ✅ K8s cluster safety\n  '

    new_content = content.replace(match.group(1), new_constructor, 1)

    # Ensure DistributedLockService is imported
    if 'DistributedLockService' not in new_content:
        # Find import from @cloudphone/shared and add it
        shared_import_pattern = r"(import\s+\{[^}]*)\}\s+from\s+'@cloudphone/shared'"
        shared_match = re.search(shared_import_pattern, new_content)

        if shared_match:
            imports = shared_match.group(1)
            if 'DistributedLockService' not in imports:
                new_imports = imports + ', DistributedLockService'
                new_content = new_content.replace(shared_match.group(1), new_imports, 1)
        else:
            # Add new import after other imports
            import_insertion = "import { DistributedLockService } from '@cloudphone/shared';\n"
            first_import_end = new_content.find('\n', new_content.find('import'))
            if first_import_end > 0:
                new_content = new_content[:first_import_end+1] + import_insertion + new_content[first_import_end+1:]

    print(f"  🔧 Added lockService")
    return new_content

def process_file(file_path: str) -> bool:
    """Process a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        new_content = add_lockservice_to_constructor(content, file_path)

        if new_content is None:
            return False

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        return True
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: bulk-add-lockservice.py <file1> <file2> ...")
        sys.exit(1)

    files = sys.argv[1:]
    success = 0
    skip = 0
    fail = 0

    for file_path in files:
        print(f"\nProcessing {file_path}...")
        result = process_file(file_path)
        if result:
            success += 1
        elif result is False:
            fail += 1
        else:
            skip += 1

    print(f"\n" + "="*60)
    print(f"Summary: {success} modified, {skip} skipped, {fail} failed")
    print(f"="*60)
