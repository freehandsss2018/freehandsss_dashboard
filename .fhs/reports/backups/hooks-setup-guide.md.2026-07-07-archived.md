---
name: hooks-setup-guide
source: awesome-claude-code
vendor_date: 2026-05-09
description: 安裝指南：Dippy（安全指令自動核准）+ parry（Prompt Injection 掃描）。需手動安裝後才能配置 settings.json。
---

# Hooks 安裝指南：Dippy + parry

> **狀態**：文檔化備用。FHS 現有 `defaultMode: bypassPermissions` 已覆蓋 Dippy 主要功能。
> parry 提供額外的 prompt injection 安全防線，待 Supabase 連線後優先安裝。

---

## Dippy — AST 安全指令自動核准

**來源**：https://github.com/ldayton/Dippy  
**用途**：以 AST（抽象語法樹）解析 Bash 指令，自動核准安全的唯讀操作

### 功能

- 解析 bash 指令的 AST
- 識別安全的指令（ls, cat, grep, git status, echo 等）
- 自動核准，不觸發 permission prompt
- 封鎖危險指令（rm, curl to external, etc.）

### 安裝

```bash
# 確認 Python 3.8+
python3 --version

# Clone 並安裝
git clone https://github.com/ldayton/Dippy.git tools/dippy
cd tools/dippy
pip install -r requirements.txt
```

### settings.json 配置（安裝後才加入）

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 tools/dippy/dippy.py",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

> ⚠️ **FHS 注意**：由於已設置 `bypassPermissions`，Dippy 的實際效益有限。若未來切換為 `default` 模式，則 Dippy 價值顯著提升。

---

## parry — Prompt Injection 掃描器

**來源**：https://github.com/vaporif/parry  
**用途**：掃描傳入 Claude Code hooks 的輸入，偵測 prompt injection 攻擊嘗試

### 功能

- 分析 PreToolUse 觸發的輸入內容
- 偵測已知的 prompt injection 模式（「忽略前述指令」、角色扮演攻擊等）
- 特別重要：保護財務數據操作不被惡意輸入操控

### 安裝

```bash
# parry 是 Rust 工具（需要 Cargo）
cargo install parry  # 或按 README 指示

# 驗證安裝
parry --version
```

### settings.json 配置（安裝後才加入）

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__claude_ai_Airtable__|Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "parry scan",
            "timeout": 3
          }
        ]
      }
    ]
  }
}
```

### FHS 優先場景

財務操作前的 prompt injection 防護：
- Airtable MCP 寫入操作前
- n8n Webhook 觸發前（含用戶輸入的 payload）

---

## 安裝優先順序

1. **parry** — 優先，特別是 Supabase 連線後（外部數據進入 Agent 的風險增加）
2. **Dippy** — 低優先，當前 bypassPermissions 已覆蓋其主要功能
