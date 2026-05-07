# 3D Printing Projects

FHS 3D 建模工作目錄。路徑規則由 `blender-3d-modeler` subagent 強制執行。

## 目錄結構

```
3d/
  input/                          ← 用戶上傳的原始 STL（只讀，不修改）
  projects/{slug}/                ← Blender 工作檔（.blend）
    {name}.blend
    backup/                       ← 破壞性操作前的備份
  output/{slug}/                  ← 最終列印用 STL
    {name}_PRINT.stl
```

## 命名規則

- `{slug}`：`{功能}-{材料}` 格式，例如 `heart-hand-cavity`
- 輸出 STL：加 `_PRINT` 後綴，表示列印就緒

## 現有專案

| slug | 描述 | 狀態 |
|------|------|------|
| heart-hand-cavity | 心形凹槽手模（2026-05-05） | ✅ 完成 |
