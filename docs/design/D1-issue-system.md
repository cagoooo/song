# D1 — 雜誌期刊期數系統

> **狀態**：設計階段 | **估時**：4-6h | **優先級**：🟠 P1 | **依賴**：無

## TL;DR

把現在散落在 5 件套裡的 `ISSUE №12 · MAY 2026 · 阿凱彈唱之夜` hardcode 字串，改成從 Firestore `settings/magazine` 一處讀取，並建立「期數歷史 archive」可瀏覽過往每場演出。

---

## 動機

### 現況痛點
- **6 處 hardcode** —「ISSUE №12」散落在：
  - `ShareCardModal.tsx`（雜誌頂條 + Hero）
  - `ThankYouModal.tsx`（END OF SIDE A 標頭）
  - `OpeningCurtain.tsx`（開場儀式字幕）
  - `Home.tsx` Topbar（品牌列）
  - `StagePage.tsx`（演出模式頂條）
  - `VoterPassportModal.tsx`（護照封面期數）
- 每場演出都要 grep + replace 6 次，**極易漏掉**
- 沒有「過往期數」概念 —— 演出資料只能看到「現在這一場」
- 阿凱老師希望像 podcast / 月刊一樣累積成「品牌資產」

### 為什麼現在做
- 5 件套已上線且引用同一組字串，現在是抽出共用層的最佳時機
- 為 D2 主理人專欄、D6 精選時刻剪輯鋪路（兩者都要關聯到「期數」）

---

## 資料模型

### Firestore 新 collection / doc

```
settings/magazine                      // 單一 doc，所有頁面共讀
  ├─ currentIssueNumber: number        // 例：12
  ├─ currentIssueTitle: string         // "阿凱彈唱之夜"
  ├─ currentIssueSubtitle?: string     // "MAY 2026 · SIDE A"
  ├─ currentSideLabel: 'A' | 'B'       // 卡帶 A 面 / B 面
  ├─ currentStartedAt: Timestamp
  ├─ currentTheme?: string             // "blue" | "red" | "green"（未來 D5 可換色）
  └─ updatedAt: Timestamp

issues/{issueId}                       // 一場演出 = 一期，封存後新增
  ├─ issueNumber: number               // 12
  ├─ title: string                     // "阿凱彈唱之夜"
  ├─ subtitle: string                  // "MAY 2026"
  ├─ sideLabel: 'A' | 'B'
  ├─ startedAt: Timestamp
  ├─ endedAt: Timestamp                // ThankYouModal 觸發時寫入
  ├─ stats: {                          // 凍結的當期統計
  │    totalVotes: number,
  │    uniqueVoters: number,
  │    top3: { songId, title, artist, votes }[],
  │    topVoterIds: string[]
  │ }
  ├─ coverImageUrl?: string            // ShareCard 截圖存 Storage
  └─ archived: boolean
```

### TypeScript types（加到 `firestore/types.ts`）

```ts
export interface MagazineSettings {
  currentIssueNumber: number;
  currentIssueTitle: string;
  currentIssueSubtitle?: string;
  currentSideLabel: 'A' | 'B';
  currentStartedAt: Date;
  currentTheme?: string;
}

export interface IssueArchive {
  id: string;
  issueNumber: number;
  title: string;
  subtitle: string;
  sideLabel: 'A' | 'B';
  startedAt: Date;
  endedAt: Date;
  stats: {
    totalVotes: number;
    uniqueVoters: number;
    top3: Array<{ songId: string; title: string; artist: string; votes: number }>;
    topVoterIds: string[];
  };
  coverImageUrl?: string;
  archived: boolean;
}
```

---

## API / Hooks / Components

### Hook
```ts
// client/src/hooks/useMagazine.ts
export function useMagazine(): {
  settings: MagazineSettings | null;
  loading: boolean;
  // 管理員操作
  updateSettings: (patch: Partial<MagazineSettings>) => Promise<void>;
  archiveCurrentIssue: (stats: IssueArchive['stats']) => Promise<IssueArchive>;
  incrementIssueNumber: () => Promise<void>;
};
```

### Firestore module
```ts
// client/src/lib/firestore/magazine.ts
export function subscribeMagazine(cb: (s: MagazineSettings) => void): Unsubscribe;
export function updateMagazineSettings(patch: Partial<MagazineSettings>): Promise<void>;
export function archiveIssue(data: Omit<IssueArchive, 'id'>): Promise<string>;
export function listIssues(opts?: { limit?: number }): Promise<IssueArchive[]>;
export function getIssue(id: string): Promise<IssueArchive | null>;
```

### Component 改動
- 5 件套全改成讀 `useMagazine()` 而不是 hardcode
- 新增 `<MagazineHeader />` 共用元件（卡帶 + ISSUE 號 + side label），目前 5 件套都各自寫一份

### 新頁面
- `/archive` — 期刊書架（grid 排列每期封面圖 + 標題）
- `/archive/:issueId` — 單期詳情頁（Top 3 / 統計 / 主理人寄語 / 下載 ShareCard）

---

## UI 草圖

### 後台「期刊設定」tab
```
┌─────────────────────────────────────────┐
│  № 13   設定下一期                       │
│  ───                                    │
│  期數      [13____]   side  [ A | B ]    │
│  標題      [阿凱彈唱之夜______________]   │
│  副標題    [JUN 2026__________________]   │
│  主題色   [● 藍 ○ 紅 ○ 綠]                │
│                                         │
│  [儲存] [預覽 OpeningCurtain]            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  過往期數 (12)                           │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐                │
│  │№12│ │№11│ │№10│ │№9 │  ← 點開歷史頁    │
│  └───┘ └───┘ └───┘ └───┘                │
└─────────────────────────────────────────┘
```

### 訪客 `/archive` 期刊書架
```
ARCHIVE  ·  阿凱 Guitar Singalong  ·  全部 12 期
══════════════════════════════════════════

┌──────────┐  ┌──────────┐  ┌──────────┐
│  №12     │  │  №11     │  │  №10     │
│ SIDE A   │  │ SIDE A   │  │ SIDE B   │
│ MAY 2026 │  │ APR 2026 │  │ MAR 2026 │
│ 87 票    │  │ 64 票    │  │ 102 票   │
└──────────┘  └──────────┘  └──────────┘
```

---

## 實作步驟

1. **Firestore module**（30 min）
   - 新增 `client/src/lib/firestore/magazine.ts`
   - 加 schema 到 `types.ts`
   - export 進 `firestore/index.ts`

2. **Firestore Rules**（15 min）
   ```
   match /settings/magazine {
     allow read: if true;
     allow write: if isAdmin();
   }
   match /issues/{issueId} {
     allow read: if true;
     allow create, update: if isAdmin();
     allow delete: if false; // 期數歷史不可刪
   }
   ```

3. **Hook**（30 min）
   - `useMagazine()` 走 `onSnapshot` 即時同步
   - 提供 fallback：若 doc 不存在自動建立 default

4. **共用 component**（45 min）
   - `<MagazineHeader />` — issueNumber + title + sideLabel + 卡帶 SVG
   - 加 storybook / 視覺測試起點

5. **5 件套改造**（90 min）
   - ShareCardModal / ThankYouModal / OpeningCurtain / Home / StagePage / VoterPassport
   - 每個都換成 `<MagazineHeader />` 或 `useMagazine()` 讀值

6. **後台「期刊設定」UI**（60 min）
   - 在 admin 區加 tab
   - form + preview

7. **`/archive` 頁面**（60 min）
   - 路由 + 列表 + 單期詳情
   - SEO meta（每期一張 OG 圖）

8. **整合 ThankYouModal「結束今晚」流程**（30 min）
   - 觸發時自動寫 `issues/{auto-id}`，並 `incrementIssueNumber()`
   - 把當期 ShareCard 截圖傳 Storage 存 coverImageUrl

9. **Migration**（15 min）
   - 跑一次性 script 把當前 hardcode `№12` 寫入 Firestore

---

## 驗收條件

- ✅ 改一處 Firestore，5 件套全跟著變
- ✅ `/archive` 看得到過往期數
- ✅ 「結束今晚」會自動歸檔當期 + 把 currentIssueNumber +1
- ✅ Admin 後台可改下一期標題 / 期數 / side
- ✅ ShareCardModal 預覽即時反映設定變更
- ✅ Firestore Rules 阻擋訪客寫入 settings / issues
- ✅ `OpeningCurtain` 在 currentTheme === 'red' 時整套變紅色

---

## 風險 / 已知坑

### 🚨 高風險
1. **「結束今晚」是寫入操作不可逆**
   - 期數 +1 後若馬上反悔要復原非常麻煩
   - **解法**：archive 前先 confirm dialog（搭配 P0 #2「結束今晚 confirm」一起做）
   - 加 admin-only「取消結束 / 復原上一期」按鈕（限 5 分鐘內可用）

2. **5 件套 hardcode 移除順序**
   - 一個 PR 改 6 個檔案，merge conflict 機率高
   - **解法**：先做 `<MagazineHeader />` 共用元件 PR，再做 6 個替換 PR

### ⚠️ 中風險
3. **issues 統計凍結**
   - 結束時凍結的 `top3` 之後若改歌曲 title / artist 就對不上
   - **解法**：archive 時連 `title` / `artist` 一起存（snapshot），不只存 `songId`

4. **theme 切換時 CSS 變數要動態切換**
   - 雜誌藍 `#2b4dff` 散落各處
   - **解法**：抽到 `:root[data-theme="blue|red|green"] { --magazine-accent: ... }`，配合 T1 CSS 拆檔一起做

### 💡 小坑
5. `useMagazine()` SSR-safe — `typeof window !== 'undefined'` 防爆
6. `incrementIssueNumber` 用 `runTransaction` 避免兩個管理員同時點

---

## 估時

| 樂觀 | 預期 | 悲觀 |
|:----:|:----:|:----:|
| 4h | 5h | 7h（含寫 archive UI） |

---

## 依賴項

- ⚠️ **依賴 P0 #2「結束今晚 confirm」** — 先做這個再 archive，否則容易誤觸
- ⚠️ **建議搭配 T1 CSS 拆檔** — `currentTheme` 改色機制要在 CSS 拆檔後做才不會亂

---

## 後續延伸

- **D2 主理人專欄**：每篇文章可關聯 `issueId`
- **D6 精選時刻**：剪輯 metadata 存在 `issues/{id}/highlights/`
- **B2 多場活動**：B2 上線後 issue 概念併入 event（一場 event = 一期 issue）
