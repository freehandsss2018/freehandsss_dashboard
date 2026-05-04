# FHS Handoff - 2026-05-05
當前版本：v1.4.2（憲法層）/ V40.6（n8n Node 14）/ V40.7（UI層）/ 6 Agents + 2 Skills + Hook System v1.0.0

## 本次 Session 完成事項（2026-05-05）

✅ **Blender MCP 環境建置完成**
- 確認 Blender 5.1.1 已安裝（`C:\Program Files\Blender Foundation\Blender 5.1\`）
- 安裝 uv 0.11.8（`C:\Users\Edwin\.local\bin\`）
- 下載 Blender MCP addon v1.2 至桌面，已在 Blender 安裝並啟用
- Claude Code MCP server 設定（`claude mcp add blender`，寫入 `~/.claude.json`）
- Blender ↔ Claude Code 連線測試通過（port 9876，status: ✅ Connected）

## 待辦 ⏳ 項目

1. **[P-MED] iPhone 實機測試 — V40 財務模式**
2. **🟡 Legacy Scripts 文件化決策**（4 個腳本未在 scripts/README.md 記錄）
3. **🟡 rebuild_index.py**（根目錄，Antigravity conversation 索引工具，任務未完成中）

## 核心配置

| 項目 | 現況 |
|------|------|
| 憲法層 | `AGENTS.md` v1.4.2 |
| 稼動生產版 | `Freehandsss_dashboard_current.html` |
| 主要開發版 | `freehandsss_dashboardV40.html`（V40.7）|
| n8n Workflow | V45.7.4（24 nodes）|
| Airtable Base | `app9GuLsW9frN4xaT` |
| Airtable 新欄位 | Order_Items +3 formula / Main_Orders +3 rollup |
| Blender MCP | addon v1.2 已裝，每次開啟 Blender 需重新 Connect |
| uv | 0.11.8（`C:\Users\Edwin\.local\bin\`）|
