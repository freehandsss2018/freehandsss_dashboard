---
name: feedback_v42_generate_else_clear
description: generate() 的 else 分支（enableP=false）只 hide preview-box-a，沒有清空 output-preview-a.value，導致舊手模文字殘留在 IG modal
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 3fbfb24d-65d5-453c-86a6-6d665ecefc38
---

當 enableP 取消勾選，`generate()` 的 else 分支執行：
```javascript
document.getElementById("preview-box-a").style.display = "none";
// ← 缺少 output-preview-a.value = ""
```

`output-preview-a` 仍保留舊手模文字，被 `_igpmRefresh()` 讀取後在 IG 訊息 modal 顯示，用戶以為 bug 未修。

**Why:** hide box ≠ clear value；任何讀取 output-preview-a.value 的地方（igpmRefresh、其他函式）都會看到舊值。

**How to apply:** `display = "none"` 旁邊永遠補一行 `output-preview-a.value = ""`。display 層修正必須同時清空 textarea value。
