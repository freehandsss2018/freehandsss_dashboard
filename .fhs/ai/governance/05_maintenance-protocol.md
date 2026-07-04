# 05 — 維護協議（governance 檔案怎麼安全地演化）

> **Version**: v1.0.0（2026-07-04，Session 137）
> **讀者**：任何想修改 CLAUDE.md、governance/、learnings、handoff 的未來 session。
> **原則**：制度檔的價值在「穩定可預期」。寧可慢半拍，不可讓兩個 session 讀到互相矛盾的規則。

---

## §1 權限矩陣

### ✅ 可自行改（無需問 Fat Mo，但改前必備份）

| 動作 | 條件 |
|---|---|
| `02 §7 實戰修正錄` 追加條目 | 照 §3 格式，追加不改舊條 |
| `03` rubric 追加**新的正/反例** | 只加例子，不動判準本文 |
| `04` 追加新模板變體 | 新增檔尾，不改既有 T1–T5 |
| [[00_INDEX]] 狀態欄更新 | 事實同步 |
| 修 typo / 修失效路徑引用 | 引用目標確實已遷移，且在同 commit 註明 |
| `learnings.md` 追加條目 | 遵其自身規則（≤150字元/條、50條上限）|
| handoff.md 輪轉 | 嚴格照 §4 SOP，先備份 |

### ⛔ 動之前必先問 Fat Mo（提案→等確認）

| 對象 | 理由 |
|---|---|
| `AGENTS.md` 任何改動 | 憲法層，既有規則已要求 |
| `CLAUDE.md` 改動（含路由表增刪行） | 每 session 載入，錯一行污染所有未來 session |
| `02` 的門檻數字、分派表、升降級規則本體 | 制度核心，改了=換了一套調度哲學 |
| `03` 的判準本文（增/刪/改判準條件） | 同上 |
| **刪除**任何既有規則/條目（任何檔） | 刪除的破壞半徑大於新增 |
| 9 支 subagent 的 frontmatter（model:/tools:） | 既有同步規則（master 在 .fhs/ai/subagents/，需雙寫）|
| 新建 governance 編號檔（07+） | 先確認不與現有檔重疊職責 |

**提案格式**（問 Fat Mo 時）：現行條文原文 → 建議新條文 → 動機（哪個 session 踩了什麼）→ 影響面。

---

## §2 教訓寫回哪裡（落點分流表）

| 教訓類型 | 落點 | 例 |
|---|---|---|
| FHS 業務/技術 pitfall（財務、n8n、Supabase、HTML） | `.fhs/memory/learnings.md`（既有制度） | 「PUT body 只能 4 欄」 |
| **調度/流程層**教訓（派工翻車、驗證漏洞、token 事故） | [[02_model-dispatch]] §7 實戰修正錄 | 「haiku 批次替換漏了轉義字元，改規格必附 raw string」 |
| 判斷失誤（該問沒問/該停沒停/假完成） | `03` 對應 rubric 追加正/反例 | 某 session 的假完成案例 → R2 反例 |
| 一次性事故全記錄 | `.fhs/memory/lessons/`（既有，帶日期檔名） | 完整 post-mortem |
| 與 Fat Mo 的架構決策 | `.fhs/notes/decisions.md`（既有硬規則） | — |

**判斷不了落哪：問「這教訓對非 FHS 專案有沒有用？」有 → governance（調度層）；沒有 → learnings（業務層）。**

## §3 條目格式（02 §7 / 03 例子通用）

```
- 【情境】一句話（含 session 編號）。【修正】一句話規則。【日期】YYYY-MM-DD。
```
≤3 行。寫不進 3 行 = 那是 lessons/ 的 post-mortem，這裡只放結論。

---

## §4 精簡與輪轉觸發（防制度自肥）

| 檔案 | 觸發 | 動作 |
|---|---|---|
| `.fhs/memory/handoff.md` | >800 行 | **輪轉 SOP**：(1) `cp` 全檔到 `.fhs/memory/archive/handoff-<起訖年月>.md`（archive/ 不存在先建）(2) 原檔保留：便攜塊 + MASTER 表 + 最近 5 個 session 條目 (3) 剪除段落的位置留一行指標「更早 session 見 archive/」(4) read-back 驗證便攜塊完整 + hook 仍能抽取（跑一次 `bash scripts/hooks/session-start-sop.sh` 確認輸出正常） |
| `learnings.md` | >50 條 | 既有制度：合併/退役，附 📌 可追溯附註（S113/S136 慣例） |
| governance 各檔 | >400 行 | 提案精簡（走 §1「先問」——精簡=刪除） |
| `02 §7` / `03` 例子 | 單節 >15 條 | 合併同型條目，退役已升格為規則本體的 |
| `.fhs/ai/governance/backups/` | >20 檔 | 刪 90 天前的備份（git 歷史仍在） |

## §5 備份規則

- 改 `CLAUDE.md` 或 governance 任何檔之前：`cp <檔> .fhs/ai/governance/backups/<檔名>.<YYYY-MM-DD>.bak`。同日多次改動，第一次備份即可。
- 輪轉/精簡類操作（§4）：備份是硬前置，沒備份不准動。

## §6 版本規則

- 每個 governance 檔頭有 `Version`。可自行改級（§1 上表）= patch +0.0.1；Fat Mo 批准的規則本體變更 = minor +0.1.0；哲學級重寫 = major。
- 改版必須同步 [[00_INDEX]] 狀態欄日期。

## §7 季度健檢（每 ~90 天或 Fat Mo 呼叫時）

1. 重測 [[01_diagnosis]] 的實測數字（wc -l 五個大檔、grep subagent model 釘選），數字惡化 → 觸發 §4。
2. 抽查最近 5 個 session 的雙紀律自檢：自驗豁免使用率是否又漂移（>3/5 全自驗 = 向 Fat Mo 報告制度失效）。
3. 驗證 CLAUDE.md 路由表每條路徑仍存在。
4. 產出 ≤20 行健檢報告，追加到本檔尾部 §8。

## §8 健檢記錄

- （尚無。第一次健檢由未來 session 寫入。）
