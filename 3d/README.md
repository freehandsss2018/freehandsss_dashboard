# 3D Printing Projects

FHS 3D 建模工作目錄。路徑規則由 `blender-3d-modeler` subagent 強制執行。

## 目錄結構

```
3d/
  input/                          ← 用戶上傳的原始 STL/OBJ（只讀，不修改，已 gitignore）
  scripts/                        ← 可重複執行的 pipeline script（版控）
  projects/{slug}/                ← Blender 工作檔（.blend）
    {name}.blend
    backup/                       ← 破壞性操作前的備份
  output/{slug}/                  ← 最終列印用 STL（已 gitignore，2.6GB客人隱私+大檔）
    {name}_PRINT.stl
  param_memory.json               ← /3d-print 指令參數案例庫（diff-learning）
```

## 命名規則

- `{slug}`：`{功能}-{材料}` 格式，例如 `heart-hand-cavity`
- 輸出 STL：加 `_PRINT` 後綴，表示列印就緒

## 現有專案

| slug | 描述 | 狀態 |
|------|------|------|
| heart-hand-cavity | 心形凹槽手模（2026-05-05） | ✅ 完成 |
| pipeline-v0-phase1 | 鎖匙扣手腳模打印自動化 v0 Phase 1（腳），`scripts/pipeline_v0_phase1_foot.py`：FULL模式（全流程含紋理誇張化）+ MASTER模式（師傅已修紋理版，只做縮放/刻字/加環/QC）（2026-07-11/12） | ✅ Phase 1 機械QC PASS，待Fat Mo目測紋理風格 |

## 2026-09-27 紋理參照研究（本機）

- **A08 R3 試作已暫停，交 Claude Code。** Fat Mo 親自判斷紋理效果未如理想、未達預期；A08 R3 是未簽收的失敗基準，不能打印。曾按主圖 9427 人工初對位五段趾紋，參照師傅版加深；工作檔 `projects/astra-texture-study-2026-09-27/astra_a08_r3_photo_guided.blend`、對位圖 `output/astra-texture-study-2026-09-27/a08_photo_alignment.png` 及前後比較 `a08_r3_previous_comparison.png` 留作證據。**最新自足報告與 Claude 續作方案：`.fhs/reports/planning/2026-09-27_a08-texture-stop-and-claude-plan.md`。** 下列 A07 及更早條目屬歷史。

- **歷史候選 A07：深紋優先。** 按 Fat Mo 當時的指示，先在兩趾做明顯深紋，不以甲框為先決門檻。`output/astra-texture-study-2026-09-27/astra_a07_a05_comparison.png` 為 A05／A07 同光線比較，局部最大基線凹陷約增加至 3–4 倍；部分端點仍待修順，非風格簽收或打印就緒。工作檔 `projects/astra-texture-study-2026-09-27/astra_a07_post_switch.blend`。當時只看過 9427／9431 兩張白色腳模照片，尚未逐條配準。下列 A03–A05 條目為歷史。

- 首輪分析在 `output/astra-texture-study-2026-09-27/analysis.md`，尺寸與來源雜湊在同目錄 `measurements.json`；五張正式對比圖為 `07_dorsal_comparison.png` 至 `11_ankle_oblique.png`。這些資料與客人模型在 gitignored 目錄，只在本機使用。
- Blender 初始對比工作檔：`projects/astra-texture-study-2026-09-27/texture_comparison.blend`；分析腳本：`scripts/astra_texture_study.py`。切換至 Astra 後的局部候選為 `projects/astra-texture-study-2026-09-27/astra_a03_post_switch.blend`；試作脚本、A01–A03 指標與圖片在上述 output 目錄。來源模型保持唯讀；未改生產 pipeline 或 `param_memory.json`。Trial 1／2 為切換前試驗，不算 Astra 能力證據。
- 個案觀察：師傅參照先整理散亂表面，再局部建立甲緣、趾節短紋與有主次的腳底／踝部摺線。舊 P2 只有全域幾何頻帶放大，P2b 趾甲步驟實際跳過；單一 `k` 不能代表師傅的雕刻方式。
- Fat Mo 對 A03 不滿意，已要求改善框狀甲緣、硬過渡與整齊摺紋，並要求日後按同一隻腳的實拍紋路製作。最新為 A05 局部試作，`astra_a05_a03_comparison.png` 比較 A03／A05，`astra_a05_big_toe_reference.png` 比較師傅版；工作檔 `projects/astra-texture-study-2026-09-27/astra_a05_post_switch.blend`。部分形態改善但未全部達標，待 Fat Mo 評語；照片尚未核對，不可稱真實還原。只供視覺評語，非列印就緒。另一對未見過的成對樣本留作泛化測試；跨代理記憶架構延後，本機個案記錄不等同模型訓練或 Claude 已同步讀取。
