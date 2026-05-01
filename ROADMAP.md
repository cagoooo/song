# 🚀 互動式吉他彈唱點播平台 - 未來開發路線圖

> **文件版本**: 7.0  
> **更新日期**: 2026-01-19  
> **當前版本**: v3.9.0  
> **目的**: 提供詳細的未來優化與開發建議

---

## 📋 目錄

1. [開發優先級總覽](#開發優先級總覽)
2. [🔥 短期高優先 (1-2 週)](#短期高優先-1-2-週)
3. [📱 中期功能擴展 (2-4 週)](#中期功能擴展-2-4-週)
4. [🌟 長期進階功能 (1-3 個月)](#長期進階功能-1-3-個月)
5. [🔧 技術債務清理](#技術債務清理)
6. [⚡ 效能優化策略](#效能優化策略)
7. [🛡️ 安全性強化](#安全性強化)
8. [📅 建議實施時程](#建議實施時程)

---

## 開發優先級總覽

| 優先級 | 代號 | 說明 | 建議時間 |
|:------:|------|------|----------|
| 🔴 | P0 | 影響核心功能或安全性的問題 | 立即 |
| 🟠 | P1 | 顯著提升用戶體驗的功能 | 1-2 週 |
| 🟡 | P2 | 有價值但非緊急的改善 | 2-4 週 |
| 🟢 | P3 | 錦上添花的功能 | 1-3 月 |

---

## 🔥 短期高優先 (1-2 週)

### 1. 即時推播通知系統 🟠 P1

**價值**: 即時通知演奏者有新投票，增加互動感  
**預估時間**: 4-6 小時

#### 功能規格

| 功能 | 說明 |
|------|------|
| 瀏覽器推播 | 有人投票時通知表演者 |
| 音效提示 | 可選擊鈴聲或震動 |
| 通知設定 | 可開關特定類型通知 |
| 歌曲上榜通知 | 歌曲進入 Top 3 時通知 |

#### 技術實作

```typescript
// hooks/usePushNotification.ts
export function usePushNotification() {
  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        ...options
      });
    }
  };

  return { requestPermission, sendNotification };
}
```

---

### 2. 歌曲標籤篩選系統 🟠 P1

**價值**: 讓訪客更快找到喜歡的歌曲類型  
**預估時間**: 3-4 小時

#### 功能規格

| 功能 | 說明 |
|------|------|
| 預設標籤 | 經典、流行、情歌、搖滾、民謠、日韓、西洋 |
| 多選篩選 | 可同時選擇多個標籤 |
| 標籤統計 | 顯示各標籤歌曲數量 |
| 熱門標籤 | 根據投票數顯示熱門標籤 |

#### UI 設計建議

```
┌────────────────────────────────────┐
│ 🏷️ 標籤篩選                        │
│ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │ 經典 │ │ 流行 │ │ 情歌 │ ...    │
│ └──────┘ └──────┘ └──────┘        │
│ 已選: 流行、情歌 (共 23 首)        │
└────────────────────────────────────┘
```

---

### 3. 歌曲難度標記 🟠 P1

**價值**: 方便表演者選擇適合的歌曲  
**預估時間**: 2-3 小時

#### 難度等級設計

| 等級 | 圖示 | 說明 |
|------|------|------|
| 入門 | ⭐ | 基礎和弦、簡單節奏 |
| 中等 | ⭐⭐ | 需要練習的曲目 |
| 進階 | ⭐⭐⭐ | 高難度技巧 |

#### 資料結構擴展

```typescript
interface Song {
  id: string;
  title: string;
  artist: string;
  difficulty?: 1 | 2 | 3;  // 新增難度欄位
  // ... 其他欄位
}
```

---

### 4. 測試覆蓋率提升至 50% 🟠 P1

**價值**: 提升程式碼品質和穩定性  
**預估時間**: 6-8 小時

#### 優先測試模組

| 模組 | 測試類型 | 預估時間 |
|------|----------|----------|
| `useInteractions.ts` | Hook 測試 | 1.5 小時 |
| `TipAnimation.tsx` | 元件測試 | 1 小時 |
| `MobileTabView.tsx` | 元件測試 | 1 小時 |
| `SongCard.tsx` | 元件測試 | 1 小時 |
| `firestore.ts` | 整合測試 | 2 小時 |

---

### 5. Error Boundary 全域錯誤處理 🟠 P1

**價值**: 防止單一元件錯誤導致整個應用崩潰  
**預估時間**: 2-3 小時

#### 實作建議

```typescript
// components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // 可整合 Sentry 等錯誤追蹤服務
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 text-center">
          <h2>😵 發生錯誤</h2>
          <button onClick={() => window.location.reload()}>
            重新載入
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

## 📱 中期功能擴展 (2-4 週)

### 6. 統計儀表板 🟡 P2

**價值**: 了解使用者行為，優化活動策劃  
**預估時間**: 8-10 小時

#### 功能規格

| 圖表類型 | 說明 |
|----------|------|
| 熱門歌曲排行 | 長條圖顯示 Top 10 |
| 投票趨勢 | 折線圖顯示每日投票數 |
| 時段熱度 | 熱力圖顯示活躍時段 |
| 歌手統計 | 餅圖顯示各歌手佔比 |
| CSV 匯出 | 匯出統計資料 |

#### 技術選型

```bash
npm install recharts date-fns
```

#### 目錄結構

```
components/StatsDashboard/
├── index.tsx            # 主頁面
├── QuickStats.tsx       # 快速統計卡片
├── VoteTrendChart.tsx   # 投票趨勢圖
├── TopSongsChart.tsx    # 熱門歌曲長條圖
├── HourlyHeatmap.tsx    # 活躍時段熱力圖
├── ArtistPieChart.tsx   # 歌手分佈餅圖
└── hooks/useStats.ts    # 統計資料 Hook
```

---

### 7. 深色模式完善 🟡 P2

**價值**: 提升夜間使用體驗  
**預估時間**: 3-4 小時

#### 待完善項目

| 元件 | 問題 | 解決方案 |
|------|------|----------|
| Toast 訊息 | 對比度不足 | 調整背景顏色 |
| Tooltip | 深色背景看不清 | 新增邊框 |
| 骨架屏 | 閃爍感明顯 | 降低對比度 |
| 互動動畫 | 部分顏色刺眼 | 調整透明度 |

#### CSS 變數建議

```css
:root {
  --toast-bg-success: theme('colors.green.100');
  --toast-text-success: theme('colors.green.800');
}

.dark {
  --toast-bg-success: theme('colors.green.900');
  --toast-text-success: theme('colors.green.100');
}
```

---

### 8. 點播歷史記錄 🟡 P2

**價值**: 讓訪客追蹤自己的點播紀錄  
**預估時間**: 3-4 小時

#### 功能規格

| 功能 | 說明 |
|------|------|
| 本機儲存 | localStorage 儲存最近 50 筆 |
| 今日統計 | 顯示「今日已點播 X 首」 |
| 歷史列表 | 可查看完整歷史 |
| 快速重複點播 | 一鍵重新投票 |

---

### 9. 演出模式（投影優化）🟡 P2

**價值**: 現場表演時的大螢幕顯示  
**預估時間**: 5-6 小時

#### 功能規格

| 功能 | 說明 |
|------|------|
| 全螢幕模式 | 按 F11 或按鈕切換 |
| 簡潔排行榜 | 只顯示 Top 5-10 |
| 大字體 | 方便遠距離閱讀 |
| 自動輪播 | 輪播熱門歌曲 |
| 暗色主題 | 減少投影機刺眼 |
| 隱藏管理按鈕 | 訪客模式 |

#### UI 設計建議

```
┌─────────────────────────────────────────┐
│         🎸 現場熱門點播排行榜             │
├─────────────────────────────────────────┤
│  🥇  告白氣球 - 周杰倫         87 票    │
│  🥈  小幸運 - 田馥甄           65 票    │
│  🥉  晴天 - 周杰倫             54 票    │
│   4  演員 - 薛之謙             48 票    │
│   5  那些年 - 胡夏             42 票    │
├─────────────────────────────────────────┤
│     🎵 正在彈奏: 告白氣球 - 周杰倫       │
│     ⭐ 平均評分: 4.7/5 (23 人評分)       │
└─────────────────────────────────────────┘
```

---

### 10. 多場活動支援 🟡 P2

**價值**: 支援多個表演場地或活動  
**預估時間**: 10-12 小時

#### 功能規格

| 功能 | 說明 |
|------|------|
| 建立活動 | 管理員建立新活動 |
| 活動代碼 | 訪客輸入代碼加入 |
| 獨立計票 | 每場活動獨立投票 |
| 活動歸檔 | 活動結束後歸檔 |
| 歷史查看 | 查看過往活動紀錄 |

---

## 🌟 長期進階功能 (1-3 個月)

### 11. 歌詞同步播放 🟢 P3

**預估時間**: 10-15 小時

| 功能 | 說明 |
|------|------|
| LRC 歌詞格式 | 時間軸同步 |
| 歌詞編輯器 | 管理員編輯歌詞 |
| 自動滾動 | 跟隨播放進度 |
| 大螢幕模式 | 投影歌詞顯示 |

---

### 12. 社群登入整合 🟢 P3

**預估時間**: 6-8 小時

| 登入方式 | 說明 |
|----------|------|
| Google | Firebase Auth 內建 |
| Facebook | 需申請 App |
| Apple | 需 Apple Developer |
| LINE | 台灣常用 |

#### 好處

- 雲端同步點播歷史
- 個人收藏歌單
- 社群互動身份

---

### 13. 積分勳章系統 🟢 P3

**預估時間**: 12-15 小時

| 勳章類型 | 條件 |
|----------|------|
| 🎤 首次點播 | 第一次投票 |
| 🔥 熱情歌迷 | 單日點播 10 首 |
| 👑 點歌王 | 累積 100 次點播 |
| ⭐ 評論達人 | 給予 50 次評分 |
| 💎 打賞大戶 | 累積打賞 100 次 |

---

### 14. 完整多語系支援 🟢 P3

**預估時間**: 6-8 小時

| 語言 | 說明 |
|------|------|
| 繁體中文 | 預設 |
| 簡體中文 | 大陸用戶 |
| English | 國際化 |
| 日本語 | 日本歌曲較多時 |

#### 技術選型

```bash
npm install react-i18next i18next
```

---

## 🔧 技術債務清理

### 待處理項目

| 項目 | 優先級 | 說明 |
|------|:------:|------|
| Bundle 優化 | 🟠 | 目標 < 600KB |
| TypeScript strict | 🟡 | 啟用嚴格模式 |
| 移除未使用依賴 | 🟢 | `npm prune` |
| ESLint 規則統一 | 🟢 | 新增 .eslintrc |
| Husky pre-commit | 🟢 | 提交前自動檢查 |

### 已完成 ✅

- ✅ 無限循環動畫移除 (v3.0.0)
- ✅ React.memo 優化 (v3.0.0)
- ✅ 程式碼分割 lazy() (v2.4.0)
- ✅ 虛擬滾動 (v3.0.0)
- ✅ Toast/Tooltip 透明度修復 (v3.0.2)
- ✅ 統一錯誤處理 (v3.7.1)

---

## ⚡ 效能優化策略

### 目前狀態 vs 目標

| 指標 | 目前 | 目標 | 策略 |
|------|------|------|------|
| 測試覆蓋率 | ~30% | 50%+ | 新增 Hook/元件測試 |
| Bundle Size | ~1 MB | < 600 KB | Tree-shaking、分割 |
| FCP | ~1.5s | < 1.0s | 預載入、懶加載 |
| LCP | ~2.5s | < 2.0s | 圖片優化 |

### Bundle 分割策略

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          'ui-vendor': ['framer-motion', '@radix-ui/react-dialog'],
          'charts': ['recharts'],  // 統計儀表板
        }
      }
    }
  }
});
```

---

## 🛡️ 安全性強化

### 建議強化項目

| 項目 | 目前狀態 | 建議 |
|------|----------|------|
| Rate Limiting | 前端防連點 | 後端 API 限流 |
| 輸入驗證 | 基本驗證 | 加強 XSS 過濾 |
| HTTPS | 已啟用 | 設定 HSTS |
| CSP | 未設定 | 加入 Content-Security-Policy |
| Firestore 規則 | 已設定 | 增加速率限制 |

### Firestore 進階規則

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 投票速率限制：每分鐘最多 10 票
    function isRateLimited(userId) {
      let recentVotes = getAfter(
        /databases/$(database)/documents/votes
      ).data.createdAt > request.time - duration.value(1, 'm');
      return recentVotes < 10;
    }
  }
}
```

---

## 📅 建議實施時程

### 第一階段：本週 (v4.0.0)

| 項目 | 預估時間 | 優先級 |
|------|----------|:------:|
| 即時推播通知 | 4-6 小時 | 🟠 |
| 標籤篩選系統 | 3-4 小時 | 🟠 |
| Error Boundary | 2-3 小時 | 🟠 |

### 第二階段：下週 (v4.1.0)

| 項目 | 預估時間 | 優先級 |
|------|----------|:------:|
| 歌曲難度標記 | 2-3 小時 | 🟠 |
| 測試覆蓋率提升 | 6-8 小時 | 🟠 |
| 深色模式完善 | 3-4 小時 | 🟡 |

### 第三階段：2-4 週 (v4.2.0)

| 項目 | 預估時間 | 優先級 |
|------|----------|:------:|
| 統計儀表板 | 8-10 小時 | 🟡 |
| 點播歷史記錄 | 3-4 小時 | 🟡 |
| 演出模式 | 5-6 小時 | 🟡 |

### 第四階段：1-2 個月 (v5.0.0)

| 項目 | 預估時間 | 優先級 |
|------|----------|:------:|
| 多場活動支援 | 10-12 小時 | 🟡 |
| 歌詞同步播放 | 10-15 小時 | 🟢 |
| 社群登入整合 | 6-8 小時 | 🟢 |

---

## 🔧 開發指令參考

```bash
# 日常開發
npm run dev              # 開發模式
npm run check            # TypeScript 檢查
npm run test:run         # 執行測試
npm run test:coverage    # 測試覆蓋率

# 建置部署
npm run build            # 建置生產版本
firebase deploy --only firestore:rules --project guitar-ff931

# 套件管理
npm install fuse.js              # 模糊搜尋
npm install recharts             # 圖表
npm install react-i18next        # 多語系
```

---

## 📝 快速開始建議

如果您想立即開始優化，建議從以下項目開始：

1. **🟠 即時推播通知** - 大幅提升互動感
2. **🟠 標籤篩選系統** - 改善歌曲搜尋體驗
3. **🟠 Error Boundary** - 提升應用穩定性

這三項都是高優先級且實作時間相對較短的功能！

---

*最後更新：2026-01-19 v3.9.0*  
*下次建議更新時機：完成 v4.0.0 後*
