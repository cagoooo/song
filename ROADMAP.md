# 🚀 互動式吉他彈唱點播平台 - 未來開發路線圖

> **文件版本**: 8.1
> **更新日期**: 2026-05-01
> **當前版本**: **v4.1.2**（技術債務批次清理完成）
> **GitHub**: https://github.com/cagoooo/song
> **目的**: 提供最新進度總覽 + 詳細未來優化與開發建議

---

## 🆕 本批次完成（2026-05-01 技術債務清理）

| 項目 | 變更 | 影響 |
|------|------|------|
| **firestore.ts 拆檔** | 844 行 → 9 個 sub-module（types/songs/suggestions/tags/nowPlaying/playedSongs/interactions/qrScans/session）+ barrel `index.ts` | 維護性大幅提升，**20+ 個既有 import 路徑零變更** |
| **TS 設定強化** | 加 `noFallthroughCasesInSwitch` + `forceConsistentCasingInFileNames` | 防 switch 漏 break、Mac/Windows 大小寫陷阱 |
| **MD 文件收斂** | 8 個 → 2 個（`README.md` + `ROADMAP.md`），其餘移到 `docs/archive/` | 根目錄清爽 |
| **Husky pre-commit** | `.husky/pre-commit` 跑 typecheck + 169 測試 | 提交前自動把關 |
| **lint-staged 設定** | `package.json` 加 lint-staged config | 與 Husky 搭配 |
| **GitHub Actions CI** | `.github/workflows/ci.yml` — typecheck + test + build + bundle size guard (<400KB) + Lighthouse on PR | 每次 push 自動把關 |
| **Lighthouse CI** | `.lighthouserc.json` — Perf ≥85、a11y ≥90、CLS ≤0.1 (error) | 效能迴歸守門員 |
| **Firestore preconnect** | `index.html` 加 3 個 `<link rel="preconnect">` 到 firestore/auth/installations | 首次連線省 ~150ms TLS handshake |
| **WebP 轉換腳本** | `scripts/convert-to-webp.mjs` + `npm run webp` | PNG → WebP 預估 ~70% 縮減 |
| **驗證結果** | TS clean、169/169 測試 pass、build 成功（主 bundle 283KB） | 零回歸 |

> **後續啟用步驟**（你需要跑一次 npm install）：
> ```bash
> npm i -D husky lint-staged @lhci/cli sharp
> npm run prepare           # 啟用 Husky
> chmod +x .husky/pre-commit
> npm run webp              # 把 PNG 轉成 WebP
> ```

---

## 📊 目前狀態總覽 (v4.1.2)

| 指標 | 現況 | 對比目標 | 狀態 |
|------|------|----------|------|
| **Bundle Size** | **287 KB** | < 600 KB | ✅ 超越 |
| **單元測試** | **169 個 / 100% 通過** | 50% 覆蓋率 | ✅ 達標 |
| **PWA 支援** | Service Worker + Manifest | 離線可用 | ✅ 完成 |
| **Error Boundary** | 全域錯誤防護 | 覆蓋全 App | ✅ 完成 |
| **手機版 RWD** | Tab 切換 + 跨頁互動 | 全頁面響應式 | ✅ 完成 |
| **正在彈奏 + 評分** | 即時同步 + 五星 | 訪客互動完整 | ✅ 完成 |

---

## 📋 目錄

1. [✅ 已完成里程碑（v2.x → v4.1.2）](#-已完成里程碑)
2. [🔥 Phase A：短期高優先 (1-2 週)](#-phase-a短期高優先-1-2-週)
3. [📱 Phase B：中期功能擴展 (2-4 週)](#-phase-b中期功能擴展-2-4-週)
4. [🌟 Phase C：長期進階 (1-3 個月)](#-phase-c長期進階-1-3-個月)
5. [🔧 技術債務 & 重構](#-技術債務--重構)
6. [⚡ 效能優化下一階段](#-效能優化下一階段)
7. [🛡️ 安全性強化](#-安全性強化)
8. [🧪 測試策略升級](#-測試策略升級)
9. [📈 可觀測性與分析](#-可觀測性與分析)
10. [📅 建議實施時程 (v4.2 → v5.0)](#-建議實施時程)

---

## ✅ 已完成里程碑

### v4.1.2 (2026-05-01)
- ✅ ErrorBoundary 測試修復，**169/169 通過**（100%）
- ✅ 「正在彈奏中」評分區五星佈局 RWD 修復

### v4.1.1 (2026-04)
- ✅ 手機端點播按鈕佈局跑版修復

### v4.1.0
- ✅ **Bundle 優化**：1.2 MB → **287 KB**（壓縮 **76%**）
- ✅ 測試覆蓋率提升至 **142 個 → 169 個** 測試
- ✅ UI 跑版修復批次

### v4.0.0
- ✅ **Error Boundary** 全域錯誤防護
- ✅ 排行榜動畫優化（減少空白閃爍）

### v3.11.0
- ✅ 歌曲建議通知改為全螢幕中央顯示，支援 RWD

### v3.10.0 ~ v3.10.1
- ✅ 即時通知系統：投票時桌面通知管理員（後改為即時 toast）

### v3.9.0
- ✅ **訪客互動動畫**：打賞動畫、評分系統、即時同步

### v3.8.0 ~ v3.8.3
- ✅ **PWA 離線支援**（Service Worker、manifest.json、Firestore IndexedDB 持久化、安裝提示）
- ✅ MobileTabView 受控模式
- ✅ 排行榜重複歌曲自動跳轉 + 搜尋
- ✅ 管理員登入自動切到排行榜 Tab

### v3.7.1
- ✅ 統一 Firestore 錯誤處理（`error-handler.ts` + `getErrorToast`）

### v3.0.0 ~ v2.x
- ✅ React.memo + 虛擬滾動效能優化
- ✅ SongList 1033 行 → 8 個獨立模組
- ✅ Vitest 框架建立
- ✅ Firestore 安全規則部署 (`guitar-ff931`)

---

## 🔥 Phase A：短期高優先 (1-2 週)

> 焦點：把 v4 系列既有基礎（測試、Bundle、PWA、Error Boundary）轉化為使用者直接感受得到的價值。

### A1. 標籤篩選 UI 完整串接 🟠 P1
**現況**：已有 `TagSelector.tsx` + `useTags.ts` + `useTags.test.ts`，但**篩選結果尚未串到 SongList**。
**價值**：訪客找歌時間 ↓ 50%
**預估**：3–4 小時

**實作要點**：
- `Home.tsx` 新增 `selectedTags` state
- `SongList` 接收 `selectedTags` prop，於 `useSongSearch` 內加 filter
- 標籤旁顯示「(N 首)」即時統計
- 多選用 chip toggle，清除按鈕用 `aria-label="清除所有標籤"`

### A2. 歌曲難度標記（⭐ / ⭐⭐ / ⭐⭐⭐）🟠 P1
**價值**：表演者選曲速度 ↑、訪客選歌更貼合曲庫
**預估**：2–3 小時

**Schema 擴充**：
```typescript
interface Song {
  difficulty?: 1 | 2 | 3;  // 1=入門, 2=中等, 3=進階
}
```
- `EditDialog` 新增難度下拉
- `SongCard` 顯示星數
- Firestore Rules：`request.resource.data.difficulty in [1, 2, 3]`
- 與 A1 整合：可同時用「標籤 + 難度」雙重篩選

### A3. 點播歷史記錄（localStorage）🟠 P1
**價值**：訪客個人化、回流率 ↑
**預估**：3 小時

**結構**：
```typescript
// localStorage key: 'song_vote_history'
{
  votes: [{ songId, title, artist, timestamp }],  // 最近 50 筆
  todayCount: number,
  lastResetDate: string
}
```
- 歌單頂部顯示「今日已點播 X 首」
- 個人歷史 Modal（漢堡選單入口）
- 「再次點播」按鈕快速重投
- **不需 Firebase**，純前端實作

### A4. 演出模式（投影/全螢幕）🟠 P1
**價值**：表演現場大螢幕直接呈現排行榜
**預估**：4–5 小時

**功能**：
- URL `?mode=stage` 進入演出模式
- F11 全螢幕、隱藏管理按鈕
- Top 10 大字體、深色主題、自動輪播熱門歌
- 底部跑馬燈：「正在彈奏 + 平均評分」
- 每 30 秒自動刷新（Firestore listener 已支援）

### A5. CI/CD 自動化（GitHub Actions）🟠 P1
**現況**：手動 `npm run build` + `firebase deploy`
**預估**：2 小時

**`.github/workflows/deploy.yml`**：
```yaml
on: [push: main]
jobs:
  test-and-deploy:
    - npm ci
    - npm run check       # TypeScript
    - npm run test:run    # 169 測試
    - npm run build       # Bundle check < 400KB
    - firebase deploy --only hosting,firestore:rules
```
- 加入 Bundle Size 檢查（超過 400KB CI 紅燈）
- PR 自動跑測試 + 預覽部署（Firebase Hosting Preview Channel）

---

## 📱 Phase B：中期功能擴展 (2-4 週)

### B1. 統計儀表板 🟡 P2
**預估**：8–10 小時 | 需安裝 `recharts`、`date-fns`

| 圖表 | 資料來源 | 用途 |
|------|----------|------|
| 熱門歌曲 Top 10 | `votes` aggregate | 長條圖 |
| 每日投票趨勢 | `stats/daily` | 折線圖 |
| 時段熱度 | `votes.timestamp.hour` | 24h 熱力圖 |
| 歌手分佈 | `songs.artist` group | 圓餅圖 |
| 標籤偏好 | `songs.tags` × `votes` | 雷達圖 |
| CSV 匯出 | 全部 | 報表用 |

**目錄結構**：
```
components/StatsDashboard/
├── index.tsx          (lazy load — 不影響 287KB bundle)
├── QuickStats.tsx     KPI 卡片
├── VoteTrendChart.tsx
├── TopSongsChart.tsx
├── HourlyHeatmap.tsx
├── ArtistPieChart.tsx
└── hooks/useStats.ts
```
**注意**：`recharts` 約 90KB，必須 `React.lazy` 懶加載，僅管理員可見。

### B2. 多場活動支援（Multi-Event）🟡 P2
**預估**：10–12 小時

| 功能 | 說明 |
|------|------|
| 建立活動 | 管理員建立 `events/{eventId}`（標題、日期、活動代碼） |
| 訪客加入 | 輸入 6 碼活動代碼或掃 QR |
| 獨立計票 | `votes` 加 `eventId`，排行榜按 event 過濾 |
| 活動歸檔 | 結束後鎖投票，可查歷史 |
| 跨活動統計 | 累積總投票、最熱歌手 |

**Firestore Schema**：
```
events/{eventId}
  ├─ title, startAt, endAt, code
  ├─ status: 'upcoming' | 'live' | 'archived'
  └─ votes/{voteId} (subcollection)
```

### B3. 深色模式完善 🟡 P2
**預估**：3 小時
**待修**：Toast 對比度、Tooltip 邊框、骨架屏閃爍、互動動畫顏色刺眼。
建議用 CSS variables 統一管理：
```css
.dark { --toast-bg-success: theme('colors.green.900'); }
```

### B4. 模糊搜尋強化 🟡 P2
**現況**：已有 `useFuzzySearch.ts` + 測試，但**尚未取代主搜尋**。
**預估**：2 小時
- `useSongSearch` 改用 Fuse.js（已安裝）
- 支援注音、英拼錯字（「告白」→「告辛氣球」也能搜）
- 加入歌詞片段搜尋（若有 lyrics 欄位）

### B5. 鍵盤快捷鍵 🟡 P2
**預估**：2 小時
- `/` 聚焦搜尋
- `↑↓` 切歌曲、`Enter` 投票
- `Cmd/Ctrl+K` 開啟 command palette
- `?` 顯示快捷鍵說明
- 用 `useHotkeys` 或自製 hook

### B6. 歌曲排序選項 🟡 P2
**預估**：1.5 小時
- 排序：投票數 / 字母 / 新增時間 / 難度
- 持久化於 localStorage
- URL query string 同步（可分享）

---

## 🌟 Phase C：長期進階 (1-3 個月)

### C1. 歌詞同步播放 (LRC) 🟢 P3
**預估**：12–15 小時
- LRC 格式時間軸同步
- 管理員後台：歌詞編輯器（textarea + 預覽）
- 演出模式整合：大螢幕投影歌詞
- YouTube Embed 對齊（取 player currentTime）

### C2. 社群登入整合 🟢 P3
**預估**：6–8 小時 | Google → LINE → Apple
- 訪客可選擇匿名 or 登入
- 登入後雲端同步點播歷史、收藏歌單、勳章
- 留言匿名/實名切換

### C3. 積分勳章系統 🟢 P3
**預估**：12–15 小時

| 勳章 | 條件 |
|------|------|
| 🎤 首次點播 | 第一次投票 |
| 🔥 熱情歌迷 | 單日 10 票 |
| 👑 點歌王 | 累積 100 票 |
| ⭐ 評論達人 | 給 50 次評分 |
| 💎 打賞大戶 | 累積 100 次打賞 |
| 🌙 夜貓子 | 22:00 後投 20 票 |

需搭配 C2 才能跨裝置累積。

### C4. AI 歌曲推薦 🟢 P3
**預估**：15–20 小時
- 根據訪客投票歷史，推薦同曲風/同歌手
- 用 Firestore 收集 (userId, songId, weight)，前端跑 cosine similarity
- 進階版：呼叫 Gemini API 用「今晚氣氛 + 已投票歌曲」生成推薦
- ⚠️ **成本控管**：Gemini 走 Free Tier，加入 captcha + maxInstances 護欄

### C5. 多語系 (i18n) 🟢 P3
**預估**：6–8 小時 | `react-i18next`
- zh-TW (預設) / zh-CN / en / ja
- 抽出所有 hardcode 字串至 `locales/*.json`

### C6. 即時聊天/留言區 🟢 P3
**預估**：10 小時
- Firestore `chat/{eventId}/messages`
- 訪客匿名暱稱
- 管理員可禁言、刪訊息
- 髒話過濾（中文 dirty-words list）
- ⚠️ **濫用風險高**，務必先做 rate limit + 舉報機制

### C7. 表演者打賞金流 🟢 P3
**預估**：20+ 小時
- 整合 Stripe / LINE Pay / 街口支付
- ⚠️ **超出純前端範疇**，需 Cloud Functions
- 法規面：發票、稅務、平台抽成
- **建議延後到專案有商業化需求才做**

---

## 🔧 技術債務 & 重構

| 項目 | 優先級 | 說明 | 估時 |
|------|:------:|------|------|
| TypeScript `strict: true` | 🟠 | 啟用嚴格模式，修補 any | 4h |
| 移除 `@tanstack/react-query` | 🟡 | 確認已不用後 prune | 0.5h |
| `firestore.ts` 拆檔 | 🟡 | 按 collection 拆成 `votes.ts`/`songs.ts`/`events.ts` | 3h |
| Husky + lint-staged | 🟡 | pre-commit 自動 typecheck + test | 1h |
| ESLint 規則統一 | 🟢 | 採用 `eslint-config-airbnb` 或 `xo` | 2h |
| 移除 SESSION_PROGRESS.md / DEVELOPMENT_*.md 重複 | 🟡 | 8 個 md 收斂為 2 個（README + ROADMAP） | 1h |
| `MusicPlayer.tsx` 元件審視 | 🟢 | 是否仍被使用？未用就刪 | 0.5h |

---

## ⚡ 效能優化下一階段

Bundle 已從 1.2MB 砍到 287KB，下一步從**載入體驗**著手：

| 指標 | 目前 | 目標 | 策略 |
|------|------|------|------|
| FCP | ~1.2s | < 0.8s | 預載入 critical CSS、字型 swap |
| LCP | ~2.0s | < 1.5s | Hero 區圖片 priority、preconnect Firestore |
| TTI | ~2.5s | < 2.0s | defer 非 critical JS |
| CLS | ~0.05 | < 0.05 | ✅ 已達標 |
| Lighthouse PWA | ? | 100 | maskable icon、theme_color、screenshots |

**具體動作**：
1. **字型優化**：`<link rel="preload" as="font" crossorigin>` + `font-display: swap`
2. **圖片**：所有 PNG → WebP/AVIF（Vite plugin `vite-imagetools`）
3. **Firestore 預連接**：`<link rel="preconnect" href="https://firestore.googleapis.com">`
4. **Lighthouse CI**：CI pipeline 加入 `@lhci/cli`，分數低於 90 紅燈
5. **Web Vitals 上報**：`useReportWebVitals` → Firebase Analytics

---

## 🛡️ 安全性強化

| 項目 | 現況 | 目標 |
|------|------|------|
| Firestore Rules 速率限制 | 基本驗證 | 投票每分鐘 ≤10、建議每天 ≤5 |
| Content-Security-Policy | 未設定 | `default-src 'self'; script-src 'self' apis.google.com` |
| HSTS | 未設定 | `Strict-Transport-Security: max-age=31536000` |
| App Check | 未啟用 | reCAPTCHA v3 防爬蟲/機器人 |
| API Key 限制 | ⚠️ 待檢查 | GCP Console → Restrict to `cagoooo.github.io` referer |
| Secret Scanning | GitHub 預設 | 已有 |
| 輸入過濾 | 基本 | 加 DOMPurify 過濾建議區 XSS |

**Firestore 進階規則範例**（投票防灌票）：
```javascript
match /votes/{voteId} {
  allow create: if request.auth != null
    && request.resource.data.createdAt == request.time
    && getAfter(/databases/$(database)/documents/rateLimits/$(request.auth.uid))
        .data.lastVoteAt < request.time - duration.value(6, 's');
}
```

⚠️ **建議優先做 App Check**：免費、5 分鐘設定、立刻擋掉 90% 機器人投票。

---

## 🧪 測試策略升級

**現況**：169 個單元測試 ✅
**缺口**：

| 類型 | 工具 | 建議 |
|------|------|------|
| **E2E 測試** | Playwright | 投票流程、管理員登入、PWA 安裝 |
| **視覺迴歸** | Percy / Chromatic | 防止 UI 跑版重複出現 |
| **效能迴歸** | Lighthouse CI | Bundle > 400KB 紅燈 |
| **Firestore Rules 測試** | `@firebase/rules-unit-testing` | rules 修改前先跑 |
| **無障礙測試** | `vitest-axe` | 自動化 a11y check |

**E2E 起手式**（Playwright）：
```bash
npm i -D @playwright/test
npx playwright install
```
3 個關鍵 flow 先做：(1) 訪客投票 (2) 管理員登入後新增歌曲 (3) PWA 安裝。

---

## 📈 可觀測性與分析

**現況**：有 Firebase Performance 但**未充分利用**。

**建議擴充**：
1. **Firebase Analytics 自定事件**
   - `vote_submitted` / `suggestion_added` / `tag_filtered` / `pwa_installed`
   - 每事件帶 `eventId` 維度，方便活動分析
2. **Sentry 錯誤追蹤**
   - 整合 Error Boundary `componentDidCatch`
   - Source map 上傳，看得到原始檔行號
3. **Web Vitals 儀表板**
   - 自建或用 Google Analytics 4 內建
4. **使用者旅程漏斗**
   - 進站 → 看歌單 → 投票 → 再投票
   - 找出流失點

**LINE 通知（可選）**：
- 每天 8AM 推播昨日投票統計給管理員
- 用 `line-messaging-firebase` skill 整合（你已有此 skill）

---

## 📅 建議實施時程

### v4.2.0（本週，1 週內）
| 項目 | 估時 | 依賴 |
|------|------|------|
| A1 標籤篩選串接 | 4h | 無 |
| A2 難度標記 | 3h | 無 |
| A3 點播歷史 | 3h | 無 |
| A5 CI/CD | 2h | 無 |

### v4.3.0（下週）
| 項目 | 估時 | 依賴 |
|------|------|------|
| A4 演出模式 | 5h | A1+A2 完成更佳 |
| B3 深色模式完善 | 3h | 無 |
| B4 模糊搜尋升級 | 2h | 無 |
| B5 鍵盤快捷鍵 | 2h | 無 |

### v4.4.0（2-3 週）
| 項目 | 估時 | 依賴 |
|------|------|------|
| B1 統計儀表板 | 10h | 需 lazy load |
| B6 排序選項 | 1.5h | 無 |
| 安全性：App Check | 0.5h | 無 |
| Lighthouse CI | 1h | A5 完成 |

### v5.0.0（1-2 個月，重大版本）
| 項目 | 估時 |
|------|------|
| B2 多場活動支援 | 12h |
| C1 歌詞同步 | 15h |
| C2 社群登入 | 8h |
| E2E + 視覺迴歸測試 | 6h |
| 文件大整理（8 md → 2 md） | 1h |

### v6.0.0（3+ 個月，AI 化）
- C3 勳章系統
- C4 AI 推薦
- C5 多語系
- C6 即時聊天

---

## 🎯 Top 5 立即可做（推薦順序）

如果你只想挑幾項馬上動手，建議這個順序：

1. **A5 CI/CD（2h）** — 一勞永逸，後面開發都受惠
2. **App Check（0.5h）** — 免費防機器人，CP 值最高
3. **A1 標籤篩選串接（4h）** — 程式碼已有，只差串接
4. **A3 點播歷史（3h）** — 純前端，無風險
5. **A4 演出模式（5h）** — 現場最有感

**總計 ~14.5 小時**，可在 2-3 個下午完成，立刻把產品推進到 **v4.3**。

---

## 🔧 開發指令參考

```bash
# 日常
npm run dev                    # 開發
npm run check                  # TypeScript
npm run test:run               # 169 測試
npm run test:coverage          # 覆蓋率報告

# 建置 + 部署
npm run build                  # Bundle 檢查 (目標 < 400KB)
firebase deploy --only hosting,firestore:rules --project guitar-ff931

# 未來會用到
npm i recharts date-fns                   # B1 統計儀表板
npm i react-i18next i18next               # C5 多語系
npm i -D @playwright/test                 # E2E
npm i -D @lhci/cli                        # Lighthouse CI
```

---

## 📚 跨檔案整合建議

目前根目錄有 **8 個 md 文件**（DEVELOPMENT_PROGRESS / DEVELOPMENT_ROADMAP / DEVELOPMENT_STATUS / FUTURE_DEVELOPMENT_GUIDE / FUTURE_DEVELOPMENT_ROADMAP / NEXT_DEVELOPMENT_CHECKLIST / OPTIMIZATION_SUGGESTIONS / SESSION_PROGRESS），內容多有重複且版本不一。

**建議收斂為 2 份**：
- `README.md` — 對外：專案介紹、demo 連結、快速開始
- `ROADMAP.md`（本檔）— 對內：進度 + 未來規劃

**處置建議**：其餘 6 份可移到 `docs/archive/` 保留歷史，或直接刪除（git 還查得到）。

---

*最後更新：2026-05-01 | v4.1.2 | 下次更新時機：完成 v4.2.0 後*
