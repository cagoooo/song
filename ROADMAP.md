# 2026-06-23 進度更新：點歌建議全鏈路修復、分享／更新／載入卡帶化收尾

> 本段源自一連串**現場實測回饋**，聚焦「推薦新歌 → 送出 → 重複偵測 → 分享 → 更新 → 首次載入」這條訪客主線的卡關與跑版問題，逐一修復並把視覺體驗收斂到全站卡帶／editorial 風格。所有變更已合併進 `main`（PR #67～#73 + 載入畫面卡帶化 `81e1444` / v4.14.0）。本次採「改完即自動 commit → push → 開 PR → CI 綠 → squash 自動合併」流程。

## 已完成項目（6/23）

| 類別 | 完成內容 | 主要範圍 / PR | 驗證狀態 |
|---|---|---|---|
| 送出建議防卡死 | `addSuggestion` 由 `await addDoc` 改為**樂觀寫入**（本地產生 doc id + `setDoc`，與 2s timeout 競速）。Firebase 寫入 Promise 只在伺服器確認後 resolve，現場網路差時會一直 pending → 按鈕卡在「送出中…」。改後 UI 不再被網路阻塞，離線寫入連線恢復後自動同步。 | [suggestions.ts](client/src/lib/firestore/suggestions.ts)（PR #67） | tsc ✅ / 測試 ✅，已合併 |
| 重複確認框被蓋住 | 共用 `AlertDialog` 的 overlay/content z-index `z-50 → z-[140]`（高於 modal 內容層 130）。原本重複確認框被建議表單（z-130）整個蓋住，手機按送出「沒反應」。 | [alert-dialog.tsx](client/src/components/ui/alert-dialog.tsx)（PR #68） | tsc ✅，已合併 |
| 重複歌曲誤判 | 抽出 [duplicateSong.ts](client/src/lib/duplicateSong.ts)：改「標準化（去空白/標點/括號內容、轉小寫）相等 + 字元 bigram **Dice 相似度 ≥ 0.8**」判斷，修正子字串包含造成的誤判（「再見的時候」被「再見」擋下）。附 11 條單元測試。 | [duplicateSong.ts](client/src/lib/duplicateSong.ts) + test（PR #69） | tsc ✅ / 27 測試 ✅，已合併 |
| 手機關閉鈕靈敏度 | 建議表單關閉鈕改在 `pointerdown` 立即關閉（保留 `onClick` 供鍵盤），避免鍵盤開著時首次點擊被 input 失焦/鍵盤收合吃掉而「卡一下/像點兩次」。 | [SuggestionForm.tsx](client/src/components/SongSuggestion/SuggestionForm.tsx)（PR #69） | tsc ✅，已合併 |
| 建議卡片手機 RWD | 卡片改回 flex 直欄 + `dvh` 高度上限（扣安全區），標題固定、欄位內部捲動、送出鈕 sticky 釘底並補 `env(safe-area-inset-bottom)`。修正手機捲不到底、看不到藍色送出鈕。 | [editorial-modals.css](client/src/styles/editorial-modals.css)、[SuggestionForm.tsx](client/src/components/SongSuggestion/SuggestionForm.tsx)（PR #70） | tsc ✅ / Playwright ✅，已合併 |
| Changelog 維護 | 補 4.13.0 條目，修正更新提示卡「每次更新內容都一樣」（`UpdatePrompt` 只顯示 `CHANGELOG[0]`，但該檔自 4.12.0 後沒更新）。 | [changelog.ts](client/src/lib/changelog.ts)（PR #71） | tsc ✅，已合併 |
| 立即更新進行狀態 | 按「立即更新」後圖示旋轉、文案變「更新中…」、按鈕鎖定（`disabled` + `aria-busy`），新版 SW 啟用後自動 reload 結束；尊重 `prefers-reduced-motion`。 | [UpdatePrompt.tsx](client/src/components/UpdatePrompt.tsx)、[editorial-ritual.css](client/src/styles/editorial-ritual.css)（PR #72） | tsc ✅，已合併 |
| 分享點歌卡片 RWD | `.share-cassette-dialog` 加 `max-height`（dvh）+ body 內部捲動、頂條/標題固定，並隱藏 `DialogContent` 內建重複關閉鈕。修正手機 QR 以下社群按鈕/說明被裁切捲不到。 | [editorial-modals.css](client/src/styles/editorial-modals.css)（PR #73） | tsc ✅ / Playwright ✅，已合併 |
| 載入畫面卡帶化（v4.14.0）| 「吉他點歌系統載入中」改為 SVG 擬物化卡帶：齒輪持續旋轉、左右磁帶卷半徑隨 `progress` 動態捲動、老式 LED 三位數計數器、骨架預覽、全面 RWD。 | [AppLoading.tsx](client/src/components/AppLoading.tsx)（`81e1444`，使用者主導）| 已合併上線 |

## 未來優化改良與可開發功能建議（依「點歌建議漏斗 / 分享成長 / 首次體驗」方向）

> 依「現場實用度 × 實作成本」分層：P0 低成本高感受、可立即著手；P1/P2 逐步加深；F 為較大型功能。難度標註 🟢易 / 🟡中 / 🔴大。多數可直接接既有模組（`funnelAnalytics`、`mySuggestions`、`useSuggestionNotification`、`duplicateSong`、Firestore 即時層）。

### P0：把已修好的「送出」做到滴水不漏（低成本、直接接現有碼）

1. ~~**送出失敗的「重試 / 已暫存」回饋**🟢~~ ✅ **已完成（6/23, PR #76；6/24 跨平台強化 PR #85）**：新增 [pendingSuggestions.ts](client/src/lib/pendingSuggestions.ts) localStorage 佇列，離線/寫入失敗即 enqueue（沿用同 doc id 冪等重送），啟動 + `online` 事件自動補送並 toast；送出當下離線提示「已暫存」。**PR #85 再補齊跨平台補送觸發**（[usePendingSuggestionFlush.ts](client/src/hooks/usePendingSuggestionFlush.ts)：`focus` / `visibilitychange` / `pagehide` / 60s 輪詢）＋ **Background Sync bonus**（支援的瀏覽器登記 `flush-suggestions`，SW 連線恢復時喚醒並 `postMessage` 通知前端補送，不在 SW 內寫 Firestore）。完整「關閉分頁也背景補送」見下方 F #27。
2. **送出節流 / 防連點重複建議**🟢：同一裝置短時間（如 30s）內擋掉相同 title 的重複送出，配合既有 `mySuggestions` 本地紀錄比對，減少重覆審核負擔。
3. ~~**重複偵測門檻可調 + 灰階提示**🟢~~ ✅ **已完成（6/24, PR #80）**：`duplicateSong` 中相似度（0.6–0.8）改為**柔性提示**（不擋送出，標題下方小字列出「歌單裡有點像的」），高相似才跳確認框。
4. ~~**建議表單欄位記憶「稱呼」**🟢~~ ✅ **已完成（6/24, PR #80）**：`suggestedBy`（你的稱呼）以 localStorage 記住，回訪自動帶入，省去每次重打。
5. ~~**送出成功後的「+1 我也想聽」即時引導**🟢~~ ✅ **已完成（6/24, PR #81）**：投遞成功儀式結束後，自動展開社群推薦、把剛送出的建議卡片捲到視野並高亮「揪人 +1」，銜接既有 `suggestionUpvotes`，把單次推薦變成擴散。

### P1：點歌建議漏斗的可視化與營運（已有埋點，缺儀表板）

6. ~~**漏斗儀表板（admin）**🟡~~ ✅ **已完成（6/23, PR #77）**：新增 [FunnelDashboard.tsx](client/src/components/FunnelDashboard.tsx)，admin 工具列「漏斗」鈕開啟，顯示主漏斗比例條、打字/送出/放棄轉換率、重複提示成效、近期事件流與清除本機數據。
7. ~~**跨裝置漏斗彙整**🟡~~ ✅ **已完成（6/24, PR #84）**：`trackEvent` 加上輕量 Firestore server sink，多位訪客的漏斗事件聚合到伺服器；admin 漏斗儀表板新增「全場視圖」切換看真實現場數據。⚠️ 需另外部署 `firestore.rules`（`firebase deploy --only firestore:rules`）寫入才會生效。
8. ~~**建議狀態通知強化**🟢~~ ✅ **已完成（6/24, PR #82）**：補上「你推薦的《X》今晚被彈了！」回饋（接 `playedSongs`），被彈出時跳慶祝，形成「推薦→被採納→被演出」的完整正向迴圈。
9. ~~**admin 批次審核效率**🟡~~ ✅ **已完成（6/24, PR #83）**：「相似建議自動分組」（複用 `duplicateSong` 相似度），把同一首的多筆推薦聚合成一張卡一次批次處理。

### P1：分享與成長（分享卡片已修好，下一步是「值得被分享」）

10. **分享帶上情境參數**🟢：分享連結加 `?from=share`／活動代號，落地頁顯示「你朋友邀請你一起點歌」，並餵進漏斗看分享回流。
11. **動態分享圖（OG image）**🟡：目前分享是純連結 + QR。可生成含「今晚 Top 3 點播 / 期數 Nº」的動態預覽圖（已有 ShareCard 思路），社群上更吸睛。
12. **「翻面 B 面」分享微儀式**🟢：呼應卡帶語言，分享成功後播一個小翻面動畫 + 「已寄出這捲卡帶」，提升完成感（複用既有 confetti/卡帶元件）。
13. **原生分享 API 優先**🟢：手機端優先用 `navigator.share`（系統分享面板），社群按鈕作為桌機/降級方案，行動端少一步。

### P1：首次載入與 PWA 體驗（載入畫面已卡帶化，續推感知效能）

14. **真實進度取代模擬進度**🟡：目前 `AppLoading` 是時間模擬遞增。可把實際里程碑（字體就緒 / Firestore 首批快照 / 首屏資料）對應到進度段，讓「快好了」名副其實，並在卡住時誠實顯示。
15. **骨架對齊真實版面**🟢：載入骨架的兩欄結構盡量比照真正首屏（卡帶 Hero + 排行榜列），減少載入完成時的版面跳動（CLS）。
16. **離線/連線中斷的明確態**🟢：偵測到 `navigator.onLine === false` 或首批快照逾時，載入畫面顯示「等待連線中…」而非無限轉動，呼應第 1 點的離線敘事。
17. **更新流程閉環**🟢：`UpdatePrompt` 已有「更新中」狀態；可在新版啟用後（`controllerchange` reload）顯示一個一次性「已更新到 vX.Y」小確認，讓使用者知道剛剛更新成功（接 `SW_ACTIVATED` 訊息與 changelog）。

### P2：行動端 RWD 與無障礙系統化（這次修了三個 modal，該收斂成通用解）

18. ~~**共用「行動端底部表單 sheet」元件**🟡~~ ✅ **已完成（6/23, PR #78）**：抽出共用 `.ed-sheet` / `.ed-sheet-body`（+ `.ed-sheet--bottom`）於 [editorial-modals.css](client/src/styles/editorial-modals.css)，分享卡與建議表單已遷移去重；新 modal 直接套用即可。（歌曲編輯 modal 後續可一併遷移。）
19. ~~**modal 視覺回歸測試**🟡~~ ✅ **已完成（6/23, PR #78）**：新增 [modal-rwd.spec.ts](tests/visual/modal-rwd.spec.ts)，斷言開啟後主要 CTA 落在 viewport 內可見可點、無橫向溢出；CI 無 Firestore 進不了主畫面時優雅 skip（待 Firestore mock 後可於 CI 生效）。
20. **z-index 契約稽核**🟢：`z.ts` 已有分層約定，但 AlertDialog 之前漏接。補一份「modal/overlay 必須使用 `Z.*` 或既定區間」的檢查（或 lint 註記），避免再出現 z-50 被 z-130 蓋住這類事故。
21. **無障礙補強**🟡：表單/對話框的 focus trap、`aria-label`、進度條 `aria-live` 播報、社群分享按鈕的可辨識名稱，並確保系統字級放大時不破版。

### P2：品質與發版自動化（讓「每次都長一樣」不再發生）

22. ~~**Changelog 與版本連動**🟡~~ ✅ **已完成（6/23, PR #75）**：新增 [check-changelog.mjs](scripts/check-changelog.mjs) 於 `prebuild` 校驗 `package.json` version === `changelog.ts` 最新條目 version（不一致/重複即擋下 build），並對齊版本到 4.14.0（後續隨發版遞增）。
23. **「本次更新」精準化**🟢：目前永遠顯示 `CHANGELOG[0]`。可記住使用者上次看過的版本，只顯示「從你上次到現在」之間的條目，避免重看舊內容。
24. **PR/commit → changelog 半自動**🟡：用 PR 標題或 commit 慣例（feat/fix）自動彙整草稿條目，發版時人工潤飾，降低「忘了更新 changelog」的機率。

### F：較大型可開發功能（願景）

25. **點歌建議「願望牆」**🔴：把待審核建議做成一面公開可瀏覽、可 +1、可留言的願望牆（接 `suggestionUpvotes`），讓現場觀眾彼此看到、互相加碼，形成社群感與即時熱度。
26. **建議 → 自動補歌曲資料**🔴：送出建議時用既有搜尋/AI 能力預抓歌手、年代、曲風、YouTube 連結，admin 審核時一鍵帶入歌庫，縮短「推薦→可點播」的生產線（銜接 v4.10.0 轉調工具→歌庫線與 AI 譜圖辨識）。
27. **離線送出佇列（PWA 強化）**🔴 — 🟡 **部分完成（6/24, PR #85）**：分頁開著時的補送已做到滴水不漏（P0 #1：跨平台觸發 + Background Sync 喚醒通知前端）。**剩餘的 🔴 大工**＝「分頁全關也由 SW 直接補送」：需把佇列搬到 IndexedDB（localStorage 在 SW 讀不到）+ 在 SW 內以 Firestore REST 編碼寫入（含 App Check／憑證），且 CI 無法驗證 SW 背景行為 → 風險高，暫不納入。

---



> 本段承接近期「轉調工具 / 全螢幕看譜」一條線（音樂搜尋連結、轉調工具狀態保存、縮放下限放寬到 40%），聚焦在**手機端全螢幕看譜時，把過高的頂部工具列收斂，讓下方譜面區塊取得更大顯示空間**。源自現場實測回饋：手機開啟全螢幕看譜，工具列佔掉近半個畫面，真正要看的譜反而被擠到很小。所有變更已合併進 `main`（commit `16f3d40`）。

## 已完成項目（6/21）

| 類別 | 完成內容 | 主要範圍 / commit | 驗證狀態 |
|---|---|---|---|
| 手機工具列瘦身 | 壓縮 `@media (max-width: 768px)` 下的全螢幕看譜工具列垂直高度：整體 `gap` 6px、四周 padding 收窄；標題字級 19→17px 並移除多餘 `padding-right`、調性小標 11px；轉調鍵列高度 36→32px、字級與間距縮小；縮放列與「複製 / 關閉」按鈕高度 42→36px。整體把工具列從近半畫面收斂，讓譜面區塊明顯放大。 | [editorial-modals.css](client/src/styles/editorial-modals.css)（`16f3d40`） | 已合併上線 |
| 防溢位結構合併 | 推送時與另一條分支（`claude/mobile-layout-overflow`，已先合併 main）撞 6 處 CSS 衝突；採「保留遠端較穩健的水平捲動防溢位結構（`min-width:0` + `box-sizing` + 搜尋音樂列 flex `nowrap` + `overflow-x:auto`），套上本次更緊湊的尺寸值」逐處手動解衝突，最終以 `further compact` commit 收斂兩邊。 | [editorial-modals.css](client/src/styles/editorial-modals.css) | 已合併上線 |
| RWD 與按鈕可用性 | 維持 RWD：轉調 12 鍵、Spotify / YouTube Music、縮放 −/%/＋、複製、關閉所有按鈕點擊行為不變，僅調樣式；搜尋音樂列改為超出可水平捲動，長字（YouTube Music）不再擠壓換行。 | [editorial-modals.css](client/src/styles/editorial-modals.css) | 已合併上線 |
| SW 自動部署確認 | 確認本專案 Service Worker 版本**無需手動 bump**：`prebuild` 跑 [stamp-sw-version.mjs](scripts/stamp-sw-version.mjs) 自動把 `CACHE_VERSION` 印成「版本號-git短hash-build時間戳」三段式，每次 push 必變；`deploy.yml`（push main 觸發）build 後自動部署 GitHub Pages，本次部署 1m6s success，使用者下次開站即收到更新提示。 | [stamp-sw-version.mjs](scripts/stamp-sw-version.mjs)、[deploy.yml](.github/workflows/deploy.yml) | Actions success ✅ |
| 沉浸看譜三連發（P0 #1/#2/#3）| **#1 工具列自動隱藏 + 點一下喚回**：無操作 4 秒上滑收起、輕點譜面切換、收起時留半透明握把；`is-immersive` 改單列 grid + bar 轉 absolute 滑出，scroll 撐滿畫面。**#2 螢幕常亮 Wake Lock**：進全螢幕請求、離開釋放、回前景自動重請求、不支援靜默降級。**#3 字級與縮放解耦**：新增 A－/A/A＋ 獨立字級（實際 font-size 不糊），zoom 維持 transform 俯瞰；手機端字級/縮放並排不增高。 | [TransposeToolModal.tsx](client/src/components/TransposeToolModal.tsx)、[editorial-modals.css](client/src/styles/editorial-modals.css)（`a7920e8`）| tsc ✅ / build ✅ 無 warning，已合併上線；Wake Lock 與真機手勢待裝置實測 |

## 未來優化改良與可開發功能建議（依「全螢幕看譜 / 手機閱讀體驗」方向）

> 以下依「現場實用度 × 實作成本」排序，P0 為低成本高感受、可立即著手；P1/P2 逐步加深；F 為較大型可開發功能。每項標註預估難度（🟢易 / 🟡中 / 🔴大）。

### P0：榨出更多譜面空間（延續本次方向，最低成本最高感受）

1. ~~**工具列自動隱藏 + 點一下喚回**🟡~~ ✅ **已完成（6/21, `a7920e8`）**：無操作 4 秒上滑收起、輕點譜面切換、收起時保留半透明握把。這是讓譜面接近 100% 全螢幕的最大單一槓桿。
2. ~~**螢幕常亮（Wake Lock API）**🟢~~ ✅ **已完成（6/21, `a7920e8`）**：進全螢幕請求 `navigator.wakeLock`、離開釋放、回前景自動重請求、不支援靜默降級。
3. ~~**字級與縮放解耦**🟢~~ ✅ **已完成（6/21, `a7920e8`）**：新增 A－/A/A＋ 獨立字級（實際 `font-size` 不糊），`scale` 保留俯瞰。
4. **記住每首譜的縮放與捲動位置**🟢：用內容 hash 或 song id 把上次的 `fullscreenZoom`（及捲動位置）存 localStorage，重開同一份譜自動套用——沿用既有 [transposeMemory.ts](client/src/lib/transposeMemory.ts) 的記憶模式。
5. **工具列高度上限防回歸測試**🟡：補一條斷言「390px / 430px 下工具列高度不得超過視窗的 40%」，避免日後新增按鈕又把譜面擠小（呼應既有 ROADMAP 的視覺回歸測試訴求）。

### P1：看譜的閱讀與操作品質

6. **夜間 / 護眼看譜主題**🟡：現場常是低光環境，提供全螢幕看譜專屬深色底（米白紙感 ↔ 暗色）切換，降低刺眼、省電（OLED）；和弦行用 accent 高亮、歌詞降一階對比。
7. **橫螢幕看譜最佳化**🟡：偵測 landscape 時自動把工具列改為極窄側邊欄或併入頂部單列，讓寬螢幕橫放時譜面利用率最大；長譜橫放更好讀。
8. **看譜手勢補完**🟢：雙擊譜面 = 重設縮放（目前要點百分比鈕）；左右邊緣輕掃 = 上 / 下半音快速移調；雙指已支援縮放，補上「雙擊歸位」最直覺。
9. **自動捲動 / 跑詞節拍器**🔴：可調速度的自動垂直捲動（teleprompter），邊彈邊讓譜自己往上跑，速度 +/−、暫停、回頂；長譜彈唱免單手滑。可結合歌曲 BPM 推薦初始速度。
10. **和弦行黏頂（sticky 段落標籤）**🟡：捲動長譜時，當前段落標籤（`[主歌]` / `[副歌]`）黏在頂部一小條，知道現在彈到哪段。

### P1：把全螢幕看譜變成「演奏台」（轉調工具線整合）

11. **全螢幕內 Capo / 移調夾建議**🟢：目前全螢幕已有 12 鍵轉調，補上「夾 N 格彈 X 調」的 capo 等效提示（轉調引擎已有此能力，只差在全螢幕露出）。
12. **底部常駐迷你移調列**🟡：手機端把「−半音 / 目前調 / ＋半音 / 數字級數切換」收成底部一條極窄常駐列（拇指可及），看譜時不必回頂部工具列即可即時移調。
13. **看譜模式直接存進歌庫 / 加入今晚歌單**🟢：admin 在全螢幕看到滿意的調，一鍵沉澱到歌庫或排進 UpNextBar，銜接既有「轉調工具 → 歌庫生產線」（v4.10.0）。

### P2：分享、投影與協作

14. **看譜投影模式**🟡：把當前譜 + 調以 `?mode=sheet` 投到大螢幕 / 第二裝置（沿用既有 StagePage 投影思路），團員各自看手機、主螢幕看大譜。
15. **分享當前譜 + 調的快捷**🟢：全螢幕內一鍵產生「這份譜 + 這個調」的分享（連結 / 圖片 / QR），現場團員秒同步到同一個調。
16. **多人同步看譜（進階）**🔴：以現有 Firestore 即時架構，讓一台「主控」捲動 / 移調時，其他人裝置跟著同步（合奏對齊）。

### P2：效能、穩定與無障礙

17. **超長譜分段渲染 / 虛擬化**🟡：極長譜在 `transform: scale` 下整塊渲染可能掉幀，評估分段或 `content-visibility: auto` 降低重繪成本。
18. **`transform` 模糊問題收斂**🟢：放大時文字略糊，改以字級為主、`scale` 為輔（見第 3 點），或對 `pre` 加 `text-rendering` / 在縮放穩定後 snap 到整數級距。
19. **無障礙補強**🟡：工具列按鈕的 focus ring、`aria-label` 完整度、縮放百分比以 `aria-live` 播報、確保系統字級放大時版面不破。

### F：較大型可開發功能（願景）

20. **看譜書籤 / 設定清單（Setlist 看譜流）**🔴：把今晚歌單串成可左右翻頁的「看譜本」，彈完一首滑到下一首，每首記住各自的調與縮放——把單張看譜升級成整場演出的看譜流程。

---

# 2026-06-20 進度更新：浮動按鈕卡帶化、更新提示卡帶化、Web 工作階段自動化

> 本段承接 6/19 的卡帶風一致性工作，聚焦在「右下角浮動元件」與「PWA 更新體驗」的視覺收斂，並補上 Claude Code on the web 的開發環境自動化。所有變更已合併進 `main`（PR #53、#54）。

## 已完成項目（6/20）

| 類別 | 完成內容 | 主要範圍 / commit | 驗證狀態 |
|---|---|---|---|
| 浮動按鈕重疊修正 | 修正手機端「管理員登入」FAB 與「返回頂部」按鈕在右下角重疊的問題；訪客瀏覽時返回頂部按鈕自動堆疊於登入鈕上方（`stacked` 變體 + `is-stacked` CSS 偏移）。 | `Home.tsx`、`ScrollToTop.tsx`、`editorial-ritual.css`（`31820e1`、PR #53） | 已合併上線 |
| 返回頂部卡帶化 | 把原本單調的琥珀色圓鈕重新設計為迷你卡帶：四角螺絲、雙轉軸 + 磁帶（複用 `editorial-spin`）、「▲ TOP」標籤；位置改用 CSS 計算，配合 `has-up-next-bar` 與安全區自動避讓。 | `ScrollToTop.tsx`、`editorial-ritual.css`（`31820e1`、PR #53） | 已合併上線 |
| 更新提示卡帶化 | 將「有新版本可以更新」的琥珀色卡片重新設計為卡帶：黑色外殼 + 點狀紋理、`SIDE A · NEW VERSION` 米白標籤、脈動 live dot、雙轉軸 + 來回掃動的磁帶頭、accent 藍「立即更新」動作鍵；版本號以 mono 字呈現為目錄編號。 | `UpdatePrompt.tsx`、`editorial-ritual.css`（`1e3098f`、PR #54） | tsc ✅ / vite build ✅，已合併上線 |
| 減少動態尊重 | 返回頂部、更新提示的轉軸 / 磁帶 / 脈動動畫全部遵守 `prefers-reduced-motion`，開啟減少動態時改為靜態。 | `editorial-ritual.css` | 已合併上線 |
| Web 工作階段自動化 | 新增 SessionStart hook（`.claude/hooks/session-start.sh` + `.claude/settings.json`），在 Claude Code on the web 新工作階段啟動時非同步執行 `npm install`，確保 vitest / vite 等開發相依可用；僅在 `CLAUDE_CODE_REMOTE=true` 時觸發。 | `.claude/hooks/session-start.sh`、`.claude/settings.json`（`9eb1ac3`） | 已合併上線 |

---

# 2026-06-19 進度更新：卡帶風 UX、管理員工具、社群預覽與 PWA 圖示

> 本段整理近期實測後已完成的修正與下一階段可開發方向，放在進度表最上方，方便快速掌握目前狀態。

## 已完成項目

| 類別 | 完成內容 | 主要 commit / 範圍 | 驗證狀態 |
|---|---|---|---|
| 管理員社群推薦 | 批次刪除改為站內確認對話框，加入處理中、成功、失敗回饋；部分失敗時保留未刪除選取項目，方便重試。 | SongSuggestion 批次工具列 | 已上線 |
| 轉調工具 | 轉調工具改為管理員專用；新增全螢幕看譜、縮放、上下左右捲動、手機/平板手勢操作；存進歌庫後自動跳到存檔表單並聚焦歌名欄位。 | 轉調工具 modal / 全螢幕看譜 | 已上線 |
| 手機 RWD 與遮擋 | 修正推薦新歌 modal、催歌王、底部管理員列、已點過清單、全螢幕看譜等多輪手機 UX 問題，降低遮擋與卡住感。 | 多個前端元件與 CSS | 已上線 |
| 管理員工具列 | 修正桌機與窄寬度下，管理員上排功能按鈕與轉調工具按鈕重疊問題。 | 管理員工具列 / header 佈局 | 已上線 |
| 卡帶風一致性 | 歌曲編輯移除「演奏難度」與「標籤」欄位；歌曲編輯、分享點歌系統、正在彈奏彈窗改為更一致的卡帶 UIUX。 | 歌曲編輯、分享、NowPlayingNotification | 已上線 |
| 投票回饋降噪 | 單票不再觸發過度誇張的黑馬爆衝動畫，保留低干擾回饋，避免影響連續點歌體驗。 | 投票回饋 / 慶祝動畫 | 已上線 |
| 連線成功通知 | 移除或降噪「連線成功、即時更新已啟用」大面積綠色通知，避免擋住主介面。 | toast / 即時連線提示 | 已上線 |
| 社群分享與品牌圖示 | 產生卡帶風 favicon、PWA icons、apple-touch-icon、LINE/Facebook/Twitter OG 預覽圖；修正繁中 meta、manifest 與 GitHub Pages 絕對網址。 | `eab0ff1` / `client/index.html`, `manifest.json`, `scripts/generate-og-image.mjs` | `check`、`build`、線上抓取、GitHub Actions OK |

## 未來優化改良與可開發功能建議

### P0：先補防回歸，避免同類問題反覆發生

1. 手機端視覺回歸測試：針對推薦新歌 modal、全螢幕看譜、正在彈奏通知、底部管理員列建立 390px、430px、768px 截圖比對。
2. 浮層 z-index 契約表：整理 modal、toast、全螢幕看譜、bottom bar、返回頂部、管理員工具列的層級，避免黑幕出現但內容不見、按鈕不能點、卡片被擋住。
3. 全螢幕看譜互動測試：補上加減縮放、滾輪縮放、雙指縮放、單指拖曳、上下左右捲動的 e2e 測試。
4. Service Worker 更新驗收腳本：固定檢查線上 `sw.js` 版本、更新提示、使用者按更新後是否成功 reload，避免「明明 push 了但還是舊版」。
5. mojibake 檢查：新增腳本掃描常見亂碼字元，避免 meta、manifest、ROADMAP 或 UI 文案再次出現編碼問題。

### P1：管理員現場操作效率

6. 管理員演出控台：把統計、節目單、開場、列印、結束今晚、演出模式、轉調工具集中為一個可收合的控台，手機端改為底部抽屜。
7. 歌庫存入後下一步：轉調工具存進歌庫成功後，提供「查看新歌」、「加入今晚歌單」、「繼續轉調」三個快速動作。
8. 社群推薦審核快篩：自動標示「疑似重複」、「已在歌庫」、「缺歌手」、「可直接採納」，降低管理員審核負擔。
9. 批次操作復原佇列：刪除、拒絕、清除歷史後提供短時間復原，降低現場誤點風險。
10. 管理員手機模式：針對小螢幕提供更大點擊區、更少文字、更穩定的 sticky 工具列。

### P1：社群分享與活動擴散

11. 社群分享卡多版本：除了目前卡帶版 OG 圖，再新增「今晚排行榜版」、「正在彈奏版」、「推薦新歌版」。
12. LINE 分享落地頁：掃 QR 或點分享連結後，直接看到「點歌」、「推薦」、「排行」三個入口與今晚狀態。
13. `npm run verify:og`：自動驗證 title、description、og:image 200、尺寸、hash、manifest icons 是否完整。
14. 活動期數自動化：OG 圖、首頁卡帶、manifest screenshots 可帶入 `ISSUE N°xx`、日期、今晚主題。
15. 分享來源追蹤：用 URL query 記錄 LINE / Facebook / QR Code 來源，後台看哪種分享最有效。

### P2：現場互動與觀眾體驗

16. 低干擾投票回饋：一般 +1 只顯示小型 toast 或按鈕內回饋；只有達成票數里程碑或排名大幅變動才出現大動畫。
17. 即時熱度資訊：顯示在線人數、最近 5 分鐘投票熱度、熱門搜尋字、推薦新歌數。
18. 個人點歌紀錄：訪客可看「我今晚點過什麼」、「再點一次」、「分享我的今晚歌單」。
19. 現場投影模式 v2：大螢幕只保留正在彈奏、下一首、Top 3、倒數或提示，不顯示管理操作。
20. 催歌王改成任務感：用更清楚的規則說明誰是催歌王，並避免手機端點擊區過小或無反應。

### P2：設計系統與維護

21. 卡帶風設計 token：整理藍色、米白紙感、黑色磁帶、邊框、陰影、字級，讓新元件不再各自發散。
22. 共用 Dialog 元件：把歌曲編輯、分享、推薦新歌、歷史紀錄、全螢幕看譜整理成一致的 modal API。
23. 產圖腳本快照測試：對 `og-preview.png` 尺寸、檔案大小、hash 變動建立報告，避免社群圖意外壞掉。
24. Release checklist：每次 push 後自動檢查 GitHub Actions、SW 版本、OG 圖、manifest、主要路由 200。
25. 全域 Skill 流程自動化：新建 Skill 後自動同步三家工具、更新索引、提交本地 skill repo，減少人工漏步。

# 🚀 互動式吉他彈唱點播平台 — 開發進度 & 未來路線圖

> **文件版本**：13.1
> **更新日期**：2026-06-13（v4.11.5 — 辨識完成自動捲到控制列+結果，免手動找）
> **當前版本**：**v4.11.5**（OCR/AI 辨識完成自動 scrollIntoView 到控制列+轉調結果）
> **GitHub**：[cagoooo/song](https://github.com/cagoooo/song)
> **目的**：完整反映已完成項目、針對 editorial 雜誌風方向提供詳細未來優化與開發建議
> **📐 詳細設計文件**：[docs/design/](docs/design/README.md) — D1-D6、T1-T4、C1、C3 共 12 份獨立設計文件

---

## 🆕 v4.6.2 — 社群推薦 RWD + 全站「專注輸入」防干擾（2026-06-02）

> **主題**：兩個都源自「使用者實際在現場用會卡住」的真實回饋 — 一個關於「看不到內容」，一個關於「打字被干擾」。沒有新增 dependency，純前端體驗修正，但建立了一個可長期複用的防干擾基礎設施。

### 1️⃣ 社群歌曲推薦清單 — RWD 捲動修正
- **問題**：「社群歌曲推薦」展開後內容被裁切、上下滾不動，看不到更多卡片。
- **根因**：Radix `ScrollArea` 的 Root 只有 `max-height` + `overflow-hidden`，內部 Viewport 用 `h-full`（百分比高度無明確父高可參照）→ Viewport 撐成完整內容高度不觸發 overflow，超出部分被 `max-h` 硬裁掉；觸控裝置因預設 `type="hover"` 捲軸不顯示更難察覺。
- **修法**（[SongSuggestion.tsx](client/src/components/SongSuggestion/SongSuggestion.tsx)）：丟棄 Radix `ScrollArea`，改原生捲動 — **手機不限高、清單自然展開交給整頁捲動（保證看得到全部）；桌機 `sm:max-h-[520px]` + `overflow-y-auto` + `overscroll-contain` + 自訂細捲軸**。
- **驗證**：預覽量測手機（439px → overflow visible、19 張卡片自然展開）/ 桌機（1280px → max-h 520px、scrollHeight 1861 > 520、實測可捲到底）。

### 2️⃣ 「專注輸入」防干擾 composing guard（基礎設施）
- **問題**：使用者填「推薦新歌」表單打字時，全站即時投票會觸發連擊大字（z-9999）、黑馬慶祝（z-9998）、全站熱度（z-9997）、互動動畫等全螢幕覆蓋層，整片蓋在輸入框上方造成視覺衝擊、干擾輸入。
- **解法**：新增輕量全域旗標 [composingGuard.ts](client/src/lib/composingGuard.ts)（`useSyncExternalStore` + 可重入計數）：
  - **第一階段**：`SuggestionForm` Dialog 開啟期間登記「正在輸入」，Home 在此期間暫停渲染 4 個全螢幕覆蓋層（`ComboOverlay` / `DarkHorseOverlay` / `GlobalHypeOverlay` / `InteractionOverlay`），關閉即恢復。
  - **第二階段（擴及全站）**：新增 `useComposingWhileTyping` 全域焦點監聽 hook，在 Home 掛載一次 → **全站「所有」文字輸入框**（搜尋、登入、編輯、匯入、標籤，含未來新增者）聚焦即自動防干擾、失焦即恢復；在輸入框之間切換以 120ms 延遲合併 `focusout→focusin` 避免覆蓋層閃現；排除 checkbox/radio/button/range/file 等非打字輸入。
  - **設計亮點**：計數而非布林 → 多來源（多表單）可各自 enter/exit 不互相干擾；顯示端只需 `useIsComposing()` 一行。背後的計票 hook 持續運作，只暫停「視覺呈現」。
- **驗證**：預覽以「真正聚焦 + 派發冒泡 focusin」精準模擬真實點擊 → 聚焦輸入框即抑制覆蓋層、失焦 120ms 後恢復；對話框守衛同樣通過。
- **踩雷紀錄**：自動化環境的程式化 `.focus()` 不會派發會冒泡的原生 `focusin`，導致初測誤判「沒生效」；改用「真實聚焦 + 手動派發冒泡事件」才正確驗證。**未來測 focus 行為時要用真實互動（preview_click）或手動派發 bubbling 事件，別只靠 `el.focus()`。**

> **延伸方向見下方新段落「🔕 專注輸入 / 防干擾體系延伸建議」** — 這個 composing guard 是一塊可長期投資的基礎設施。

---

## 🚨 v4.6.1 hotfix — CSS @import 順序救援（2026-05-18）

> **事件**：v4.2.0-ac73b69-u8le 線上實際打開 `https://cagoooo.github.io/song/` 整站跑版，所有元素垂直堆成一條（卡帶 hero / SETLIST 計數器 / TICKER / 點歌按鈕全部失去版面）。
> **根因**：T1（commit c338517）把 4706 行 `index.css` 拆 5 個 editorial CSS 後，`@import './styles/editorial-*.css'` 寫在 `@tailwind base/components/utilities` **之後**。CSS spec 規定 `@import` 必須在所有其他 statement 之前（除 `@charset` 與空 `@layer`），Vite build 噴 warning `@import must precede all other statements`，6 個 editorial CSS **整批被丟棄**，最終 bundle 只剩 Tailwind 預設樣式。
> **修法**：把 6 個 `@import` 移到 `@tailwind` directives **之前**，並在註解警告未來別寫反。[PR #13](https://github.com/cagoooo/song/pull/13)
> **驗證**：CSS bundle 127.52 kB → 221.84 kB（gzip 19.08 → 34.66 kB）— 多回的 94 kB 就是被丟掉的 editorial 樣式；無痕視窗實測首頁雜誌外殼正常、SW 自動升級 `ac73b69-u8le` → `f253a16-438o`。
> **教訓**：**Vite warning 不會 fail build**，整批樣式丟掉照樣產出 dist，CI 也綠燈通過。下面「📛 事故覆盤 — 工程體系建議」段落會詳列制度化防線。

---

## 🆕 v4.2.0 → v4.6.0 增量（2026-05-13 ~ 2026-05-16）

> **三週內五個 PR 合併，從「功能完整的點播平台」升級成「演出儀式平台」**

| 版本 | 主題 | 主要產出 |
|------|------|---------|
| **v4.3.0** | Editorial 雜誌風大改版 + 歌曲詳情 | 全站視覺重塑（白底 + 暖米色 + 雜誌藍 + Playfair Display + JetBrains Mono），SongDetailModal 含和弦圖 / 歌詞 / 相似歌 / SVG 指型圖 |
| **v4.4.0** | 節目單分享卡 | ShareCardModal — IG 1080×1350 直式 + FB OG 1200×630，2× 高解析度 PNG 下載 + ClipboardItem 複製 |
| **v4.4.1** | Editorial 收尾 | SongSuggestion / SuggestionForm / RankingBoard 三檔全面 editorial 化（pin / 評論 / 進度條 / 章節編號） |
| **v4.5.0** | END OF SIDE A 收尾儀式 | ThankYouModal — 「結束今晚」管理員按鈕 + 全螢幕雜誌風儀式 + 黑膠 720° 兩圈旋轉 + Verifier fix |
| **v4.6.0** | 三件套：UpNextBar + VoterPassport + OpeningCurtain | 底部隊列條 / 護照式催歌履歷 / 6 秒鏡像反向開場儀式 — 從 Claude Design handoff 直接落地 |

### 📊 累積資料（v4.6.0 截止）

| 指標 | 現況 | 對比 v4.2.0 | 變化 |
|------|------|-------------|------|
| **單元測試** | 216 個 / 100% 通過 | 216 | 持平（新增元件多為視覺化，沒新增測試 ⚠️） |
| **新增 components** | +9 個（SongDetail × 3、ShareCard、ThankYou、UpNext、VoterBoard、VoterPassport、OpeningCurtain） | — | 全站超過 35 個元件 |
| **新增 hooks** | +1（useNowPlaying） | — | 累積 12 個自訂 hooks |
| **新增 npm deps** | `html-to-image@1.11.13` | — | bundle 影響：dynamic import，不進初始 chunk |
| **`index.css` 行數** | ~6300 行（編輯後） | ~2200 行 | +186% — **編輯時要小心，後續可拆檔** |
| **設計風格** | Editorial 雜誌風統一 | 彩虹漸層 | 完全重塑 |

---

## 📊 目前狀態總覽 (v4.6.0)

| 指標 | 現況 | 對比目標 | 狀態 |
|------|------|----------|------|
| **單元測試** | 216 個 / 100% 通過（19 個 test files） | 50% 覆蓋率 | ✅ 超越 |
| **TypeScript 嚴格度** | `strict` + `noImplicitReturns` + 全套 | 嚴格化 | ✅ 進階 |
| **Initial Bundle（gzip）** | ~280 KB | < 300 KB | ✅ 達標 |
| **PWA 支援** | SW + Manifest + 自動 bump + 更新提示 | 離線 + 自動更新 | ✅ 完成 |
| **CI/CD** | Actions: typecheck + 216 test + build + Lighthouse | 全自動 | ✅ 完成 |
| **Error Boundary** | 全域錯誤防護 | 全 App | ✅ 完成 |
| **行動裝置 RWD** | 含後台、含 editorial 卡帶 hero | 全頁面響應式 | ✅ 完成 |
| **互動特效層次** | 5 套 + 5 件套 ritual modals | 演出現場有感 | ✅ 完成 |
| **設計語言一致性** | Editorial 雜誌風 100% 覆蓋 | 統一品牌 | ✅ 完成 |
| **演出儀式完整度** | 開場 → 進行中 → 收尾 三段都有 | 完整體驗 | ✅ 完成 |

---

## 📋 目錄

1. [✅ 已完成里程碑](#-已完成里程碑)
2. [🔥 Phase A：短期高優先](#-phase-a短期高優先)（**已 100% 完成 ✅**）
3. [📱 Phase B：中期功能擴展](#-phase-b中期功能擴展)（**5/6 完成**）
4. [🌟 Phase C：長期進階](#-phase-c長期進階)
5. [🎯 v4.7 → v5.0 立即可做的詳細建議](#-v47--v50-立即可做的詳細建議)
6. [🎬 Editorial 方向延伸建議](#-editorial-方向延伸建議)
7. [⚡ Bundle 三次優化](#-bundle-三次優化)
8. [🛡️ 安全性下一階段](#️-安全性下一階段)
9. [🧪 測試策略升級](#-測試策略升級)
10. [📈 可觀測性與分析](#-可觀測性與分析)
11. [🎨 UX 細節提升清單](#-ux-細節提升清單)
12. [🔕 專注輸入 / 防干擾體系延伸建議](#-專注輸入--防干擾體系延伸建議)（**🆕 v4.6.2 衍生**）
13. [🔮 v4.7+ 未來優化改良與可開發功能（完整建議清單）](#-v47-未來優化改良與可開發功能完整建議清單)（**🆕 v4.6.9 整理**）
14. [🧹 程式碼健康度 / 技術債](#-程式碼健康度--技術債)
15. [📅 建議實施時程 (v4.7 → v7.0)](#-建議實施時程)
16. [🎯 Top 7 立即可做（推薦順序）](#-top-7-立即可做)

---

## ✅ 已完成里程碑

### v4.11.5（2026-06-13）— 辨識完成自動捲到結果 🎯

> **背景**：辨識完成後結果在下方，使用者要自己捲下去找。

- ✅ **自動捲動**（TransposeToolModal）：OCR / AI 辨識成功後 `scrollIntoView` 自動捲到**控制列**位置（而非結果頂端）— 這樣「可切調的控制列 + 轉調結果」同框可見，接續 v4.11.4「邊切調邊看」設計
- ✅ 等 React 渲染出結果再捲（220ms delay）；smooth 平滑捲動
- ✅ 只在「辨識完成」捲（OCR/AI），手動貼文字/修錯字不會亂跳
- ✅ 實測：辨識完成觸發 `scrollIntoView` 到 `ttm-controls`（preview 隱藏分頁 smooth 不實捲，真實瀏覽器會平滑捲動）；tsc 乾淨；build 無 warning

### v4.11.4（2026-06-13）— 手機「轉調結果」自動移到原譜上方 📱

> **背景**：手機單欄時原譜在上、結果在下，要切調（半音/目標調在最上方控制列）得一直上下捲。

- ✅ **手機 order 對調**（[editorial-modals.css](client/src/styles/editorial-modals.css)）：`.ttm-panes.has-result` 時手機把「轉調結果」`order:-1` 移到「貼上原譜」上方，緊鄰控制列 → **邊切調邊看結果不用捲**
- ✅ **條件對調**：沒結果時原譜仍在上（先輸入的邏輯順序）；一有結果（output 非空）才對調
- ✅ 桌機雙欄不變（order 只在 ≤768 斷點套用）— 實測桌機原譜左/結果右並排、手機有結果時結果在上（resTop 378 < srcTop 648）；無破版
- ✅ tsc 乾淨；build 無 warning

### v4.11.3（2026-06-13）— AI 辨識上傳前壓縮圖片 ⚡（手機 2 分鐘 → ~10 秒）

> **事件**：手機按「✨ AI 辨識」卡在 92% 進度約 2 分鐘才出結果（進度條停 92% 是設計如此，真正慢的是辨識本身）。

- **根因**：手機上傳的是整個網頁長截圖（含 91pu 網站 UI、廣告），原圖 ~1080×3000 的 PNG、base64 好幾 MB → **4G 上傳大圖 + Gemini 處理大圖都很慢**。
- **修法**（[aiSheetOcr.ts](client/src/lib/aiSheetOcr.ts)）：`imageToOptimizedDataUrl` 上傳前用 canvas 縮到最長邊 1600 + 轉 JPEG 0.85；截圖肥大 PNG → 體積降 90%+（實測 1080×3200 PNG 129KB → 540×1600 JPEG 15KB，縮 9 倍，真實照片縮更多）。Gemini Vision 辨識譜文字 1600px 已足夠清晰。
- **加超時保護**：70 秒 AbortController，避免極端情況無限等，超時給友善提示。
- **驗證**：縮圖後 JPEG（32KB）打後端 → 5 秒正確辨識（`[前奏] |C |G |Am |F` + 中文），辨識品質不受影響。
- 進度條提示改不寫死秒數（「請稍候…圖較大時多等幾秒」）。

### v4.11.2（2026-06-13）— 修復手機上傳圖後 modal 橫向溢出破版 🐛

> **事件**：手機上傳長譜截圖後，整個轉調工具 modal 橫向溢出視窗 — 按鈕橫排被切、原圖過大、譜面跑出畫面外。

- **根因**：CSS Grid/Flex 經典陷阱 — `.ttm-output` 是 `white-space: pre`（和弦譜要保持對齊不換行），長和弦行（`|Em7 |Cmaj7 |Am7 …`）的內容寬度把 grid 欄位的 `min-width: auto` 撐破 → 右欄 pre 撐爆 column → 連帶整個 modal（含左欄圖/按鈕）橫向溢出。先前 preview 用短譜測沒抓到。
- **修法**（[editorial-modals.css](client/src/styles/editorial-modals.css)）：`.ttm-pane { min-width: 0 }` + `.ttm-panes { grid-template-columns: minmax(0,1fr)… }` — 讓欄位可縮到比內容窄，譜面靠自己 `overflow-x: auto` 橫捲，不撐破版面。
- **驗證**：375px + 15 個和弦超長譜實測 — 整頁無水平溢出（docScrollW=viewportW）、modal 在視窗內、譜面自己橫捲（outScrollW 537 > clientW 328）。
- 教訓：grid/flex 內含 `white-space:pre` 或可變寬內容的子項，**務必設 `min-width:0`**，否則內容會撐破軌道。

### v4.11.1（2026-06-13）— AI 辨識進度條 + 手機 RWD 優化 📱

> **背景**：AI 辨識要 5-10 秒沒回饋會「以為當掉」；手機上轉調結果被控制列推到很下面。

- ✅ **AI 辨識進度條**（TransposeToolModal）：點「✨ AI 辨識」後顯示紫色進度條 + 百分比 + 「約 5–10 秒請稍候」提示；單一 fetch 無真實進度 → 用緩升動畫（越接近越慢停 92%，完成跳 100%）讓使用者明確知道在跑、不會以為當機
- ✅ **手機轉調結果 RWD**（375px 實測）：控制列 **257→143px**（瘦身近半）；目標調 12 鍵改「橫向可捲一列」（堆疊 101→47px）；輸入區降高 + 標題瘦身 → 轉調結果 **outTop 880→675**（上移 205px，更快看到結果）；無水平捲動破版
- ✅ 平板 768 單欄正常；tsc 乾淨；build 無 warning；preview 進度條 + 雙斷點實測通過

### v4.11.0（2026-06-13）— ✨ AI Vision 譜圖辨識（辨識品質天花板）

> **背景**：Tesseract 搞不定反白段落標籤（`[前奏]→[41%]`）、手機拍照歪斜的譜。用 Gemini Flash 看圖直接出譜，品質接近人工抄譜。
> **📐 設計文件**：[G3-sheet-ocr.md](docs/design/G3-sheet-ocr.md#g3b-2-落地架構2026-06-13)

- ✅ **後端代理**（Supabase Edge Function `guitar-ai-sheet`）：藏 Gemini key、CORS、限流、service_role 讀 key → Gemini 2.5 Flash Vision；落腳既有 active 專案 smes-inventory + `guitar_` 前綴隔離，不碰原 app、不開新專案（免費方案 2 active 已滿）
- ✅ **金鑰安全**：Gemini key（**新版 `AQ.` 格式**，實測有效，已記入 gemini-api-integration skill）存 RLS 鎖死的 `guitar_config` 表，公開讀不到；前端只帶公開 anon key
- ✅ **限流零破產**：全站 200/日 + 單裝置 30/日原子計數；Gemini 維持免費層超量回 429 不扣錢
- ✅ **前端**（[aiSheetOcr.ts](client/src/lib/aiSheetOcr.ts) + TransposeToolModal）：圖片模式「✨ AI 辨識」紫色按鈕，與 Tesseract 混合（免費即時當預設，不滿意按 AI 重辨）
- ✅ **實測**：合成譜圖（含反白 `[前奏]` 標籤）→ Gemini 完整正確辨識，瀏覽器端 CORS + 後端 + Gemini 全通，5 秒回應 — **OCR 的反白標籤硬骨頭一次解掉**
- ✅ 測試 590 全綠；tsc 乾淨；build 無 warning

### v4.10.3（2026-06-13）— 轉調結果多格式下載 📥（文字 / 圖片 / PDF）

> **背景**：原本只能下載 .txt。使用者要圖片與 PDF — 傳團員、列印、存檔更好用。

- ✅ **下載選單**（[TransposeToolModal.tsx](client/src/components/TransposeToolModal.tsx)）：「⬇ 下載 ▾」點開三選項 📄 .txt / 🖼️ .png / 📕 .pdf（點外面自動關、產圖中顯示忙碌狀態）
- ✅ **圖片 PNG**（html-to-image）：把轉調結果譜面渲染成 2× 高解析 PNG，截前暫時展開限高截完整；**中文走瀏覽器渲染不會 tofu**
- ✅ **PDF**（jsPDF，dynamic import 獨立 chunk 不進主 bundle）：PNG 置中塞進 A4 直式，中文是圖片不 tofu；Node 端對端驗證產出有效 PDF（190mm 寬、比例正確）
- ✅ **關鍵修復**：`fontEmbedCSS:''` 讓 html-to-image 不去 fetch Google Fonts cross-origin CSS（否則 CORS 拖慢甚至卡死產圖）— 讀 html-to-image 原始碼確認此參數會完全跳過字型處理
- ✅ 測試 590 全綠；tsc 乾淨；build 無 warning（jspdf 獨立 chunk 390KB gzip 128KB）
- ⚠️ PNG/PDF 因 preview 無頭隱藏分頁的 SVG→Image 渲染限制無法自動截驗（[claude-preview-headless-verify-traps]），但 PNG 邏輯與 production 已上線的 ShareCardModal 一致、PDF 經 Node 端對端驗證

### v4.10.2（2026-06-13）— 轉調工具 header 排版統一 + RWD 🎨

> **背景**：截圖區（左欄 header）三按鈕風格不一（兩個有框、一個底線）又擠，使用者反映很醜。

- ✅ **三按鈕統一**（[TransposeToolModal.tsx](client/src/components/TransposeToolModal.tsx)）：上傳 / 修正文字 / 清除 全改 `.ttm-pane-btn` 膠囊風 + variant 色（primary 藍 / 一般 / danger 紅 hover）；文案精簡（「修正辨識文字」→「修正文字」、「清除圖片」→「清除」）
- ✅ **標題升級**：左右兩欄 header 標題統一 `.ttm-pane-title`（義式襯線 + 圖示：🖼️ 原圖參照 / 🎼 轉調結果 / 🔢 數字級數）
- ✅ **RWD**：桌機標題左、按鈕右同行；手機標題在上、三按鈕等分一列在下，無水平捲動破版（375px 實測）
- ✅ 清掉死碼 `.ttm-ocr-btn`；測試 590 全綠；tsc 乾淨；build 無 warning；preview 桌機/手機雙斷點實測通過

### v4.10.1（2026-06-13）— 可疑字「就地點擊修正」✏️（OCR 校對 UX 大躍進）

> **背景**：原本修辨識錯字要先點「✏️ 修正辨識文字」切到 textarea。改成右欄黃字直接點就能改。

- ✅ **inline 編輯**（[TransposeToolModal.tsx](client/src/components/TransposeToolModal.tsx)）：右欄黃色可疑字 = 可點按鈕，點下去就地變成輸入框（autofocus），Enter / 失焦套用、Esc 取消；改完寫回原譜對應 token（用「行 + 非空白 token 索引」定位，轉調不增減 token 故一一對應）並重新轉調
- ✅ **改字不歸零轉調**：修錯字視為「同份譜微調」，先同步更新慣用調記憶 key，避免被當新譜把位移歸零（preview 實測 +4 改字後仍 +4，且原調 C/D 在 E 調正確顯示 E/F#）
- ✅ 鍵盤可達（role=button + Enter/Space）；提示文案改「右欄黃字直接點它就能就地修正」
- ✅ 測試 590 全綠；tsc 乾淨；build 無 warning；preview 就地編輯端對端通過

### v4.10.0（2026-06-13）— P1-3 轉調工具「存進歌庫」📥（一次性工具 → 歌庫生產線）

> **背景**：辛苦轉好的譜關掉就沒了。讓 admin 一鍵把轉好的譜沉澱成歌庫資產，詳情頁拿得到真實樂譜。

- ✅ **譜→歌庫欄位純函式**（[songChart.ts](client/src/lib/songChart.ts)，6 測試）：buildChartFromSheet 把純文字譜拆成 progression（去重前 8）+ lyricBlocks（沿用 lyrics-DSL 解析）
- ✅ **歌庫寫入**（[songs.ts](client/src/lib/firestore/songs.ts)）：addSongWithChart 寫完整樂譜欄位（含查重），payload 符合 firestore.rules isValidSongPayload
- ✅ **修復 T3 讀取斷鏈**：subscribeSongs / getSongs 抽 mapSongDoc 統一補讀 songKey/capo/bpm/progression/lyricBlocks/kaiNote + D5 標記 —— **既有填過樂譜的歌詳情頁從此顯示真實資料而非 fallback**（先前 subscribe 漏讀，T3 資料一直讀不到）
- ✅ **存庫 UI**（TransposeToolModal）：admin 限定「💾 存進歌庫」→ 內嵌表單（歌名/歌手/筆記）→ 存入後歌單與詳情頁即時可見；存「目前調的和弦版」（級數模式也轉回和弦）；查重防呆
- ✅ 測試 584 → **590**；tsc 乾淨；build 無 warning；preview 迴歸（非 admin 正確隱藏存庫鈕、轉調正常）。admin 寫入端對端待 production 登入驗證（避免污染正式歌庫）

### v4.9.1（2026-06-13）— P0-3 轉調結果下載 + 分享 📤（P0 清單全四項完成）

- ✅ **下載 .txt**（[TransposeToolModal.tsx](client/src/components/TransposeToolModal.tsx)）：右欄結果一鍵下載成檔，檔名帶調性（`吉他譜_D調.txt` / 級數模式 `吉他譜_級數.txt`），現場存檔 / 傳團員
- ✅ **分享**（Web Share API）：手機可直接傳 LINE / 訊息；不支援的桌機自動隱藏分享鍵（避免無效按鈕），保留下載 + 複製
- ✅ preview 實測下載檔名/內容正確；tsc 乾淨；至此 [G-toolbox-roadmap](docs/design/G-toolbox-roadmap.md) **P0 四項全數完成**

### v4.9.0（2026-06-13）— 吉他手工具線 P0 三連發 🎯（打磨到順手）

> **背景**：依 [G-toolbox-roadmap.md](docs/design/G-toolbox-roadmap.md) P0 清單，低成本高感受三項一次到位。

- ✅ **P0-1 可疑辨識字高亮**（[transpose.ts](client/src/lib/transpose.ts) export classifyToken + TransposeToolModal）：右欄轉調結果裡「和弦行內辨識不出、又非中文」的 token 標黃底（`.ttm-suspect`），OCR 校對不用整張圖用眼睛掃，直接看哪裡標黃去修
- ✅ **P0-2 個人慣用調記憶**（[transposeMemory.ts](client/src/lib/transposeMemory.ts)，12 測試）：localStorage 記每首歌（SongDetail 用 song.id）/ 每份譜（工具用內容 hash）上次轉到的調，下次打開自動套用；functional updater 防快速連點丟值
- ✅ **P0-4 數字級數顯示（Nashville）**（transpose.ts: chordToNashville/chordLineToNashville/nashvilleSheet）：「♪ 和弦 ↔ 🔢 級數」切換，C 調的 C/F/G/Am → 1/4/5/6m，教學/移調思考超直覺；級數相對偵測調、與位移無關
- ✅ 測試 564 → **584（+20）**；tsc 乾淨；build 無 warning；preview 三項實測通過（雜訊字標黃、級數 C→1/5/6m、記憶重貼自動套 +2）

### v4.8.3（2026-06-13）— 譜圖辨識後原圖呈現 UI 🖼️ + 吉他手工具線路線圖

> **背景**：使用者回饋 — 轉調結果右欄已有，左欄重複露出 OCR 辨識文字反而雜亂，希望辨識後直接看完整原圖。

- ✅ **圖片模式 UI**（[TransposeToolModal.tsx](client/src/components/TransposeToolModal.tsx)）：OCR 完成後左欄呈現**完整原圖**取代辨識文字框，對照右欄轉調結果更清爽；圖隨容器寬縮放、過長限高捲動
- ✅ **三鍵切換**：「✏️ 修正辨識文字 / 🖼️ 看原圖」互切（有錯字才進文字編輯）+「✕ 清除圖片」回純文字輸入；pane 標題依模式切換文案
- ✅ **RWD**：手機單欄堆疊、圖不溢出視窗、按鈕列自動換行（375px 實測無水平捲動破版）
- ✅ **吉他手工具線完整未來路線圖**：新增 [G-toolbox-roadmap.md](docs/design/G-toolbox-roadmap.md) — 18 項分 P0-P3 的優化與可開發功能建議

### v4.8.2（2026-06-13）— G3b-1 影像預處理 🧹（紅浮水印剋星 + 排版修復）

> **背景**：使用者第二輪實測 — 91 譜紅色 logo 浮水印壓住的段落辨識崩壞（`|G` 整顆消失、`|→J`、`[尾奏]|Cmaj7→[B%]|ICmaj7`），且中文被逐字切開「有 時 候」排版醜，缺原圖對照。

- ✅ **canvas 預處理**（[sheetOcr.ts](client/src/lib/sheetOcr.ts)）：去紅浮水印（偏紅像素漂白，黑字/藍和弦不受影響）+ 放大至 1800px + 對比強化；實測紅 logo 壓住的和弦行 `|G |Bm7 E7 |Am7 |D` 從殘缺變全數辨識，耗時 < 3 秒
- ✅ **CJK 逐字黏回**：依像素間距把「有 時 候」黏回「有時候」連續歌詞，對齊空白保留 — 排版直接還原譜面
- ✅ **原圖參照面板**：OCR 後輸入欄上方顯示原圖（可收起），對照抓錯字不用切視窗
- ✅ **雜訊規則擴充**：`J→|`、`T→7`（ET=E7）、底線拆分（D_IG=D |G）、黏標籤拆分（[B%]|ICmaj7=[B%] |Cmaj7）— 全部來自使用者實測截圖的真實誤認
- ✅ 測試 560 → **564**；G3 設計文件 G3b-1 標記完成

### v4.8.1（2026-06-13）— G3a 譜圖 OCR 轉調 📷（截圖 / 上傳圖片直接轉調）

> **背景**：91 譜等網站的譜大多只給**圖檔**，文字貼不進轉調工具。阿凱老師提出「截圖或上傳圖片也能轉調」。
> **📐 設計文件**：[G3-sheet-ocr.md](docs/design/G3-sheet-ocr.md)（含 G3b Gemini Vision 升級路徑）

- ✅ **OCR 模組**（[sheetOcr.ts](client/src/lib/sheetOcr.ts)，14 測試）：Tesseract.js v7 瀏覽器端辨識（eng+chi_tra，圖不離開裝置、零後端費用）；**版面重建純函式** — word bbox 以半形字元寬映射欄位，和弦↔歌詞視覺對齊轉成文字欄位對齊；全形轉半形 + 小節線誤判修正（I/l→\| 僅在修完變和弦行時採用）
- ✅ **三種餵圖方式**（TransposeToolModal）：📷 上傳譜圖 / **Ctrl+V 直接貼截圖** / 拖放圖檔；進度提示（首次下載 ~20MB 語言檔）、錯誤提示、辨識完成可直接修錯字
- ✅ **端對端實測**：合成 91 譜版面圖 → `Cmaj7/Bm7/Em7/Am7` 全中 + 對齊保留 + 偵測 C 調 + 轉調直通 `Dmaj7/C#m7/F#m7/Bm7`；Node 整合測試 env-gated（CI 不下載語言檔）
- ✅ tesseract.js 走 dynamic import 獨立 chunk，**主 bundle 零影響**；測試 530 → 544（+14）
- 🔮 **G3b 規劃**：canvas 預處理（二值化/去浮水印）→ Gemini 2.x Flash Vision（Supabase Edge Function 藏 key）→ 混合模式，詳見設計文件

### v4.8.0（2026-06-13）— G1 自動轉調系統 🎸（吉他手工具線第一彈）

> **背景**：網路上的譜常不是原 Key（原曲 G 卻寫成 C），現場得靠移調夾湊。需求 = 91 譜的即時轉調體驗，但免費。
> **📐 設計文件**：[G1-transpose.md](docs/design/G1-transpose.md)（含 G2 Chordify 式自動採譜研究筆記）

- ✅ **轉調引擎**（[transpose.ts](client/src/lib/transpose.ts)，47 測試）：和弦解析（複雜後綴/分數和弦/C6∕9 特例）、半音移調、**整行移調保持對齊**（和弦變長吃後方空白、變短補回 — 歌詞對照不跑位）、和弦行偵測（CJK + 英文歌詞 60% token 比例規則）、調性偵測（順階和弦計分 + 信心 %）、#/b 拼法依目標調智慧選、Capo 等效建議
- ✅ **指型字典**（[chordShapes.ts](client/src/components/SongDetail/chordShapes.ts)，15 測試）：30 個開放和弦 + E-shape/A-shape 封閉和弦自動產生（baseFret 把位標示，ChordSvg 高把位渲染）；指型卡從寫死 6 張改為依當前進行實際推導
- ✅ **歌曲詳情頁即時轉調**（SongDetailModal）：轉調控制列 −/＋/↺ 回原調 + Capo 提示；進行 / 歌詞和弦行 / 指型卡 / KEY meta 全部即時連動；小調歌正確（Em +2 → F#m 實測）；切歌自動歸零
- ✅ **貼譜快速轉調工具**（[TransposeToolModal.tsx](client/src/components/TransposeToolModal.tsx)，lazy load）：topbar「🎸 轉調工具」入口全民可用；貼上外部譜 → 自動偵測調性 → 12 鍵目標調 pill / 半音 stepper → 即時雙欄預覽（和弦行高亮）→ 一鍵複製；同音異名 F#/Gb 以半音值比對
- ✅ **測試 468 → 530（+62）**；tsc 乾淨；preview 實測：範例譜偵測 C 74%、+2 → D/Em/Bm 正確、Capo 建議「夾 2 彈 C」正確
- 🔮 **G2 預告**：Chordify 式自動採譜 — chromagram + 和弦分類原理已研究完，建議走 essentia.js 瀏覽器端 MVP（零後端費用、音訊不離開使用者裝置避開版權），詳見 G1 文末研究筆記

### v4.7.4（2026-06-02）— +1 附議 + 投影期數動態 + CHANGELOG（A2/C3/F4）
- ✅ **A2 ·「+1 我也想聽」附議**（[suggestions.ts](client/src/lib/firestore/suggestions.ts) + [suggestionUpvotes.ts](client/src/lib/suggestionUpvotes.ts) + SuggestionCard）：待審核卡片可附議，🔥 計數即時回流、本機去重；**Firestore rules `isValidUpvote()` 僅允許對 pending 的 upvotes +1**（已部署 guitar-ff931）。群眾訊號供阿凱排歌
- ✅ **C3 · 演出投影版面期數動態化**（[StagePage.tsx](client/src/pages/StagePage.tsx)）：`?mode=stage` 既有投影版面去除硬編「ISSUE #12 / 阿凱彈唱之夜」，改讀 D1 useMagazine（admin 改期數即時反映）；跑馬燈校名正名「石門國小」
- ✅ **F4 · CHANGELOG.md + 自動產生器**（[CHANGELOG.md](CHANGELOG.md) + [scripts/gen-changelog.mjs](scripts/gen-changelog.mjs)）：Keep a Changelog 版本分段；`npm run changelog` 從 git conventional commits 無依賴產生
- ✅ **測試 +12**（+1 去重 6 + F4/C3 既有覆蓋），全套 **453 → 468**；預覽實測 A2 首次 +1 成功、計數回流、去重；rules 部署成功

### v4.7.3（2026-06-02）— 現場回顧時間軸（B1）🏁 Top 6 全清
- ✅ **B1 · 補播升級「現場回顧」**（[liveRecap.ts](client/src/lib/liveRecap.ts) + [LiveRecap.tsx](client/src/components/LiveRecap.tsx)）：把 #3 的補播 toast 升級為左下浮動 pill + 可點開時間軸，補看近 30 分鐘黑馬/全站熱度亮點，「打字時錯過」的標「🙈」；有未讀脈動 + 數字、開啟即已讀；無亮點自動隱藏
- ✅ session 記憶體 store（useSyncExternalStore，依 triggeredAt 去重、最多 20 筆）；既有 toast 即時提示保留互補
- ✅ **測試 +9**（store 6 + 元件 3），全套 **453 → 462**；預覽煙霧測試頁面正常、pill 正確隱藏
- 🏁 **Top 6 起手清單全部完成**（F1/E1/D1/A1/C1/B1）

### v4.7.2（2026-06-02）— 主歌單超寬螢幕雙欄（C1）
- ✅ **C1 · 主歌單 2xl 雙欄**（SongList + [VirtualSongList.tsx](client/src/components/SongList/VirtualSongList.tsx) + [useWideColumns.ts](client/src/hooks/useWideColumns.ts)）：演出投影常 1920+，≥1536px 時主歌單排雙欄善用空間
- ✅ 非虛擬清單純 CSS grid `2xl:grid-cols-2`；虛擬清單用 react-virtual `lanes` 多欄（columns=1 完全等同單欄、零風險回退）
- ✅ **測試 +3**，全套 **450 → 453**；預覽實測 1280→單欄、1600(2xl)→雙欄，無回歸

### v4.7.1（2026-06-02）— 「我的推薦」本機追蹤（A1）
- ✅ **A1 · 「我的推薦」追蹤**（[mySuggestions.ts](client/src/lib/mySuggestions.ts) + [MySuggestions.tsx](client/src/components/SongSuggestion/MySuggestions.tsx)）：訪客送出後用 Firestore doc id 本機記錄，回站比對歌單即時狀態顯示「待審核 / 已採納 🎉 / 已加入歌單 / 未採納 / 已下架」；狀態變好時彈一次慶祝 toast（去重）；無紀錄自動隱藏
- ✅ **純本機、無登入、無 server 成本**；送出成功用 addSuggestion 回傳 id 記錄
- ✅ **測試 +12**（store 6 + 元件 6），全套 **438 → 450**；預覽實測卡片渲染 + 狀態徽章正常

### v4.7.0（2026-06-02）— CI Node24 + 漏斗埋點 + 批次審核（Top 6 前三）
- ✅ **F1 · CI 升 Node 24 actions**（[ci.yml](.github/workflows/ci.yml) / [deploy.yml](.github/workflows/deploy.yml)）：設 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24='true'` 提前對齊 6/16 強制、消除 deprecation；deploy build Node 20→22
- ✅ **E1 · 推薦/防干擾漏斗埋點**（[funnelAnalytics.ts](client/src/lib/funnelAnalytics.ts)）：零依賴 localStorage 聚合，`window.songFunnel()` 看本機漏斗（開啟→打字→送出/放棄、重複提示點擊率、專注輸入次數、補播次數），算打字/送出轉換率（+7 測試）
- ✅ **D1 · 待審核建議批次審核**（SongSuggestion + SuggestionCard + [batchSuggestions.ts](client/src/components/SongSuggestion/batchSuggestions.ts)）：管理員批次模式勾選 → 全選待審核 / 批准 / 拒絕 / 刪除（confirm），Promise.allSettled 重用既有 mutation，目標解析純函式（+6 測試）
- ✅ **測試 +13**，全套 **425 → 438**；tsc 0 error；預覽驗證 E1 漏斗實際記錄、D1 非 admin 視圖不變
- ⚠️ 註：D1 admin UI 因預覽無法登入 admin，以 6 單元測試 + 重用既有 mutation 覆蓋，未做 live 點擊

### v4.6.9（2026-06-02）— 寬螢幕三欄 + 整批正式上線 🚀
- ✅ **社群推薦清單寬螢幕三欄**（SongSuggestion）：`xl:grid-cols-3`，斷點 手機 1 欄 / md 2 欄 / xl(≥1280) 3 欄；預覽實測 390→1、1024→2、1440→3
- ✅ **v4.6.2 ~ v4.6.9 整批部署到生產**（PR #17 + #18 合併 main → GitHub Pages）：線上 SW 從舊版 `…5586711` 更新為 `…daed739`/`…abd4d4b`
- ✅ **順帶消除 App Check 403**：新版不含任何 App Check 初始化（取代含 App Check 的 4.2.0 舊版），console 噪音消失
- 🏁 至此從兩個現場回饋（推薦區滾不動 / 打字被干擾）出發的「輸入 / 防干擾 / 捲動」體系 **全部完成並上線**，累積 425 測試全綠

### v4.6.8（2026-06-02）— 搜尋框例外 + 事件補播佇列
- ✅ **搜尋框設防干擾例外（#2）**（composingGuard + SearchBar）：`data-dnd="off"` 覆寫 → 完全不觸發；搜尋框掛上後搜尋時覆蓋層完整顯示，邊搜邊看現場熱度（比 v4.6.4 soft 淡化更進一步）
- ✅ **被抑制事件補播佇列（#3）**（[useMissedHypeReplay.ts](client/src/hooks/useMissedHypeReplay.ts)）：填表單（hard）時錯過的黑馬/全站熱度，hard 結束後用精簡 toast 補播「剛剛你錯過了…」（去重、最多 3 筆、combo 不納入）
- ✅ **測試 +6**（off 例外 1 + 補播 5），全套 **419 → 425**
- ✅ **驗證**：#2 預覽實測搜尋聚焦時覆蓋層不淡化完整顯示；#3 以 5 單元測試覆蓋（hard 記錄→結束補播 / 非 hard 不算 / 去重 / 多事件取最新 / hard→soft 也補播）

### v4.6.7（2026-06-02）— IME 組字保護 + 送出成功儀式
- ✅ **IME 組字保護（#10）**（SuggestionForm）：form `onKeyDown` 攔截「組字中按 Enter」→ `preventDefault`，避免注音/拼音/日文選字時誤觸送出；一般 Enter 不受影響
- ✅ **送出成功儀式（#11）**（SuggestionForm）：送出成功改顯示「Delivered · 已投遞」framer-motion 蓋章覆蓋層 + 小彩帶（動態 import canvas-confetti），停留 1.7s 自動關閉，取代單一 toast，呼應 editorial / VoterPassport 儀式語言
- ✅ **驗證**：IME 組字 Enter 預覽實測被攔（一般 Enter 不攔）；成功儀式純展示層，以 419 測試無回歸 + 程式碼審查確保（不在線上 DB 製造測試資料）

### v4.6.6（2026-06-02）— 防干擾整合測試（Top 7 全清）
- ✅ **防干擾端到端整合測試**（[composingGuard.integration.test.tsx](client/src/lib/composingGuard.integration.test.tsx)）：忠實複刻 Home 覆蓋層 gating，5 例驗證「真實聚焦 → 等級 → 渲染/淡化/消失」契約（初始正常 / 搜尋→soft 淡化 / 表單→hard 消失 / 失焦恢復 / soft→hard 切換）
- ✅ **依使用者決定用輕量整合測試**（既有 vitest + @testing-library），不裝 Playwright、不動 CI
- ✅ 全套 **414 → 419**
- 🏁 **防干擾優先表 Top 7 全部完成**（#16/#7/#8/#4/#5/#6/#13/#17 — 註：原 #9 行動鍵盤=本表 #6、#12 ResponsiveScrollList=本表 #5）

### v4.6.5（2026-06-02）— 行動鍵盤遮擋 + ScrollArea 稽核
- ✅ **行動裝置鍵盤遮擋處理**（[useScrollFocusedIntoView.ts](client/src/hooks/useScrollFocusedIntoView.ts)）：手機鍵盤彈出時（聚焦延遲 300ms + visualViewport resize）把聚焦欄位 scrollIntoView 到可視區中央；只在觸控/小螢幕介入
- ✅ **送出鈕 sticky 貼底**（SuggestionForm）：長內容/鍵盤彈出時仍隨手可按
- ✅ **全站 Radix ScrollArea 稽核（#13）**：8 處中唯 VoteHistoryModal 用 `max-h` 有同款裁切陷阱 → 改用 `ResponsiveScrollList cap="always"`；其餘 7 處固定高度安全
- ✅ **測試 +7**（鍵盤 hook 6 + ResponsiveScrollList cap 1），全套 **407 → 414**
- ✅ **預覽實測**：390px sticky 送出鈕 + 聚焦捲動正常；VoteHistoryModal 灌 30 筆可捲到底

### v4.6.4（2026-06-02）— 防干擾分級 + 共用捲動容器
- ✅ **防干擾分級 soft/hard**（[composingGuard.ts](client/src/lib/composingGuard.ts)）：搜尋框 → `soft`（覆蓋層淡化 opacity-30、保留現場感、ComboOverlay 不放彩帶）；表單 → `hard`（整組暫停）；hard 優先 soft；支援 `data-dnd` 屬性覆寫。API：`beginComposing(level)` / `useComposingLevel()`
- ✅ **ResponsiveScrollList 共用元件**（[ResponsiveScrollList.tsx](client/src/components/ui/ResponsiveScrollList.tsx)）：手機自然展開 / 桌機限高原生捲動 + 細捲軸；SongSuggestion 改用（行為一致）
- ✅ **測試 +10**（分級 5 + ResponsiveScrollList 5），全套 **397 → 407**
- ✅ **預覽實測**：搜尋聚焦→覆蓋層淡化仍在、表單→消失；重構後推薦清單捲動正常
- 💡 **防干擾優先表 #4 / #5 已劃掉**，下一步 #6 行動鍵盤遮擋 或 #13 ScrollArea 稽核

### v4.6.3（2026-06-02）— 防干擾體系 Top 3 落地
- ✅ **composingGuard 單元測試**（[composingGuard.test.ts](client/src/lib/composingGuard.test.ts)）：10 例涵蓋可重入計數 / release 冪等 / 焦點監聽各類型 / 切換不閃現 / unmount 解除 → 全套測試 **387 → 397** 個
- ✅ **表單草稿自動暫存**（[draftStorage.ts](client/src/lib/draftStorage.ts) + SuggestionForm）：title/artist/suggestedBy/notes debounce 400ms 寫 localStorage，重開自動回填 + 「已帶回上次未送出的草稿」橫幅 + 一鍵清除，送出成功才清
- ✅ **即時重複偵測**（SuggestionForm）：標題打字 debounce 400ms 比對歌單（≥2 字），inline amber 提示「這首好像已在歌單：「歌名」（N 票）→ 前往點播」，抽 `navigateToSong` 共用
- ✅ **預覽實測**：草稿跨重整回填 / 清除、即時提示顯示與導航皆正常；tsc 0 error
- 💡 **防干擾體系優先表 Top 3 已劃掉**，下一步見「🔕 專注輸入 / 防干擾體系延伸建議」#4 起

### v4.6.2（2026-06-02）— 社群推薦 RWD + 全站防干擾輸入
- ✅ **社群歌曲推薦清單 RWD 捲動修正**（[SongSuggestion.tsx](client/src/components/SongSuggestion/SongSuggestion.tsx)）：丟棄 Radix `ScrollArea`，手機自然展開、桌機原生 `overflow-y-auto` 限高 520px + 自訂細捲軸
- ✅ **composing guard 基礎設施**（[composingGuard.ts](client/src/lib/composingGuard.ts)）：`useSyncExternalStore` + 可重入計數的全域「專注輸入」旗標
- ✅ **推薦表單打字時暫停 4 個全螢幕覆蓋層**（Combo / DarkHorse / GlobalHype / Interaction）
- ✅ **`useComposingWhileTyping` 全域焦點監聽**：全站所有文字輸入框聚焦即自動防干擾、失焦恢復，零散接線
- ✅ **預覽實測通過**：RWD 兩種斷點捲動正常；防干擾聚焦即抑制、失焦 120ms 後恢復
- 💡 **延伸建議已寫進 ROADMAP**：見「🔕 專注輸入 / 防干擾體系延伸建議」段

### v4.6.1（2026-05-18）— CSS @import 順序救援 hotfix
- ✅ **修復 `client/src/index.css`**：6 個 editorial CSS 的 `@import` 從 `@tailwind` 後面移到前面
- ✅ **CSS bundle 從 127 kB → 221 kB**（gzip 19 → 34 kB），editorial 樣式整批回到 dist
- ✅ **Vite build warning `@import must precede all other statements` 消失**
- ✅ **線上實測通過**：Service Worker 自動從 `ac73b69-u8le` 升級到 `f253a16-438o`，雜誌外殼正常顯示
- ✅ **註解警告未來別寫反**：在 index.css 加長註解說明 CSS spec 限制
- ⚠️ **未做但已寫進 ROADMAP**：build warning 升 error、stylelint 防護、視覺迴歸測試（見「📛 事故覆盤」段）

### v4.6.0（2026-05-16）— 三件套
- ✅ **UpNextBar** — 底部 sticky 96px 隊列條，黑膠 mini 封面（6s spin）+ LIVE 脈動 + Playfair italic 24px 歌名 + 進度條，三狀態（演出中 / 觀眾剛投票 / 待開場），手機 < 780px 只留 NOW + 1 張卡
- ✅ **VoterPassportModal** — 護照式催歌履歷，封面 portrait + VERIFIED VOTER 圓章 + 3 格統計，6 個動態徽章（依本機 useVoteHistory 算 maxDayCount / unique / distinct days），SVG textPath 弧形字 + feTurbulence 油墨破損濾鏡，hover 卡片翻面看解鎖條件
- ✅ **OpeningCurtain** — 6 秒鏡像反向 thank-you 開場儀式，11 個 keyframes 串完整時間軸，sessionStorage 每瀏覽器 session 自動播一次，admin「🎭 開場」手動觸發，`prefers-reduced-motion` / `?intro=skip` / `?mode=stage` 全關掉

### v4.5.0（2026-05-16）— END OF SIDE A
- ✅ **ThankYouModal** — 「結束今晚」管理員按鈕 + 全螢幕雜誌風儀式 modal
- ✅ Verifier fix #1：黑膠盤與藍色 label 拆兩個 keyframes（避免 transform 吃掉置中）
- ✅ Verifier fix #2：旋轉角度改 720°（兩整圈，視覺更有「結束」感）

### v4.4.1（2026-05-15）— Editorial 收尾
- ✅ `SongSuggestion` / `SuggestionForm` / `SuggestionCard` / `RankingBoard` 四檔全面 editorial 化
- ✅ Suggestion 加章節編號（№ 01 / № 02）+ pin / 評論 / 進度條
- ✅ RankingBoard 雜誌風 chapter header + 金/銀/銅 italic 排名

### v4.4.0（2026-05-15）— 節目單分享卡
- ✅ **ShareCardModal** — IG 1080×1350 直式 + FB OG 1200×630 雙尺寸
- ✅ 2× 高解析度 PNG 下載（`html-to-image` 動態 import，不污染初始 bundle）
- ✅ ClipboardItem API 複製到剪貼簿（可直接貼 LINE / IG）
- ✅ 卡片內容：雜誌頂條 / Hero「今晚這 N 首歌，謝謝你」/ 200px 旋轉黑膠 / FINAL SET 紅圓印章 8° 傾斜 / Top 3 + 催歌王 panel

### v4.3.0（2026-05-15）— Editorial 雜誌風大改版
- ✅ 全站視覺從 amber/orange 漸層 → editorial 雜誌風（白底 + 暖米色 #faf7f0 + 雜誌藍 #2b4dff + Playfair Display + JetBrains Mono）
- ✅ Hero / Topbar / Footer — 卡帶（90 MIN / Type II / DOLBY NR + 雙轉軸動畫）
- ✅ SongCard — 統一藍色強調 + 黑膠 mini 封面 + 票數欄 + 藍橘漸層進度條
- ✅ 5 個 Overlay 完全重寫（Combo / DarkHorse / GlobalHype / VoteHistory / VoterLeaderboard）
- ✅ StatsDashboard 雜誌特輯封面風 + 阿凱主理人 pull-quote
- ✅ **SongDetailModal**（315 行）+ ChordSvg（109 行）+ data.ts（186 行）
  - 6 個常用和弦 SVG 指型圖（C / G / Am / Em / F / Dm）
  - 歌詞區塊（INTRO / VERSE / CHORUS / OUTRO）
  - 相似歌推薦（findSimilarSongs）
  - 點封面/標題開啟，「我要點」整合 onVote

### v4.2.0+（2026-05 後續累積，2026-05-09 ~ 2026-05-15）
- ✅ B1 統計儀表板（6 圖表 + KPI + CSV）
- ✅ 後台管理員 UI RWD
- ✅ PWA 自動更新流程（build 時戳版本、使用者收 banner、一鍵 reload）
- ✅ shadcn CSS 完整變數（修 modal 透明 bug）
- ✅ pinyin-pro lazy load
- ✅ firebase modular 拆分（auth dynamic import / memoryLocalCache）
- ✅ Lighthouse PWA 100 / a11y 100（maskable icons / screenshots / `<main>` landmark）

### v4.2.0（2026-05-08 主版本）
- ✅ A1 標籤篩選 UI / A2 歌曲難度標記 / A3 點播歷史 / A4 演出模式 / A5 CI/CD
- ✅ B4 模糊搜尋強化（拼音 + 首字母 + 注音）
- ✅ B5 鍵盤快捷鍵（CommandPalette + `?` 說明）
- ✅ B6 排序選項（4 種 + URL query 同步）
- ✅ 特效大爆發：飆升 / 連擊 / 黑馬 / 集體投票 / 領袖板
- ✅ OG 預覽圖生成 + Husky pre-commit + Lighthouse CI
- ✅ firestore.ts 拆檔（844 行 → 9 sub-modules）

### v4.1.x（2026-04）
- ✅ ErrorBoundary 測試修復 → 216/216
- ✅ Bundle 1.2MB → 287KB（壓縮 76%）

### v4.0.x 以前
- ✅ Error Boundary、PWA 離線、Firestore IndexedDB
- ✅ MobileTabView、即時通知系統
- ✅ React.memo + 虛擬滾動、SongList 1033 行 → 8 個模組
- ✅ Vitest 框架建立、Firestore 安全規則部署

---

## 🔥 Phase A：短期高優先

> ✅ **已 100% 完成（v4.2.0）**。A1～A5 全部上線。

| 項目 | 狀態 |
|------|:----:|
| A1 標籤篩選 UI 串接 | ✅ |
| A2 歌曲難度標記 ⭐ | ✅ |
| A3 點播歷史記錄 | ✅ |
| A4 演出模式 `?mode=stage` | ✅ |
| A5 CI/CD GitHub Actions | ✅ |

---

## 📱 Phase B：中期功能擴展

| 項目 | 狀態 | 備註 |
|------|:----:|------|
| B1 統計儀表板 | ✅ | 6 圖表 + KPI + CSV，懶加載 ~13KB |
| **B2 多場活動支援（Multi-Event）** | ⏸️ **唯一待做** | 估時 10-12h |
| B3 深色模式完善 | ✅ | toast / tooltip / skeleton 已完整 |
| B4 模糊搜尋強化 | ✅ | 拼音 + 首字母 + 注音 |
| B5 鍵盤快捷鍵 | ✅ | `Cmd+K` palette + `?` 說明 |
| B6 歌曲排序選項 | ✅ | 4 種排序 + URL query 同步 |

### B2 多場活動 — 為什麼還沒做，做的時候要注意什麼

**為什麼留在最後**：B2 改動 Firestore schema（`votes` / `songs` / `suggestions` 都要加 `eventId`），加複合索引，URL routing 要重做，**且 v4.6.0 後 UpNextBar / ThankYouModal / VoterPassport 都已假設「單一活動」邏輯**，B2 上線後三件套都要重做活動切換邏輯。

**最小可行版本（10-12 小時）**：
```
events/{eventId}
  ├─ title, code (6 碼), startAt, endAt
  ├─ status: 'live' | 'archived'
  ├─ ownerUid
  └─ theme?  ← editorial 配色可以每場活動換（藍 / 紅 / 綠）

訪客流：URL = /?event=ABCDEF → useEvent hook 載入
管理員流：新增「活動」Tab → 列表 + 建立 + 結束
```

**核心難點（v4.6.0 後新增）**：
1. **舊資料 migration** — 既有 `votes` 全部歸到 `event=default`，否則統計儀表板會炸
2. **Firestore 複合索引** — `votes` 需要 `(eventId, songId, createdAt DESC)`，部署前用 `firebase.json` 預先註冊
3. **演出模式 + 活動代碼** — `?mode=stage&event=ABCDEF` 雙 query
4. **歸檔活動唯讀畫面** — `status==='archived'` disable 所有投票按鈕
5. **🆕 UpNextBar 隊列要 scope 到 event** — 跨活動隊列不能互相污染
6. **🆕 VoterPassport 累積要分活動 vs. 全平台** — 護照顯示「本場 N 票 / 生涯 M 票」雙計數
7. **🆕 ThankYouModal 結束邏輯改為「結束此活動」** — 不是結束整個系統
8. **🆕 ShareCardModal 要帶 event meta** — 「ISSUE №12 阿凱彈唱之夜」可換成活動名

**驗收條件**：可同時跑兩場活動、票數不互相污染、結束後可查歷史、管理員看得到跨活動總統計、UpNextBar 顯示當前活動隊列、VoterPassport 雙計數正確。

---

## 🌟 Phase C：長期進階

### [C1](docs/design/C1-lrc-sync.md). 歌詞同步播放 (LRC) 🟠 P2（升級為 P2，因為 SongDetailModal 已有 lyrics 結構）
**預估**：12–15 小時 → **可改為 10 小時**（資料結構已有，詳見 [C1 設計文件](docs/design/C1-lrc-sync.md)）

- ✅ SongDetailModal 已有 lyrics 結構（INTRO / VERSE / CHORUS / OUTRO）
- 接下來只需加時間軸：`{ sec: 'CHORUS', rows: [{ chord, line, startMs?: 12500 }] }`
- LRC 格式 import / export
- 管理員後台：歌詞編輯器（textarea + 預覽 + 自動產生時間戳）
- 演出模式整合：大螢幕投影歌詞，當前句高亮放大 + 拍子線
- YouTube Embed 對齊（取 player currentTime）
- **進階**：拍子線（節拍器條）

### C2. 社群登入整合 🟢 P3
**預估**：6–8 小時 | Google → LINE → Apple
- 訪客可選擇匿名 or 登入
- 登入後雲端同步：點播歷史、收藏歌單、勳章、貢獻積分
- 🆕 **VoterPassport 雲端化** — 目前是 localStorage，登入後應該雲端同步護照
- 留言匿名/實名切換
- ⚠️ 隱私聲明 + 未成年保護條款要先寫好

### [C3](docs/design/C3-passport-badges-expansion.md). 積分勳章系統 🟠 P2（升級為 P2，因為 VoterPassport 已有 6 個徽章基底）
**預估**：12–15 小時 → **可改為 8 小時**（VoterPassport 已有架構，詳見 [C3 設計文件](docs/design/C3-passport-badges-expansion.md)）

- ✅ VoterPassportModal 已有徽章解鎖框架（基於 useVoteHistory）
- 接下來要做：
  - 擴張到 12-15 個徽章
  - 跨裝置同步（依賴 C2）
  - 排行榜整合（領袖板顯示徽章數）
  - 解鎖瞬間的全螢幕慶祝動畫（類似黑馬時刻）

| 勳章 | 條件 | 現況 |
|------|------|:----:|
| 🎤 首次點播 | 第一次投票 | ✅ 已在 VoterPassport |
| 🔥 熱情歌迷 | 單日 10 票 | ✅ |
| 👑 點歌王 | 累積 100 票 | ✅ |
| ⭐ 評論達人 | 給 50 次評分 | ❌ 未做（需要評分系統） |
| 💎 打賞大戶 | 累積 100 次打賞 | ❌ 需要 C7 金流 |
| 🌙 夜貓子 | 22:00 後投 20 票 | ⏳ 可加入 |
| 🎬 黑馬獵人 | 投中 5 次黑馬歌曲 | ⏳ 可加入 |
| 🤝 領袖 | 在 VoterLeaderboard 上榜 10 次 | ⏳ 可加入 |
| 🎵 場場到 | 連續 5 場到 | ⏳ 可加入（依賴 B2） |
| 🎭 開場見證 | 看完 OpeningCurtain 5 次 | ⏳ 新點子 |
| 📚 雜學家 | 投過 10 種不同曲風 | ⏳ 依賴 tag |

### C4. AI 歌曲推薦 🟢 P3
**預估**：15–20 小時
- 收集 `(userId, songId, rating, timestamp)` 至 Firestore
- 前端跑 cosine similarity（不需後端）
- 進階版：呼叫 Gemini 1.5 Flash Free Tier
  - input: 訪客已投票 5 首歌 + 當下氣氛文字
  - output: 3 首推薦 + 一句推薦理由
- ⚠️ **成本控管**：套用 `gemini-free-tier-first` skill — Turnstile + maxInstances + 預算告警
- 🆕 **推薦理由用 editorial 風格呈現** —「主理人觀點：你連投三首女歌手抒情，下一首 推薦 田馥甄〈小幸運〉，副歌轉調剛好接得上」

### C5. 多語系 (i18n) 🟢 P3
**預估**：6–8 小時 | `react-i18next`
- zh-TW（預設） / zh-CN / en / ja
- 抽出所有 hardcode 字串至 `locales/*.json`
- 語言切換可記在 localStorage
- 🆕 **挑戰**：editorial 風格的 italic / 中英混排在不同語言下要重新調整 typography

### C6. 即時聊天/留言區 🟢 P3
**預估**：10 小時
- Firestore `events/{eventId}/chat/{messageId}`
- 訪客匿名暱稱（不需登入但有 nonce 防灌）
- 管理員可禁言、刪訊息、固定置頂
- 髒話過濾（中文 dirty-words list）
- ⚠️ 濫用風險高：rate limit + 舉報機制 + 圖片連結禁止
- 🆕 **editorial 化**：留言可以用「來自 N 排 M 號的訊息」風格呈現，像雜誌讀者來信

### C7. 表演者打賞金流 🟢 P3
**預估**：20+ 小時 — **建議延後到專案有商業需求才做**

---

## 🎯 v4.7 → v5.0 立即可做的詳細建議

### 🎁 P0：即刻有感（每個 < 4 小時）

#### 1. **SongDetailModal × 真實資料源串接**（3-4 小時）
**現況**：`SongDetail/data.ts` 是 hardcode 的兩首歌（小幸運、稻香）的和弦/歌詞，其他歌走 fallback。
**問題**：演出當下管理員想看歌曲詳情，看到的是「無歌詞資料」。
**做法**：
- Firestore Song schema 加 `chord: string?`、`lyrics: LyricBlock[]?`、`bpm: number?`、`key: string?`、`youtubeId: string?`
- 管理員後台 EditDialog 加「樂譜編輯」tab（textarea + 即時預覽）
- 既有 `data.ts` 改為 fallback hint，提示管理員去後台補
- **進階**：批次 import 從 LINE / Notion 貼上的歌詞自動切 INTRO / VERSE / CHORUS

**驗收**：管理員可在後台加 / 改任何一首歌的和弦歌詞，SongDetailModal 即時讀到。

#### 2. **UpNextBar 串到 Firestore 真實隊列**（2-3 小時）
**現況**：UpNextBar 用 `useNowPlaying` hook，目前只看單一「正在播」狀態。
**問題**：「Up Next 隊列」是 mock 還是真實的？需要確認。
**做法**：
- 確認 `useNowPlaying` 是否從 Firestore 拉真實的 `nowPlaying` doc + `upNext` array
- 加管理員 UI：拖拉排序隊列、跳過、加進下一首
- 演出模式 + UpNextBar 雙顯示
- **進階**：訪客可看到「你點的歌排第 N」，到場時推 LINE 通知（搭配 `line-messaging-firebase` skill）

#### 3. **VoterPassport 解鎖瞬間動畫**（2 小時）
**現況**：徽章解鎖瞬間沒有任何視覺回饋，使用者要打開 modal 才知道解鎖了。
**做法**：
- `useVoteHistory` 加 callback：每次 vote 後比對 badges 解鎖狀態
- 新解鎖 → 觸發類似 DarkHorseOverlay 的全螢幕慶祝（藍底 + 圓章從 0 旋轉跳到 1.2 倍 + 「BADGE UNLOCKED」跑馬燈）
- 動畫結束自動進入 VoterPassport 並 scroll 到該徽章
- 加音效（可選靜音）

**驗收**：投到第 10 票時自動跳出「🔥 熱情歌迷 解鎖！」慶祝。

#### 4. **ThankYouModal 加「分享今晚」CTA**（1.5 小時）
**現況**：ThankYouModal 是結束儀式，但沒引導到 ShareCardModal。
**做法**：
- ThankYou 結尾「END OF SIDE A」下方加大字按鈕「節目單分享卡 →」
- 點擊直接開 ShareCardModal，預填當晚數據
- 加「下載今晚精華」按鈕 → 觸發 CSV 匯出 + screenshot
- **進階**：ThankYou 結束後 3 秒自動進入 ShareCardModal 預覽

#### 5. **OpeningCurtain 客製化文字 / 圖片**（2 小時）
**現況**：開場儀式內容是 hardcode（「阿凱彈唱之夜 / ISSUE №12 / MAY 2026」等）。
**做法**：
- Firestore `settings/openingCurtain` doc：title / subtitle / issue / date / disc-color / 動畫長度
- 管理員後台「儀式設定」tab 編輯
- 預覽功能（admin 可看到改了即時效果）
- **進階**：依賴 B2 後每場活動可有不同開場

#### 6. **「結束今晚」前先確認 modal**（30 分）
**現況**：管理員按「結束今晚」直接跳 ThankYouModal，不可逆。
**做法**：
- 加 AlertDialog「結束後 UpNextBar 隊列會清空，確定要結束今晚的活動嗎？」
- Confirm → 才跳 ThankYou
- Cancel → 回原狀

**驗收**：誤觸不會炸場。

#### 7. **Performance：editorial CSS 拆檔**（2 小時）
**現況**：`client/src/index.css` 已經 **6300+ 行**，編輯時 VSCode 都會卡。
**做法**：
- 拆成模組：
  - `index.css`（主 entry + tailwind imports）
  - `editorial-base.css`（卡帶 / hero / topbar / footer）
  - `editorial-cards.css`（SongCard / SuggestionCard / RankingBoard）
  - `editorial-overlays.css`（Combo / DarkHorse / GlobalHype）
  - `editorial-modals.css`（ThankYou / Passport / SongDetail / ShareCard / OpeningCurtain）
  - `editorial-ritual.css`（UpNextBar / OpeningCurtain animations）
- 用 `@import` 串接，build 時 PostCSS 會 inline
- 加 CSS source map，方便 devtools 定位
- **驗收**：行數最大檔 < 1500 行，編輯速度恢復正常

---

### 🎨 P1：UX 拋光（每個 2-6 小時）

#### 8. **「投票脈衝」全站整合**（2 小時）
- 每筆投票進來時，對應 SongCard 邊框閃藍光 0.5s
- UpNextBar「你點的還排第 N」即時更新（spring 動畫）
- VoterPassport「累積票數」+1 立刻翻面
- 排行榜的條形圖寬度用 spring 過渡

#### 9. **收藏歌單 × Editorial 化**（3 小時）
- 心型 icon → 改成書籤 icon（雜誌風）
- 漢堡選單「我的收藏」→ 改「我的書籤頁」
- 收藏頁面用 editorial 風格（chapter header 「№ 04 收藏」+ 卡片列表）
- 演出當下管理員可一鍵把所有收藏批次投票

#### 10. **「催歌履歷頁」公開分享**（4 小時）
- VoterPassport 加「公開分享」按鈕
- 生成短連結 `/passport/:voterId`
- 公開頁不顯示 voterId 真實值，只顯示徽章 + 統計
- 訪客可以炫耀「我這場已經投了 30 票」
- ⚠️ **隱私**：本機 voterId 公開要明確同意

#### 11. **管理員批次工具**（6 小時）
- **CSV 匯入歌曲**：拖檔 → 預覽 → 確認匯入
- **批次標籤套用**：勾選多首 → 套相同 tag
- **批次刪除/封存**
- **歌單匯出** JSON / CSV 備份
- **批次補和弦歌詞**：拖入多首歌的 LRC 一鍵 import

#### 12. **演出模式增強**（3 小時）
- 加入「節目單預覽」（已經有 UpNextBar，可重用元件）
- QR Code 大圖左下顯示，讓現場觀眾掃描加入投票
- 跑馬燈可自訂訊息（活動主題、贊助商、Wi-Fi 密碼）
- 倒數計時器（活動還有幾分鐘）
- **編輯模式**：管理員按 E 開「儀式版面編輯」浮動 panel

#### 13. **建議歌曲審核工作流**（2-3 小時）
**從舊版 ROADMAP 留下**：
- 管理員看得到 pending suggestions 列表
- 可一鍵「採納 → 加入歌單」or「拒絕 → 標記原因」
- 採納時 auto-prefill EditDialog（含和弦歌詞欄位空白等待補）
- 拒絕時可發回給建議者一句話（透過 LINE 通知）

---

### 🛡️ P1：守門員（每個 1-3 小時）

#### 14. **Sentry 錯誤追蹤**（2 小時）
- `@sentry/react` + `@sentry/vite-plugin` 自動上傳 source map
- 整合 ErrorBoundary `componentDidCatch`
- 一個月免費 5K events 對小流量站夠用
- 用 `gcp-api-key-secure-create` skill 設 Sentry DSN

#### 15. **Firestore Rules 單元測試**（3 小時）
```bash
npm i -D @firebase/rules-unit-testing
```
- 寫 `firestore.rules.test.ts`：
  - 訪客不能改別人的 vote
  - 投票時間戳必須 `request.time`
  - difficulty 必須 1/2/3
  - 管理員 UID 才能 update songs
  - **🆕 chord / lyrics 欄位寫入限管理員**
  - **🆕 nowPlaying / upNext 寫入限管理員**
- 整合進 CI（rules 修改前自動跑）

#### 16. **Rate limit 強化（防灌票）**（2 小時）
- 用 `useVoteHistory` 已有的本地記錄
- 同首歌 60 秒內投 ≥5 次 → 前端擋
- Firestore Rules：每分鐘 ≤10 票（搭配 `rateLimits/{uid}` collection）
- **🆕 VoterPassport 也會洩漏 voterId 規律**，要確認本機 voterId 不易被逆推

#### 17. **CSP（Content-Security-Policy）**（2 小時）
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' apis.google.com www.googletagmanager.com 'sha256-XXX';
  connect-src 'self' *.firebaseio.com *.googleapis.com;
  img-src 'self' data: https:;
  style-src 'self' 'unsafe-inline';
  font-src 'self' data: https://fonts.gstatic.com;
">
```
**注意**：editorial 用了 Google Fonts (Playfair Display / JetBrains Mono)，CSP 要放 `fonts.gstatic.com`。

#### 18. **API Key restrictions 檢查**（30 分）
> ⚠️ **這個從 v4.2.0 起就在清單上但還沒做！** 是最高優先項。

1. 打開 GCP Console → APIs & Services → Credentials
2. 找出 `guitar-ff931` 專案的 Browser API Key
3. 確認 HTTP referrers 限制：
   - `https://cagoooo.github.io/song/*`
   - `http://localhost:5173/*`
4. 確認 API restrictions 只勾：
   - Cloud Firestore API
   - Firebase Auth API
   - Firebase Installations API
5. 📌 用 `firebase-stack-automation` skill 可一鍵自動化

---

### 🧪 P2：測試擴張（每個 3-8 小時）

#### 19. **新增 5 件套元件的單元測試**（6 小時）
**問題**：v4.3.0 → v4.6.0 五個 PR 加了 9 個元件，**沒有新增任何單元測試**，216 個測試還停在 v4.2.0。
**做法**：
- ShareCardModal — 卡片內容 render 對應到 props（snapshot）
- ThankYouModal — open/close + 720° 動畫 ARIA
- UpNextBar — 三狀態切換（演出中 / 觀眾剛投票 / 待開場）
- VoterPassportModal — 6 個徽章解鎖邏輯（餵不同 history 看徽章對不對）
- OpeningCurtain — sessionStorage 邏輯 + ESC 可關
- SongDetailModal — 切歌時投票狀態 reset
- **目標**：216 → 250+ 個測試

#### 20. **E2E with Playwright**（6 小時）
```bash
npm i -D @playwright/test
npx playwright install chromium
```
4 個關鍵 flow 起手：
1. 訪客投票流程（搜尋 → 投票 → 看排行榜）
2. 管理員登入後新增歌曲 + 設標籤 + 設難度
3. 演出模式進入 + 黑馬慶祝觸發（mock 多筆 vote）
4. **🆕 完整儀式流**：OpeningCurtain → 投 10 票 → VoterPassport 解鎖 → ThankYou → ShareCard

#### 21. **視覺迴歸 Chromatic / Percy**（4 小時）
- 註冊 Chromatic 免費版（每月 5,000 snapshots）
- 配合 Storybook 抓 SongCard / RankingBoard / Modals 各個狀態快照
- **特別重要**：editorial 改版這種 mass refactor 後沒 visual regression，PR review 完全靠肉眼
- **🆕 加 5 件套**：每個 modal 的 hero / loading / empty 三狀態都拍

#### 22. **無障礙 with vitest-axe**（2 小時）
- 對每個主要 component 跑 a11y check
- 重點：對比度（editorial 雜誌藍 #2b4dff 在白底對比夠不夠？）、aria-label、focus order
- **特別關注**：OpeningCurtain 有 6 秒儀式，要有 skip 按鈕（已實作 ✅）+ `aria-live` 提示

---

## 🎬 Editorial 方向延伸建議

> 既然 v4.6.0 走完 editorial 大改版，把握雜誌風品牌往這個方向繼續深化是高 CP 值的方向。
> **📐 D1-D6 各有獨立設計文件**：[docs/design/](docs/design/README.md)

### 🎨 [D1](docs/design/D1-issue-system.md)：雜誌期刊期數系統（4-6 小時）
**現況**：「ISSUE №12」是 hardcode，每場活動寫死。
**做法**：
- Firestore `settings/magazine` doc：currentIssue + issueHistory
- 每場活動結束自動 +1
- 歷史期數頁面 `/archive/:issue` — 顯示過往活動的 ShareCard / Top 10 / 統計
- 雜誌期刊書架 view — 像 Apple Podcasts 的書封陣列

### 🖋️ [D2](docs/design/D2-editor-column.md)：「主理人專欄」內容系統（6-8 小時）
**靈感**：StatsDashboard 已有「阿凱主理人 pull-quote」，可往內容平台延伸。
**做法**：
- Firestore `posts/{postId}`：title / content (Markdown) / coverImage / publishedAt
- 「主理人手記」頁面：阿凱可在後台寫短文 / 演出心得
- 訪客可訂閱 RSS / 收藏文章
- **進階**：每場活動結束自動產生「主理人觀察」AI 摘要（用 Gemini Free Tier，搭配 `gemini-free-tier-first` skill）

### 📻 [D3](docs/design/D3-pdf-print.md)：節目單 PDF 列印版（3-4 小時）
**現況**：ShareCardModal 只有 PNG 下載，沒有 PDF 列印版。
**做法**：
- 用 `window.print()` + `@media print` CSS（搭配 skill `pdf-export-print-best-practice`）
- A4 直式版面：封面（雜誌頂條）+ Top 20 歌單 + 統計 + 主理人寄語
- 演出當下管理員可印一份給 VIP 觀眾
- **不用 html2pdf / jsPDF**，業界都用 window.print()

### 🎤 [D4](docs/design/D4-reader-letters.md)：「演出後感」訪客留言（5-6 小時）
**靈感**：editorial 風格適合配「讀者來信」欄。
**做法**：
- ThankYouModal 結束後跳出「給今晚的一句話」textarea
- 限 50 字以內，匿名 / 暱稱二選一
- 演出隔天阿凱可在後台精選 5 句，發佈到「讀者回響」頁
- 跟 D2 主理人專欄整合：每篇文章下有「讀者回響」section

### 🎵 [D5](docs/design/D5-song-mood-tags.md)：歌曲版本 / 風格標記擴張（3-4 小時）
**現況**：歌曲 tag 是簡單字串陣列。
**做法**：
- 擴張 schema：
  - `version`: '原曲' / 'acoustic' / 'remix' / '阿凱改編'
  - `mood`: '熱血' / '抒情' / '療癒' / '懷舊'
  - `era`: '90s' / '00s' / '10s' / '20s'
- StatsDashboard 加雷達圖（mood 分佈）
- TagFilterBar 改三段式過濾

### 🎞️ [D6](docs/design/D6-highlight-reel.md)：「精選時刻」自動剪輯（8-10 小時）
**進階點子**：
- 自動偵測「黑馬時刻」、「COMBO 觸發」、「集體投票」等高潮事件
- 整理成「今晚精選時刻」timeline
- 每個時刻 + 對應的歌名 + 觸發秒數
- 演出後管理員可剪成 highlight reel（含 ShareCard 風格的動畫截圖）

---

## ⚡ Bundle 三次優化

> v4.6.0 後 5 個新 modal + html-to-image 進來，重做 bundle 分析。

### 預計 chunk 分析（v4.6.0，建議重跑 `npm run build` 確認）

| Chunk | 預估 Raw | 預估 Gzip | 優化建議 |
|-------|----------|-----------|----------|
| `firebase` | ~400 KB | ~110 KB | ✅ 已 auth dynamic import |
| `index` (main app + editorial CSS) | ~350 KB | ~100 KB | ⭐ **CSS 拆檔** + framer-motion tree-shake |
| `charts` (recharts) | 411 KB | 111 KB | ✅ 已 lazy（StatsDashboard 內） |
| `html-to-image` | ~50 KB | ~15 KB | ✅ 已 dynamic import（ShareCardModal 觸發時） |
| `qrcode.react` | ~30 KB | ~10 KB | 可改 lazy（QRCodeShareModal 內） |
| `pinyin-pro` | 216 KB | 139 KB | ✅ 已 lazy |
| `react-vendor` | 141 KB | 45 KB | 已最佳 |

### 具體下一步動作

1. **🆕 CSS 拆檔**（2h，可省 ~20KB 主 chunk）
   - editorial CSS 6300 行拆 5 個檔
   - PostCSS `purgecss` 確認沒漏未使用樣式
2. **🆕 SongDetail / Passport / OpeningCurtain 三個 modal lazy**（1.5h，可省 ~30KB 初始）
   - 只有開啟才動態 import
   - `const SongDetailModal = lazy(() => import('./SongDetail/SongDetailModal'))`
3. **framer-motion → motion**（3h，可省 20KB gzip）— 視 API 相容性
4. **ui-radix 精簡**（2h，可省 10KB gzip）— 確認沒用到的 primitive 全砍

### 額外建議

- **route-based code splitting**：StagePage / EditDialog 已 lazy，加上 5 件套 modal 也 lazy
- **SW 不快取 OG / Screenshot 大圖**：確認 `sw.js` cacheList 不含 og-preview.png（首載肥大主因）
- **Brotli 壓縮**：Firebase Hosting 預設 gzip，若改 Cloudflare CDN 可 brotli 再省 15%

---

## 🛡️ 安全性下一階段

> ⚠️ **重要決定記錄**：App Check 已於 2026-05-08 關閉並徹底清除（`bb11037`）。理由：本站定位是學生展演活動，沒有商業價值，不需要防灌票成本。**未來若有公開大型活動或商業用途再啟用**。

| 項目 | 現況 | 優先級 | 估時 |
|------|------|:------:|------|
| **API Key restrictions** | ⚠️ **三版 ROADMAP 都掛著還沒做！** | 🔴 P0 | 0.5h |
| CSP header（含 fonts.gstatic.com） | 未設定 | 🟠 P1 | 2h |
| HSTS | 未設定 | 🟡 P2 | 0.5h |
| Sentry 整合 | 未設定 | 🟠 P1 | 2h |
| 輸入過濾（DOMPurify） | 基本 | 🟡 P2 | 1h |
| Firestore Rules 測試 | 無 | 🟠 P1 | 3h |
| 速率限制（前端） | 部分 | 🟡 P2 | 2h |
| 速率限制（rules） | 無 | 🟢 P3 | 4h |
| 🆕 voterId 不易逆推 | 未審查 | 🟡 P2 | 1h |
| 🆕 ShareCardModal 截圖含敏感資料 | 未審查 | 🟡 P2 | 1h |

---

## 🧪 測試策略升級

**現況**：216 個單元測試 ✅，但 **v4.3.0 → v4.6.0 加了 9 個元件、0 個測試**，覆蓋率有下滑風險。

| 類型 | 工具 | 估時 | 優先級 |
|------|------|------|:------:|
| **🆕 補 5 件套單元測試** | Vitest | 6h | 🔴 P0 |
| **E2E 測試** | Playwright | 6h（4 flows） | 🟠 P1 |
| **視覺迴歸** | Chromatic / Percy | 4h | 🟠 P1（editorial 改版後變得很重要） |
| **效能迴歸** | Lighthouse CI | ✅ 已有 | — |
| **Firestore Rules 測試** | `@firebase/rules-unit-testing` | 3h | 🟠 P1 |
| **無障礙測試** | `vitest-axe` | 2h | 🟡 P2 |
| **元件文件 / Storybook** | Storybook 8 | 8h | 🟡 P2（editorial 元件多，文件化能省 onboarding） |

---

## 📈 可觀測性與分析

### 立即可做（< 2 小時）

1. **Firebase Analytics 自定事件**（補加 v4.3 後的事件）
   - `vote_submitted`（帶 songId, isCombo, isSurge）
   - `suggestion_added`
   - `tag_filtered`（帶 tags 陣列）
   - `pwa_installed`
   - `stage_mode_entered`
   - `dark_horse_triggered`
   - `combo_triggered`（帶 comboCount）
   - 🆕 `song_detail_opened`（帶 songId）
   - 🆕 `share_card_downloaded`（帶 format: 'ig' | 'fb'）
   - 🆕 `share_card_copied`
   - 🆕 `thank_you_triggered`
   - 🆕 `voter_passport_opened`
   - 🆕 `badge_unlocked`（帶 badgeId）
   - 🆕 `opening_curtain_played`（帶 isSkipped）
   - 🆕 `up_next_clicked`（帶 source: 'tooltip' | 'card'）

2. **每事件帶 sessionId 維度**（用 `crypto.randomUUID()` 存 sessionStorage）

3. **使用者旅程漏斗**
   - 進站 → 看歌單 → 投票 → 解鎖徽章 → 結束時看 ShareCard → 下載分享

### 中期（4-6 小時）

4. **Sentry 錯誤追蹤** + source map
5. **LINE 通知整合**（你已有 `line-messaging-firebase` skill）
   - 每天 8AM 推播昨日投票統計給管理員
   - 黑馬時刻即時推播
   - 系統錯誤超過 5 次/分鐘告警
   - 🆕 觀眾投到的歌即將演奏時推播

6. **🆕「演出後總結」自動 LINE 推播**
   - 結束「END OF SIDE A」後 5 分鐘自動推
   - 包含：總票數 / Top 5 / 黑馬 / 催歌王 voterId / ShareCard 連結

---

## 🎨 UX 細節提升清單

### Editorial 風格延伸
- [ ] **滾動條樣式化** — 改成雜誌風（細灰底 + 藍色 thumb）
- [ ] **載入骨架屏雜誌化** — 改 chapter header + 卡片形狀 placeholder
- [ ] **page transition** — route 切換用「翻頁」動效
- [ ] **微互動** — 按鈕 hover scale 1.02、click 觸覺回饋（mobile vibrate API）
- [ ] **空狀態雜誌插圖** — 沒搜尋結果用「找不到這篇文章」風格

### 排行榜細節
- [ ] **歌手大頭照欄位**（管理員可上傳，預設用首字 avatar）
- [ ] **YouTube 縮圖**（若有 youtubeId，顯示 thumbnail）
- [ ] **🆕 排行榜歷史對比** — 「比昨天上升 ↑3」雜誌風小標

### 訪客 onboarding
- [ ] **首次進站 quick tour**（3 步教學：搜尋 → 投票 → 看排行榜）
- [ ] **新功能 announcement**（v4.x 更新後彈出 changelog）
- [ ] **空歌單時的 CTA**：「歡迎來到 XXX 演出！點選任何一首歌投票」
- [ ] **🆕 第一次解鎖徽章引導** — 引導點開 VoterPassport

### 管理員體驗
- [ ] **快捷鍵 panel**（已有 `?` 但可再豐富）
- [ ] **管理員專用 Toolbar**（永遠浮在右下角，4 個快速操作）
- [ ] **批次選取模式**（長按 SongCard 進入選取）
- [ ] **撤銷功能**（誤刪歌曲後 5 秒內可 Undo）
- [ ] **🆕 「結束今晚」前 confirm**（已在 P0 #6）
- [ ] **🆕 OpeningCurtain / ThankYou / ShareCard 預覽模式** — admin 不用真的觸發

---

## 🔕 專注輸入 / 防干擾體系延伸建議

> **背景**：v4.6.2 建立了 `composingGuard`（全域「專注輸入」旗標）+ `useComposingWhileTyping`（焦點監聽）。這是一塊**可長期投資的基礎設施** — 目前只用來「打字時暫停全螢幕慶祝動畫」，但同一套機制可以延伸成完整的「現場體驗節奏控制」。以下按「直接延伸 → 體系深化 → 整體輸入體驗 → 捲動體系 → 測試/可觀測性」排序，每項標 priority + 估時，方便你挑著做。

### 🅰️ 防干擾體系深化（建立在 composingGuard 上）

1. **🟠 P1｜防干擾「分級」而非「全有全無」（4-5h）**
   - 現況：打字時 4 個覆蓋層全部 `return null`（hard mute）。
   - 升級：分 `hard`（表單，全擋）/ `soft`（搜尋，只降強度）兩級。soft 模式不全關，而是把慶祝動畫**縮到角落、降透明度、縮短時長**，讓使用者搜尋時仍感受得到現場熱度但不被糊臉。
   - 作法：`beginComposing(level)` 帶等級，`useIsComposing()` 回傳等級；覆蓋層依等級套不同 className（角落小尺寸 vs 全螢幕）。

2. **🟠 P1｜搜尋框設為例外 / 可設定（30min）**
   - 現況：聚焦搜尋框也會暫停所有動畫（符合「打字不被干擾」，但搜尋很短暫，有人可能想邊搜邊看熱度）。
   - 作法：`isTextEntry` 加一個「排除清單」（用 `data-allow-overlays` 屬性標記），搜尋框掛上即不觸發防干擾；或做成 admin 設定開關。

3. **🟡 P2｜防干擾期間的事件「補播佇列」（5-6h）**
   - 痛點：使用者打字時剛好出現黑馬時刻 / 里程碑 → 被暫停 → 永遠錯過這個高潮。
   - 升級：被抑制期間，把「重要事件」（黑馬、50/100/200 里程碑）推進佇列；表單關閉/失焦後，快速回放一個「剛剛你錯過了 🎉」精簡版 toast，而非完全吞掉。
   - 價值：兼顧「不干擾」與「不漏掉現場最嗨的瞬間」。

4. **🟡 P2｜整合 `prefers-reduced-motion`（1-2h）**
   - 把系統「減少動態」偏好也接進同一條抑制管線：偵測到偏好 → 永久 soft mute（慶祝動畫改靜態徽章 / 短淡入）。
   - 與 OpeningCurtain 已有的 `prefers-reduced-motion` 邏輯統一收斂到一個 hook。

5. **🟢 P2｜抽成宣告式 `<DoNotDisturbBoundary>`（3-4h）**
   - 現況：靠 Home 手動 `{!isComposing && <X/>}` 包 4 個覆蓋層。
   - 升級：抽成 `<DoNotDisturbBoundary>{...overlays}</DoNotDisturbBoundary>`，內部讀 `useIsComposing()` 決定渲染，新增覆蓋層自動受保護，避免漏包。

6. **🟢 P3｜防干擾涵蓋更多干擾源（依需求）**
   - 目前只擋 4 個慶祝/互動覆蓋層。可評估是否也要在打字時暫停：UpNextBar 的脈動動畫、SW 更新 banner（`UpdatePrompt`）自動彈出、Toast 風暴（多筆投票連發 toast）。

### 🅱️ 推薦表單 / 輸入體驗整體升級（延續本次脈絡）

7. **🟠 P1｜表單草稿自動暫存（2-3h）**
   - 痛點：使用者打到一半誤觸關閉 / 切走 → 全部消失，要重打。
   - 作法：title/artist/notes 即時寫 `localStorage`，重開表單自動回填，送出成功才清除。

8. **🟠 P1｜即時重複偵測（打字時就提示）（2-3h）**
   - 現況：`checkDuplicate` 只在「送出時」擋。
   - 升級：title `onChange` debounce 300ms 即時比對，欄位下方顯示「這首好像已經在歌單了 →」inline 提示 + 快速跳轉，減少白打一場的挫折。

9. **🟠 P1｜行動裝置鍵盤遮擋處理（2-4h）**
   - 痛點：手機鍵盤彈出時，Dialog 下半部欄位（notes / 送出鈕）容易被鍵盤蓋住。
   - 作法：用 `visualViewport` API 偵測鍵盤高度，聚焦欄位自動 `scrollIntoView`；送出鈕改 sticky 貼在可視區底。

10. **🟡 P2｜IME 組字保護（1-2h）**
    - 痛點：注音 / 拼音 / 日文輸入「組字中」按 Enter 是要選字，不該誤觸送出。
    - 作法：監聽 `compositionstart/end`，組字期間擋掉 Enter submit；composing guard 也可順便接 composition 事件強化偵測。

11. **🟢 P2｜送出後的成功儀式（2-3h）**
    - 現況：送出只有一個 toast。
    - 升級：給推薦者一個 editorial 風小確認動畫（「你的推薦已投遞 №N」信封蓋章），呼應 VoterPassport 的儀式語言，提高再次推薦意願。

### 🅲 RWD / 捲動體系（延續推薦清單修正）

12. **🟠 P1｜抽共用 `<ResponsiveScrollList>`（2-3h）**
    - 把本次「手機自然展開 / 桌機限高 + 原生捲動 + 細捲軸」抽成共用元件，排行榜、點播歷史、建議清單等長清單一律複用，避免每處重踩 Radix ScrollArea 陷阱。

13. **🟠 P1｜全站 Radix `ScrollArea` 稽核（1-2h）**
    - grep 全 repo 找還有沒有別處用 `ScrollArea` + `max-h` + 內部 `h-full` 的同款陷阱（可能同樣裁切看不到內容），一次修掉。

14. **🟡 P2｜細捲軸樣式抽成 utility（30min）**
    - 目前 inline arbitrary（`[&::-webkit-scrollbar]:...`）很長，抽成 `.scrollbar-editorial` CSS class 或 Tailwind plugin，重複使用更乾淨。（也呼應「UX 細節提升清單 → 滾動條樣式化」那一條，可一起做）

15. **🟢 P3｜長清單虛擬化（4-6h）**
    - 當建議數 / 排行榜破百筆，導入 `react-window` 虛擬化，只渲染可視範圍，省記憶體與捲動效能。目前資料量還沒到，列為觀察項。

### 🅳 測試 / 可觀測性（把這次手測自動化）

16. **🟠 P1｜composingGuard 單元測試（1-2h）**
    - `beginComposing` 可重入計數（多次 enter/exit 平衡、release 只生效一次）、`useIsComposing` 訂閱與通知、`isTextEntry` 各類型判定。補進現有 vitest（呼應技術債「5 件套 0 測試」）。

17. **🟠 P1｜Playwright e2e：防干擾行為（2-3h）**
    - 把這次「真實聚焦輸入框 → 派發投票事件 → 斷言覆蓋層不出現；失焦後出現」寫成自動化 e2e，避免未來改動 Home 覆蓋層渲染時悄悄破壞防干擾。（與「📛 事故覆盤 B1 Playwright smoke」可共用 harness）

18. **🟢 P2｜輸入漏斗 / 防干擾埋點（2-3h）**
    - 記錄「推薦表單 開啟 → 開始打字 → 送出」漏斗與放棄率、防干擾觸發次數，回答「干擾是否真的影響推薦轉換」「分級防干擾上線後有沒有改善」。接 P0 既有 analytics 管線即可。

### 🎯 防干擾體系 — 建議優先順序

| 優先 | 項目 | 估時 | 一句話理由 |
|------|------|------|-----------|
| ~~**1**~~ ✅ | ~~#16 composingGuard 單元測試~~ **（v4.6.3 完成，10 例）** | 1-2h | 新基礎設施要先有測試護欄 |
| ~~**2**~~ ✅ | ~~#7 表單草稿自動暫存~~ **（v4.6.3 完成，含回填橫幅）** | 2-3h | 直接救「誤關全沒」的挫折，CP 值最高 |
| ~~**3**~~ ✅ | ~~#8 即時重複偵測~~ **（v4.6.3 完成，inline amber 提示）** | 2-3h | 減少白打一場，延續推薦表單脈絡 |
| ~~**4**~~ ✅ | ~~#1 防干擾分級 soft/hard~~ **（v4.6.4 完成，搜尋→soft 淡化 / 表單→hard 暫停）** | 4-5h | 讓搜尋時仍有現場感，不糊臉 |
| ~~**5**~~ ✅ | ~~#12 ResponsiveScrollList~~ **（v4.6.4 完成，含 5 測試）** | 2-3h | 把這次 RWD 修法沉澱成可複用資產 |
| ~~**6**~~ ✅ | ~~#9 行動鍵盤遮擋~~ **（v4.6.5 完成，自動捲動 + sticky 送出鈕）** | 2-4h | 手機是主力裝置，遮擋很惱人 |
| ~~**7**~~ ✅ | ~~#17 防干擾 e2e~~ **（v4.6.6 完成，改輕量整合測試非 Playwright）** | 2-3h | 鎖住這次成果不被未來改壞 |

> 🏁 **防干擾優先表 Top 7 全部完成**（v4.6.3 ~ v4.6.6）；**v4.6.7 完成 #10 #11、v4.6.8 完成 #2 #3**。
> **尚未做的延伸項**（可視需要挑做）：#14 細捲軸抽 utility（已部分沉澱在 ResponsiveScrollList 的 THIN_SCROLLBAR）、#15 長清單虛擬化、#18 輸入漏斗埋點。
> 至此「🔕 專注輸入 / 防干擾體系延伸建議」18 項中已完成 15 項，剩 3 項皆為低優先 / 視資料量再做。

---

## 🔮 v4.7+ 未來優化改良與可開發功能（完整建議清單）

> **整理時間**：2026-06-02（v4.6.9 整批上線後）
> **如何使用**：每項標 **優先度（P0 立即有感 / P1 高價值 / P2 加分 / P3 願景）+ 估時 + 為什麼值得做**。可從每個分類的 ⭐ 起手項挑著做。
> **方向延續**：沿著這陣子做的「輸入 → 防干擾 → 捲動 / 版面 → 推薦流程 → 現場儀式」脈絡往外擴，並補上工程體質與資料面。

### 🅰️ 推薦 / 點歌流程（延續推薦表單脈絡）
- ⭐ **A1 · 推薦表單「我的推薦」追蹤（P1，4-5h）**：訪客送出後用本機 id（localStorage）記住自己推薦過哪些，回站可看到「你推薦的 ○○ 已被採納 🎉 / 仍待審核」。呼應 VoterPassport 的個人化履歷感，提高回訪。
- ✅ ~~**A2 · 一鍵「我也想聽 +1」附議（P1，3-4h）**~~ **（v4.7.4 完成）**：待審核卡「+1 我也想聽」🔥 計數 + 本機去重 + rules `isValidUpvote()` 已部署。
- **A3 · 推薦時自動帶 YouTube/曲目縮圖（P2，3-5h）**：打歌名時用 YouTube Data API 或 oEmbed 抓縮圖預覽，卡片更生動、也幫助確認是不是同一首。注意 API 配額與 key 限制。
- **A4 · 智慧去重升級（P2，2-3h）**：目前即時重複偵測是字串包含比對；接 `useFuzzySearch` 的模糊比對，能抓「錯字 / 簡繁 / 空格差異」的重複（如「想见你」vs「想見你」）。
- **A5 · 推薦理由範本 chip（P3，1-2h）**：notes 欄給幾個快速 chip（「想合唱」「點給朋友」「壓軸必備」），降低留空率、內容更有溫度。

### 🅱️ 現場感 / 即時互動（延續防干擾 + 慶祝覆蓋層）
- ⭐ **B1 · 補播佇列升級成「現場回顧」小條（P1，3-4h）**：把 #3 的補播 toast 升級為可點開的「剛剛現場」時間軸（黑馬、熱度、新進榜），讓打完字的人快速補看錯過的高潮。資料已在手，差 UI。
- **B2 · 「現在有 N 人在線」即時人數（P2，4-6h）**：用 Firestore presence 或 RTDB 顯示在線人數 / 最近 1 分鐘投票數脈動，強化「大家都在」的現場感。要留意讀取成本。
- **B3 · 覆蓋層尊重 `prefers-reduced-motion`（P2，1-2h）**：偵測系統「減少動態」→ 慶祝動畫改靜態徽章 / 短淡入；與 OpeningCurtain 既有邏輯收斂成一個 hook（防干擾延伸 #4 的姊妹項）。
- **B4 · 音效層（P3，3-4h）**：投票 / 黑馬 / 里程碑配 CC0 短音效（預設靜音、可開），現場大螢幕播放更有氣氛。素材走 Pixabay CC0。

### 🅲 版面 / RWD（延續三欄優化）
- ⭐ **C1 · 主歌單 & 排行榜也支援寬螢幕多欄（P1，3-4h）**：三欄推薦反應好的話，把「可選歌單」在超寬螢幕（2xl）排雙欄、排行榜並排更多，善用大螢幕（演出投影常是 1920+）。
- **C2 · 全站長清單改用 ResponsiveScrollList（P2，2-3h）**：把 RankingBoard / SongList / TagSelector 等仍用固定高 Radix ScrollArea 的地方逐步收斂到共用元件，統一捲動體驗 + 細捲軸（呼應 #13 稽核）。
- ✅ ~~**C3 · 演出 / 投影專用版面（P2，5-6h）**~~ **（v4.7.4：StagePage 早已存在，本次補上期數動態化）**：`?mode=stage` 大字 NOW PLAYING + UP NEXT + QR；期數/標題改讀 D1 useMagazine。
- **C4 · 卡片密度切換（P3，2h）**：讓使用者選「舒適 / 緊湊」兩種密度，手機看更多、桌機看更舒服。

### 🅳 管理 / 後台（阿凱的排歌效率）
- ⭐ **D1 · 待審核建議批次操作（P1，3-4h）**：多選 → 一鍵批准 / 拒絕 / 加入歌單；目前逐張處理，活動中建議量大時很花時間。
- **D2 · 建議審核鍵盤快捷（P2，2-3h）**：A 批准 / R 拒絕 / J、K 上下移動，呼應已有的快捷鍵系統，後台操作更快。
- **D3 · 「一鍵把附議高的轉成歌單」（P2，依 A2）**：結合 A2 附議數，後台一鍵把熱門建議升級為可點播歌曲。
- **D4 · 活動場次（event）支援（P2，6-8h）**：技術債 T4 已預留 props；真正做多場活動切換（畢業歌會 / 耶誕點歌 各自獨立歌單與排行）。

### 🅴 資料 / 可觀測性（目前幾乎空白，最值得補）
- ⭐ **E1 · 輸入 / 推薦漏斗埋點（P1，2-3h）**：防干擾延伸 #18。記錄「表單開啟 → 開始打字 → 送出 / 放棄」「重複提示點擊率」「防干擾觸發次數」，用資料回答「這些優化有沒有用」。
- **E2 · 輕量前端事件分析（P2，3-4h）**：投票 / 推薦 / 分享 / 解鎖徽章等關鍵事件接一個輕量 analytics（GA4 或自建 Firestore 聚合），看活動成效。
- **E3 · 錯誤監控（P2，2-3h）**：接 Sentry 或自建，把線上 JS 例外 / Firestore 失敗收集起來（這次 App Check 403 若有監控早就會被通報）。

### 🅵 工程體質 / 技術債（穩健度）
- ⭐ **F1 · CI 升級 Node 24 actions（P1，0.5-1h）**：目前 GitHub Actions 噴 deprecation 警告——`actions/checkout@v4`、`setup-node@v4` 等將於 2026-06-16 起強制 Node 24。提前把 workflow 的 actions 升版，避免屆時 CI 壞掉。**時效性最高。**
- **F2 · 5 件套儀式 modal 補測試（P1，6h）**：技術債 T2，ThankYou/Opening/Passport/ShareCard 仍 0 測試；抽 `RitualModal` 共用容器順便補測。
- **F3 · package.json version 與實際版本對齊（P2，0.5h）**：SW 版本仍停在 `4.2.0-<hash>`，但 ROADMAP 已到 v4.6.9；把 package.json version 升上來，版本資訊一致（呼應 skill `changelog-version-drift-trap`）。
- ✅ ~~**F4 · 加 CHANGELOG.md（P2，1h）**~~ **（v4.7.4 完成）**：CHANGELOG.md（Keep a Changelog 版本分段）+ 無依賴產生器 `npm run changelog`。
- **F5 · 視覺迴歸煙霧測試（P2，3-4h）**：事故覆盤 B1；Playwright 首頁截圖 baseline，防再次像 v4.6.1 那樣整站跑版卻全測試綠燈。

### 🅶 無障礙 / 國際化 / PWA
- **G1 · 無障礙稽核（P2，3-4h）**：鍵盤可達性、focus ring、aria-label、色彩對比、螢幕報讀器測試；公開站該有基本 a11y。
- **G2 · 離線體驗強化（P2，2-3h）**：PWA 已有 SW；補「離線時看最後一次歌單 + 友善離線提示」，現場網路不穩也能看歌單。
- **G3 · i18n 架構（P3，6-8h）**：長期願景 C5；先抽字串、預留切換，未來可做英文 / 雙語場次。

### 🎯 下一步：建議起手順序（Top 6）
| 優先 | 項目 | 估時 | 一句話理由 |
|------|------|------|-----------|
| ~~**1**~~ ✅ | ~~F1 CI 升 Node 24 actions~~ **（v4.7.0 完成）** | 0.5-1h | 有時效（6/16 強制），不做屆時 CI 會壞 |
| ~~**2**~~ ✅ | ~~E1 推薦 / 防干擾漏斗埋點~~ **（v4.7.0 完成，window.songFunnel()）** | 2-3h | 用資料驗證這批優化到底有沒有用 |
| ~~**3**~~ ✅ | ~~D1 待審核批次操作~~ **（v4.7.0 完成）** | 3-4h | 直接幫阿凱省排歌時間，活動量大時最有感 |
| ~~**4**~~ ✅ | ~~A1 「我的推薦」追蹤~~ **（v4.7.1 完成）** | 4-5h | 提高訪客回訪 + 個人化，延續推薦脈絡 |
| ~~**5**~~ ✅ | ~~C1 寬螢幕多欄擴及主歌單/排行~~ **（v4.7.2 完成，主歌單 2xl 雙欄）** | 3-4h | 延續三欄好評，善用演出投影大螢幕 |
| ~~**6**~~ ✅ | ~~B1 補播升級「現場回顧」小條~~ **（v4.7.3 完成）** | 3-4h | 資料已在手，把現場感做滿 |

> 🏁 **Top 6 起手清單全部完成**（v4.7.0 ~ v4.7.3：F1/E1/D1/A1/C1/B1）。
> 後續可選方向回到「🔮 v4.7+ 未來優化」其餘項：A2 +1 附議、A3 縮圖、B2 在線人數、C3 演出投影版面、D4 多場次、E2/E3 分析監控、F2/F4 測試與 CHANGELOG 等。

---

## 🧹 程式碼健康度 / 技術債

> v4.3.0 → v4.6.0 三週快速堆積的技術債盤點。
> **📐 詳細設計**：[T1-T4](docs/design/README.md#-技術債清理t1-t4)

### 🔴 高優先（影響後續開發）

1. ~~**`client/src/index.css` 4706 行**~~ → ✅ **已完成（c338517 拆 5 檔）**，但**留下 v4.6.1 教訓**：拆檔 PR 漏寫 `@import` 順序，全站跑版。**待補的防線見「📛 事故覆盤」A1-A3、B1-B3。**
2. **🆕 沒有 CSS lint / build warning 阻斷機制**（從 v4.6.1 衍生）
   - Vite warning 不會 fail build，整批樣式丟掉照樣產出 dist
   - **解法**：A1 + A2 + A3 三件套（共 1.25h，見「📛 事故覆盤」段）
3. **🆕 沒有視覺煙霧測試**（從 v4.6.1 衍生）
   - 387 個單元測試全綠仍未抓到首頁跑版
   - **解法**：B1 Playwright smoke（3-4h，見「📛 事故覆盤」段）
4. **5 件套元件 0 測試** → [T2 設計文件](docs/design/T2-ritual-modal-tests.md)
   - 9 個新元件 0 個單元測試，216 → 250+ 目標
   - **解法**：補 35-40 個測試，6h
5. **`SongDetail/data.ts` hardcode 兩首歌** → [T3 設計文件](docs/design/T3-songdetail-firestore.md)
   - 大部分歌曲走 fallback，UX 不完整
   - **解法**：擴張 Song schema 加 6 個樂譜欄位 + DSL 編輯器，4h
6. **5 件套假設「單一活動」** → [T4 設計文件](docs/design/T4-event-aware-props.md)
   - B2 上線時要重做活動切換
   - **解法**：預留 eventId props（永遠 default），4h 讓 B2 估時砍半

### 🟠 中優先（影響擴展）

4. **5 件套元件假設「單一活動」**
   - B2 上線時要重做活動切換
   - **解法**：B2 實作前先確認 props 介面足夠 generic
5. **OpeningCurtain hardcode 文字**
   - 「阿凱彈唱之夜 / ISSUE №12 / MAY 2026」寫死
   - **解法**：P0 #5 走 Firestore settings
6. **CSS variable 命名分散**
   - editorial 顏色（藍 `#2b4dff`）散落各檔，沒抽到 `:root`
   - **解法**：抽到 `index.css` `:root` 變數

### 🟡 低優先（健康度）

7. **沒有 ADR (Architecture Decision Records)**
   - 重要決策（如關 App Check）只在 commit message
   - **解法**：建 `docs/adr/` 目錄
8. **沒有 CHANGELOG.md**
   - v4.3.0 → v4.6.0 五個 PR 沒有單獨的 changelog
   - **解法**：用 `conventional-changelog` 自動生成
9. **未來重複的「儀式 modal」會增加**
   - ThankYou / Opening / Passport / Share 都是儀式類 modal，共用邏輯（press ESC / 黑膠動畫 / 雜誌頂條）但沒抽 `RitualModal` 共用元件
   - **解法**：抽 `RitualModal` 容器元件（chapter header / 黑膠 / closeOnEsc / sessionStorage 紀錄）

---

## 📅 建議實施時程

### v4.7.0（本週末，4-6 小時）
> **主題：補齊技術債 + 守門員**

| 項目 | 估時 | 依賴 |
|------|------|------|
| 1. **API Key restrictions 檢查**（拖三版了） | 0.5h | 無 |
| 2. 「結束今晚」confirm dialog | 0.5h | 無 |
| 3. 5 件套單元測試（先寫 3 個高風險：Passport / UpNext / ShareCard） | 3h | 無 |
| ~~4. composingGuard 單元測試（防干擾體系 #16）~~ | ✅ v4.6.3 | 完成（10 例）|
| ~~5. 推薦表單草稿自動暫存（防干擾體系 #7）~~ | ✅ v4.6.3 | 完成（含回填橫幅）|
| 6. **🆕 即時重複偵測也已順手完成**（防干擾體系 #8） | ✅ v4.6.3 | 完成（inline amber 提示）|

**驗收**：API key 有 referer 限制、testbench 397 個 ✅、推薦表單誤關後重開可回填 ✅
> 💡 更多防干擾 / 輸入體驗延伸見「🔕 專注輸入 / 防干擾體系延伸建議」段的優先順序表（Top 3 已劃掉，下一步從 #4 起）。

### v4.8.0（下週，6-8 小時）
> **主題：把 5 件套串得更深**

| 項目 | 估時 | 依賴 |
|------|------|------|
| SongDetailModal 真實資料源串接 | 4h | Firestore schema 改 |
| VoterPassport 解鎖瞬間動畫 | 2h | 無 |
| ThankYouModal → ShareCardModal CTA | 1.5h | 無 |
| OpeningCurtain 客製化文字 | 2h | Firestore settings |

### v4.9.0（2 週內，8-10 小時）
> **主題：測試 + 監控完整化**

| 項目 | 估時 | 依賴 |
|------|------|------|
| Sentry 錯誤追蹤 + source map | 2h | 無 |
| Firebase Analytics 自定事件擴張 | 1h | 無 |
| Firestore Rules 單元測試 | 3h | 無 |
| Playwright E2E（4 flows） | 6h | 無 |
| Chromatic 視覺迴歸 | 4h | 無 |

### v5.0.0（1 個月內，重大版本）
> **主題：多場活動 + 雲端同步（破壞性升級）**

| 項目 | 估時 |
|------|------|
| **B2 多場活動支援** | 12h |
| **C2 社群登入**（Google 優先） | 8h |
| **🆕 5 件套支援活動切換** | 4h |
| Migration script（既有資料歸 default event） | 3h |
| A11y 全面審查 + axe | 4h |
| 收藏歌單雲端同步 | 3h |

### v6.0.0（2-3 個月內，AI 化 + Editorial 深化）
| 項目 | 估時 |
|------|------|
| **C1 歌詞同步播放（LRC）** | 10h（架構已有） |
| **C3 積分勳章擴張**（12-15 個 + 跨裝置） | 8h（架構已有） |
| **C4 AI 歌曲推薦**（Gemini Free Tier） | 18h |
| **D1 雜誌期刊期數系統** | 6h |
| **D2 主理人專欄** | 8h |
| **D3 節目單 PDF 列印版** | 4h |
| **D6 精選時刻自動剪輯** | 10h |

### v7.0.0（3+ 個月，社群化）
| 項目 | 估時 |
|------|------|
| C5 多語系 | 8h |
| C6 即時聊天 | 10h |
| D4 演出後感留言 | 6h |
| Storybook + 元件庫文件化 | 8h |
| Cloud Functions（後端服務） | 視範疇 |
| C7 打賞金流（若有商業需求） | 20h+ |

---

## 📛 事故覆盤 — 從 v4.6.1 CSS 跑版學到的工程體系建議

> **核心提問**：一個寫在 CSS 規範內的順序錯誤（commit c338517），為何能通過 typecheck + 387 個單元測試 + CI build + lighthouse + PR review + merge to main + GitHub Pages 部署 → **直到使用者打開網站才被發現**？
> **答案**：整套防線都驗證「程式碼語法 / 元件行為 / 效能」，**沒有任何一道驗證「使用者看到的版面是不是還是雜誌風」**。下面分四層建立制度化防護。

### 🛡️ 第一層防線 — Build 時阻擋（≤ 1 小時，必做）

**做不到的話下次拆 CSS 還是會中。CP 值最高。**

#### A1. Vite warning 升級成 fail（30 分鐘）🔴 P0
**現況**：`vite build` 對 `@import must precede` 只噴 yellow warning，exit code 0，CI 綠燈過。
**做法**：
```ts
// vite.config.ts
export default defineConfig({
  // ...
  css: {
    devSourcemap: true,
    postcss: {
      plugins: [
        // 自製 plugin 把指定的 warning 升級成 error
        {
          postcssPlugin: 'fail-on-bad-import',
          AtRule: {
            import: (node, { result }) => {
              // 檢查前面是否有非 @charset / 空 @layer 之外的 rule
              let prev = node.prev();
              while (prev) {
                if (prev.type === 'atrule' && !['charset', 'layer'].includes(prev.name)) {
                  throw node.error(`@import "${node.params}" 必須放在 @${prev.name} 之前 — CSS spec 規定`);
                }
                if (prev.type === 'rule') {
                  throw node.error(`@import "${node.params}" 必須放在所有 rule 之前`);
                }
                prev = prev.prev();
              }
            },
          },
        },
      ],
    },
  },
  build: {
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        if (warning.message?.includes('@import must precede')) {
          throw new Error(`[BLOCKED] ${warning.message}`);
        }
        defaultHandler(warning);
      },
    },
  },
});
```
**驗收**：故意把 `@import` 放回 `@tailwind` 後面 → `npm run build` 直接 exit 1，CI 紅燈擋下。

#### A2. CSS bundle size lower bound（15 分鐘）🔴 P0
**現況**：整批樣式丟掉 bundle 還是 build 成功（127 kB），無人察覺。
**做法**：build 後加 size check script：
```js
// scripts/check-css-bundle-size.mjs
import { statSync, readdirSync } from 'fs';
const files = readdirSync('dist/assets').filter(f => f.endsWith('.css'));
const sizes = files.map(f => statSync(`dist/assets/${f}`).size);
const total = sizes.reduce((a, b) => a + b, 0);
const MIN = 180 * 1024; // 180 KB（含 editorial 樣式的底線）
if (total < MIN) {
  console.error(`✗ CSS bundle ${(total/1024).toFixed(1)} KB < ${MIN/1024} KB lower bound`);
  console.error(`  editorial 樣式可能沒進 bundle，檢查 @import 順序`);
  process.exit(1);
}
console.log(`✓ CSS bundle ${(total/1024).toFixed(1)} KB ≥ ${MIN/1024} KB`);
```
加進 `package.json` build 後跑：
```json
"build": "vite build && node scripts/check-css-bundle-size.mjs"
```
**驗收**：故意拔掉一個 `@import` → build 後 size check 紅字 fail。

#### A3. Stylelint + stylelint-order（30 分鐘）🟠 P1
**現況**：沒有 CSS lint，純靠 hand review。
**做法**：
```bash
npm i -D stylelint stylelint-config-standard stylelint-order
```
```json
// .stylelintrc.json
{
  "extends": "stylelint-config-standard",
  "plugins": ["stylelint-order"],
  "rules": {
    "no-invalid-position-at-import-rule": true,
    "order/order": [
      [
        { "type": "at-rule", "name": "import" },
        { "type": "at-rule", "name": "tailwind" },
        { "type": "at-rule", "name": "layer" },
        "declarations",
        "rules"
      ]
    ]
  }
}
```
加進 lint-staged：
```json
"lint-staged": {
  "*.{ts,tsx}": "tsc --noEmit -p tsconfig.json",
  "*.css": "stylelint"
}
```
**驗收**：pre-commit hook 寫錯 import 順序立刻被擋。

---

### 🛡️ 第二層防線 — 視覺煙霧測試（2-4 小時，強烈建議）

**Build 過了仍有可能跑版（例如 Tailwind purge 把樣式砍光、CDN 載入順序錯）。**

#### B1. Playwright 視覺煙霧測試（3-4 小時）🟠 P1
**現況**：387 個單元測試全綠，但「首頁長得對不對」沒人測。
**做法**：開最小可行 visual smoke：
```ts
// e2e/visual-smoke.spec.ts
import { test, expect } from '@playwright/test';

test('首頁雜誌外殼版面', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // 1. 卡帶 hero 必須存在且有正確的 z-index
  const cassette = page.locator('[data-testid="cassette-hero"]');
  await expect(cassette).toBeVisible();
  const cassetteBox = await cassette.boundingBox();
  expect(cassetteBox?.width).toBeGreaterThan(400); // 確保不是塌陷

  // 2. SETLIST / VOTES TONIGHT / ACTIVE 三個 KPI 數字必須在同一水平線（flex 沒崩）
  const kpis = await page.locator('[data-testid="hero-kpi"]').all();
  expect(kpis).toHaveLength(3);
  const ys = await Promise.all(kpis.map(k => k.boundingBox().then(b => b!.y)));
  expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(10); // 同水平線

  // 3. 整頁截圖跟 baseline 比對
  await expect(page).toHaveScreenshot('home-hero.png', { maxDiffPixels: 100 });
});
```
**驗收**：v4.6.0 跑版狀態下這 3 個 expect 全爆，跑版立刻被攔截。
**附加**：CI 加 playwright workflow，PR 自動跑這支 smoke。

#### B2. Chromatic 視覺迴歸（4 小時）🟠 P1
**現況**：ROADMAP 已列在 #21，但還沒做。**v4.6.1 證明這項是「必做」而不是「nice to have」**。
**做法**：搭配 Storybook 8（也是 ROADMAP 待做項），對 5 件套 modal + SongCard + Hero 各跑視覺快照。每月 5,000 snapshots 免費版對小流量站夠用。
**升級為**：P0（從 P2 升上來，等同優先級到 Sentry）。

#### B3. CSS bundle 含必要 token 的 grep check（10 分鐘）🟡 P2
build 後 grep dist CSS 是否含 `--ed-paper` / `cassette` / `editorial` 等關鍵字串，缺一即 fail。**這次事故 30 秒內可抓到**：
```js
// scripts/check-css-bundle-content.mjs
import { readFileSync, readdirSync } from 'fs';
const cssFile = readdirSync('dist/assets').find(f => f.startsWith('index') && f.endsWith('.css'));
const css = readFileSync(`dist/assets/${cssFile}`, 'utf8');
const required = ['--ed-paper', '--ed-accent', 'cassette', 'editorial'];
const missing = required.filter(k => !css.includes(k));
if (missing.length) {
  console.error(`✗ CSS bundle 缺關鍵 token: ${missing.join(', ')}`);
  process.exit(1);
}
```

---

### 🛡️ 第三層防線 — 部署 / SW 更新體驗（2-3 小時，建議）

**就算 main 已 merge 修復，使用者瀏覽器的 SW 仍快取舊版，hotfix 體感延遲。**

#### C1. SW 自動 hard refresh 機制（2 小時）🟠 P1
**現況**：`UpdatePrompt` 元件需使用者點按 banner 才更新，hotfix 場景使用者不一定看得到 banner（首頁版面壞掉 banner 也跟著爆）。
**做法**：
- build 時生成 `dist/version.json`（含 git hash + critical flag）
- 前端 entry 載入時 fetch `version.json` 比對 `window.__APP_VERSION__`，若有 `critical: true` 標記直接 `location.reload(true)` 不問
- hotfix PR 在 prebuild script 加 `--critical` flag，自動標記
- 一般版本仍走 UpdatePrompt 流程
**驗收**：下次跑版 hotfix merge 後，使用者不用無痕視窗也能 30 秒內看到新版。

#### C2. SW 強化「壞版本」偵測（1 小時）🟡 P2
**進階**：SW 啟動時做 health check（fetch dist CSS 看 size 是否 ≥ 180 kB），偵測到「壞版本」自動清快取觸發 reload。但**慎用 fail-open**：health check 自己壞掉時不能讓使用者卡在 reload loop。

#### C3. 部署後自動煙霧測試（1 小時）🟡 P2
GitHub Actions deploy.yml 加 step：deploy 後 Playwright 對 production URL 跑 B1 的 smoke，紅燈時自動發 LINE 通知（搭 `line-messaging-firebase` skill）。**這次跑版可以在 2 分鐘內主動告警，不用等使用者反應**。

---

### 🛡️ 第四層防線 — 架構治理（長期，4-8 小時）

**根本性減少 CSS @import / 全域樣式的依賴面。**

#### D1. CSS Modules 分階段遷移（8 小時）🟡 P2
**現況**：6 個 editorial-*.css 仍是「全域樣式檔」，class name 純靠約定不衝突。
**做法**：強耦合 component 的 CSS 改 CSS Modules（檔案綁元件），共用 design tokens 留 `editorial-base.css`：
- `SongCard/SongCard.tsx` ← `SongCard.module.css`（卡片專用樣式）
- `OpeningCurtain/OpeningCurtain.tsx` ← `OpeningCurtain.module.css`（動畫專用）
- `editorial-base.css` 只留 `:root` tokens + `@layer base` + 純 utility（hero / cassette 等橫跨多元件的留全域）
**收益**：刪掉某 component 時對應 CSS 自動沒被 import → tree shake；不再有「6 個 .css 互相 import 順序」的隱形依賴。
**成本**：重構 9 個元件 + 處理 keyframes 共用問題。

#### D2. ADR：CSS 架構決策記錄（30 分鐘）🟢 P3
建 `docs/adr/0001-css-architecture.md`：
- 當下選 `@import` 拆 5 檔的理由
- 不選 CSS Modules / vanilla-extract / Tailwind-only 的理由
- 本次事故的教訓 + 改採的防線
- 未來檢視時機（編輯 editorial-*.css 超過 6 個檔、或 component 超過 50 個時）

#### D3. Storybook 元件文件化（8 小時，已在 ROADMAP）🟡 P2
**升級理由**：拆 CSS / 改 token 的 PR 在 Storybook 加 Chromatic 視覺對比，PR review 直接看「改動前 vs. 改動後」截圖，**這比看 .css diff 直觀 10 倍**。

---

### 📊 事故防線 priority 矩陣

| 防線 | 投入 | 防護涵蓋 | 優先級 |
|------|------|----------|:------:|
| **A1 Vite warning fail build** | 30 min | 100% 同類事故 | 🔴 P0 |
| **A2 CSS size lower bound** | 15 min | 100% 同類事故 | 🔴 P0 |
| **A3 stylelint + order** | 30 min | 寫錯瞬間就被擋 | 🟠 P1 |
| **B1 Playwright 視覺煙霧** | 3-4 h | 任何視覺跑版 | 🟠 P1 |
| **B2 Chromatic 視覺迴歸** | 4 h | PR review 防線 | 🟠 P1（從 P2 升） |
| **B3 grep token check** | 10 min | 簡易版 B1 | 🟡 P2 |
| **C1 SW hotfix critical flag** | 2 h | hotfix 體感延遲 | 🟠 P1 |
| **C3 部署後 prod 煙霧** | 1 h | 主動告警 | 🟡 P2 |
| **D1 CSS Modules 遷移** | 8 h | 根本改架構 | 🟡 P2 |
| **D2 ADR 記錄** | 30 min | 未來決策依據 | 🟢 P3 |

**建議路徑**：本週末做 A1 + A2 + A3（共 1.25 h）→ 下週做 B1（3-4 h）+ C1（2 h）→ 月內做 B2（4 h）+ D2（0.5 h）。**先把 build/CI 防線補完，再升級視覺迴歸，最後處理長期架構。**

---

## 🎯 Top 7 立即可做

> **本週末挑這幾項，CP 值最高、PR 最小、立即有感**
> **🆕 v4.6.1 事故後重新排序：把 build 防線排到最高，避免下次拆 CSS / 改全域樣式再炸**

| # | 項目 | 估時 | 收益 | 為什麼選它 |
|---|------|------|------|------------|
| 1 | **🆕 Vite warning → build error**（A1） | 0.5h | 防同類整批樣式被吞 | 🔴 **v4.6.1 事故核心防線，CP 值無敵** |
| 2 | **🆕 CSS bundle size lower bound**（A2） | 15min | 100% 攔截「樣式整批丟失」 | 🔴 **2 行 script，幾乎沒成本** |
| 3 | **API Key restrictions 檢查** | 0.5h | 防 key 洩漏被打 quota | 🔴 **拖三版 ROADMAP 還沒做** |
| 4 | **🆕 stylelint + stylelint-order**（A3） | 0.5h | pre-commit 就被擋 | 🟠 同類錯誤再犯的最後一道閘 |
| 5 | **「結束今晚」confirm dialog** | 0.5h | 防誤觸炸場 | 演出當下風險最高 |
| 6 | **5 件套單元測試**（先寫 3 個） | 3h | 防 editorial 改版回歸 | 9 個新元件 0 測試 |
| 7 | **🆕 Playwright 首頁視覺煙霧**（B1） | 3h | 任何視覺跑版 30 秒內抓 | 🟠 v4.6.1 事故第二層防線 |

**總計 ~8 小時**（縮 6 小時，因為 build 防線 #1-#2-#4 都很便宜），一個週末做完，把產品推進到 **v4.7.0**。
**v4.6.1 之後加入的 #1 #2 #4 #7 四項是「事故防線」，建議跟原本的 #3 #5 #6 平行做。**

### 🔁 後續批次（v4.8.0 → v5.0.0）

| 批次 | 項目 | 估時 | 主題 |
|------|------|------|------|
| **v4.8 守門員強化** | Sentry + Firestore Rules 測試 + Chromatic 視覺迴歸（B2）+ SW critical flag（C1）| 10h | 真實環境守門員 |
| **v4.8 UX 深化** | SongDetailModal 真實資料源 + VoterPassport 解鎖動畫 + ThankYou → ShareCard CTA + OpeningCurtain 客製文字 | 10h | 5 件套串得更深 |
| **v5.0 多場活動** | B2 + 5 件套支援活動切換 + Migration + 收藏雲端同步 | 22h | 破壞性重大升級 |

---

## 🔧 開發指令參考

```bash
# 日常
npm run dev                    # 開發
npm run check                  # TypeScript
npm run test:run               # 216 測試
npm run test:coverage          # 覆蓋率報告
npm run lighthouse             # 跑 Lighthouse CI

# 建置 + 部署
npm run build                  # 自動 bump SW 版本 + 生成 OG 圖
npm run webp                   # PNG → WebP
firebase deploy --only hosting,firestore:rules --project guitar-ff931

# 未來會用到
npm i web-vitals                          # Web Vitals 上報
npm i @sentry/react @sentry/vite-plugin   # Sentry
npm i -D @playwright/test                 # E2E
npm i -D @firebase/rules-unit-testing     # Rules 測試
npm i -D vitest-axe                       # a11y 測試
npm i -D chromatic                        # 視覺迴歸
```

---

## 📦 v4.6.0 已建立的元件清單（快速索引）

### 新增 hooks（累積 12 個）
| Hook | 用途 |
|------|------|
| `useAllSongTags` | 收集全歌單的標籤集合 |
| `useVoteHistory` | localStorage 點播歷史 + 今日累計 |
| `useSortMode` | 4 種排序模式 + URL query 同步 |
| `useStatsData` | 6 大圖表的聚合運算 |
| `useVoteSurge` | 偵測票數飆升 |
| `useComboCounter` | 同首歌 3 秒內連投偵測 |
| `useDarkHorse` | 排名跳升 ≥3 名觸發 |
| `useGlobalHype` | 多人同時段投票偵測 |
| `useVoterLeaderboard` | 訪客貢獻排行 |
| `useKeyboardShortcuts` | 全域快捷鍵綁定 |
| `useServiceWorkerUpdate` | SW 新版偵測 + 重新整理 |
| 🆕 `useNowPlaying` | 演出中 + UpNext 隊列狀態 |

### 新增 components（累積 35+ 個）
| Component | 版本 | 用途 |
|------|------|------|
| TagFilterBar | v4.2.0 | 標籤多選篩選列 |
| VoteHistoryButton / VoteHistoryModal | v4.2.0 | 個人歷史 |
| SortSelector | v4.2.0 | 排序下拉 |
| StatsDashboard | v4.2.0 | 統計儀表板 |
| StagePage | v4.2.0 | 演出模式 |
| SurgeBadge / ComboOverlay / DarkHorseOverlay / GlobalHypeOverlay | v4.2.0 | 特效 overlays |
| VoterLeaderboardModal | v4.2.0 | 領袖板 |
| CommandPalette / ShortcutsHelpModal | v4.2.0 | 命令面板 |
| UpdatePrompt | v4.2.0+ | 新版本 banner |
| 🆕 **SongDetailModal / ChordSvg / data.ts** | v4.3.0 | 歌曲詳情 + 和弦圖 |
| 🆕 **VoterBoard** | v4.3.0 | 抽出共用領袖板 |
| 🆕 **ShareCardModal** | v4.4.0 | 節目單分享卡 |
| 🆕 **ThankYouModal** | v4.5.0 | END OF SIDE A 收尾儀式 |
| 🆕 **UpNextBar** | v4.6.0 | 底部隊列條 |
| 🆕 **VoterPassportModal** | v4.6.0 | 護照式催歌履歷 |
| 🆕 **OpeningCurtain** | v4.6.0 | 開場儀式 |

### 新增腳本（持平）
| 腳本 | 用途 |
|------|------|
| `scripts/stamp-sw-version.mjs` | build 前自動戳 SW 版本 |
| `scripts/generate-og-image.mjs` | 生成 1200×630 OG 預覽圖 |
| `scripts/subset-og-font.mjs` | Noto Sans TC 字型精簡 |
| `scripts/convert-to-webp.mjs` | 圖片 WebP 批次轉換 |

---

## 📚 參考連結

- 線上 Demo：https://cagoooo.github.io/song/
- Firebase Console：guitar-ff931 (登入 `ipad@mail2.smes.tyc.edu.tw`)
- CI：[GitHub Actions](https://github.com/cagoooo/song/actions)
- 設計來源：Claude Design handoff（多次迭代，5 個 handoff ID 在 commit message）
- 文件歸檔：`docs/archive/`（含 v3.x 之前的開發紀錄）

---

*最後更新：2026-05-18 | v4.6.1 hotfix（CSS @import 順序救援）| 下次更新時機：完成 v4.7.0 build 防線（A1+A2+A3）+ Top 7 任一項後*

---

## 🔖 v4.6.1 事故時間線（30 分鐘從發現到修復）

| 時間（推估） | 事件 |
|---|---|
| 演出前 | 部署 v4.2.0-ac73b69-u8le 到 GitHub Pages |
| T+0 | 阿凱打開 `https://cagoooo.github.io/song/` 看到整站垂直堆疊跑版 |
| T+2 min | 截圖回報 + DevTools 截圖（Console 全綠、無錯誤訊息） |
| T+5 min | 從近 5 個 commit 鎖定 `c338517 refactor(css): index.css 4706 行拆 5 個邏輯檔` |
| T+8 min | `npm run build` 重現 → Vite warning `@import must precede all other statements` |
| T+10 min | grep 確認 editorial CSS 完全沒進 dist bundle（`grep -c "ed-paper" → 0`） |
| T+15 min | 修 `index.css` 把 `@import` 移到 `@tailwind` 之前 → rebuild → bundle 127→222 kB |
| T+18 min | commit + pre-commit hook（tsc + 387 tests 全綠）+ push |
| T+22 min | PR #13 開立 + 等 CI |
| T+25 min | merge 到 main → GitHub Actions 自動 deploy |
| T+28 min | 阿凱用無痕視窗驗證 → SW 自動升級 ac73b69-u8le → f253a16-438o → 雜誌外殼正常 |
| T+30 min | 「可以了 很棒」← 結束 |

**啟示**：根因鎖定到實際修復約 15 分鐘，是因為 build 階段直接告訴你「`@import must precede`」。如果 warning 升級成 error（A1 防線），CI 在 c338517 那個 PR 階段就紅燈擋下，**整起事故根本不會發生**。

