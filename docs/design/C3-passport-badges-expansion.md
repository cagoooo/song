# C3 — 護照徽章擴張至 12-15 個

> **狀態**：設計階段 | **估時**：8h（從 12-15h 砍）| **優先級**：🟠 P1 | **依賴**：D6（黑馬獵人徽章需要 highlight 資料）

## TL;DR

VoterPassportModal 目前已有 6 個徽章（灌票王 / 點滿一場 / 首發點播 / 評星達人 / 連續 3 場 / 看完一場）。本 doc 擴張到 14 個，新增解鎖瞬間的全螢幕慶祝動畫（類似黑馬時刻），並把徽章定義抽出來作為 data layer，方便後續維護。

---

## 動機

### 現況痛點
- 6 個徽章太少 — 投 50 票就把所有「重度玩家」徽章解鎖完，沒有後續動力
- 沒有「稀有」徽章（夜貓子 / 黑馬獵人 / 開場見證）
- 解鎖瞬間沒有視覺回饋 — 使用者要打開 modal 才知道解鎖了
- 徽章定義 hardcode 在 `VoterPassportModal.tsx:79-139`，60 行邏輯難維護
- 沒有徽章排行榜 — 阿凱看不到誰收集最多

### 為什麼從 12-15h 砍到 8h
- ✅ VoterPassport 架構已建立（6 個徽章 / 解鎖邏輯 / SVG textPath 等）
- ✅ DarkHorseOverlay 慶祝動畫可直接複用
- 只需做：擴張到 14 個 + 解鎖瞬間動畫 + 抽 data layer

---

## 現況徽章（6 個）

| Key | 圖示 | 名稱 | 條件（依 code） |
|-----|:----:|------|-----------------|
| `vote-storm` | 🔥 | 灌票王 | 單場 ≥ 50 票 |
| `full-deck` | 🎸 | 點滿一場 | 單場 ≥ 5 首不同歌 |
| `first-call` | 🌟 | 首發點播 | 總票 ≥ 1 |
| `five-star` | ⭐ | 評星達人 | 不同歌 ≥ 10 |
| `three-shows` | 📻 | 連續 3 場 | 到場場次 ≥ 3 |
| `final-encore` | 🎬 | 看完一場 | 單場 ≥ 16 票 |

---

## 🆕 擴張到 14 個徽章

```ts
// client/src/components/VoterPassport/badge-specs.ts (新檔)
export const BADGE_SPECS: BadgeDef[] = [
  // ===== 入門級（必拿）=====
  { key: 'first-call', glyph: '🌟', name: '首發點播', titleStamp: 'FIRST CALL · 首發點播 · ',
    condition: '投出第一票', tier: 'starter',
    check: (s) => s.totalVotes >= 1,
    progress: (s) => null },

  // ===== 累積級（投票多）=====
  { key: 'five-star', glyph: '⭐', name: '評星達人',
    condition: '累積點過 10 首不同的歌', tier: 'common',
    check: (s) => s.uniqueSongs >= 10,
    progress: (s) => ({ now: s.uniqueSongs, target: 10 }) },

  { key: 'song-collector', glyph: '🗂️', name: '歌曲蒐藏家',  // 🆕
    condition: '累積點過 30 首不同的歌', tier: 'rare',
    check: (s) => s.uniqueSongs >= 30,
    progress: (s) => ({ now: s.uniqueSongs, target: 30 }) },

  { key: 'centurion', glyph: '👑', name: '點歌王',  // 🆕
    condition: '累積投票滿 100 次', tier: 'rare',
    check: (s) => s.totalVotes >= 100,
    progress: (s) => ({ now: s.totalVotes, target: 100 }) },

  // ===== 單場級 =====
  { key: 'full-deck', glyph: '🎸', name: '點滿一場',
    condition: '同一場投 5 首不同歌', tier: 'common',
    check: (s) => s.maxDayUnique >= 5 },

  { key: 'vote-storm', glyph: '🔥', name: '灌票王',
    condition: '單場 ≥ 50 票', tier: 'rare',
    check: (s) => s.maxDayCount >= 50 },

  { key: 'final-encore', glyph: '🎬', name: '看完一場',
    condition: '單場 ≥ 16 票', tier: 'common',
    check: (s) => s.maxDayCount >= 16 },

  // ===== 連場級 =====
  { key: 'three-shows', glyph: '📻', name: '連續 3 場',
    condition: '到場 3 個不同夜晚', tier: 'rare',
    check: (s) => s.showsAttended >= 3 },

  { key: 'season-pass', glyph: '🎟️', name: '季票常客',  // 🆕
    condition: '到場 ≥ 10 場', tier: 'epic',
    check: (s) => s.showsAttended >= 10,
    progress: (s) => ({ now: s.showsAttended, target: 10 }) },

  // ===== 時段級 🆕（行為類）=====
  { key: 'night-owl', glyph: '🌙', name: '夜貓子',  // 🆕
    condition: '22:00 後投 20 票', tier: 'rare',
    check: (s) => s.lateNightVotes >= 20,
    progress: (s) => ({ now: s.lateNightVotes, target: 20 }) },

  { key: 'opening-act', glyph: '🎭', name: '開場見證',  // 🆕
    condition: '看完 OpeningCurtain 5 次（不 skip）', tier: 'rare',
    check: (s) => s.openingCurtainsWatched >= 5,
    progress: (s) => ({ now: s.openingCurtainsWatched, target: 5 }) },

  // ===== 事件級 🆕（依賴 D6）=====
  { key: 'dark-horse-hunter', glyph: '🐎', name: '黑馬獵人',  // 🆕（依賴 D6）
    condition: '投中 5 次黑馬時刻', tier: 'epic',
    check: (s) => s.darkHorseHits >= 5,
    progress: (s) => ({ now: s.darkHorseHits, target: 5 }) },

  { key: 'combo-master', glyph: '⚡', name: '連擊宗師',  // 🆕（依賴 D6）
    condition: '觸發 COMBO ×5 三次', tier: 'epic',
    check: (s) => s.combosTriggered >= 3,
    progress: (s) => ({ now: s.combosTriggered, target: 3 }) },

  // ===== 隱藏級 🆕（特殊）=====
  { key: 'genre-explorer', glyph: '🎼', name: '雜學家',  // 🆕（依賴 D5）
    condition: '投過 5 種不同 mood', tier: 'epic',
    check: (s) => s.uniqueMoods >= 5,
    progress: (s) => ({ now: s.uniqueMoods, target: 5 }) },
];
```

**Tier 系統**：
- `starter` (1)：必拿
- `common` (3-4)：認真投就有
- `rare` (5-6)：常客
- `epic` (3-4)：硬核玩家
- `legendary` (0-1, 未來保留)

---

## 資料模型

### Stats 計算物件（擴張）

```ts
// client/src/components/VoterPassport/passport-stats.ts (新檔)
export interface PassportStats {
  // 既有
  totalVotes: number;
  uniqueSongs: number;
  showsAttended: number;
  maxDayCount: number;
  maxDayUnique: number;
  firstVoteAt?: number;
  lastVoteAt?: number;

  // 🆕 來自 useVoteHistory 衍生
  lateNightVotes: number;       // hour >= 22 || hour < 6 的票數

  // 🆕 來自 sessionStorage / localStorage
  openingCurtainsWatched: number;

  // 🆕 來自 Firestore highlights（D6）
  darkHorseHits: number;
  combosTriggered: number;

  // 🆕 來自 Firestore + D5 mood tags
  uniqueMoods: number;
}

export function calculatePassportStats(
  history: VoteHistoryEntry[],
  meta?: {
    openingCurtainsWatched?: number;
    darkHorseHits?: number;
    combosTriggered?: number;
    uniqueMoods?: number;
  }
): PassportStats;
```

---

## 解鎖瞬間慶祝動畫

新增 `BadgeUnlockOverlay.tsx` — 類似 DarkHorseOverlay：

```ts
interface BadgeUnlockOverlayProps {
  badge: BadgeDef | null;
  onClose: () => void;
}
```

### 動畫時序（共 4 秒）
1. **0.0-0.3s** 黑底淡入
2. **0.3-1.0s** 圓章從 0 旋轉跳到 1.2 倍 + 雜誌藍光暈
3. **1.0-2.0s** 「BADGE UNLOCKED」跑馬燈
4. **2.0-3.0s** 徽章名稱 + 條件 fade-in（Playfair italic 大字）
5. **3.0-4.0s** 淡出，自動 open VoterPassport 並 scroll 到該徽章

### 觸發機制

```ts
// 新 hook：useBadgeUnlockListener
export function useBadgeUnlockListener(
  history: VoteHistoryEntry[],
  onUnlock: (badge: BadgeDef) => void
): void;
```

實作：
- 監聽 `history` 變化
- 計算前後 stats
- 比對「上次解鎖狀態」與「現在解鎖狀態」
- 新解鎖 → call `onUnlock(badge)`
- 已解鎖狀態存 `localStorage.passport-unlocked-keys-v1`

---

## API / Hooks / Components

### 新檔
- `components/VoterPassport/badge-specs.ts` — 14 個 BadgeDef
- `components/VoterPassport/passport-stats.ts` — stats 計算 + 共用
- `components/VoterPassport/BadgeUnlockOverlay.tsx` — 慶祝動畫
- `hooks/useBadgeUnlockListener.ts` — 監聽 + diff
- `hooks/useOpeningCurtainWatched.ts` — 累積看完次數

### VoterPassportModal 改動
```diff
- // 既有 60 行徽章邏輯
+ const stats = calculatePassportStats(history, { ... });
+ const badges = BADGE_SPECS.map(spec => ({
+   ...spec,
+   unlocked: spec.check(stats),
+   progress: spec.progress?.(stats) ?? null,
+ }));
```

### Home.tsx / Layout 加 BadgeUnlockOverlay
```tsx
const [unlockedBadge, setUnlockedBadge] = useState<BadgeDef | null>(null);
useBadgeUnlockListener(history, setUnlockedBadge);

<BadgeUnlockOverlay badge={unlockedBadge} onClose={() => setUnlockedBadge(null)} />
```

---

## UI 草圖

### BadgeUnlockOverlay 慶祝畫面

```
═══════════════════════════════════════════════
（全黑 + 雜誌藍光暈背景）

           ┌─────────────────┐
           │      ⭐         │   ← 圓章從 0 旋到 1.2x
           │   FIVE-STAR    │
           │   評星達人      │
           └─────────────────┘
            ▮  BADGE UNLOCKED  ▮  ← 跑馬燈

              評星達人
       累積點過 10 首不同的歌

            [看護照 →]
═══════════════════════════════════════════════
```

### 擴張版 VoterPassportModal

```
═══════════════════════════════════════════════
 Nº 12 · VOTER PASSPORT          阿凱彈唱之夜
─────────────────────────────────────────────

 ┌────────────────────┐  ┌──────────────────┐
 │  Voter Passport    │  │  87           14 │
 │  Nº 12 · Side A    │  │  總票         不同歌
 │   ▶ VERIFIED ◀      │  │  ─                │
 │                    │  │            3 場     │
 └────────────────────┘  └──────────────────┘

   已解鎖 7 / 14 ─────────────────────────

   ⭐   🌟   🎸   🔥   📻   🎬   ⚡
   評    首    點    灌    連    看    連
   星    發    滿    票    續    完    擊
   達    點    一    王    3    一    宗
   人    播    場          場    場    師

   未解鎖 7 / 14 ─────────────────────────

   🗂️   👑   🎟️   🌙   🎭   🐎   🎼
   蒐    點    季    夜    開    黑    雜
   藏    歌    票    貓    場    馬    學
   家    王    常    子    見    獵    家
              客          證    人

   ── 點 locked 卡看解鎖條件 + 進度 ──
═══════════════════════════════════════════════
```

---

## 實作步驟

1. **抽 `badge-specs.ts` + `passport-stats.ts`**（90 min）
   - 重構既有 6 個徽章成 BADGE_SPECS
   - 加 8 個新徽章定義
   - `calculatePassportStats()` 共用函式
   - 寫 12-15 個 unit test（每個徽章 unlock/lock 路徑）

2. **新欄位資料蒐集**（60 min）
   - `lateNightVotes`：from `useVoteHistory`（已有 timestamp，加 hour filter）
   - `openingCurtainsWatched`：新 hook `useOpeningCurtainWatched`，localStorage 累積計數
   - `darkHorseHits` / `combosTriggered`：依賴 D6（無 D6 先填 0）
   - `uniqueMoods`：依賴 D5（無 D5 先填 0）

3. **VoterPassportModal 重構**（45 min）
   - 改用 BADGE_SPECS + stats
   - 視覺：tier 不同顏色 / 邊框（starter 灰 / common 藍 / rare 金 / epic 紫）

4. **BadgeUnlockOverlay 慶祝動畫**（120 min）
   - 4 秒時序動畫（CSS keyframes）
   - svg textPath 弧形字（reuse 既有）
   - prefers-reduced-motion fallback：直接 fade
   - audio cue（可選靜音）

5. **useBadgeUnlockListener hook**（60 min）
   - 監聽 history 變化
   - localStorage 存「已解鎖 keys」防止重複觸發
   - 第一次掛載時：跑一次完整 stats，標記所有當前已解鎖（不觸發動畫）
   - 之後每次 history 變才比對

6. **整合進主流程**（30 min）
   - Home.tsx 加 BadgeUnlockOverlay
   - StagePage 也要加（觀眾在演出模式投票時也會解鎖）

7. **徽章排行榜（可選）**（60 min）
   - admin 後台「徽章統計」tab
   - 顯示「14 個徽章各被多少人解鎖」+「平均收集數」
   - 阿凱可看到哪些徽章太難 / 太簡單

---

## 驗收條件

- ✅ 14 個徽章定義集中在 `badge-specs.ts`
- ✅ 解鎖瞬間跳 BadgeUnlockOverlay 4 秒動畫
- ✅ 動畫結束自動開啟 VoterPassport 並 scroll 到該徽章
- ✅ localStorage 記錄已解鎖 keys，重整不重複觸發
- ✅ prefers-reduced-motion 走 fade，不抖
- ✅ 每個徽章都有 unlock / lock 對應 unit test
- ✅ 視覺 tier 區分明確（starter/common/rare/epic）
- ✅ 沒 D5/D6 時對應徽章顯示 locked + 「即將推出」hint

---

## 風險 / 已知坑

### 🚨 高風險
1. **第一次掛載觸發大量慶祝**
   - 若使用者已投 100 票才上線新版本，會連跳 7 個 BadgeUnlockOverlay
   - **解法**：
     - localStorage `passport-unlocked-keys-v1` 第一次掛載直接寫入「當前所有已解鎖」
     - 不觸發動畫
     - 之後變動才比 diff

2. **第二天清快取的使用者**
   - 清 localStorage 後重投，舊解鎖全跳一次
   - **解法**：可接受（罕見情況），且把它當「重新看慶祝動畫」彩蛋

### ⚠️ 中風險
3. **依賴 D5 / D6 的徽章顯示策略**
   - D5/D6 沒做前，雜學家 / 黑馬獵人永遠 locked
   - **解法**：
     - 卡片角落標「即將推出」
     - 不算進「7/14」進度（避免使用者覺得 6 個是天花板）
     - 或：暫時隱藏（feature flag 控制）

4. **lateNightVotes 計算**
   - 跨時區 / 跨日午夜的歸屬
   - **解法**：以本機時鐘 22:00-06:00 為晚上（不嚴格）

### 💡 小坑
5. tier 視覺差異不要過大（會被吐槽手遊化），雜誌風應該內斂
6. BadgeUnlockOverlay 跟 DarkHorseOverlay / ComboOverlay 不能同時觸發（會疊）
   - **解法**：用 priority queue + 5 秒間隔強制

---

## 估時

| 樂觀 | 預期 | 悲觀 |
|:----:|:----:|:----:|
| 7h | 8h | 12h（含 tier 視覺迭代） |

---

## 依賴項

- 🟢 **可獨立做 10 個徽章**（不含 darkhorse / combo / mood）
- 🟡 **D5 完成後**：解鎖「雜學家」
- 🟡 **D6 完成後**：解鎖「黑馬獵人」「連擊宗師」
- 🟢 可單獨完成：解鎖動畫部分

---

## 後續延伸

- **「徽章宇宙」頁** — 公開頁面陳列所有 14 個徽章 + 全平台累積解鎖次數
- **季節徽章** — 限時徽章（例：「2026 五月」期間到場 ≥ 3 場）
- **隱藏徽章** — 不顯示條件，意外觸發才知道（例：「夜半 03:00 投票 1 次」「投票第 1024 次」）
- **C2 社群登入** 後跨裝置同步徽章
- **徽章交換** — v7.0+ 社群化：兩位 voter 可交換徽章複製品（純收藏）
