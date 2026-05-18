# D5 — 歌曲版本 / 風格標記擴張

> **狀態**：設計階段 | **估時**：3-4h | **優先級**：🟡 P2 | **依賴**：T3（Song schema 擴張）

## TL;DR

把 Song schema 從現在的單一 `tags: string[]` 擴張成三個維度的結構化標記（`version` / `mood` / `era`），為 C4 AI 推薦鋪路，並讓 StatsDashboard 多一張「情緒分佈雷達圖」。

---

## 動機

### 現況痛點
- `tags: string[]` 太自由，相同歌曲不同管理員會標不同 tag（「抒情」vs「催淚」vs「慢歌」）
- StatsDashboard 想做情緒分佈但沒乾淨資料源
- C4 AI 推薦需要結構化特徵向量，現在的 tag 太雜
- TagFilterBar 變成大雜燴 chip，使用者選不出規律

### 為什麼現在做
- T3 即將動 Song schema，順便做 mood 擴張影響面最小
- 為 C4 AI 推薦鋪路（C4 估時 18h，若這次先做 D5，C4 砍到 12h）

---

## 資料模型

### Firestore Song schema 擴張

```ts
// 既有
export interface Song {
  id: string;
  title: string;
  artist: string;
  notes?: string;
  lyrics?: string;
  audioUrl?: string;
  isActive: boolean;
  createdAt: Date;
  voteCount: number;
  isPlayed?: boolean;
  isNowPlaying?: boolean;
  difficulty?: 1 | 2 | 3;
}

// 🆕 擴張
export interface Song {
  // ...既有
  /** @deprecated 改用 mood / era / genre，舊資料留著當 fallback */
  tags?: string[];

  /** 版本：原曲 / 改編 / 不插電 / 阿凱版 */
  version?: SongVersion;

  /** 情緒：熱血 / 抒情 / 療癒 / 懷舊 / 嗨歌 / 慢歌 */
  mood?: SongMood;

  /** 年代 */
  era?: SongEra;

  /** 曲風（取代雜亂 tags） */
  genre?: SongGenre;
}

export type SongVersion = 'original' | 'acoustic' | 'remix' | 'kai-cover';
export type SongMood = 'energetic' | 'tender' | 'healing' | 'nostalgic' | 'hype' | 'slow';
export type SongEra = '80s' | '90s' | '00s' | '10s' | '20s';
export type SongGenre = 'pop' | 'rock' | 'folk' | 'rnb' | 'indie' | 'classic' | 'mandopop' | 'jpop' | 'kpop';
```

### 視覺對應

```ts
export const MOOD_META: Record<SongMood, { label: string; emoji: string; color: string }> = {
  energetic: { label: '熱血', emoji: '🔥', color: '#dc2626' },
  tender:    { label: '抒情', emoji: '🌙', color: '#2b4dff' },
  healing:   { label: '療癒', emoji: '🌿', color: '#10b981' },
  nostalgic: { label: '懷舊', emoji: '📻', color: '#a16207' },
  hype:      { label: '嗨歌', emoji: '⚡', color: '#f59e0b' },
  slow:      { label: '慢歌', emoji: '🕯️', color: '#6366f1' },
};
```

---

## API / Hooks / Components

### Firestore Rules 擴張
```
function isValidSongPayload() {
  return request.resource.data.title is string
    && (!('mood' in request.resource.data) || request.resource.data.mood in [
         'energetic', 'tender', 'healing', 'nostalgic', 'hype', 'slow'
       ])
    && (!('era' in request.resource.data) || request.resource.data.era in [
         '80s', '90s', '00s', '10s', '20s'
       ])
    && ...
}
```

### Hook
```ts
// 用既有 useAllSongTags 邏輯擴張
export function useMoodDistribution(): {
  distribution: Record<SongMood, number>;
  totalSongs: number;
};
```

### Component 改動
- `TagFilterBar` 改成三段式：
  - 上排：情緒（6 個 emoji chip）
  - 中排：年代（5 個年代）
  - 下排：曲風（9 個）
- `EditDialog` 加三個 select 欄位
- `StatsDashboard` 加 mood 分佈雷達圖（recharts 已有）

---

## UI 草圖

### TagFilterBar 改造
```
═══════════════════════════════════════════════
  ▮ 篩選
  ─────

  情緒  [ 🔥熱血 ] [🌙抒情] [🌿療癒] [📻懷舊] [⚡嗨歌] [🕯️慢歌]
  年代  [ 80s ] [ 90s ] [ 00s ] [ 10s ] [ 20s ]
  曲風  [流行][搖滾][民謠][R&B][獨立][經典][華語][日韓]
  難度  [ ⭐ ] [ ⭐⭐ ] [ ⭐⭐⭐ ]

  [清除全部]
═══════════════════════════════════════════════
```

### StatsDashboard 新增雷達圖
```
┌─────────────────────────────────────────┐
│ № 03  今晚情緒分佈                       │
│                                         │
│              熱血                        │
│            * * *                        │
│       慢歌 * * * * * 抒情                │
│           * * * * *                     │
│        嗨歌 * * * 療癒                    │
│             * *                         │
│              懷舊                        │
│                                         │
│ 主理人觀察：抒情占 47%，是 12 期最高比例    │
└─────────────────────────────────────────┘
```

---

## 實作步驟

1. **Schema 擴張**（30 min）
   - `firestore/types.ts` 加四個欄位
   - export MOOD / VERSION / ERA / GENRE meta

2. **Firestore Rules**（15 min）
   - 加 enum 驗證

3. **EditDialog 三個 select**（45 min）
   - 用既有 shadcn Select primitive
   - 預設 undefined（不強制填）
   - 加「快速填」按鈕：跳出五個常見組合

4. **TagFilterBar 三段式改造**（60 min）
   - 保留既有舊 tag 行為（fallback）
   - 加 mood / era / genre 三排
   - URL query 改成 `?mood=tender,nostalgic&era=90s`

5. **StatsDashboard 雷達圖**（45 min）
   - 用 recharts `<RadarChart>`
   - 主理人 pull-quote 自動產生（「抒情占 47%」）

6. **Migration script**（30 min）
   - 一次性 script 把既有歌曲的 `tags: ["抒情"]` 自動 map 到 `mood: 'tender'`
   - 跑在 dev branch + manual review 過再 apply prod

---

## 驗收條件

- ✅ EditDialog 可選三個維度
- ✅ TagFilterBar 三段式可用，URL 同步
- ✅ StatsDashboard 雷達圖顯示當期情緒分佈
- ✅ 舊資料（只有 tags）不破壞，繼續顯示
- ✅ 主理人 pull-quote 自動生成（依最大佔比情緒）
- ✅ Rules 阻擋寫入無效 enum

---

## 風險 / 已知坑

### ⚠️ 中風險
1. **既有資料 migration**
   - 32 首歌已標的 tags 不一定能自動 map（「催淚」算 tender 還是 slow？）
   - **解法**：
     - 寫對應表自動 map 60% 常見 tag
     - 剩下 40% 阿凱後台手動補（給 admin 一個 unmapped songs 列表）

2. **管理員不想填**
   - 三個維度要填很煩，阿凱可能全部空著
   - **解法**：
     - **不強制必填**
     - 提供「快速填」按鈕，根據歌手 / 標題自動猜
     - 給 UI 提示「填了會顯示在統計雷達圖」

### 💡 小坑
3. **mood 是主觀的** — 同首歌不同人標不同
   - **解法**：以阿凱判斷為準，不開放眾包
4. **era 邊界模糊** — 〈Hotel California〉是 70s 還是 80s？
   - **解法**：80s 涵蓋 1980-1989，邊界往新算

---

## 估時

| 樂觀 | 預期 | 悲觀 |
|:----:|:----:|:----:|
| 3h | 4h | 6h（含 migration 校對） |

---

## 依賴項

- 🟠 **依賴 T3**：T3 會動 Song schema，D5 一起做最有效
- 🟢 **可獨立做**：不靠 T3 也行，只是會分兩次動 schema

---

## 後續延伸

- **D5.5：曲風偏好統計** — 「你最常投抒情歌」個人化統計，嵌在 VoterPassport
- **C4 AI 推薦** — 用 mood / era / genre 作為特徵向量
- **演出主題分類** — 整場「抒情之夜」「90s 復古」「校園民謠」
- **音樂教學** — 〈晴天〉的和弦結構在「抒情 + 10s」這群歌很常見
