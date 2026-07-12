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
