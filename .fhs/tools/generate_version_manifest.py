#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FHS Documentation Version Manifest Generator
自動從 AGENTS.md 與各 subagent 檔案生成版本清單
Phase 4 自動化工具
"""

import os
import re
import json
import sys
from pathlib import Path
from datetime import datetime

# Fix encoding on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def extract_frontmatter(file_path):
    """從 frontmatter 中提取版本資訊"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        data = {}

        # 方案 1: YAML frontmatter（--- ... ---）
        match = re.search(r'^---\n(.*?)\n---', content, re.DOTALL | re.MULTILINE)
        if match:
            frontmatter = match.group(1)
            for line in frontmatter.split('\n'):
                if ':' in line:
                    key, value = line.split(':', 1)
                    data[key.strip()] = value.strip()

        # 方案 2: Blockquote 格式（> Version: v1.4.5）
        else:
            version_match = re.search(r'^> Version: (v[\d.]+)', content, re.MULTILINE)
            if version_match:
                data['version'] = version_match.group(1)

            date_match = re.search(r'^> Last updated: (.+)$', content, re.MULTILINE)
            if date_match:
                data['last_updated'] = date_match.group(1)

        return data if data else None
    except Exception as e:
        print(f"⚠️  無法解析 {file_path}: {e}")
        return None

def generate_manifest():
    """生成版本清單"""
    print("🔄 FHS 文檔版本清單生成工具")
    print("=" * 60)

    manifest = {
        "generated_at": datetime.now().isoformat(),
        "files": {}
    }

    # 1. 檢查 AGENTS.md
    print("\n📌 檢查憲法層（AGENTS.md）...")
    agents_path = ".fhs/ai/AGENTS.md"
    if os.path.exists(agents_path):
        agents_data = extract_frontmatter(agents_path)
        if agents_data:
            manifest["files"]["AGENTS.md"] = {
                "path": agents_path,
                "version": agents_data.get("version", "unknown"),
                "type": "constitution",
                "status": "✅ Source of Truth"
            }
            print(f"  ✅ {agents_data.get('version', 'unknown')}")

    # 2. 檢查所有 README
    print("\n📖 檢查 README 檔案...")
    readme_patterns = [
        "README.md",
        "docs/README.md",
        ".fhs/ai/README.md",
        "Freehandsss_Dashboard/README.md",
        "supabase/README.md",
        "n8n/README.md"
    ]

    for readme_path in readme_patterns:
        if os.path.exists(readme_path):
            with open(readme_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # 尋找版本參考
            version_match = re.search(r'v(\d+\.\d+\.\d+|Phase \d+)', content)
            if version_match:
                manifest["files"][readme_path] = {
                    "path": readme_path,
                    "version": version_match.group(1),
                    "type": "readme",
                    "status": "✅ Found"
                }
                print(f"  ✅ {readme_path}: {version_match.group(1)}")

    # 3. 檢查所有 subagent
    print("\n🤖 檢查 Subagent 版本...")
    subagents_dir = ".fhs/ai/subagents/freehandsss"
    if os.path.exists(subagents_dir):
        for subagent_file in os.listdir(subagents_dir):
            if subagent_file.endswith('.md'):
                subagent_path = os.path.join(subagents_dir, subagent_file)
                subagent_data = extract_frontmatter(subagent_path)
                if subagent_data:
                    manifest["files"][subagent_file] = {
                        "path": subagent_path,
                        "version": subagent_data.get("version", "unknown"),
                        "compatible_with": subagent_data.get("compatible_with", "unknown"),
                        "type": "subagent",
                        "status": "✅ Standardized"
                    }
                    print(f"  ✅ {subagent_file}: {subagent_data.get('version', 'unknown')} (compatible: {subagent_data.get('compatible_with', 'unknown')})")

    # 4. 生成報告
    print("\n" + "=" * 60)
    print("📋 版本一致性檢查")
    print("=" * 60)

    # 檢查是否所有檔案都參考相同的 AGENTS 版本
    agents_version = manifest["files"].get("AGENTS.md", {}).get("version")
    if agents_version:
        mismatches = []
        for name, info in manifest["files"].items():
            if name != "AGENTS.md":
                if info.get("compatible_with") and agents_version not in info.get("compatible_with", ""):
                    mismatches.append(f"  ⚠️  {name}: compatible_with = {info.get('compatible_with')}")

        if mismatches:
            print(f"\n🔴 版本不一致（應為: {agents_version}）")
            for mismatch in mismatches:
                print(mismatch)
        else:
            print(f"\n✅ 所有 subagent 都相容於 AGENTS.md {agents_version}")

    # 5. 保存清單
    output_path = ".fhs/reports/version_manifest.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"\n💾 清單已保存: {output_path}")
    print(f"📊 統計: {len(manifest['files'])} 個檔案已檢查")

    return manifest

if __name__ == "__main__":
    manifest = generate_manifest()
