# 完成記錄：Canva 學習記錄重構——schema v2（規則編號表 + 逐 Page 列點）（D76）

> flow_id: `2026-09-13-0857`／執行：Claude Code Sonnet 5／2026-09-13

## 一、任務背景

Fat Mo 提供兩張 Agent Dashboard「Canva 學習記錄」截圖，指出四點：①截圖一紅圈顯示嘅重複文字係 UI bug；②卡片應先分「純音樂」／「全幅AI短片」兩個類別；③內容應以簡精列點取代大段文字解說，並按 Page 拆分（Page2 學到咩、Page3 學到咩……）；④要求 AI 審視後主動追加建議，唔係奉承。

## 二、規劃階段（`/cl-flow-fast`）

- `/rp` 輕量精煉 → Gate 1 Fat Mo 回覆「Y」
- Fat Mo 明確要求「拷問我」逐條釐清：8 條問題（資料位置／跨單連繫／Page分段處理／教訓類型標籤／款式版面排序／規則表顯示／11單回填方法／防退化機制）逐一拍板，Q8 起 Fat Mo 授權「跟 recommended 即可」
- A3 草案（`artifacts/2026-09-13-0857/a3-draft.md`）：含現行渲染邏輯量測（教訓文字 81% 從未顯示於卡片、分類欄缺失 10/11 單、slot 命名不統一等 7 項實測問題）
- A2 Gemini 對抗評審（`gemini-3.6-flash`，主力 `3.8-flash` 過載自動降級）：7 條批評（5 MAJOR + 2 MINOR），5 條採納、2 條拒絕
  - 採納：跨 log 準確率雙重計算風險、規則表跨頁重複 DOM id 風險、防退化校驗時機太遲、覆核缺 rules[] 對照表、deep-equal 定義不精確
  - 拒絕：E4 篩選會令 `apply()` 計數脫節（前提不成立，兩者 DOM token 完全唔重疊）、`.cnote[open]` 全域修未經驗收（驗收清單本身已含 IG/3D 零回歸項）
- Verdict `APPROVED_READY`

## 三、執行內容

### 資料層（`canva_auto/placement_memory.json`）

- 升級 `schema_version: 2`：新增頂層 `rules[]`（規則編號表 CV-01..CV-35）+ 逐 case `category`/`page_count`/`parent_order`/`first_pass_total`/`first_pass_corrected`/`lessons[]`
- 一次性合併腳本 `scripts/_oneoff/canva_lessons_merge.js`：對 v1 **887 個 key path** 逐一深比對驗證（型別+值+陣列長度完全相等）後先寫入，v1 舊欄位零改動
- 11 單回填：AI 從 5 個來源（`note`/`slots[].note`/`non_geometry_findings`/`convergence_log`/`technique_lesson*` 等額外欄位）抽取列點，每點標 `src` 出處
- **兩輪覆核**：派 fresh-context `general-purpose` agent（無本次對話記憶）逐單四項檢查（無中生有／有冇漏真錯／type 標啱唔啱／rule 引用啱唔啱）——首輪 **11/11 FAIL**，揪出：
  - 8 條 lesson 將「AI 做啱咗／Fat Mo 自己嘅動作／AI 自行診斷成功」誤標做 🔴`ai_error`
  - 4 處 `src` 指錯欄位（`technique_lesson_2_geometry_freeze`/`text_centring_rule`/`technique_lesson` 被誤寫做 `case.note`）
  - 4 條真教訓完全漏記（其中 hiumanthm 案自標「最嚴重錯誤」嘅 page4 揀錯 asset 問題）
  - 全部 11 項針對 pristine v1 backup（`git show HEAD:...`）重新跑合併腳本修正並通過深比對驗證
- 分類判準：`mcp__Canva__read-design` 逐單實查 `design_metadata.page_count`（非估算）——全幅：0600903/0600906（5頁）；其餘 9 單純音樂（4頁）

### 渲染層（`scripts/agent_dashboardV42.js`）

- `renderCanvaLearningZone`/`renderCanvaCase` 全面重寫：純音樂/全幅款分組置頂（各附 AI 首次準確率）、卡片內逐 Page 列點（＋「流程」分 Stage①-⑤/工具子分組）、規則編號表按 Page 分組並雙向錨點跳轉（`#case-*`↔`#rule-*`，CSS `:target` 高亮）、Canva 直達連結、母片連結（精確 order 比對，避免 yunggggm「母片 Kaki 訂單編號巧合同 hiumanthm 重複」誤連結）、五類型篩選 chip（`🔴🟡🐞✋📦`，獨立 JS 實現，唔碰現有 `apply()`）
- 新增共用 helper `cnoteBlock()`：修正截圖一紅圈嘅真 bug（`<details>` 展開後截斷摘要同全文 `<p>` 同時顯示）——IG看門狗／Canva／3D 三個學習記錄 zone 共用此修，三者皆已驗證零回歸

### 防退化（`scripts/canva_memory_validate.js`，`[NEW]`）

- 可 `require`（生成器內部呼叫，結果併入既有勘誤表機制）亦可 CLI 直跑
- 錯誤（缺欄位／規則引用不存在／type 非五類／id 重複）→ exit 1；達 3 單門檻未升格 → `💡` 提示，exit 0
- `.fhs/ai/commands/canva-auto.md` v1.7.0→v1.8.0：Step 0 新增「Schema v2 寫入規格」段，Stage④ 同步要求寫入後強制執行此 CLI

## 四、驗證

- 合併腳本：887 個 v1 key path 深比對 0 差異；35 條規則引用完整性通過；rule id 唯一性通過
- Generator：`node scripts/agent_dashboardV42.js` 零勘誤（`✨ 零勘誤`）
- Browser 實測（本地 `python -m http.server`，非 `file://`）：
  - 兩段類別正確渲染（純音樂 9 單／全幅 2 單），35 條規則列全部渲染
  - 類型篩選 chip 聯動正確（🔴 13 條精準過濾、🐞 14 條精準過濾，涵蓋 lesson 同 rule 兩種元素、空分組正確摺疊）
  - `:target` 錨點跳轉高亮（`outline: 2px solid #d97706`）實測生效
  - `cnoteBlock` 重複文字 bug 修復：Canva／3D 兩 zone 展開後 `summary` 文字 `display:none` 確認（IG zone 現無 live 資料可測，但共用同一函式，行為一致）
  - 手機寬度（375px）：`grid-template-columns` 收窄至單欄（347px），零橫向溢出
  - console 全程零 error
- `scripts/canva_memory_validate.js` 正反測試：刻意灌入壞資料（未知 rule 引用 + 缺 category）→ exit 1 且精確報告錯誤位置；`git checkout` 還原後重跑 → exit 0

## 五、已知限制 / 後續

- `lessons[].type` 判斷雖有五類判準文字（見 canva-auto.md），仍帶主觀性；日後同類型爭議可累積案例再細化判準
- `first_pass_total`/`first_pass_corrected` 對「同單多次 convergence_log 覆核追加」嘅拆算方式（見 canva-auto.md 新增規格段）仍需未來新單持續驗證是否夠用
- E4 類型篩選只做「隱藏/顯示」，未做「記住上次篩選」（localStorage）——非本次範圍，可視使用頻率決定是否補
- 3D 打印學習記錄 zone（`render3dCase`）結構未同步重構（仍為單段 note），僅共用咗 `cnoteBlock` 之 bug fix；Fat Mo 未提出此需求，故未動

## 六、影響檔案

| 類型 | 檔案 |
|---|---|
| `[MODIFY]` | `canva_auto/placement_memory.json`（schema v1→v2） |
| `[NEW]` | `scripts/canva_memory_validate.js` |
| `[NEW]` | `scripts/_oneoff/canva_lessons_merge.js` |
| `[MODIFY]` | `scripts/agent_dashboardV42.js` |
| `[MODIFY]` | `.fhs/ai/commands/canva-auto.md`（v1.7.0→v1.8.0） |
| `[MODIFY]` | `docs/repo-map.md`（新增兩個腳本登記） |
| `[MODIFY]` | `scripts/README.md`（同上） |
| `[MODIFY]` | `.fhs/notes/decisions.md`（D76） |
| `[MODIFY]` | auto-memory `project_canva_video_automation.md`（schema v2 一段指引） |
| `[MODIFY]` | `Changelog.md` |
| `[NEW]` | 本完成記錄 |

詳見 `artifacts/2026-09-13-0857/`（task-brief/a3-draft/ag-review/cl-final-plan.md）。
