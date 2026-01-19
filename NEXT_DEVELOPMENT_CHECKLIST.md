# 🚀 互動式吉他彈唱點播平台 - 未來開發藍圖

> **更新日期**: 2026-01-19 16:00  
> **當前版本**: v4.1.0

---

## 📋 功能完成度統計

```
核心功能      ████████████████████ 100%
管理員功能    ████████████████████ 100%
訪客互動      ████████████████████ 100%
效能優化      ███████████████████░ 95% ← 已優化 Bundle split
PWA 支援      ████████████████░░░░ 80%
測試覆蓋      ███████████████░░░░░ 75% ← 已提升至 142 個測試
```

---

## ✅ v4.1.0 已完成項目

| 項目 | 結果 |
|------|------|
| **Bundle 優化** | 1.2MB → 287KB (↓76%) ✅ |
| **測試數量** | 105 → 142 個 (+35%) ✅ |
| **測試通過率** | 140/142 (98.6%) ✅ |
| **UI 修復** | 評分區跑版、點播按鈕佈局 ✅ |

---

## 🎯 短期優先開發項目（1-2 週）

### ⭐⭐⭐ 高優先級

| 項目 | 說明 | 預估工時 | 難度 | ROI |
|------|------|:--------:|:----:|:---:|
| **即時推播通知 (FCM)** | 歌曲進入 Top 3 時推播給訂閱者 | 8 小時 | 🟡 | ⭐⭐⭐ |
| **標籤篩選功能** | 歌曲列表支援多標籤篩選 | 3 小時 | 🟢 | ⭐⭐⭐ |
| **E2E 測試 (Playwright)** | 關鍵流程自動化測試 | 6 小時 | 🟡 | ⭐⭐ |
| **ErrorBoundary 測試修復** | 修復剩餘 2 個失敗測試 | 2 小時 | 🟢 | ⭐ |

### 📝 詳細說明

#### 1. 即時推播通知 (FCM) 🔔
```
功能需求：
├─ 訂閱者可收到通知：
│   ├─ 您點的歌進入 Top 3
│   ├─ 您點的歌正在彈奏
│   └─ 新歌曲上架（可選）
├─ 推播設定頁面
└─ 支援 iOS Safari + Android Chrome

技術方案：
├─ Firebase Cloud Messaging (FCM)
├─ Service Worker 整合
├─ Firestore trigger (Cloud Functions)
└─ Notification API

實作步驟：
1. 設定 Firebase Cloud Messaging
2. 擴展 Service Worker (sw.js)
3. 創建 useNotifications Hook
4. 新增推播設定 UI
5. 創建 Cloud Function 觸發推播
```

#### 2. 標籤篩選功能 🏷️
```
UI 設計：
[歌曲列表]
  ┌─ 篩選：[🔘全部] [華語] [西洋] [日韓] [動漫]
  │       [經典] [流行] [抒情] [搖滾] ...
  └─ 可多選，顯示符合任一標籤的歌曲

技術方案：
├─ 使用現有 useTags Hook
├─ 新增 TagFilter 元件
└─ localStorage 記住篩選偏好
```

#### 3. E2E 測試 (Playwright) 🎭
```
覆蓋流程：
├─ 訪客點播流程
├─ 管理員登入 → 歌曲管理
├─ 排行榜即時更新
└─ 正在彈奏中流程

技術設定：
├─ npm install -D @playwright/test
├─ 配置 playwright.config.ts
└─ 設定 GitHub Actions CI
```

---

## 🔮 中期功能擴展（1 個月內）

### ⭐⭐ 中優先級

| 項目 | 說明 | 預估工時 | ROI |
|------|------|:--------:|:---:|
| **現場表演模式** | 大螢幕投影專用介面 | 8 小時 | ⭐⭐⭐ |
| **統計儀表板 v2** | 更豐富的數據視覺化 | 10 小時 | ⭐⭐⭐ |
| **多國語系 (i18n)** | 繁中/簡中/英文 | 6 小時 | ⭐⭐ |
| **歌詞同步播放** | LRC 格式支援 | 12 小時 | ⭐⭐ |
| **手勢滑動切換** | 手機版左右滑動切換 Tab | 3 小時 | ⭐⭐ |

### 📝 詳細說明

#### 1. 現場表演模式 🎤
```
專為投影設計的顯示介面：

┌─────────────────────────────────────────┐
│  🎸 吉他點歌 LIVE           🔴 LIVE    │
├─────────────────────────────────────────┤
│                                         │
│     🎵 Now Playing                      │
│                                         │
│     《 告白氣球 》                       │
│       周杰倫                            │
│                                         │
│     ♪ ♫ ♪ ♫ ♪                          │
│                                         │
├─────────────────────────────────────────┤
│  下一首：小幸運 - 田馥甄                 │
│  等候中：8 首                           │
└─────────────────────────────────────────┘

功能：
├─ 全螢幕顯示
├─ 自動輪播 Top 10 排行
├─ 訪客互動動畫放大顯示
├─ 鍵盤快捷鍵控制 (←/→/Space)
└─ QR Code 顯示（訪客掃描點歌）
```

#### 2. 統計儀表板 v2 📊
```
新增功能：
├─ 時段分析（尖峰時間）
├─ 歌曲類型分布餅圖
├─ 訪客來源分析
├─ 匯出 CSV/Excel
└─ 自訂時間範圍

技術方案：
├─ 使用現有 Recharts
├─ Cloud Functions 排程聚合
└─ BigQuery 長期資料分析（可選）
```

#### 3. 手勢滑動切換 👆
```bash
npm install @use-gesture/react

# hooks/useSwipeGesture.ts
export function useTabSwipe(currentTab, tabs, setTab) {
  return useDrag(({ swipe: [swipeX] }) => {
    const idx = tabs.indexOf(currentTab);
    if (swipeX < 0 && idx < tabs.length - 1) {
      setTab(tabs[idx + 1]);
    } else if (swipeX > 0 && idx > 0) {
      setTab(tabs[idx - 1]);
    }
  });
}
```

---

## 🌟 長期進階功能（2-3 個月）

### ⭐ 願景項目

| 項目 | 說明 | 預估工時 | 複雜度 |
|------|------|:--------:|:------:|
| **社群登入系統** | Google/Facebook/Apple 登入 | 16 小時 | 🟡 |
| **用戶收藏夾** | 個人喜愛歌曲清單 | 5 小時 | 🟢 |
| **積分勳章系統** | 點播累積積分與獎勵 | 15 小時 | 🔴 |
| **AI 歌曲推薦** | 根據歷史行為推薦 | 20 小時 | 🔴 |
| **打賞金流整合** | 綠界/藍新金流 | 25 小時 | 🔴 |
| **離線模式增強** | 完整 PWA 離線功能 | 10 小時 | 🟡 |

### 📝 詳細說明

#### 1. 積分勳章系統 🏆
```
積分規則：
├─ 每次點播：+10 分
├─ 連續 7 天登入：+50 分
├─ 被演出的歌曲：+20 分
└─ 打賞表演者：+打賞金額 x 2 分

勳章成就：
🥉 新手聽眾   - 首次點播
🥈 熱門選手   - 累計點播 50 首
🥇 音樂達人   - 累計點播 200 首
💎 傳奇聽眾   - 累計點播 1000 首
🌟 人氣推手   - 點播歌曲進入 Top 3 共 10 次
```

#### 2. AI 歌曲推薦 🤖
```
推薦來源：
├─ 用戶點播歷史
├─ 相似用戶喜好 (協同過濾)
├─ 歌曲標籤關聯
└─ 時間/場合推薦

技術方案：
├─ Firebase ML Kit (簡易)
├─ Vertex AI (進階)
└─ 自建推薦引擎 (複雜)
```

---

## 🔧 技術優化項目

### 效能面

| 項目 | 目前狀態 | 目標值 | 優化方案 | 優先級 |
|------|:--------:|:------:|----------|:------:|
| Bundle Size | ✅ 287 KB | < 250 KB | 更細緻分割、移除未用模組 | 🟢 |
| 測試覆蓋率 | ✅ 75% | 85% | 補足 E2E 測試 | 🟡 |
| FCP | ~1.5s | < 1.0s | 預載入、骨架屏優化 | 🟡 |
| LCP | ~2.5s | < 2.0s | 圖片懶加載、CDN | 🟢 |
| CLS | ~0.1 | < 0.05 | 預留空間、字型優化 | 🟢 |

### 程式碼品質

| 項目 | 優先級 | 說明 | 預估工時 |
|------|:------:|------|:--------:|
| TypeScript Strict Mode | 🟡 | 消除 `any` 類型、啟用 `strict: true` | 4 小時 |
| ESLint + Prettier 統一 | 🟢 | 統一程式碼風格 | 1 小時 |
| Husky Pre-commit | 🟢 | 提交前自動檢查 lint + test | 1 小時 |
| E2E 測試 (Playwright) | 🟡 | 關鍵流程自動化測試 | 6 小時 |
| Storybook | 🟢 | 元件文檔化、視覺測試 | 8 小時 |

### 安全性

| 項目 | 目前狀態 | 建議 | 優先級 |
|------|:--------:|------|:------:|
| Rate Limiting | 前端防連點 | 後端 API 限流 (Cloud Functions) | 🟡 |
| Content Security Policy | 未設定 | 加入 CSP header | 🟡 |
| Firestore Rules 審核 | 已設定 | 定期審核、最小權限原則 | 🟢 |
| Dependency Audit | 自動 | `npm audit --fix` 定期執行 | 🟢 |

---

## 📅 推薦開發時程

### 2026年 1月（本月剩餘）

```
第四週 (1/20-1/26)：
├─ 📌 標籤篩選功能 (3h)
├─ 📌 ErrorBoundary 測試修復 (2h)
└─ 📌 TypeScript Strict Mode (4h)
```

### 2026年 2月

```
第一週：
├─ 即時推播通知 (FCM) - 基礎設定
└─ Service Worker 整合

第二週：
├─ 即時推播通知 - 完成
└─ E2E 測試 (Playwright) 基礎設定

第三週：
├─ 現場表演模式 UI
└─ 手勢滑動切換

第四週：
├─ 統計儀表板 v2
└─ 月度測試與優化
```

### 2026年 3月

```
第一週：
└─ 多國語系支援 (i18n)

第二週：
└─ 社群登入系統

第三週：
└─ 用戶收藏夾

第四週：
├─ 積分勳章系統 (Phase 1)
└─ 季度測試與優化
```

### 2026年 Q2

```
├─ 歌詞同步播放功能
├─ AI 歌曲推薦
├─ 離線模式增強
└─ 商業化功能評估
```

---

## 🎯 Quick Win 清單（30 分鐘內完成）

立即可執行的小優化：

- [ ] **加入 Husky + lint-staged** - 自動化程式碼品質
  ```bash
  npx husky-init && npm install
  npx mrm lint-staged
  ```

- [ ] **Lighthouse CI 整合** - 自動效能報告
  ```bash
  npm install -D @lhci/cli
  ```

- [ ] **添加 robots.txt** - SEO 基礎
  ```
  User-agent: *
  Allow: /
  Sitemap: https://cagoooo.github.io/song/sitemap.xml
  ```

- [ ] **meta 標籤優化** - 社群分享
  ```html
  <meta property="og:title" content="互動式吉他彈唱點播平台">
  <meta property="og:image" content="/og-image.png">
  ```

---

## 💡 開發最佳實踐

### 開始新功能前

1. **確認需求** - 與用戶確認功能細節、驗收標準
2. **技術評估** - 選擇最適合的技術方案
3. **寫測試** - TDD 可避免後期技術債
4. **漸進式發布** - 使用 Feature Flag 控制

### 維護程式碼品質

1. **定期更新依賴** - `npm outdated` + `npm update`
2. **每月安全審計** - `npm audit --fix`
3. **定期效能測試** - Lighthouse CI
4. **錯誤追蹤** - 考慮 Sentry 整合

### Git 工作流

```bash
# 功能分支
git checkout -b feature/tag-filter
# 開發完成後
git push origin feature/tag-filter
# 創建 Pull Request 進行 Code Review
```

---

## 📞 相關資源

| 資源 | 說明 |
|------|------|
| [Firebase FCM 文件](https://firebase.google.com/docs/cloud-messaging) | 推播通知 |
| [Playwright 文件](https://playwright.dev/) | E2E 測試 |
| [react-i18next 文件](https://react.i18next.com/) | 多國語系 |
| [Recharts 文件](https://recharts.org/) | 圖表庫 |
| [@use-gesture/react](https://use-gesture.netlify.app/) | 手勢操作 |
| [Sentry](https://sentry.io/) | 錯誤追蹤 |

---

*最後更新：2026-01-19 16:00*
