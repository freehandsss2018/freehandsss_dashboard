# AI 團隊註冊制度（ai-team-registry）

> **Version**: v1.1.0（2026-07-14；v1.0.0＝2026-07-13 S171 D30 初建；v1.1＝渲染層改白底卡片牆＋n8n 升級 live 實掃＋服務狀態 zone，Fat Mo 兩輪風格指定）
> **讀者**：任何未來 AI session——Claude（Opus/Sonnet/Haiku）、Codex、或其他模型。呢份係**制度本體**；`artifacts/agent_dashboardV42.html` 只係佢嘅生成物。
> **一句話用法**：`node scripts/agent_dashboardV42.js` → 生成 `artifacts/agent_dashboardV42.html`（人睇）+ `artifacts/agent_dashboardV42.json`（AI 讀）。召喚詞：`/team` 或「團隊名冊」。

---

## §1 問題與設計原理（點解係「生成」，唔係「維護」）

**問題**：FHS 嘅 AI 資產分散喺 7+ 個居所（subagents/commands/skills/hooks/MCP/n8n/召喚詞），人腦記唔住 → 工具變裝飾 → 重複建設、殭屍技能、召喚詞失傳。呢個唔係記性問題，係**架構問題**：冇單一視圖。

**原理三條**（違反任何一條，本制度就會退化成又一份過期文件）：

1. **可以被掃描嘅嘢，永遠唔好人手抄第二份。** 雙寫必漂移——本制度上線**首日**就喺 `.fhs/ai/subagents/MANIFEST.md` 抓到 4 項版本/登記漂移，實證。名冊嘅真源係各資產自身嘅 frontmatter/檔頭，唔係名冊本身。
2. **人工登記點只准有一個**：`.fhs/ai/team-manifest.json`，且只登記「掃描器掃唔到」嘅非檔案資產（MCP connector／n8n workflow／cron／內建 agent／召喚詞）。
3. **盤點工具同時係漂移偵測器。** 每次生成必附「勘誤表」（bridge 孤兒、缺 description、MANIFEST 漂移、manifest 同 .mcp.json 唔對數）。名冊唔會講大話：佢可能唔知用量，但「存在／唔存在」永遠準確。

---

## §2 資產分類學（七類居所表）

| 資產類 | 居所（真源） | 掃啲咩 | 新增時要做咩 |
|---|---|---|---|
| Subagents | `~/.claude/agents/freehandsss/*.md` | frontmatter：`name`/`description`/`tools`/`model`/`version`/`last_updated` | 寫齊 frontmatter 就自動上冊；MANIFEST.md 雙寫按既有規則（governance/05 §1） |
| 斜線指令 | master `.fhs/ai/commands/*.md` ＋ bridge `.claude/commands/*.md` | 檔頭 `# /name — 標題`、`**用途**：`、`**觸發指令**：`、`**版本**：` | 兩邊都要有檔——生成器會抓單邊孤兒 |
| Skills | `.claude/skills/*/SKILL.md` | frontmatter：`name`/`description` | 寫齊 frontmatter；FHS 自研/拷問系列要入 manifest `skill_categories`，否則歸「設計技能包」 |
| Hooks | `scripts/hooks/*` ＋ `.claude/settings.json` 接線 | settings.json hooks 事件自動對應 | manifest `hook_descriptions` 補一句人話 |
| MCP（專案級） | `.mcp.json` | server keys 自動掃 | manifest `mcp_connectors` 補描述（缺描述會上勘誤表） |
| n8n workflows | NAS n8n API（`.env` N8N_INSTANCE＋N8N_KEY） | **live 實掃**（v1.1，2026-07-14）：全部 workflow 名／active 狀態／最近 50 次執行結果 → 運行/異常/停止狀態燈 | 長期成員喺 manifest `automations` 用 `n8n_id` 補描述；分類規則喺 `n8n_categories`（regex→label）；離線時退回 manifest 條目標「未知」，生成不失敗 |
| MCP（connector/harness）、內建 agent | 無檔案可掃 | — | **同一個 session 內**登記 `team-manifest.json` |
| 召喚詞 | 無檔案可掃 | — | 登記 manifest `trigger_words`（phrase/target/effect 三欄） |

---

## §3 給未來 AI 嘅五條硬規則

- **R1** 名冊 HTML/JSON 係生成物，**嚴禁手改**——手改必被下次生成覆蓋。要改內容，去改真源（frontmatter／manifest）。
- **R2** 新增任何 AI 資產，同一個 session 內必須令佢喺名冊出現：檔案型＝frontmatter 寫齊；非檔案型＝登記 manifest。判準一句話：**「唔喺名冊上＝唔存在」**。
- **R3** 每個資產必須有一句「人話 description」（寫俾 Fat Mo 睇，唔係寫俾工程師睇）；有召喚詞嘅要登記召喚詞——防「工具變裝飾」（見 auto-memory feedback_grilling_proactive_prompt 同一精神）。
- **R4** 生成後勘誤表非零 → 同 session 修復，或明確落 handoff 待辦。**禁止靜默忽略**。
- **R5** 改本制度檔或 manifest schema 前，先讀 `.fhs/ai/governance/05_maintenance-protocol.md` 權限矩陣；追加「Known failure modes」條目屬可自行改級（05 §1）。

---

## §4 已知限制與邊界

- **出生日期**：repo 內檔案＝git 首次提交日；repo 外（user-level agents）＝MANIFEST 安裝史，退而求其次檔案 birthtime（同步盤上係近似值）。
- **外掛 plugin skills**（`anthropic-skills:*`、`dataviz` 等）唔掃——屬 harness 層，逐 session 唔同，掃咗反而製造假象。
- **MCP 欄以「configured」為準**，唔代表當前 session 已載入／已授權（如 figma 要 OAuth）。
- **服務狀態＝生成時快照，非實時監控**：狀態燈（運行/異常/停止/待命）反映生成嗰刻 n8n active 旗標＋最近執行結果；要新鮮數據就重跑 `/team`。n8n 離線→狀態「未知」，生成照樣成功。守護狀態 tile＝fhs-health issue_count＋.kgov-pending 旗標＋hook `node --check` 三者合計。
- **用量數據**未納入 v1——邊個技能真係有人用，屬 `/fhs-usage-audit` 職責（正交，勿重複建設）。

## §5 Known failure modes

- 【情境】CRLF 檔案嘅 frontmatter，`indexOf('\n---')` 切 block 後末行殘留 `\r`，JS regex `.`＋`$` 唔食 `\r` → **最後一個 key 靜默消失**（2026-07-13 首建即中：grilling/domain-modeling 嘅 description 啱好排最後）。【修正】parser 已逐行 `replace(/\r+$/,'')`；日後任何行錨點解析都要防 CRLF＋BOM（BOM 教訓見 governance/02 §7 2026-07-04 條）。【日期】2026-07-13
- 【情境】Browser pane screenshot 可以成個 session 失效（30s timeout），文字工具照常。【修正】名冊驗證一律用 read_page＋computed style＋console error 三件套，唔依賴截圖。【日期】2026-07-13

## §6 與現有制度嘅關係（職責正交表）

| 制度 | 管咩 | 本制度點配合 |
|---|---|---|
| fhs-health / `/fhs-slim` | 文件衛生（過肥/孤兒/過時/重複/斷鏈） | 正交：佢管文件健康，本制度管「AI 資產帳」 |
| `.fhs/notes/knowledge-map.md` | 舊知識去邊搵 | 正交：佢答「過去點解」，名冊答「而家有咩兵、點召喚」 |
| `.fhs/ai/subagents/MANIFEST.md` | subagent 安裝/版本史（雙寫 master） | 名冊交叉核對佢同 frontmatter，漂移上勘誤表 |
| `/fhs-usage-audit` | 邊啲 prompt/技能有真實用量 | 正交：名冊管「存在」，佢管「有冇用」；拷問試用閘類覆核用佢 |
| governance/05 | 制度檔演化權限 | 本檔同 manifest 嘅修改權限跟佢 |
