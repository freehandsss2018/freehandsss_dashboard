# IG漏單看門狗：容器輪替被誤判為OAuth失效，寫死資料夾ID是根因

**日期**：2026-07-25（決策 D48）

## 事發經過

Telegram 收到告警：「距上次新匯出已168小時——疑似排程到期或OAuth失效，請查Meta Accounts Center」。第一直覺懷疑 Facebook/Instagram App 授權過期，去查 Facebook「企業整合工具」設定頁，結果查到的過期項目全部跟這套系統無關（是舊的不相干App）。

## 根因

`scripts/ig-watchdog/build_n8n_workflow.cjs` 用一個**寫死常數** `CONTAINER_FOLDER_ID` 指定 Google Drive 裡監測的父資料夾。Meta 的「每天自動匯出到 Google Drive」功能，其匯出目的地容器**並非永久穩定**——2026-06-18 首次設定建立了容器 A，2026-07-18 卻自動建立了全新容器 B（兩者共享同一個更上層的穩定祖先資料夾）。程式碼仍指向容器 A，導致連續 7 天（168 小時，數字精準吻合告警）查詢一個已無新資料的舊資料夾，回報「0 個新匯出」。

開發者在 2026-06-20 寫程式時已經**預判**這個情境並寫在註解裡（「容器真的輪替/改名時，因連續48h找不到新instagram-*子資料夾而告警，屆時需手動更新此常數」），但 Telegram 實際顯示的告警文字卻寫成「疑似OAuth失效」——跟真正故障原因完全對不上，把人導去錯誤的排查方向。

## 診斷方法（可複用）

1. 先查執行紀錄（n8n executions 列表）：全部綠色 Succeeded → 排除「查詢本身失敗/憑證壞了」
2. 用 Google Drive 連結器直接查 Drive 實際內容，比對每日新資料夾的 `parentId` 隨時間變化——發現某個時間點 `parentId` 換了，就是容器輪替
3. 查兩個容器各自的 `parentId`（用 `get_file_metadata`），確認是否共享一個更穩定的祖先——如果有，就是修復用的錨點

## 修復方式

不是把寫死值從 A 換成 B（治標），而是查出兩個容器共享的穩定上層資料夾，改成**執行期動態查詢「該上層底下最新建立的容器」**，一勞永逸解決未來再次輪替的問題。同時把誤導性的告警文字改成精確描述（指向容器名稱是否合理、排程本身是否還在跑），不再泛稱「OAuth失效」。

## 教訓

- **任何自動化排程如果依賴「單一寫死的雲端資料夾/容器 ID」，都要假設它有一天會變**，尤其是第三方（Meta/Google）自動建立的容器，官方文件通常不承諾長期穩定
- **告警文字的猜測性用詞會誤導未來排查方向**——「疑似 X」這種措辞如果沒有實際檢測邏輯支撐，寧可寫「查無新資料，請人手核實原因」這種不下定論的文字，也不要寫一個聽起來很篤定但其實只是隨便猜的具體原因
- **執行紀錄全綠 ≠ 功能正常**——執行成功只代表「查詢沒有拋錯」，不代表「查詢的對象是對的」；本案 7 天全部 Succeeded，但每次都在查一個早已沒人寫入的資料夾

## 追加（同日）：發現「真的報錯也沒人知道」的另一個漏洞

修復容器輪替後，追問「怎樣阻止再發生」時發現：這個 workflow（以及全 n8n 實例其他 workflow）都沒有設定 `errorWorkflow`，代表萬一節點真的拋錯（例如 Google Drive credential 真的過期），**不會有任何通知**，只能靠人手開 n8n 後台才會發現——跟這次事件的盲點是同一種性質（安靜地失敗，沒人主動注意到）。

發現既有的 `FHS_System_ErrorMonitor`（workflow ID `8WbbEqZpiWu0CB1o`，Error Trigger → Airtable/Supabase 落地）已存在，但**全 n8n 實例沒有任何 workflow 實際指向它**，形同虛設。修復：
1. 幫它加一個 Telegram 即時通知節點（原本只有靜默落地，沒有即時推送）
2. 把 `FHS_IGWatchdog_DriveWatch` 的 `settings.errorWorkflow` 接上去
3. 同步更新 `build_n8n_workflow.cjs` 的 `settings` 常數，避免下次重新產生 workflow 時把這個接線洗掉（`settings: {}` → `settings: { errorWorkflow: '...' }`）

**教訓**：建了「錯誤監控」機制不代表有在用——要定期確認實際有 workflow 指向它，否則等同沒建。其他 production workflow（`FHS_Core_OrderProcessor` 等）目前也還沒接上，是已知 backlog，非本次範圍。
