---
description: 新產品跨層融入引導 — 五步 atomic 流程 + Rollback Matrix（v1.1.0）（Claude Code Bridge）
---

# /new-product (Claude Code Bridge)

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/new-product.md](/.fhs/ai/commands/new-product.md)

### 簡化流程：
1. 確認新產品基本資料（SKU / 是否加購配件 / 是否需新 ENUM 值）
2. 呼叫 product-integration-validator 執行基線掃描
3. 依序執行五步 atomic 流程（每步均有獨立 Gate，FAIL 必須修復才可繼續）
4. 五步全 PASS 後，呼叫 product-integration-validator 執行最終驗證

### 防守檢查：
- ✅ 每步均有 PASS/FAIL Gate，不可跳步
- ✅ Rollback Matrix 明確（步驟 X FAIL → 回退哪些已完成步驟）
- ✅ 呼叫 database-reviewer / build-error-resolver / product-integration-validator 進行跨層驗證
