# 🚀 互動式吉他彈唱點播平台 — 開發進度 & 未來路線圖

> **文件版本**：10.0
> **更新日期**：2026-05-16
> **當前版本**：**v4.2.1**（含 v4.2.0 後共 9 項增量更新）
> **GitHub**：[cagoooo/song](https://github.com/cagoooo/song)
> **目的**：完整反映已完成項目、提供詳細未來優化與開發建議

---

## 🎨 v4.2.1 — Editorial 系統第二波（2026-05-15 ~ 2026-05-16）

> **主題：雜誌風儀式感大補帖**。把演出當作一張黑膠 SIDE A，從開場到收尾都有對應的儀式畫面，加上隊列即時感與個人徽章收藏。

| 項目 | 範疇 | 影響 |
|------|------|------|
| **節目單分享卡** | `ShareCardModal.tsx`（PR #2，commit 677a906） | IG 直式 + FB OG 雙尺寸 PNG 匯出 |
| **Editorial UI 收尾** | SuggestionForm / SongSuggestion / RankingBoard 列（PR #3） | 統一雜誌風細節（卡片邊框、章節編號、義式 italic） |
| **END OF SIDE A 感謝卡 modal** | `ThankYouModal.tsx`（PR #4，commit 4a01d1a） | 演出結束儀式畫面：捲動式致謝、卡帶定格、可一鍵跳分享卡 |
| **🆕 Up Next 底部 sticky 隊列條** | `UpNextBar/`（PR #5） | 黑膠 mini + LIVE 脈動 + 進度條 + 3 張隊列卡 + 投票黃光 pulse |
| **🆕 護照式催歌履歷 modal** | `VoterPassportModal.tsx`（PR #5） | 6 個動態徽章 + SVG 圓章 + feTurbulence 油墨蓋章質感 |
| **🆕 6 秒開場儀式** | `OpeningCurtain.tsx`（PR #5） | 黑膠飛入 + 唱針落下 + 跑馬燈淡入；sessionStorage 自動播一次 |

**新增 CSS 命名空間**（共 +~1900 行）：`un-*` (UpNextBar) / `vb-*` (VoterBadge) / `oc-*` (OpeningCurtain)
**動畫總數**：UpNextBar 6 個 keyframes + Passport 卡片翻面 + OpeningCurtain 11 個 keyframes（完整 6s 時間軸）

---

## 🆕 v4.2.0 之後的增量（2026-05-09 ~ 2026-05-15）

| 項目 | 範疇 | 影響 |
|------|------|------|
| **B1 統計儀表板** | `StatsDashboard.tsx`（340 行）+ `useStatsData.ts`（232 行） | 6 大圖表（熱門 Top 10、每日趨勢、24h 熱度、歌手分佈、標籤雷達、KPI 卡片）+ CSV 匯出 |
| **shadcn CSS 變數修補** | `index.css` +74 行 | 修掉 `--popover` / `--card` / `--accent` 等缺失變數導致 modal 透明 bug |
| **後台管理員 RWD** | `RankingBoard` + `StatsDashboard` + `Home` | KPI 卡 grid 從 4 欄 → 2/4 響應；統計區行動裝置可垂直堆疊 |
| **SW 版本自動 bump** | `scripts/stamp-sw-version.mjs` + `useServiceWorkerUpdate.ts` + `UpdatePrompt.tsx` | 每次 build 自動把 `sw.js` 版本戳改新，使用者立即收到「新版本可用」banner，一鍵更新 |
| **管理員工具腳本 gitignore** | `.gitignore` +5 行 | 本地 admin 修復腳本不入 repo |

---

## 📊 目前狀態總覽 (v4.2.0+)

| 指標 | 現況 | 對比目標 | 狀態 |
|------|------|----------|------|
| **單元測試** | **216 個 / 100% 通過**（19 個 test files） | 50% 覆蓋率 | ✅ 超越 |
| **TypeScript 嚴格度** | `strict` + `noImplicitReturns` + `noFallthroughCasesInSwitch` + `forceConsistentCasingInFileNames` | 嚴格化 | ✅ 進階 |
| **Initial Bundle（gzip）** | ~280 KB（react+ui+main） | < 300 KB | ✅ 達標 |
| **PWA 支援** | SW + Manifest + 自動 bump + 更新提示 | 離線可用 + 自動更新 | ✅ 完成 |
| **CI/CD** | GitHub Actions：typecheck + 216 test + build + Lighthouse | 全自動 | ✅ 完成 |
| **Error Boundary** | 全域錯誤防護 | 覆蓋全 App | ✅ 完成 |
| **行動裝置 RWD** | 含後台管理員介面 | 全頁面響應式 | ✅ 完成 |
| **互動特效層次** | 5 套（飆升 / 連擊 / 黑馬 / 集體投票 / 領袖板） | 演出現場有感 | ✅ 完成 |

---

## 📋 目錄

1. [✅ 已完成里程碑](#-已完成里程碑)
2. [🔥 Phase A：短期高優先](#-phase-a短期高優先)（**已 100% 完成 ✅**）
3. [📱 Phase B：中期功能擴展](#-phase-b中期功能擴展)（**5/6 完成**）
4. [🌟 Phase C：長期進階](#-phase-c長期進階)（C3 徽章已部分達成 🟡）
5. [🎨 Editorial 系統下一步](#-editorial-系統下一步v421-之後的延伸建議) 🆕 — UpNextBar / VoterPassport / OpeningCurtain 的細節升級
6. [🎯 v4.3 → v5.0 立即可做的詳細建議](#-v43--v50-立即可做的詳細建議)
7. [⚡ Bundle 二次優化（具體可省 ~250KB）](#-bundle-二次優化)
8. [🛡️ 安全性下一階段](#️-安全性下一階段)
9. [🧪 測試策略升級](#-測試策略升級)
10. [📈 可觀測性與分析](#-可觀測性與分析)
11. [🎨 UX 細節提升清單](#-ux-細節提升清單)
12. [📅 建議實施時程 (v4.3 → v6.0)](#-建議實施時程)
13. [🎯 Top 10 立即可做（推薦順序）](#-top-10-立即可做v421-之後最高-cp)

---

## ✅ 已完成里程碑

### v4.2.1（2026-05-15 ~ 2026-05-16）Editorial 第二波
- ✅ **節目單分享卡**（`ShareCardModal` — IG 直式 + FB OG 雙尺寸 PNG）
- ✅ **Editorial 細節收尾**（SuggestionForm / SongSuggestion / RankingBoard 列雜誌風統一）
- ✅ **END OF SIDE A 感謝卡**（`ThankYouModal` — 演出結束儀式 + 一鍵跳分享）
- ✅ **Up Next 底部 sticky 隊列條**（`UpNextBar` — 三狀態切換：演出中 / 觀眾剛投票 / 待開場）
- ✅ **護照式催歌履歷**（`VoterPassportModal` — 6 動態徽章 + SVG 圓章 + feTurbulence 蓋章濾鏡）
- ✅ **6 秒開場儀式**（`OpeningCurtain` — sessionStorage 每 session 自動播一次 + admin 手動觸發）

### v4.2.0+（2026-05 後續累積）
- ✅ **B1 統計儀表板**（6 圖表 + KPI + CSV）
- ✅ **後台管理員 UI RWD**（KPI grid 響應、統計區堆疊）
- ✅ **PWA 自動更新流程**（build 時戳版本、使用者收 banner、一鍵 reload）
- ✅ **shadcn CSS 完整變數**（修 modal 透明 bug）

### v4.2.0（2026-05-08 主版本）
- ✅ **A1 標籤篩選 UI**（`TagFilterBar` + `useAllSongTags`）
- ✅ **A2 歌曲難度標記**（⭐⭐⭐ + Firestore Rules 校驗）
- ✅ **A3 點播歷史 localStorage**（`VoteHistoryModal` + `useVoteHistory` + 8 個測試）
- ✅ **A4 演出模式 `?mode=stage`**（`StagePage.tsx` 275 行）
- ✅ **A5 CI/CD**（`.github/workflows/ci.yml` typecheck + test + build + bundle guard < 400KB）
- ✅ **B4 模糊搜尋強化**（拼音首字母、Fuse.js 整合）
- ✅ **B5 鍵盤快捷鍵**（`CommandPalette` + `useKeyboardShortcuts` + `?` 開說明）
- ✅ **B6 排序選項**（`SortSelector` + `useSortMode` + URL query 同步）
- ✅ **B3 深色模式完善**（toast / tooltip / skeleton 對比度）
- ✅ **特效大爆發**：
  - 🔥 **B-飆升動畫**（票數激增的火焰徽章 + 排名變化動效）
  - 🎯 **連擊計數**（同首歌 3 秒內連投觸發中央 COMBO 大字）
  - 🐎 **黑馬時刻**（排名跳升 ≥3 名且進前 5 觸發全螢幕慶祝）
  - 🎉 **集體投票特效**（GlobalHype 同時段多人投票觸發共鳴）
  - 👑 **領袖板**（VoterLeaderboard 顯示貢獻最多的訪客）
- ✅ **OG 預覽圖生成**（`scripts/generate-og-image.mjs` + Noto Sans TC subset）
- ✅ **Husky pre-commit** + **lint-staged**
- ✅ **Lighthouse CI**（perf ≥85 / a11y ≥90 / CLS ≤0.1）
- ✅ **firestore.ts 拆檔**（844 行 → 9 sub-modules）
- ✅ **8 個 .md → 2 個**（其餘進 `docs/archive/`）

### v4.1.x（2026-04）
- ✅ ErrorBoundary 測試修復 → **169/169 → 216/216**
- ✅ 五星佈局 RWD、手機端點播按鈕跑版修
- ✅ Bundle 1.2MB → 287KB（壓縮 76%）

### v4.0.x 以前
- ✅ Error Boundary、PWA 離線、Firestore IndexedDB 持久化
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
| B2 **多場活動支援（Multi-Event）** | ⏸️ **待做** | 唯一未啟動，估時 10-12h |
| B3 深色模式完善 | ✅ | toast / tooltip / skeleton 已完整 |
| B4 模糊搜尋強化 | ✅ | 拼音 + 首字母 + 注音 |
| B5 鍵盤快捷鍵 | ✅ | `Cmd+K` palette + `?` 說明 |
| B6 歌曲排序選項 | ✅ | 4 種排序 + URL query 同步 |

### B2 詳細實作建議（下一波重點）

**為什麼留在最後**：B2 改動 Firestore schema、`votes`/`songs` 都要加 `eventId` 索引、URL routing 也要重做。若做了 v5.0 一定要連帶做完文件與 migration script。

**最小可行版本（6-8 小時）**：
```
events/{eventId}
  ├─ title, code (6 碼), startAt, endAt
  ├─ status: 'live' | 'archived'
  └─ ownerUid (建立者)

訪客流：URL = /?event=ABCDEF → useEvent hook 載入該活動
管理員流：新增「活動」Tab → 列表 + 建立 + 結束
```

**核心難點**：
1. **舊資料 migration** — 既有 `votes` 全部歸到 `event=default`，否則統計儀表板會炸
2. **Firestore 複合索引** — `votes` 需要 `(eventId, songId, createdAt DESC)` 複合索引，部署前用 `firebase.json` 預先註冊
3. **演出模式 + 活動代碼** — `?mode=stage&event=ABCDEF` 雙 query 處理
4. **歸檔活動的唯讀畫面** — `status==='archived'` 時 disable 所有投票按鈕

**驗收條件**：可同時跑兩場活動 + 票數不互相污染 + 結束後可查歷史 + 管理員看得到跨活動總統計。

---

## 🌟 Phase C：長期進階

### C1. 歌詞同步播放 (LRC) 🟢 P3
**預估**：12–15 小時
- LRC 格式時間軸同步
- 管理員後台：歌詞編輯器（textarea + 預覽 / 自動產生時間戳）
- 演出模式整合：大螢幕投影歌詞，當前句高亮放大
- YouTube Embed 對齊（取 player currentTime）
- **進階**：拍子線（節拍器條）

### C2. 社群登入整合 🟢 P3
**預估**：6–8 小時 | Google → LINE → Apple
- 訪客可選擇匿名 or 登入
- 登入後雲端同步：點播歷史、收藏歌單、勳章、貢獻積分
- 留言匿名/實名切換
- ⚠️ **隱私聲明** + **未成年保護** 條款要先寫好

### C3. 積分勳章系統 🟡 P2（已部分達成 — VoterPassport）
**預估**：剩 6–8 小時 | 需搭 C2 才能跨裝置同步

> **2026-05-16 更新**：`VoterPassportModal` 已完成 **本機版** — 6 個動態徽章 + 護照式 UI + 翻面互動，徽章規則依 `useVoteHistory` 即時計算。差雲端同步即可完成。

| 勳章 | 條件 | 效果 |
|------|------|------|
| 🎤 首次點播 | 第一次投票 | toast 動畫 |
| 🔥 熱情歌迷 | 單日 10 票 | side 浮動徽章 |
| 👑 點歌王 | 累積 100 票 | profile 王冠 |
| ⭐ 評論達人 | 給 50 次評分 | 評論區金邊 |
| 💎 打賞大戶 | 累積 100 次打賞 | 排行榜置頂 |
| 🌙 夜貓子 | 22:00 後投 20 票 | 月亮 icon |
| 🎬 黑馬獵人 | 投中 5 次黑馬歌曲 | 流星特效 |
| 🤝 領袖 | 在 VoterLeaderboard 上榜 10 次 | 桂冠標 |

### C4. AI 歌曲推薦 🟢 P3
**預估**：15–20 小時
- 收集 `(userId, songId, rating, timestamp)` 至 Firestore
- 前端跑 cosine similarity（不需後端）
- 進階版：呼叫 Gemini 1.5 Flash Free Tier
  - input: 訪客已投票 5 首歌 + 當下氣氛文字
  - output: 3 首推薦 + 一句推薦理由
- ⚠️ **成本控管**：套用 `gemini-free-tier-first` skill — Turnstile + maxInstances + 預算告警

### C5. 多語系 (i18n) 🟢 P3
**預估**：6–8 小時 | `react-i18next`
- zh-TW（預設） / zh-CN / en / ja
- 抽出所有 hardcode 字串至 `locales/*.json`
- 語言切換可記在 localStorage

### C6. 即時聊天/留言區 🟢 P3
**預估**：10 小時
- Firestore `events/{eventId}/chat/{messageId}`
- 訪客匿名暱稱（不需登入但有 nonce 防灌）
- 管理員可禁言、刪訊息、固定置頂
- 髒話過濾（中文 dirty-words list）
- ⚠️ **濫用風險高**：rate limit + 舉報機制 + 圖片連結禁止

### C7. 表演者打賞金流 🟢 P3
**預估**：20+ 小時
- 整合街口支付 / LINE Pay / Stripe
- ⚠️ 需 Cloud Functions、跨入後端範疇
- 法規面：發票、稅務、平台抽成
- **建議延後到專案有實質商業化需求才做**

---

## 🎨 Editorial 系統下一步（v4.2.1 之後的延伸建議）

> 三個原型已落地（UpNextBar / VoterPassport / OpeningCurtain）。下面是**直接接續這次成果**的優化清單，按「投入時間 / 收益」排序。

### 🎵 UpNextBar — 把估算進度換成真實同步

| # | 項目 | 估時 | 痛點 / 收益 |
|---|------|------|----------|
| **U1** | **進度條真實同步** | 3-4h | 目前用 `startedAt + 假設 210s` 估算，每首歌都當 3:30 計，跟實際播放有 ±60s 誤差 |
| **U2** | **「展開完整隊列」抽屜** | 3h | 目前 `+5 看全部` 只是 scroll 到排行榜，不夠精緻；改成從底部滑出 320px 高的抽屜列出全部 18 首隊列 |
| **U3** | **隊列卡 hover 預覽** | 2h | hover 隊列卡時 200ms 後彈出小卡：封面 + 點播次數 + 平均評分 + 預估時長 |
| **U4** | **手機版 swipe 切換隊列** | 2h | 手機只露 1 張卡，可加左右滑顯示其他 2 張；用 framer-motion drag |
| **U5** | **演出模式整合** | 1.5h | StagePage 大螢幕也加 UpNextBar（更大字體 + 6 張卡，不顯示 +5）|

**U1 詳細做法**：
```typescript
// 在 nowPlaying 文件新增 duration / pausedAt 欄位
interface NowPlayingInfo {
  songId: string;
  song: Song | null;
  startedAt: Date;
  startedBy: string;
  durationSec?: number;   // 🆕 admin 設定，預設 210
  pausedAt?: Date | null; // 🆕 暫停時間戳，null 表示播放中
}
// admin 介面：開始彈奏時讓 admin 拉個滑桿選 2:30 / 3:00 / 3:30 / 4:00 / 5:00
// UpNextBar 計算：elapsed = (pausedAt ?? now) - startedAt
```

---

### 🎖️ VoterPassport — 從本機履歷升級成跨裝置雲端徽章

| # | 項目 | 估時 | 痛點 / 收益 |
|---|------|------|----------|
| **V1** | **真實「首發點播」判定** | 4h | 目前是「投過 1 票」就解；要做正版需查 Firestore `votes` 集合的 timestamp ASC 找 N=1 |
| **V2** | **真實「評星達人」徽章** | 3h | 目前是「累積 10 首」代理；要查 `interactions` 集合內 type=rating 的紀錄 |
| **V3** | **新增 3 個徽章** | 2h | 🎂 周年紀念（投票滿 1 年）/ 🌙 夜貓子（22:00 後投 20 票）/ 🐎 黑馬獵人（投中 5 次 useDarkHorse 事件） |
| **V4** | **履歷 PNG 匯出 / 分享卡** | 4h | 仿 ShareCardModal 用 html-to-image 把護照頁產成 IG 直式 PNG；vb-foot 的「分享我的催歌履歷」目前 fallback 到 ShareCard，可做專屬「履歷分享卡」 |
| **V5** | **管理員看別人的履歷** | 3h | 在 VoterLeaderboardModal 點某個訪客 → 開該 sessionId 的護照 |
| **V6** | **徽章解鎖 toast** | 1.5h | 投票時偵測到剛達成解鎖條件，全螢幕中央 1.5s 慶祝動畫（仿 DarkHorseOverlay） |
| **V7** | **頭像可上傳** | 5h | 護照 portrait 框現在是「@Guest 首字母」，可加上傳介面（需 Firebase Storage + 圖片裁切） |

**V1 + V2 共用「先驗 Firestore 再算徽章」基礎建設**（4h），做完後三個徽章規則一起切到伺服器資料源。

---

### 🎭 OpeningCurtain — 從「使用者進站儀式」升級成「演出真實同步」

| # | 項目 | 估時 | 痛點 / 收益 |
|---|------|------|----------|
| **O1** | **admin 廣播觸發** | 3h | 目前手動「🎭 開場」只對自己播；可寫入 Firestore `ceremonies/current` doc，所有訪客即時收到並播放 |
| **O2** | **中場休息 / Intermission 儀式** | 4h | Side A 結束 → Side B 開始之間的轉場（黑膠翻面動畫 + 「Flip to Side B」大字 + 30 秒倒數） |
| **O3** | **歌曲過場短儀式（2 秒）** | 3h | nowPlaying 切到新歌時，全螢幕 2 秒 mini-curtain：上一首淡出 + 黑膠換 label 顏色 + 下一首歌名淡入 |
| **O4** | **手機體驗微調** | 1.5h | 目前手機版 vinyl 240px 但 ripple 定位是寫死座標，要逐項調對齊；唱針 SVG 化也比較銳利 |
| **O5** | **儀式預覽工具（admin only）** | 2h | admin 工具列加按鈕「預覽 6 秒儀式」直接重播；目前每次要清 sessionStorage 才能重看 |
| **O6** | **音效層** | 2h | 黑膠落針 *click*、唱針摩擦 *vinyl crackle*、跑馬燈淡入有 *click-click* — 用 Web Audio API 同步 keyframes |

**O1 是真正的高光時刻** — 觀眾在現場手機都同時看到開場儀式 = 像演唱會真正按下「Side A」按鈕的感覺。設計上：
```
Firestore: ceremonies/{type}/{...}
  type: 'opening' | 'intermission' | 'song-transition'
  triggeredAt: Timestamp
  triggeredBy: adminUid
  payload?: { fromSongId, toSongId, ... }

訪客 hook useCeremony() onSnapshot → 若 triggeredAt > 進站時間 → 觸發儀式
```

---

### 🪄 跨元件協同（小事但連起來特別好看）

| # | 項目 | 估時 | 連結 |
|---|------|------|------|
| **X1** | **投票時 UpNextBar 卡片黃光 + 隊列卡爬升動畫** | 2h | 已有 un-flash 黃光，可加 framer-motion layout 排序遞補 |
| **X2** | **VoterPassport 進度條即時動畫** | 1h | 投票後若新解鎖徽章，passport 已開的話進度條 spring 動畫到 100% + 蓋章音效 |
| **X3** | **OpeningCurtain 進入後自動展開 UpNextBar 抽屜** | 1.5h | 6 秒儀式結束 fade out 後 1 秒，UpNextBar 從下方 slide in 並停 3 秒高亮，引導觀眾看「等等要彈什麼」 |
| **X4** | **節目單分享卡同步 UpNextBar 隊列順序** | 2h | ShareCardModal 取的 top-voted 已經跟 UpNextBar 一致，可加上「次首」藍邊角標讓兩邊視覺一致 |
| **X5** | **ThankYouModal 結尾 → 統計動畫銜接** | 2h | END OF SIDE A 後可選自動跳出統計卡：「今晚 287 票 / 18 首歌 / 最熱：晴天」 |

---

### 📊 整體建議實施順序（CP 值排序）

**短期（一週內，~8h）**：U1 + O5 + X1
- 進度條真實同步 + admin 預覽工具 + 投票時隊列爬升動畫 — 立刻改善現場觀感

**中期（兩週，~12h）**：V1+V2 + O1 + V4
- 徽章接 Firestore + 開場儀式廣播 + 履歷分享卡 — 把「私人本機體驗」升級成「現場共鳴」

**長期（一個月，~15h）**：O2 + O3 + V7 + X3+X5
- 多種儀式（中場、過場）+ 頭像系統 + 跨元件聯動 — 整個系統儀式感完整成形

---

## 🎯 v4.3 → v5.0 立即可做的詳細建議

> 以下是「不大但很值得做」的優化清單，每個都可獨立完成、PR 小、上線立即有感。

### 🎁 P0：即刻有感（每個都 < 4 小時）

#### 1. **pinyin-pro 改 lazy load**（省 ~140KB raw / ~80KB gzip）
**現況**：`pinyin-jsHMj9PS.js` = **216KB raw / 138KB gzip**，使用者沒用搜尋也吃掉這塊。
**做法**：把 `useSongSearch.ts` 內 `import { pinyin } from 'pinyin-pro'` 改成首次 focus 搜尋框時動態 import。

```typescript
// hooks/usePinyinLazy.ts
let pinyinModule: typeof import('pinyin-pro') | null = null;
export async function getPinyin() {
  if (!pinyinModule) {
    pinyinModule = await import('pinyin-pro');
  }
  return pinyinModule;
}
```
**預估**：1.5 小時
**驗收**：初始 bundle 減少 80KB+，首次搜尋有 < 100ms 延遲（可接受）

#### 2. **firebase modular 拆分** （省 ~150KB）
**現況**：`firebase-DmM-wV4S.js` = **560KB raw / 135KB gzip**。
**問題排查**：可能有未使用的 firebase modules 被 bundle 進來。
**做法**：
- 確認 `firebase.ts` 只 import `firestore` + `auth` + 必要的 `app`
- 移除 `firebase-admin`（這只能在 Node.js / Cloud Functions 用，前端 bundle 不該有）
- 改用 `firebase/firestore/lite` 評估（無 offline persistence 但 size 砍半）

**預估**：2 小時
**驗收**：firebase chunk < 300KB

#### 3. **Lighthouse PWA 衝 100 分**
**做法**：
- 確認 `manifest.json` 有 `purpose: "maskable"` 圖示
- `theme_color` 與深色/淺色配對
- 加上 `screenshots` 陣列（行動 + 桌面各一張）
- `display: standalone` + `start_url: "/"`
- 加 `<meta name="theme-color">` 適配兩種主題

**預估**：1.5 小時
**驗收**：Lighthouse PWA = 100

#### 4. **執行 WebP 轉換**（腳本已寫但沒跑）
```bash
npm run webp
```
然後 `<img>` 改用 `<picture>` 套組：
```tsx
<picture>
  <source srcSet="/cover.webp" type="image/webp" />
  <img src="/cover.png" alt="..." loading="lazy" />
</picture>
```
**預估**：1 小時（含換 picture tag）
**驗收**：圖片總 size 減 ~70%

#### 5. **Web Vitals 上報到 Firebase Analytics**
```typescript
// main.tsx
import { onCLS, onFID, onLCP, onTTFB, onINP } from 'web-vitals';
import { logEvent } from 'firebase/analytics';

onCLS(m => logEvent(analytics, 'web_vital', { name: 'CLS', value: m.value }));
onLCP(m => logEvent(analytics, 'web_vital', { name: 'LCP', value: m.value }));
// ... 同上
```
**預估**：30 分鐘
**驗收**：Firebase Console > Analytics > Events 看得到 `web_vital`

#### 6. **字型 preload + font-display: swap**
`index.html` 加：
```html
<link rel="preload" href="/fonts/noto-tc.woff2" as="font" type="font/woff2" crossorigin>
```
CSS 字型 declaration 加 `font-display: swap`，避免 FOIT（隱形文字閃爍）。
**預估**：30 分鐘

---

### 🎨 P1：UX 拋光（每個 2-6 小時）

#### 7. **歌曲詳情頁 / Modal**（點 SongCard 開展詳細）
目前點 SongCard 直接投票，沒法看 lyrics、past performance 統計、評分分佈。
**做法**：
- 短按投票（現有）
- 長按 / hover icon 開 `SongDetailModal`
  - 歷史被點次數曲線
  - 評分分佈直方圖
  - 標籤雲
  - YouTube 預覽（若 `youtubeId` 欄位有值）
  - 「想再聽」按鈕（收藏）

#### 8. **收藏歌單**（不需登入，純 localStorage）
- 心型 icon 點擊加入收藏
- 漢堡選單入口「我的收藏」
- 演出當下可一鍵把所有收藏批次投票（限管理員）

#### 9. **建議歌曲審核工作流**
目前 suggestions 進 Firestore 但**沒有後台管理 UI**？要確認：
- 管理員看得到 pending suggestions 列表
- 可一鍵「採納 → 加入歌單」or「拒絕 → 標記原因」
- 採納時 auto-prefill EditDialog

#### 10. **即時投票脈衝**（細節動畫）
- 每筆投票進來時，對應 SongCard 邊框閃綠光 0.5s
- 排行榜的條形圖寬度用 spring 動畫過渡
- 第 1 名換人時播放短音效（可選靜音）

#### 11. **管理員批次工具**
- **CSV 匯入歌曲**：拖檔 → 預覽 → 確認匯入
- **批次標籤套用**：勾選多首 → 套相同 tag
- **批次刪除/封存**
- **歌單匯出** JSON / CSV 備份

#### 12. **演出模式增強**
- 加入「節目單預覽」(下一首播什麼)
- QR Code 大圖左下顯示，讓現場觀眾掃描加入投票
- 跑馬燈可自訂訊息（活動主題、贊助商）
- 倒數計時器（活動還有幾分鐘）

---

### 🛡️ P1：守門員（每個 1-3 小時）

#### 13. **Sentry 錯誤追蹤**
- `@sentry/react` + `@sentry/vite-plugin` 自動上傳 source map
- 整合 ErrorBoundary `componentDidCatch`
- 一個月免費 5K events 對小流量站夠用
- **環境變數**：用 `gcp-api-key-secure-create` skill 設 Sentry DSN

#### 14. **Firestore Rules 單元測試**
```bash
npm i -D @firebase/rules-unit-testing
```
- 寫 `firestore.rules.test.ts`：
  - 訪客不能改別人的 vote
  - 投票時間戳必須 `request.time`
  - difficulty 必須 1/2/3
  - 管理員 UID 才能 update songs
- 整合進 CI（rules 修改前自動跑）

#### 15. **rate limit 強化（防同一裝置狂點）**
- 用 `useVoteHistory` 已有的本地記錄
- 同首歌 60 秒內投 ≥5 次 → 前端擋
- Firestore Rules 配合：每分鐘 ≤10 票（搭配 `rateLimits/{uid}` collection）

#### 16. **CSP（Content-Security-Policy）**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' apis.google.com www.googletagmanager.com 'sha256-XXX';
  connect-src 'self' *.firebaseio.com *.googleapis.com;
  img-src 'self' data: https:;
  style-src 'self' 'unsafe-inline';
  font-src 'self' data:;
">
```
**注意**：firebase SDK 用 inline script，要小心 sha256 hash。

---

### 🧪 P2：測試擴張（每個 3-8 小時）

#### 17. **E2E with Playwright**
```bash
npm i -D @playwright/test
npx playwright install chromium
```
3 個關鍵 flow 起手：
1. 訪客投票流程（搜尋 → 投票 → 看排行榜）
2. 管理員登入後新增歌曲 + 設標籤 + 設難度
3. 演出模式進入 + 黑馬慶祝觸發（mock 多筆 vote）

#### 18. **視覺迴歸 with Chromatic**
- 註冊 Chromatic 免費版（每月 5,000 snapshots）
- `npm i -D chromatic`
- 配合 Storybook（要新增）抓 SongCard / RankingBoard / Modals 各個狀態快照
- PR 自動比對，UI 跑版立即抓

#### 19. **無障礙 with vitest-axe**
- `npm i -D vitest-axe`
- 對每個主要 component 跑 a11y check
- 重點：對比度、aria-label、focus order、screen reader 友善

---

## ⚡ Bundle 二次優化

> 目前看到的優化空間，總計可省 ~250KB raw / ~120KB gzip

### 詳細 chunk 分析（v4.2.0+ 實測）

| Chunk | Raw | Gzip | 優化建議 |
|-------|-----|------|----------|
| `firebase` | 560 KB | 135 KB | ⭐ 拆 modular import、移除 firebase-admin、評估 firestore/lite |
| `charts` (recharts) | 411 KB | 111 KB | ✅ 已 lazy（StatsDashboard 內） |
| `index` (main app) | 318 KB | 94 KB | 評估 framer-motion tree-shake |
| `pinyin-pro` | 216 KB | 139 KB | ⭐ Lazy on first search |
| `react-vendor` | 141 KB | 45 KB | 已最佳 |
| `ui-radix` | 118 KB | 37 KB | 評估只 import 用到的 primitive |
| `animation` (framer-motion) | 114 KB | 38 KB | 評估換成 `motion` (輕量 fork) |

### 具體動作（排序）

1. **pinyin-pro lazy**（1.5h，省 80KB gzip）— 最高 CP 值
2. **firebase 拆分**（2h，省 50KB gzip）
3. **framer-motion → motion**（3h，省 20KB gzip）— 視 API 相容性
4. **ui-radix 精簡**（2h，省 10KB gzip）— 確認沒用到的 primitive 全砍

### 額外建議

- **route-based code splitting**：`StagePage` 已 lazy，但 admin-only 元件（EditDialog 已 lazy）可確認都走 lazy
- **manifest.json sw scope**：確認 SW 不快取大檔（如 og-preview.png）導致首載肥大
- **Brotli 壓縮**：Firebase Hosting 預設 gzip，若改 Cloudflare CDN 可 brotli 再省 15%

---

## 🛡️ 安全性下一階段

> ⚠️ **重要決定記錄**：App Check 已於 2026-05-08 關閉並徹底清除（`bb11037`）。理由：本站定位是學生展演活動，沒有商業價值，不需要防灌票成本。**未來若有公開大型活動或商業用途再啟用**。

| 項目 | 現況 | 優先級 | 估時 |
|------|------|:------:|------|
| API Key restrictions | ⚠️ 待檢查 | 🟠 | 0.5h |
| CSP header | 未設定 | 🟡 | 2h |
| HSTS | 未設定 | 🟡 | 0.5h |
| Sentry 整合 | 未設定 | 🟠 | 2h |
| 輸入過濾（DOMPurify） | 基本 | 🟡 | 1h |
| Firestore Rules 測試 | 無 | 🟠 | 3h |
| 速率限制（前端） | 部分（useVoteHistory） | 🟡 | 2h |
| 速率限制（rules） | 無 | 🟢 | 4h |

### API Key 限制檢查清單（最高優先）

1. 打開 GCP Console → APIs & Services → Credentials
2. 找出 `guitar-ff931` 專案的 Browser API Key
3. 確認設 HTTP referrers 限制：
   - `https://cagoooo.github.io/song/*`
   - `http://localhost:5173/*`（開發）
4. 確認 API restrictions 只勾：
   - Cloud Firestore API
   - Firebase Auth API
   - Firebase Installations API
5. **如果沒設**：立刻設，否則 key 流出可能被人狂打 quota

> 📌 用 `firebase-stack-automation` skill 可一鍵自動化。

---

## 🧪 測試策略升級

**現況**：216 個單元測試 ✅，覆蓋率高。
**缺口**：缺 E2E、視覺迴歸、a11y、Firestore rules test。

| 類型 | 工具 | 估時 | 優先級 |
|------|------|------|:------:|
| **E2E 測試** | Playwright | 6h（3 flows） | 🟠 P1 |
| **視覺迴歸** | Chromatic / Percy | 4h | 🟡 P2 |
| **效能迴歸** | Lighthouse CI | ✅ 已有 | — |
| **Firestore Rules 測試** | `@firebase/rules-unit-testing` | 3h | 🟠 P1 |
| **無障礙測試** | `vitest-axe` | 2h | 🟡 P2 |
| **元件文件 / Storybook** | Storybook 8 | 8h | 🟢 P3 |

---

## 📈 可觀測性與分析

**現況**：Firebase Performance 已啟用，但**未充分利用**。

### 立即可做（< 2 小時）

1. **Firebase Analytics 自定事件**
   - `vote_submitted`（帶 songId, isCombo, isSurge）
   - `suggestion_added`
   - `tag_filtered`（帶 tags 陣列）
   - `pwa_installed`
   - `stage_mode_entered`
   - `dark_horse_triggered`
   - `combo_triggered`（帶 comboCount）

2. **每事件帶 sessionId 維度**（用 `crypto.randomUUID()` 存 sessionStorage）→ 方便事件漏斗分析

3. **使用者旅程漏斗**（在 GA4 Console 設）
   - 進站 → 看歌單 → 投票 → 再投票（return rate）

### 中期（4-6 小時）

4. **Sentry 錯誤追蹤** + source map
5. **LINE 通知整合**（你已有 `line-messaging-firebase` skill）
   - 每天 8AM 推播昨日投票統計給管理員
   - 黑馬時刻即時推播
   - 系統錯誤超過 5 次/分鐘告警

6. **自建簡易儀表板**
   - 已有 StatsDashboard，但只看「歌曲面」
   - 加「平台面」：DAU/WAU、PWA 安裝數、平均 session 時長、跳出率

---

## 🎨 UX 細節提升清單

> 小事，但累積起來能讓產品「感覺更精緻」

### 動效層次（小修但影響大）
- [ ] **滾動條樣式化**（深色模式現在還是預設灰）
- [ ] **載入骨架屏更細緻**（目前是大色塊，可改成 song row 形狀的模板）
- [ ] **page transition**（route 切換動效）
- [ ] **微互動**：按鈕 hover scale 1.02、click 觸覺回饋（mobile vibrate API）
- [ ] **空狀態插圖**：沒搜尋結果、沒投票歷史、沒活動… 都該有友善插圖

### 排行榜細節
- [ ] **前 3 名特殊配色**（金/銀/銅漸層）
- [ ] **排名變化箭頭**（↑3 ↓1 — 已部分實作？）
- [ ] **歌手大頭照欄位**（管理員可上傳，預設用首字 avatar）
- [ ] **YouTube 縮圖**（若有 youtubeId，顯示 thumbnail）

### 訪客 onboarding
- [ ] **首次進站 quick tour**（3 步教學：搜尋 → 投票 → 看排行榜）
- [ ] **新功能 announcement**（v4.x 更新後彈出 changelog）
- [ ] **空歌單時的 CTA**：「歡迎來到 XXX 演出！點選任何一首歌投票」

### 管理員體驗
- [ ] **快捷鍵 panel**（已有 `?` 但可再豐富）
- [ ] **管理員專用 Toolbar**（永遠浮在右下角，4 個快速操作）
- [ ] **批次選取模式**（長按 SongCard 進入選取）
- [ ] **撤銷功能**（誤刪歌曲後 5 秒內可 Undo）

---

## 📅 建議實施時程

### v4.3.0（本週末，4-6 小時內可完成）
> **主題：性能 + 守門員雙線並進**

| 項目 | 估時 | 依賴 |
|------|------|------|
| 1. pinyin-pro lazy load | 1.5h | 無 |
| 2. firebase 拆分 + 移除 firebase-admin | 2h | 無 |
| 3. Lighthouse PWA 100 分 | 1.5h | 無 |
| 4. Web Vitals 上報 | 0.5h | 無 |
| 5. API Key 限制檢查 | 0.5h | 無 |

**驗收**：Initial bundle gzip < 200KB、Lighthouse PWA = 100、API Key 有 referer 限制。

### v4.4.0（下週，6-8 小時）
> **主題：UX 拋光**

| 項目 | 估時 | 依賴 |
|------|------|------|
| 字型 preload + font-display | 0.5h | 無 |
| WebP 圖片轉換落實 | 1h | 無 |
| 歌曲詳情 Modal | 3h | 無 |
| 收藏歌單 localStorage | 2h | 無 |
| 演出模式增強（QR + 跑馬燈自訂） | 2h | 無 |

### v4.5.0（2 週內，8-12 小時）
> **主題：測試 + 監控完整化**

| 項目 | 估時 | 依賴 |
|------|------|------|
| Sentry 錯誤追蹤 + source map | 2h | 無 |
| Firebase Analytics 自定事件 | 1h | 無 |
| Firestore Rules 單元測試 | 3h | 無 |
| Playwright E2E（3 flows） | 6h | 無 |

### v5.0.0（1 個月內，重大版本）
> **主題：多場活動 + 雲端同步**

| 項目 | 估時 |
|------|------|
| **B2 多場活動支援** | 12h |
| **C2 社群登入**（Google 優先） | 8h |
| Migration script（既有資料歸 default event） | 3h |
| **A11y 全面審查 + axe** | 4h |
| 視覺迴歸 Chromatic | 4h |

### v6.0.0（2-3 個月內，AI 化）
| 項目 | 估時 |
|------|------|
| C1 歌詞同步播放（LRC） | 15h |
| C3 積分勳章系統 | 15h |
| C4 AI 歌曲推薦（Gemini Free Tier） | 18h |
| C5 多語系 | 8h |

### v7.0.0（3+ 個月，社群化）
| 項目 | 估時 |
|------|------|
| C6 即時聊天 | 10h |
| Storybook + 元件庫文件化 | 8h |
| Cloud Functions（後端服務） | 視範疇 |
| C7 打賞金流（若有商業需求） | 20h+ |

---

## 🎯 Top 10 立即可做（v4.2.1 之後最高 CP）

> **本週末挑這幾項，PR 小、改完立刻有感**

| # | 項目 | 估時 | 收益 | 出處 |
|---|------|------|------|------|
| 1 | **UpNextBar 進度條真實同步**（U1） | 3h | 演出現場觀感升一級 — 不再每首歌都顯示 3:30 估算 | 新增 |
| 2 | **OpeningCurtain admin 廣播觸發**（O1） | 3h | 觀眾在現場手機**同步**看到開場儀式 — 演唱會儀式感的高光 | 新增 |
| 3 | **VoterPassport 接 Firestore 真實徽章**（V1+V2） | 4h | 「首發點播」與「評星達人」改成真實判定 | 新增 |
| 4 | **pinyin-pro lazy load** | 1.5h | 初始 bundle -80KB gzip | 既有 |
| 5 | **API Key restrictions 檢查** | 0.5h | 防 key 洩漏被打 quota | 既有 |
| 6 | **Lighthouse PWA = 100** | 1.5h | 安裝體驗 / 商城上架 / 評分 | 既有 |
| 7 | **Web Vitals 上報** | 0.5h | 看得到真實使用者的 LCP/CLS | 既有 |
| 8 | **OpeningCurtain admin 預覽工具**（O5） | 2h | admin 不用清 sessionStorage 也能重看 | 新增 |
| 9 | **歌曲詳情 Modal** | 3h | 訪客體驗大升級 | 既有 |
| 10 | **Sentry 錯誤追蹤** | 2h | 看到使用者端的真實錯誤 | 既有 |

**總計 ~21 小時**。如果只挑 3 項做「演出儀式感再進化」：**1 + 2 + 3**（10h，一個週末做完，產品推進到 v4.3 Editorial 完整版）。

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

## 📦 v4.2.0+ 已建立的元件清單（快速索引）

### 新增 hooks
| Hook | 用途 |
|------|------|
| `useAllSongTags` | 收集全歌單的標籤集合（給 TagFilterBar） |
| `useVoteHistory` | localStorage 點播歷史 + 今日累計 |
| `useSortMode` | 4 種排序模式 + URL query 同步 |
| `useStatsData` | 6 大圖表的聚合運算 |
| `useVoteSurge` | 偵測票數飆升（火焰特效） |
| `useComboCounter` | 同首歌 3 秒內連投偵測 |
| `useDarkHorse` | 排名跳升 ≥3 名觸發黑馬 |
| `useGlobalHype` | 多人同時段投票偵測 |
| `useVoterLeaderboard` | 訪客貢獻排行 |
| `useKeyboardShortcuts` | 全域快捷鍵綁定 |
| `useServiceWorkerUpdate` | SW 新版偵測 + 重新整理 |

### 新增 components
| Component | 用途 |
|------|------|
| `TagFilterBar` | 標籤多選篩選列 |
| `VoteHistoryButton` / `VoteHistoryModal` | 個人歷史 |
| `SortSelector` | 排序下拉 |
| `StatsDashboard` | 統計儀表板 |
| `StagePage` | 演出模式專用頁 |
| `SurgeBadge` | 飆升火焰徽章 |
| `ComboOverlay` | COMBO 全螢幕大字 |
| `DarkHorseOverlay` | 黑馬慶祝動畫 |
| `GlobalHypeOverlay` | 集體投票共鳴 |
| `VoterLeaderboardModal` | 領袖板 |
| `CommandPalette` | Cmd+K 命令面板 |
| `ShortcutsHelpModal` | ? 快捷鍵說明 |
| `UpdatePrompt` | 新版本可用 banner |
| `ShareCardModal` 🆕 | 節目單分享卡（IG + FB OG） |
| `ThankYouModal` 🆕 | END OF SIDE A 演出收尾感謝卡 |
| `UpNextBar/` 🆕 | 底部 sticky 96px 隊列條（演出中 / 剛投票 / 待開場三狀態） |
| `VoterPassportModal` 🆕 | 護照式催歌履歷（6 動態徽章 + SVG 圓章 + 油墨蓋章濾鏡） |
| `OpeningCurtain` 🆕 | 6 秒開場儀式（11 keyframes 完整時間軸 + sessionStorage 觸發） |

### 新增腳本
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
- 文件歸檔：`docs/archive/`（含 v3.x 之前的開發紀錄）

---

*最後更新：2026-05-16 | v4.2.1 Editorial 第二波 | 下次更新時機：完成 Top 10 中前 3 項（UpNextBar U1 + OpeningCurtain O1 + VoterPassport V1+V2）*
