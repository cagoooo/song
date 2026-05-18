# C1 — LRC 歌詞同步播放

> **狀態**：設計階段 | **估時**：10h（從 12-15h 砍）| **優先級**：🟠 P1 | **依賴**：T3（schema）

## TL;DR

把 T3 已建立的 `LyricBlock[]` 加上 `startMs` 時間戳，做演出模式大螢幕歌詞同步投影：當前句高亮放大、節拍器條、拍點視覺化。支援 LRC 格式 import/export，YouTube 內嵌播放對齊。

---

## 動機

### 現況痛點
- 演出模式 StagePage 雖有「現正播放」但**沒歌詞同步**
- 阿凱現場彈唱觀眾跟不上歌詞，沒法合唱
- 卡拉 OK 級體驗缺位

### 為什麼從 12-15h 砍到 10h
- ✅ T3 已建立 `LyricBlock[]` 結構（INTRO/VERSE/CHORUS/...）
- ✅ T3 schema 已預留 `startMs?: number` 給 LRC
- ✅ SongDetailModal 已有歌詞渲染元件可重用
- 只需做：LRC 解析、時間軸對齊、大螢幕 high-light 元件、YouTube embed 同步

---

## 資料模型

### 擴張 `LyricRow`（T3 已預留）

```ts
export interface LyricRow {
  chord?: string;
  line?: string;
  startMs?: number;     // 🆕 此句開始 ms
  durationMs?: number;  // 🆕 此句持續 ms（可選，用下一句 startMs 推算）
}
```

### LRC 格式對應

```
[ti:晴天]
[ar:周杰倫]
[al:葉惠美]
[length:04:23]

[00:12.50]故事的小黃花
[00:18.20]從出生那年就飄著
[00:24.10]童年的盪鞦韆
[00:30.00]隨記憶一直晃到現在
```

對應到 `LyricRow`：
```ts
{
  chord: 'C  G  Am  Em',
  line: '故事的小黃花',
  startMs: 12500,  // [00:12.50]
}
```

---

## API / Hooks / Components

### 解析器
```ts
// client/src/lib/lrc.ts
export function parseLrc(text: string): LyricBlock[];
export function serializeLrc(blocks: LyricBlock[], meta?: {
  title?: string;
  artist?: string;
  album?: string;
  length?: string;
}): string;

/** 取得當前時間點對應的 row index */
export function getCurrentLineIndex(
  blocks: LyricBlock[],
  currentMs: number
): { blockIndex: number; rowIndex: number } | null;
```

### Hook
```ts
// client/src/hooks/useLyricSync.ts
export function useLyricSync(opts: {
  song: Song;
  isPlaying: boolean;
  /** 來源：'manual' = 管理員手動拍點 / 'youtube' = 從 YT player / 'offset' = 從 startedAt 推算 */
  source: 'manual' | 'youtube' | 'offset';
  youtubePlayerRef?: React.RefObject<any>;
  manualOffsetMs?: number;
}): {
  currentMs: number;
  currentLineIndex: { blockIndex: number; rowIndex: number } | null;
  blocks: LyricBlock[];
  // Admin 控制
  seek: (ms: number) => void;
  togglePlay: () => void;
};
```

### Components
- `components/Lyrics/LyricStage.tsx` — 大螢幕高亮歌詞元件（StagePage 整合）
- `components/Lyrics/LyricEditor.tsx` — 後台拍點編輯器
- `components/Lyrics/YouTubeSyncPlayer.tsx` — YT iframe + 同步控制
- `components/Lyrics/BeatMetronome.tsx` — 拍子線視覺（節拍器）

---

## UI 草圖

### 演出模式大螢幕（LyricStage）

```
═══════════════════════════════════════════════════
                                                  19:48
   阿凱 · Guitar Singalong   Nº 12 · MAY 2026
─────────────────────────────────────────────────

                    晴天
                    周杰倫 · 78 BPM

           ▮  童年的盪鞦韆
       ▮▮  隨記憶一直晃到現在               ← 當前句，大字
              ▮  刮風這天 我試過握著你手
                 ▮  但偏偏 雨漸漸 大到我看你不見

   ●○○○○  ←─ 拍子線（拍點視覺化）
─────────────────────────────────────────────────
   ▶ 02:14 / 04:23     ━━━━━━━━━━━━━━━○━━━
═══════════════════════════════════════════════════
```

### 後台拍點編輯器（LyricEditor）

```
┌────────────────────────────────────────┐
│  🎵 拍點編輯器 — 晴天                    │
│                                        │
│  ▶ [Play]  ⏸️ [Pause]  ⏹ [Stop]         │
│                                        │
│  ▼ 來源                                 │
│  ◉ YouTube （ID: jBZuKpRRZes）           │
│  ○ 上傳 .mp3                            │
│  ○ 手動 offset（從演出開始計時）          │
│                                        │
│  ▼ 拍點操作                              │
│  播放時按 [SPACE] 標記當前句的 startMs     │
│  Tab/Shift+Tab 切換句                    │
│                                        │
│  歌詞列表（紅色 = 未標時間戳）             │
│  ✓ [00:12.50] 故事的小黃花                 │
│  ✓ [00:18.20] 從出生那年就飄著             │
│  ✗ [-------] 童年的盪鞦韆     ← 當前      │
│  ✗ [-------] 隨記憶一直晃到現在            │
│  ...                                   │
│                                        │
│  [匯出 LRC]  [匯入 LRC]  [儲存]           │
└────────────────────────────────────────┘
```

---

## 實作步驟

1. **`lib/lrc.ts` 解析 + 序列化**（90 min）
   - `parseLrc()` 處理 LRC 格式 + 多個時間戳同行（`[00:12.50][00:24.10]歌詞`）
   - `serializeLrc()` 寫回標準 LRC
   - `getCurrentLineIndex()` 二分搜
   - 寫 8-10 個 unit test（含邊界）

2. **`useLyricSync` hook**（90 min）
   - 三種來源：manual / youtube / offset
   - 用 `requestAnimationFrame` 30fps tick（不用 60fps，省電）
   - `currentMs` 透過 ref 暫存避免 re-render
   - 加 `seek()` 跳到某 ms

3. **`LyricStage` 大螢幕元件**（90 min）
   - 5 行視窗（前 1 / 當前 / 後 3）
   - 當前句 scale 1.4 + 雜誌藍
   - smooth transition（spring 動畫 or CSS transition）
   - **wrap 長句**：自動換行 + 保持高亮

4. **`BeatMetronome` 拍子線**（45 min）
   - 依 BPM 算每拍 ms（60_000 / BPM）
   - 5 個 dot，當前拍亮起
   - 純 CSS animation（不用 RAF）

5. **`YouTubeSyncPlayer`**（90 min）
   - `youtube-player` npm package（10KB）
   - admin-only：StagePage 上方浮動 player iframe
   - `getCurrentTime()` 餵給 `useLyricSync`
   - 暫停 / 繼續 / 跳節

6. **`LyricEditor` 後台拍點**（120 min）
   - 整合 YouTube iframe
   - [SPACE] 鍵綁定：當前播放時間 → 寫進當前列 row.startMs
   - Tab / Shift+Tab 切換 row
   - 列表標示已標 / 未標
   - LRC 匯出 / 匯入

7. **StagePage 整合**（30 min）
   - 加 toggle「歌詞投影」按鈕
   - 開啟時切換 hero 區為 LyricStage

8. **效能 + 跨機型測試**（30 min）
   - 投影機 1080p 確認字夠大（min 64px）
   - 4G 行動裝置 RAF 不掉幀
   - prefers-reduced-motion 改 fade transition

---

## 驗收條件

- ✅ 阿凱可在後台貼 LRC 文字 → 解析成 LyricBlock
- ✅ 拍點編輯器 SPACE 鍵可記錄當前時間 → 寫進對應 row
- ✅ StagePage 開啟「歌詞投影」可看到當前句高亮
- ✅ 三種來源（manual / youtube / offset）都可用
- ✅ 拍子線跟 BPM 對齊
- ✅ 投影機 1080p 字夠大可遠看
- ✅ prefers-reduced-motion 走 fade 不抖
- ✅ LRC 匯出格式可被外部播放器（如 osu! / Hibiki）讀取

---

## 風險 / 已知坑

### 🚨 高風險
1. **YouTube iframe CORS + autoplay 政策**
   - Chrome 阻擋無使用者互動的 autoplay
   - **解法**：admin 必須點 [Play] 才開始，不能 onload auto play
   - iframe 帶 `?enablejsapi=1&origin={location.origin}`

2. **時間漂移**
   - YT player 的 `getCurrentTime()` 不一定每秒準
   - **解法**：每 200ms poll 一次，內插平滑
   - manual / offset 模式用 `performance.now()` 而非 `Date.now()`（不受系統時鐘影響）

### ⚠️ 中風險
3. **拍點手感**
   - SPACE 標時間時老師如果反應慢半拍，整首歌偏移
   - **解法**：
     - 提供「全體 offset」滑桿：標完後微調 ±200ms
     - 加 [B] 鍵 = back 跳上一句重標
     - 加「自動同步」按鈕：依 BPM 從第一拍均勻分配（粗略 baseline）

4. **長句換行高亮**
   - 一句歌詞 30+ 字會自動換行，當前句高亮要包整段
   - **解法**：用 `<p>` block element 而非 `<span>`，整段 transform

5. **bundle 影響**
   - `youtube-player` ~10KB，LyricEditor ~5KB，編輯器只 admin 載入
   - **解法**：route-based code splitting（StagePage / LyricEditor lazy）

### 💡 小坑
6. LRC 多重時間戳 `[00:12.50][00:24.10]xxx` 要展成多 row（不少 LRC 庫漏掉）
7. metadata `[ti:][ar:][al:][length:]` 解析後填回 `parseLrc()` return 的 meta 欄
8. 結尾沒時間戳的句子 fallback：用最後一個有時間戳 + 5s 推算

---

## 估時

| 樂觀 | 預期 | 悲觀 |
|:----:|:----:|:----:|
| 9h | 10h | 14h（含拍點手感調整） |

---

## 依賴項

- 🔴 **必須先做 T3**：`LyricBlock` schema 已預留 `startMs`
- 🟡 **建議搭 D6 一起**：D6 highlight reel 可記「副歌時刻」用 LRC 推算
- 🟢 **可獨立做**：YT player 不依賴其他

---

## 後續延伸

- **AI 自動標時間戳** — 用 Gemini Free Tier 或 Whisper（Cloud Function）對音檔做 word-level alignment
- **觀眾合唱模式** — 給觀眾手機顯示當前句（同步用 Firestore live update）
- **多語言切換** — LyricBlock 加 `lang: 'zh-TW' | 'en'`，可切日文歌詞
- **歌詞編輯版權聲明** — 商業使用要付費，教學用 fair use
