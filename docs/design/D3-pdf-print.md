# D3 — 節目單 PDF 列印版

> **狀態**：設計階段 | **估時**：3-4h | **優先級**：🟠 P1 | **依賴**：無 | **CP 值最高的一份，建議第一波做**

## TL;DR

用 `window.print()` + `@media print` CSS 做一個 A4 直式列印版節目單，讓阿凱老師演出當下可印紙本給觀眾。**絕對不用 html2pdf / jsPDF**（依 skill `pdf-export-print-best-practice`）。

---

## 動機

### 現況痛點
- ShareCardModal 只有 PNG（IG 1080×1350 / FB OG 1200×630），沒有 A4 列印版
- 演出現場常有 VIP 觀眾要紙本節目單留念，現在只能用手機看
- 沒有可印的 setlist 讓阿凱老師參考排序

### 為什麼是「最高 CP 值」
- 估時 3-4h，是這批 12 份文件裡最短
- 用 `window.print()` + `@media print` 純前端，**0 新增 dependency、0 bundle 影響**
- 立刻有用：每場演出都會用到
- 跟 ThankYouModal「結束今晚」儀式串得起來（結束時可印一份留念）

---

## 資料模型

無需新 Firestore schema。讀取現有資料：
- `songs` collection — 排行榜 Top N
- `useVoteHistory` — voter 統計
- `useMagazine()`（若 D1 已完成）— 期數
- 否則 fallback 用當天日期

---

## API / Hooks / Components

### Component 新增
```ts
// client/src/components/PrintProgram/PrintProgram.tsx
interface PrintProgramProps {
  songs: Song[];
  totalVotes: number;
  uniqueVoters: number;
  issueNumber?: number;
  issueTitle?: string;
  issueDate?: string;
  topVoters?: Array<{ voterId: string; voteCount: number }>;
  topN?: number;  // 預設 20
}

export function PrintProgram(props: PrintProgramProps): JSX.Element;
```

### 觸發機制
```ts
// 在 admin Toolbar 加按鈕
<button onClick={() => {
  document.body.classList.add('print-mode');
  window.print();
  // afterprint 事件移除 class
}}>
  🖨️ 列印節目單
</button>

// 監聽 afterprint
useEffect(() => {
  const onAfter = () => document.body.classList.remove('print-mode');
  window.addEventListener('afterprint', onAfter);
  return () => window.removeEventListener('afterprint', onAfter);
}, []);
```

### CSS 策略

```css
/* editorial-print.css — 新檔，T1 拆檔時放這裡 */

/* 預設隱藏列印版 */
.print-program { display: none; }

/* 列印模式：只顯示列印版，其餘全隱藏 */
@media print {
  body * { visibility: hidden; }
  .print-program, .print-program * { visibility: visible; }
  .print-program {
    display: block !important;
    position: absolute;
    inset: 0;
  }

  /* A4 直式 */
  @page {
    size: A4 portrait;
    margin: 12mm 15mm;
  }

  /* 強制黑白友善 */
  .print-program {
    color: #000;
    background: #fff;
    font-family: 'Playfair Display', 'Noto Serif TC', serif;
  }

  /* 不要切到一半 */
  .pp-song-row { break-inside: avoid; }
  .pp-section { break-inside: avoid-page; }
  .pp-stats-grid { break-inside: avoid; }

  /* 隱藏所有按鈕 / nav */
  button, nav, .no-print { display: none !important; }
}
```

---

## UI 草圖

### A4 列印版面（21cm × 29.7cm）

```
┌──────────────────────────────────────────────┐
│                                              │
│  Nº 12   SIDE A             阿凱 Guitar       │
│  ━━━━━                       Singalong       │
│                              MAY 2026        │
│                                              │
│  ▮ 今晚的節目單                                │
│  ▮ TONIGHT'S SETLIST                          │
│                                              │
│  87 票     14 位歌迷     22 首歌               │
│  ─────────────────────────────────────────   │
│                                              │
│  1.  晴天                          周杰倫      │
│      ────────────────────  C │ 78 BPM │ 12 票  │
│                                              │
│  2.  小幸運                        田馥甄      │
│      ────────────────────  G │ 82 BPM │ 9 票   │
│                                              │
│  ...（最多 20 首）                              │
│                                              │
│  ─────────────────────────────────────────   │
│  催歌王                                       │
│   🥇 vNJ4...   18 票  🥈 vK8b...   12 票      │
│                                              │
│  ─────────────────────────────────────────   │
│  阿凱主理人 ─ 演出心語                          │
│                                              │
│  「副歌前的那個 Em 卡半拍給它，                  │
│   整首歌的張力就出來了。」                      │
│                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│  Made with ❤️ by 阿凱老師                     │
│  桃園市龍潭區石門國民小學                       │
└──────────────────────────────────────────────┘
```

---

## 實作步驟

1. **建立 `PrintProgram` component**（45 min）
   - 純 HTML + Tailwind class，不用任何特效
   - 抽出 ShareCardModal 的卡片內容 layout 重新編排成 A4

2. **建立 `editorial-print.css`**（45 min）
   - `@media print` 規則
   - 強制黑白配色（雜誌藍變黑色）
   - `@page` 邊距設定
   - 避免 break-inside 切到一半

3. **加觸發按鈕到 admin Toolbar**（15 min）
   - 「🖨️ 列印節目單」按鈕
   - 點擊 → `document.body.classList.add('print-mode')` → `window.print()`
   - `afterprint` 事件清除

4. **整合進 ThankYouModal**（30 min）
   - END OF SIDE A 結尾加「列印節目單」按鈕
   - 跟「節目單分享卡」並列

5. **跨瀏覽器測試**（30 min）
   - Chrome / Edge / Safari 列印預覽都對齊
   - 手機 Safari 確認可走系統列印 → AirPrint

6. **預覽模式**（30 min）
   - 加 `?print=preview` query 直接顯示 A4 模擬框（不真的列印）
   - 阿凱可先看再印

---

## 驗收條件

- ✅ 點「🖨️ 列印節目單」開啟瀏覽器列印對話框
- ✅ 預覽即為 A4 直式雜誌風版面
- ✅ 紙本印出來字夠大、對比夠強
- ✅ 黑白印表機印也清楚（不靠顏色辨識）
- ✅ 印完按鈕 / nav 不會出現在紙上
- ✅ 中文字型正確（Noto Serif TC fallback）
- ✅ Top 20 歌曲完整列出，不會切頁切到一半
- ✅ Chrome / Edge / Safari 三大瀏覽器都對齊
- ✅ 手機 Safari 走 AirPrint 也可印

---

## 風險 / 已知坑

### 🚨 高風險（依 skill `pdf-export-print-best-practice` 的雷區）
1. **永遠不要用 `html2pdf.js` / `html2canvas` / `jsPDF`**
   - 已有 ROADMAP 紀錄這套會偏右、字模糊、表格切半、中文 tofu
   - **解法**：100% 用 `window.print()` + `@media print`
   - 業界 Notion / Google Docs / GitHub Issues 都用瀏覽器原生引擎

2. **`@media print` 沒做隱藏 → 印出來有按鈕**
   - 訪客看到 admin 按鈕被印出來會困惑
   - **解法**：`button, nav, .no-print { display: none !important; }`
   - 測試：每次改完用列印預覽驗收

### ⚠️ 中風險
3. **中文字型**
   - 列印預設不一定有 Playfair / Noto Serif TC
   - **解法**：CSS 加 fallback `font-family: 'Playfair Display', 'Noto Serif TC', serif;`
   - 終極解法：把字型 base64 inline 到 CSS（但會肥）

4. **顏色印不出來**
   - 雜誌藍在黑白印表機印出來會變灰
   - **解法**：列印版改用粗黑線 + 純黑字，**不靠顏色辨識**
   - 對比夠強的版面比好看的版面更重要

5. **頁數無法控制**
   - Top 20 + 統計可能要 2 頁，使用者印一張紙會被切
   - **解法**：
     - 預設 Top 10（一頁絕對放得下）
     - 加開關「印完整版」可選 Top 30

### 💡 小坑
6. **Chrome 列印對話框會吃掉 background-color** — 用戶要勾「背景圖形」才有底色，預設用白底就好
7. **Safari 不支援 `break-inside: avoid-page`** — 用 `page-break-inside: avoid` fallback
8. **手機 Safari 不會觸發 `afterprint`** — 改用 setTimeout fallback 清 class

---

## 估時

| 樂觀 | 預期 | 悲觀 |
|:----:|:----:|:----:|
| 3h | 3.5h | 5h（含跨瀏覽器精修） |

---

## 依賴項

- ✅ **完全獨立** — 不依賴任何其他項目
- 🟡 **建議搭配 D1**：若 D1 已完成，期數 / 標題從 `useMagazine()` 讀
- 🟡 **可整合 T1**：CSS 拆檔時把 `editorial-print.css` 一起拆出來

---

## 後續延伸

- **D3.5：QR Code 列印版** — 印出來的紙本帶 QR Code，掃描可繼續投票
- **D3.6：節目單留言版** — A4 留 1/3 空白給觀眾簽名 / 寫感想
- **多語言列印** — 中英對照版（C5 i18n 上線後）
- **訂製化**：D5 mood tags 上線後，列印版底部可加「今晚情緒分佈」雷達圖

---

## 📚 參考 skill

- `pdf-export-print-best-practice` — 為什麼不用 html2pdf，怎麼用 window.print() 正確收尾
- `og-social-preview-zh` — 中文字型 fallback 規則
