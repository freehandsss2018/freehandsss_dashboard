---
name: feedback_visual_bug_measure_not_guess
description: "前端視覺 bug 不可純靜態讀碼診斷，必須 playwright 實測 computed style；style.display='' 會清掉 inline display"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 12f95f66-2ea9-4ff2-b08d-30e895964c83
---

前端「版面/尺寸/對齊」類 bug，禁止純靠閱讀 HTML/CSS 原始碼臆測修復——會反覆誤判。

**Why**：Session 70（2026-06-09）玻璃瓶嬰兒模式按鈕崩版，我連續誤判兩次（先當成按鈕樣式硬加 `min-height:48px`、再當成瀏覽器快取），浪費多輪。最後派 `frontend-developer`（playwright）實測 `getComputedStyle` + `getBoundingClientRect`，一次坐實真因：`#babyModeBtnRow` computed `display=block`（應為 grid）。

**How to apply**：
1. 視覺/版面 bug → 優先派 `frontend-developer` 用 playwright 量測 computed style / rect，或請 Fat Mo 提供截圖對比，**不要**只讀 code 就改 CSS。
2. 牢記陷阱：JS `element.style.display = ''` **不是「還原」**——它清除 inline 既有的 `display` 值，使元素退回 tag 預設（`<div>`→`block`）。若原本 inline 是 `display:grid`，復原時必須明設 `'grid'`，否則 grid 排版崩潰。
3. 呼應 [[feedback_investigate_before_asking]] 的精神：有可實測的手段就先實測，別臆測。
