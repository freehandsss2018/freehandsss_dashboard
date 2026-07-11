# /3d-print — 3D 手腳模打印新單全流程（pipeline v0 + diff-learning）

**用途**：接到 Fat Mo 一句「3d-print 新單」+ 訂單資料，走完 掃描 OBJ → 廠家打印 STL 全流程（裁切→擺姿→刻字→加環→紋理誇張→縮放→出檔），內建 diff-learning 參數回饋迴圈（同 `/canva-auto` 同一原理，姊妹指令）。
**觸發指令**：`/3d-print` 或對話講「3d-print 新單」
**版本**：v1.0.0（2026-07-11，S164 新建；沿用 /canva-auto 經 /8d 迭代的三修正）
**依賴**：Blender 開住 + MCP addon（port 9876）；`blender-3d-modeler` subagent 可派（同 canva 唔同——Blender MCP 工具喺 subagent tools 清單內，重活派佢）
**數值真理源分層**：鐵律常數（腳 30.5mm、環檔、Phase 門）= `3d/param_memory.json` 的 `rules_frozen`（Fat Mo 拍板，禁學習覆寫）；每單可調參數（紋理 k、裁切位、刻字深度、環位）= 同檔 `cases` 案例庫；腳本預設值 = `3d/scripts/pipeline_v0_phase1_foot.py`。本檔**不放任何數值**。

---

## 輸入參數（Fat Mo 提供）

客名 / 部位（Phase1 只接受腳；手一律拒接並引用 Phase 門鐵律）/ 刻字內容（客人縮寫+日期，例 `KKH 0213`）/ 數量。素材路徑慣例：`3d/input/Level0(Orginal)/2026-34/<客名>/<客名>-<部位>/` 內 OBJ + IMG_*.JPG 參考相。

## Step 0 — 雙檢（開工前強制）

1. **補課檢查**：讀 `3d/param_memory.json`，最後一個 case 的 `learned` ≠ true → 先讀該單最終出貨 STL/scene 對比 AI 版參數，diff 落庫先開新單
2. **連線健檢**：`get_scene_info` 試連 Blender MCP——連唔到 = Blender 冇開/addon 冇啟動，**即刻停手上報 Fat Mo**，唔好盲跑腳本（對應 canva transaction 過期教訓：環境斷 = 一切重來）

## Stage ① — 參數預測

查 `param_memory.json`：`rules_frozen` 取鐵律常數 + `cases` 搵同部位相似案例取上次收斂參數（紋理 k、裁切偏移、刻字深度/字號、環擺位）。無案例 → 用腳本預設值並喺輸出標明「未經案例校準」。

## Stage ② — 自動執行（可派 blender-3d-modeler）

跑 `3d/scripts/pipeline_v0_phase1_foot.py` 參數化流程：import→裁切（腳踝平切橢圓面）→垂吊擺姿（趾向下、切面向上）→切面凹刻刻字→縮放至規格（**先縮放**）→加環 boolean union（**後加環**，Ring-24545.obj 只擺位）→紋理誇張（頻帶分離法）→細分→watertight 檢查→STL 出檔（命名 `<客名>-<部位>-<尺寸>mm-x<數量>.stl`）。

## Stage ③ — 眼證

viewport 多角度截圖（`get_viewport_screenshot`）+ 最長軸實測值交 Fat Mo。**驗收不自驗**：生產出檔前 Fat Mo 必須眼證（藝術紋理係佢/師傅嘅判斷權）。

## Stage ④ — 學習＋出貨

- Fat Mo 有改（口頭指示重跑 或 手動改完 scene）→ 讀最終參數 diff 落 `cases`（+convergence_log+`learned: true`）；規律 ≥3 單收斂先升格寫入記憶檔規則層；**鐵律 `rules_frozen` 永不被案例覆寫**
- Fat Mo OK → 出正式 STL 交廠 → case 記 `learned: true`

---

## Known failure modes（追加區，見 05 §1 權限）

- 全域 ICP 對齊 Level3 必然失敗（有裁切非剛體變換），勿再試
- 單頻 unsharp 紋理法會放大掃描噪聲成沙紙，只准頻帶分離法
- 紋理 k 過大（≥4）產生鱗片 artifact + 自交黑縫
- 環同刻字係實物 mm 常數，縮放前加 = 全部走樣
- 手模尺寸無公式，檔名標籤以外嘅來源一律唔信
- Blender MCP 斷線唔會自動重連，長流程中途斷 = scene state 可能半成品，重跑前先 `get_scene_info` 核實現場

## 執行規則

- Phase 門：Phase1 只做腳，收到手單一律引用鐵律拒接並提醒 Phase2 第一步（render 分析 7 手 STL）
- 重活可派 `blender-3d-modeler` subagent（router 建議 sonnet）；學習步（diff 落庫）留主 session 做
- 業務背景/樣本庫路徑/工序解密住喺記憶檔 `project_3d_print_pipeline.md`；本檔只管流程順序與鐵律

## 版本更新日誌

- v1.0.0（2026-07-11，S164）：初版，/canva-auto 姊妹指令。三修正沿用（開單補課制、環境健檢先行、數值真理源分層——新增 rules_frozen 防學習污染鐵律層）
