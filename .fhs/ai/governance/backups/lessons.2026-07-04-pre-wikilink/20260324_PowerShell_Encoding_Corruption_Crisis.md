# 事故紀錄：20260324 PowerShell 編碼損毀危機 (Encoding Crisis)

## 🚨 事件概述 (Incident Overview)
在執行 Product Bible V3.5 ➡️ V3.7 的批量引用更新時，AI (Antigravity) 使用了 PowerShell 的 `Get-Content | Set-Content` 命令進行字串替換。由於 Windows 預設 PowerShell 5.1 的編碼行為，導致所有繁體中文字符被轉換為 `?`，造成全系統核心規則（.cursorrules, Prompts, Blueprint）失效。

## 🔍 根因分析 (Root Cause)
1. **工具限制**：PowerShell 5.1 在未明確指定 `-Encoding` 時，`Set-Content` 預設採用 ANSI/ASCII 編碼。
2. **字符集不兼容**：UTF-8 編碼的繁體中文在流經 ANSI 管道時，無法被正確識別與保留，退化為問號。
3. **缺乏即時校驗**：AI 在執行批量替換後，未立即執行字讀取校驗以確認中文字符完整性。

## 🛡️ 防止再發措施 (Prevention Strategies)
1. **棄用不穩定命令**：嚴禁再使用 `Get-Content | Set-Content` 執行涉及中文的文件替換。
2. **優先選用 Python**：執行複雜的文件讀寫或替換時，應優先使用 Python 並明確指定 `encoding='utf-8'`。
3. **PowerShell 安全參數**：若必須使用 PowerShell，必須強制加上 `-Encoding utf8`。
4. **讀取校驗協定**：重大修改後，必須執行 `Select-String -Pattern '\?'` 或 `view_file` 進行人工/自動雙重抽查。

## 🔧 修復紀錄 (Recovery)
已於 2026-03-24 00:20 完成人工重構，將版本回復至 V3.7，且全數轉為 **UTF-8 (without BOM)** 標準。

---
*Status: 結案並存入 Memory Engine 3.0 錯題本*
