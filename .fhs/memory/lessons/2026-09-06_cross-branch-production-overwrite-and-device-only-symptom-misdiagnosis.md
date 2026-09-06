# 2026-09-06 — 跨分支生產版覆寫事故（第三次）＋ 真機專屬症狀嘅兩次誤診

> 相關決策：`.fhs/notes/decisions.md` D72（Gate 0 血統閘）、D71（財務欄合併）
> 相關事故先例：2026-09-03「分支合併事故」（同檔案，兩條分支雙向互相覆寫）

---

## 一、事故本身

**現象**：Fat Mo 回報 iPhone 13 Pro 橫向訂單總覽由表格版退回手機卡片版；同時直向模式失去「訂單總覽分類顯示優化」全部成果。

**真因**：本分支（`claude/read-command-cad5ef`）部署自己血統嘅 `current.html` 上 NAS，完整覆寫咗 `claude/order-overview-category-display-1a4f84` 分支已上線嘅生產版，一次抹走該分支 **117 個 commit**。其中 commit `bffc231`（2026-08-30「真機橫向手機模式最終修復，斷點由768改750」）正正就係修好 iPhone 橫向嗰個 fix。

**點解 750 呢個數係關鍵**：iPhone 13 Pro 橫向名義解析度 844px，但扣除瀏海左右安全區之後，網頁實際 viewport 落喺 **750–768px 之間**。舊斷點 `window.innerWidth < 768` 會將呢個區間誤判做手機而出卡片版；對方改成 750 就啱。

**結構性成因**：`current.html` 係**跨分支共享嘅單一部署目標**，但 git 分支之間互相唔知對方部署過乜。任何一條分支 PUT 上去就係完整覆寫，冇任何機制阻止。

---

## 二、⚠️ 第三次重演（呢個先係重點）

| 日期 | 事故 |
|------|------|
| 2026-09-03 | `read-command-15bfd5` 連續 4 次部署，覆寫另一分支 31 輪 UI 成果 |
| 2026-09-03 | D69 系列兩條分支「雙方各自 deploy 覆寫咗對方生產版」 |
| 2026-09-06 | 本次（117 個 commit） |

**D70（2026-09-05）明文將此列為「刻意不處理」嘅未解課題** —— 即係話事故發生前一日，呢個風險已經白紙黑字寫喺 `decisions.md`，而我讀過。**知道有個風險 ≠ 部署嗰刻會諗起佢**。散文層面嘅「已知風險登記」對呢類「動手瞬間先致命」嘅問題零效果，同 D66/D68 對 handoff 同步症嘅結論完全一致：**要機械閘，唔係紀律**。

---

## 三、兩次誤診（避免將來重蹈）

症狀出現後，我先後判斷為：
1. **iOS home-screen 快取** —— 因為代碼入面有 `fhs-build` cache-bust 機制，推論「呢類問題發生過」。錯。
2. **WebKit standalone webview 冷啟動時序** —— 推論 `window.innerWidth` 喺已橫向冷啟動時讀到舊值。錯，而且已被自己嘅實測推翻（CSS `@media` 同 JS 讀同一份 viewport metrics，唔會互相矛盾），但當時冇及時修正結論。

**盲點成因**：
- 用 Chromium 模擬 844×390 測到「正常」就當冇事 —— **Chromium 唔會模擬 iOS 橫向安全區內縮**，永遠測唔出 750–768 呢個致命區間。
- 由頭到尾冇問過一句：**「我部署嘅嗰份，同 Fat Mo 部機睇緊嗰份，係咪同一份？」**

**教訓（可複用判準）**：
> 遇到「真機有、模擬器冇」嘅症狀，**第一步唔係推測裝置行為，而係先核實「我以為部署咗嘅版本」同「用戶實際載入嘅版本」係咪同一份**。
> 具體做法：抓生產版檔案，grep 一個只有你新版本先有嘅特徵字串。一條指令，10 秒，可以慳返兩輪誤診同用戶嘅信任。

---

## 四、修復（D72 Gate 0）

`scripts/upload-web.ps1` 新增部署前置閘：

1. 每次部署注入 `<meta name="fhs-deploy-src" content="<commit-sha>">`（同既有 `fhs-build` 並列）。
2. 下次部署前抓生產版，讀返個 commit，`git merge-base --is-ancestor <生產版commit> HEAD`：
   - 係祖先 → 放行
   - 唔係祖先 → **擋**，並列出 `git log HEAD..<sha>` 畀人睇會抹走乜
   - 讀唔到標記／commit 不存在 → 擋
3. 逃生口 `-AllowClobber`，每次使用記入 `deploy-log.md`。

**設計依據**：同 D70 Phase 2.6 一樣，用 git 客觀祖先判斷，唔做內容猜測、唔做自動合併 —— 判斷錯只會擋多咗，唔會靜默放行。

**兩條路徑均已實測**：無標記時正確攔截（exit 1、本機檔案零改動）；標記為祖先時正確放行。

---

## 五、⚠️ 附帶踩中嘅獨立陷阱：`.ps1` 檔案本身要 UTF-8 BOM

改寫 `upload-web.ps1` 時用一般 UTF-8（無 BOM）寫檔，**PowerShell 5.1 會當系統 ANSI codepage 讀**，成個檔案嘅中文註解／字串全部變亂碼，並觸發連鎖 parse error（`Unexpected token`、`missing terminator`），錯誤訊息完全指唔到真因。

- 呢點同 `learnings/tooling.md` 記錄嘅 `Get-Content`/`Set-Content` encoding 陷阱**同源但唔同對象** —— 舊記錄講嘅係「腳本讀寫其他檔案」，呢次係「腳本檔案自己」。
- **修法**：寫完 `.ps1` 之後用 Node 補 BOM：
  ```js
  let t = fs.readFileSync(p, 'utf8').replace(/^﻿/, '');
  fs.writeFileSync(p, '﻿' + t, 'utf8');
  ```
- **判斷訊號**：PowerShell 報一堆莫名其妙嘅 parse error 而且錯誤訊息入面見到亂碼中文 → 十有八九係 BOM 問題，唔好逐行去捉語法。

---

## 六、善後狀態

- 生產版已復原並重新部署（含對方 117 commit + D71 重做 + D72 Gate 0 標記）。
- 對方分支已 merge 入本分支，並連同 D71/D72 一併 ff 落 `main` —— `main` 不再落後生產版。
- D71（財務三欄合併）已喺合併後嘅正確血統上重做，跟對方 `_FHS_TH_DEF` 宣告式欄位架構實作。
