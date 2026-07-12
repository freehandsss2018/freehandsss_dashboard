# 拷問技能 Quickcard（mattpocock/skills 吸收版）

> 來源：`npx skills add mattpocock/skills` 選裝 4 支（grilling / grill-me / grill-with-docs / domain-modeling），S170 決策 D26。
> 唔跑 `mattpocock/skills` 官方 setup 精靈（該精靈服務 to-spec/triage/wayfinder，呢批冇裝，跑咗都無消費者）。

## 三個召喚詞（中文，唔使記英文指令名）

| 你講 | 效果 | 對應原指令 |
|---|---|---|
| **拷問我** / **拷問一輪** | 對一個模糊計畫/決定，逐條問清楚，一次一條，你答完先問下條，每條我會俾建議答案 | `/grilling`、`/grill-me` |
| **拷問落檔** | 拷問過程中同步寫入 `CONTEXT.md`（詞彙表）+ `.fhs/notes/adr/`（決策記錄，連 `decisions.md` D 表索引） | `/grill-with-docs` |
| （被動觸發）**任何時候你提出新功能/模糊需求** | 我主動問「要唔要拷問一輪先？」，唔使你記得叫 | — |

> ⚠️ **已知技術限制（S170 安裝後實測發現）**：`grill-me`／`grill-with-docs` 兩支因原檔 `disable-model-invocation: true`，喺 Claude Code harness 內完全無法被呼叫（連 AI 主動叫都被拒）。上表兩個召喚詞已設計為**直接呼叫 `grilling`（及 `grilling`+`domain-modeling`）本體**，不經 `grill-me`/`grill-with-docs` 轉介，故你使用上完全不受影響。`grilling`／`domain-modeling` 本身已實測可正常呼叫。

## 唔喺呢個系統做嘅嘢（刻意唔裝）

- ❌ `tdd`/`implement`/`diagnosing-bugs` — 同 FHS `tdd-guide`/`/execute`/`build-error-resolver` 重疊
- ❌ `code-review` — FHS `code-reviewer` subagent 帶住財務真理/HTML ID 鐵律，通用版唔識呢啲，換咗會拆晒護欄
- ❌ `handoff`（MP版）— 同 FHS 交接制度撞名，裝咗你講「handoff」會撞錯
- ❌ `triage`/`wayfinder`/`to-tickets` — 要成套 ticket 文化，FHS 用 handoff.md MASTER 表做緊同一件事

## 同 FHS 現有工具嘅分界（唔重疊）

| 場景 | 用邊個 |
|---|---|
| 模糊需求要問清楚先做 | **拷問我**（新引入，逐條慢問） |
| 已有草案要快速自我批評+抓弱點 | `/8d`（既有，一次過三弱點+八維度） |
| 需要外部 AI 意見交叉驗證方向 | `/cl-flow`/`/px`（既有） |
| 財務/生產HTML改動驗收 | fresh-context subagent（既有，不可自驗） |

## 4 週試用閘（防裝飾機制，非時間表）

真正防裝飾嘅唔係「第幾週用邊支」，係「你根本唔使記得用」——由我主動喺你提出模糊需求時提你。試用閘只用嚟決定要唔要留低：

- 4 週內用過 ≥2 次真實拷問 → 留低，考慮吸收 `to-spec` 格式做第二批
- 4 週內冇用過 → 拆走 `.claude/skills/` 四支，唔留殭屍（見 handoff.md 待辦）
