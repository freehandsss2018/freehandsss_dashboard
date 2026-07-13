# /team — AI 助理團隊名冊（重生成＋查閱＋勘誤跟進）

**用途**：重新掃描全部 AI 資產（subagents／斜線指令／skills／hooks／MCP／自動化／召喚詞），生成團隊名冊同漂移勘誤表，解決「AI 資產太多記唔住」問題。
**觸發指令**：`/team` 或對話講「團隊名冊」
**版本**：v1.0.0（2026-07-13，S171 新建；決策 D30）
**制度本體**：`.fhs/notes/ai-team-registry.md`（五條硬規則 R1-R5，本檔只係執行入口）
**真源**：各資產 frontmatter/檔頭 ＋ `.fhs/ai/team-manifest.json`（非檔案資產唯一登記點）

---

## 步驟

1. 跑 `node scripts/agent-dashboard.js`
2. 回報 console 統計（成員總數＋各類 count）同勘誤表逐項
3. 勘誤表非零 → 同 session 修復或落 handoff 待辦（R4，禁止靜默忽略）
4. Fat Mo 想睇 → `preview_start` 名 `fhs-artifacts`，開 `/agent-dashboard.html`；或直接開 `artifacts/agent-dashboard.html`
5. AI 自己要查隊員資料 → 讀 `artifacts/agent-dashboard.json`（機讀版，唔好 parse HTML）

## 輸出

- `artifacts/agent-dashboard.html` — 人睇名冊（召喚詞速查／成長史／七類成員／勘誤表）
- `artifacts/agent-dashboard.json` — AI 機讀版（同一份資料）

## Known failure modes

- 【情境】CRLF frontmatter 末行 `\r` 殘留令最後一個 key 靜默消失。【修正】parser 已防禦；改 parser 前先讀 registry §5。【日期】2026-07-13
