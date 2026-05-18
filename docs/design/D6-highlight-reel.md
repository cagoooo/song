# D6 — 精選時刻自動剪輯

> **狀態**：設計階段 | **估時**：8-10h | **優先級**：🟢 P3 | **依賴**：D1（issue 關聯）、D2（嵌主理人手記）

## TL;DR

把現有的「黑馬時刻 / COMBO / GlobalHype」事件流寫進 Firestore，演出結束後自動產出一支「精選時刻 timeline」，附對應歌名 + 觸發秒數 + 截圖，可嵌進 PostPage 或匯出成短片清單。

---

## 動機

### 現況痛點
- 演出當下的高潮時刻（黑馬、COMBO、集體投票）只出現在 overlay 一閃而逝，沒被紀錄
- 阿凱演出後想回顧「今晚最熱的時刻」沒有 timeline 可看
- 觀眾隔天想分享「我投到黑馬」也沒紀錄
- StatsDashboard 是「整體數字」，沒有「時間軸事件」

### 為什麼是 P3
- 估時最長（8-10h）
- 沒有立即性（演出後才用得到）
- 視覺呈現複雜（timeline + 截圖 + 動畫）

但若做了，效果極佳 — 跟 Spotify Wrapped、Apple 「年度回顧」同性質。

---

## 資料模型

### Firestore

```
issues/{issueId}/highlights/{highlightId}
  ├─ type: HighlightType
  ├─ triggeredAt: Timestamp
  ├─ secondsFromStart: number     // 演出開始 N 秒
  ├─ songId?: string
  ├─ songTitle?: string
  ├─ songArtist?: string
  ├─ metadata: {                  // 依 type 變
  │    comboCount?: number,       // COMBO
  │    rankJump?: number,         // DARK_HORSE
  │    voterCount?: number,       // GLOBAL_HYPE
  │    surgeRatio?: number,       // VOTE_SURGE
  │    badgeId?: string,          // BADGE_UNLOCKED
  │ }
  ├─ voterIds?: string[]          // 觸發此事件的 voters（最多 5 個）
  └─ screenshotUrl?: string       // Storage 路徑（從 client 截 overlay）

type HighlightType =
  | 'DARK_HORSE'       // 黑馬時刻
  | 'COMBO'            // COMBO ≥ 5
  | 'GLOBAL_HYPE'      // 多人同投
  | 'VOTE_SURGE'       // 飆升 ≥ 3x
  | 'BADGE_UNLOCKED'   // 觀眾解鎖徽章
  | 'TOP1_CHANGED'     // 第 1 名換人
  | 'FIRST_VOTE'       // 開場第一票
  | 'LAST_VOTE'        // 收尾最後一票
```

---

## API / Hooks / Components

### Firestore module
```ts
// client/src/lib/firestore/highlights.ts
export function logHighlight(
  issueId: string,
  data: Omit<Highlight, 'id' | 'triggeredAt' | 'secondsFromStart'>
): Promise<void>;

export function subscribeHighlights(
  issueId: string,
  cb: (highlights: Highlight[]) => void
): Unsubscribe;
```

### 現有 hook 改造
- `useDarkHorse` → 觸發時 call `logHighlight(...)`
- `useComboCounter` → 觸發時 call
- `useGlobalHype` → 觸發時 call
- `useVoteSurge` → 觸發時 call

### Component 新增
- `components/Highlight/HighlightTimeline.tsx` — timeline 元件
- `components/Highlight/HighlightCard.tsx` — 單個事件卡
- `components/Highlight/HighlightExport.tsx` — 匯出清單 / JSON / CSV
- `pages/IssueArchivePage.tsx` 加 highlights section

---

## UI 草圖

### 期數歷史頁的 highlight timeline

```
═══════════════════════════════════════════════
  HIGHLIGHTS  ·  精選時刻
  Issue Nº 12 · 19:30 — 21:48 · 共 14 個高潮
═══════════════════════════════════════════════

  19:32  ────● FIRST VOTE
            ▮ vNJ4xxx 投了〈晴天〉開場

  19:48  ────●  COMBO ×5
            ▮〈稻香〉
            ▮ vK8bxxx 連投 5 次

  20:12  ────●●● DARK HORSE  ↑5
            ▮〈倒數〉從第 8 衝到第 3
            ▮ 觸發 voters: 8 位
            [📸 screenshot]

  20:34  ────●●●●● GLOBAL HYPE
            ▮ 同時段 12 人投票
            ▮ 主理人時刻：「現場最 high 的 30 秒」

  20:51  ────● BADGE UNLOCKED
            ▮ vK8bxxx 解鎖「🔥 熱情歌迷」

  21:02  ────●●● TOP 1 CHANGED
            ▮〈晴天〉超越〈小幸運〉

  21:48  ────● LAST VOTE
            ▮ vM7xxx 投了〈夜空中最亮的星〉

═══════════════════════════════════════════════
  [匯出 JSON]  [匯出 CSV]  [分享 timeline]
```

### 緊湊版（嵌主理人手記文末）

```
─────────────────────────────────────────────
  今晚的 5 個關鍵時刻
  ●  19:48  COMBO ×5  〈稻香〉
  ●  20:12  DARK HORSE ↑5  〈倒數〉
  ●  20:34  GLOBAL HYPE  12 位同投
  ●  21:02  TOP 1 CHANGED  〈晴天〉超前
  ●  21:18  COMBO ×8  〈小幸運〉
  [看完整時間軸 →]
─────────────────────────────────────────────
```

---

## 實作步驟

1. **Firestore module + Rules**（45 min）
   ```
   match /issues/{issueId}/highlights/{highlightId} {
     allow read: if true;
     allow create: if true;  // 訪客也可觸發（前端 hook 觸發）
     allow update, delete: if isAdmin();
   }
   ```
   - ⚠️ allow create: true 有灌訊息風險，要 rate limit

2. **改造 5 個 hooks 寫入 highlight**（90 min）
   - useDarkHorse / useComboCounter / useGlobalHype / useVoteSurge
   - 加 useTop1Change（新 hook，偵測第 1 名換人）
   - 觸發時去重：5 秒內同 type 同 songId 不重複寫

3. **Screenshot 機制**（120 min）— 最大難點
   - Overlay 顯示時用 `html-to-image`（已有依賴）抓對應 overlay 元件
   - 上傳 Firebase Storage `highlights/{issueId}/{highlightId}.png`
   - 失敗 fallback：不存 screenshot 也不影響事件紀錄
   - ⚠️ 效能：截圖會卡 UI 100-300ms，要在 overlay 動畫結束後背景做

4. **HighlightTimeline 元件**（90 min）
   - 垂直 timeline + 時間軸刻度
   - 每個事件圓點 + 卡片
   - 點圓點 scroll 到對應卡片
   - 篩選器（type / songId）

5. **HighlightCard 元件**（60 min）
   - 5 種 type 各自不同視覺
   - 點圖開 lightbox 看截圖
   - 點歌名跳 SongDetailModal

6. **IssueArchivePage 整合**（45 min）
   - 期數歷史頁加 highlight section
   - 主理人手記 PostPage 加緊湊版（5 個關鍵時刻）

7. **匯出功能**（60 min）
   - JSON / CSV 匯出
   - 「分享 timeline」生成靜態 HTML 短連結

---

## 驗收條件

- ✅ 5 個事件 hook 觸發時都會寫入 Firestore
- ✅ 演出後 issue archive 看得到完整 timeline
- ✅ Screenshot 失敗不影響事件紀錄
- ✅ 同事件 5 秒內去重
- ✅ Timeline 可篩選 type
- ✅ 點歌名跳 SongDetailModal
- ✅ JSON / CSV 匯出格式對
- ✅ 整合進 PostPage（緊湊版 5 個）

---

## 風險 / 已知坑

### 🚨 高風險
1. **Screenshot 卡 UI**
   - `html-to-image.toPng()` 在低階手機上會卡 300-500ms
   - **解法**：
     - 等 overlay 動畫結束（onAnimationEnd）才截圖
     - 用 `requestIdleCallback` 排程
     - 截圖失敗就跳過（不影響事件紀錄）

2. **allow create: true 灌訊息**
   - 訪客可寫 → 可能被腳本灌
   - **解法**：
     - 客端嚴格去重（5s 內同 type 同 songId 不寫）
     - Rules 限制 `secondsFromStart >= 0 && secondsFromStart <= 14400`（4 小時內）
     - 加 Cloudflare Turnstile（搭配 skill `cloudflare-turnstile-integration`）

### ⚠️ 中風險
3. **時間漂移**
   - `triggeredAt` 用 client time 不準（每個瀏覽器時鐘不同）
   - **解法**：
     - 用 `serverTimestamp()` 寫入
     - `secondsFromStart` 用 issue.startedAt 計算（server 端）

4. **儲存成本**
   - 每場演出 ~20 個 highlight × 200KB screenshot = ~4MB
   - 1 年 50 場 = 200MB
   - **解法**：免費層 5GB 撐很久，且 archived 期數可壓縮成低解析度

5. **5 個 hooks 邏輯散落**
   - 改 5 個 hooks 加 logHighlight，後續維護時容易漏
   - **解法**：抽 `useHighlightLogger()` 共用 hook，5 個 hook 都用它

---

## 估時

| 樂觀 | 預期 | 悲觀 |
|:----:|:----:|:----:|
| 8h | 10h | 14h（含 screenshot 跨機型測試） |

---

## 依賴項

- 🟠 **依賴 D1**：highlight 掛在 `issues/{issueId}` 下
- 🟡 **依賴 D2**：緊湊版嵌在 PostPage
- 🟢 **可獨立做 timeline 部分**：不靠 D1/D2 也行，但失去「歷史回顧」功能

---

## 後續延伸

- **D6.5：自動產生短片清單** — 把 timeline + screenshot 串成 30 秒 video（用 Cloud Functions + FFmpeg）
- **D6.6：「年度精選時刻」** — 12 期累積後自動生成「2026 年度回顧」
- **AI 解說**：用 Gemini Free Tier 為每個 highlight 寫一句解說
- **音訊同步**：若有錄音，timeline 可對應到原音檔
