# 🚀 互動式吉他彈唱點播平台 — 開發進度 & 未來路線圖

> **文件版本**：10.2
> **更新日期**：2026-05-18（v4.6.1 hotfix 事故覆盤）
> **當前版本**：**v4.6.1**（CSS @import 順序救援 — 整站跑版 hotfix）
> **GitHub**：[cagoooo/song](https://github.com/cagoooo/song)
> **目的**：完整反映已完成項目、針對 editorial 雜誌風方向提供詳細未來優化與開發建議
> **📐 詳細設計文件**：[docs/design/](docs/design/README.md) — D1-D6、T1-T4、C1、C3 共 12 份獨立設計文件

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
12. [🧹 程式碼健康度 / 技術債](#-程式碼健康度--技術債)
13. [📅 建議實施時程 (v4.7 → v7.0)](#-建議實施時程)
14. [🎯 Top 7 立即可做（推薦順序）](#-top-7-立即可做)

---

## ✅ 已完成里程碑

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
| 3. `index.css` 拆 5 個檔 | 2h | 無 |
| 4. 5 件套單元測試（先寫 3 個高風險：Passport / UpNext / ShareCard） | 3h | 無 |

**驗收**：API key 有 referer 限制、index.css 最大檔 < 1500 行、testbench 240+ 個 ✅

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

