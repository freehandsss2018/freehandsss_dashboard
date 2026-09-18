#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FHS Repo-Map Verification Tool (Python Version)
驗證 docs/repo-map.md 與實際檔案結構的一致性
"""

import os
import re
import sys

# Fix encoding on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def main():
    print("═══════════════════════════════════════════════════════════")
    print("🔍 FHS Repo-Map 驗證工具 — Python Cross-Platform Version")
    print("═══════════════════════════════════════════════════════════")
    print("")

    repo_map_path = "docs/repo-map.md"
    errors = 0
    warnings = 0

    if not os.path.exists(repo_map_path):
        print(f"❌ 錯誤: 找不到 repo-map 檔案: {repo_map_path}")
        sys.exit(1)

    # 檢查 1: 驗證所有引用的檔案是否存在
    print("📋 檢查 1: 驗證文件參考")
    print("---")

    with open(repo_map_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 尋找所有包含 `path/to/file.md` 的引用的檔案（例如：.fhs/ai/AGENTS.md 等等，或是包含斜線與 .md 檔名的內容）
    # 或是 repo-map 中任何帶有 ` ` 號標記的 .md 檔
    referenced_files = re.findall(r'`([^`]*\.md)`', content)
    # 去重
    referenced_files = sorted(list(set(referenced_files)))

    for file_ref in referenced_files:
        # 有些是描述不是檔案路徑，或者含有萬用字元（如 *.xlsx）或是帶有註解的，或是 YYYY-MM-DD_<task_slug>_completion_report.md 等變數
        if '*' in file_ref or '<' in file_ref or '>' in file_ref or ' ' in file_ref or 'YYYY' in file_ref:
            continue
        
        # 移除非檔案名稱的字串
        if not file_ref.endswith('.md'):
            continue
            
        if not os.path.exists(file_ref):
            print(f"❌ 缺失檔案: {file_ref}")
            errors += 1
        else:
            print(f"✅ 存在: {file_ref}")

    print("")
    print("📋 檢查 2: 驗證版本號一致性")
    print("---")

    # 檢查 AGENTS.md 版本
    agents_path = ".fhs/ai/AGENTS.md"
    agents_version = "unknown"
    if os.path.exists(agents_path):
        with open(agents_path, 'r', encoding='utf-8') as f:
            agents_content = f.read()
        match = re.search(r'^> Version:\s*(v[\d\.]+)', agents_content, re.MULTILINE)
        if match:
            agents_version = match.group(1)
    
    print(f"📌 AGENTS.md 版本: {agents_version}")

    readmes = [
        "README.md",
        "docs/README.md",
        ".fhs/ai/README.md",
        "Freehandsss_Dashboard/README.md"
    ]

    for readme in readmes:
        if os.path.exists(readme):
            with open(readme, 'r', encoding='utf-8') as f:
                readme_content = f.read()
            # 搜尋類似 AGENTS.md v1.4.5 或 憲法層 v1.4.5 的字樣
            match = re.search(r'v(\d+\.\d+\.\d+)', readme_content)
            version = match.group(1) if match else "none"
            
            # 或者找 "v1.4.5"
            if f"v{version}" != agents_version and version != "none":
                # 有些 readme 沒有 'v' 前綴，例如 "1.4.5"
                if version != agents_version.lstrip('v'):
                    print(f"⚠️  {readme}: 版本不符 (找到: {version}, 應為: {agents_version})")
                    warnings += 1
                else:
                    print(f"✅ {readme}: v{version}")
            else:
                print(f"✅ {readme}: v{version}" if version != "none" else f"✅ {readme}: 無版本標記")

    print("")
    print("📋 檢查 3: 檢查過時檔案標記")
    print("---")

    obsolete_markers = ["已過時", "已由", "取代", "⚠️"]
    triple_sync_ok = False
    for marker in obsolete_markers:
        # 檢查是否含有 Triple_Sync 且含有 marker 或者 GLOBAL_AI_SOP 且含有 marker
        match_triple = re.search(rf"Triple_Sync.*{marker}", content, re.IGNORECASE)
        match_global = re.search(rf"GLOBAL_AI_SOP.*{marker}", content, re.IGNORECASE)
        if match_triple or match_global:
            triple_sync_ok = True
            break
            
    if triple_sync_ok:
        print("✅ Triple_Sync/GLOBAL_AI_SOP 已標記為過時")
    else:
        print("⚠️  Triple_Sync/GLOBAL_AI_SOP 未在 repo-map.md 中被明確標記為過時")
        warnings += 1

    print("")
    print("═══════════════════════════════════════════════════════════")
    print("📊 驗證結果")
    print("═══════════════════════════════════════════════════════════")
    print(f"❌ 錯誤: {errors}")
    print(f"⚠️  警告: {warnings}")
    print("")

    if errors == 0 and warnings == 0:
        print("✅ repo-map.md 驗證通過！")
        sys.exit(0)
    elif errors == 0:
        print("⚠️  驗證通過但有警告，請檢查版本一致性")
        sys.exit(0)
    else:
        print("❌ 驗證失敗，請修正上述問題")
        sys.exit(1)

if __name__ == '__main__':
    main()
