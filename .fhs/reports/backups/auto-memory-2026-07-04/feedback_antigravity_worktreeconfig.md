---
name: Antigravity worktreeConfig crash fix
description: Antigravity v1.21.6+ crashes with __store TypeError when .git/config has extensions.worktreeConfig=true
type: feedback
originSessionId: b5461fc3-0e76-4b06-99f0-46b106636d6b
---
Antigravity v1.21.6 及以上版本，若 `.git/config` 含有 `extensions.worktreeConfig = true`，會導致整個 app 崩潰（"Something went wrong: TypeError: Cannot read properties of null (reading '__store')"），聊天視窗完全無回應。

**Why:** Antigravity 的 Go language server 讀取 Git config 時不支援 `worktreeconfig` extension，觸發 `ConnectError: core.repositoryformatversion does not support extension: worktreeconfig`，導致 service 層級崩潰。

**How to apply:** 若 Antigravity 突然完全無法使用（聊天無回應、指令消失、__store 錯誤），先檢查：
```bash
cat .git/config | grep -A3 extensions
```
若有 `worktreeConfig = true`，執行：
```bash
git config --unset extensions.worktreeConfig
```
然後重啟 Antigravity。此設定由 `git worktree` 操作自動加入，移除後不影響正常 git 功能。
