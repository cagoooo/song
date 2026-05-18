# T3 — SongDetail 串 Firestore 真實資料源

> **狀態**：設計階段 | **估時**：4h | **優先級**：🟠 P1 | **依賴**：無

## TL;DR

把 `SongDetail/data.ts` hardcode 的「晴天」一首歌的樂譜資料，改成從 Firestore Song doc 讀取（新增 `chord` / `lyrics` / `bpm` / `key` / `capo` / `youtubeId` 欄位）。管理員後台 EditDialog 加「樂譜編輯」tab。Fallback 機制保留給沒填資料的歌。

---

## 動機

### 現況痛點
- `client/src/components/SongDetail/data.ts:60-95` 只有「晴天」一首是真實資料
- 其他 32 首歌全走 `seedHash` fallback，生成「假的」capo / BPM / key / 歌詞
- 阿凱演出當下開 SongDetail 看到一堆假資料 + 「請阿凱老師補上」文字
- C1 LRC 同步播放沒有資料源
- D6 highlight reel 想抓「副歌時刻」沒有時間軸

### 為什麼是 P1
- SongDetailModal 是 v4.3.0 的旗艦功能，但只支援 1 首歌是嚴重 UX 缺陷
- C1 LRC、C4 AI 推薦、D5 mood tags 都依賴此 schema
- 4h 就能解鎖整批下游功能

---

## 資料模型

### Firestore Song schema 擴張

```ts
// firestore/types.ts
export interface Song {
  // ===== 既有欄位 =====
  id: string;
  title: string;
  artist: string;
  notes?: string;
  lyrics?: string;          // ⚠️ 舊欄位（純文字），保留但 deprecate
  audioUrl?: string;
  isActive: boolean;
  createdAt: Date;
  voteCount: number;
  isPlayed?: boolean;
  isNowPlaying?: boolean;
  difficulty?: 1 | 2 | 3;

  // ===== 🆕 樂譜欄位 =====
  /** 音調，例：C / G / Am */
  songKey?: string;          // 用 songKey 不用 key（key 是 JS reserved）

  /** Capo 位置：0 = 不夾 */
  capo?: number;

  /** BPM */
  bpm?: number;

  /** 歌曲長度，格式 "MM:SS" */
  length?: string;

  /** 和弦進行：["C", "G", "Am", "F"] */
  progression?: string[];

  /** 🆕 結構化歌詞區塊（取代純文字 lyrics） */
  lyricBlocks?: LyricBlock[];

  /** YouTube ID（給 SongDetail thumbnail / 預覽） */
  youtubeId?: string;

  /** 阿凱筆記 */
  kaiNote?: string;
}

export interface LyricBlock {
  sec: 'INTRO' | 'VERSE 1' | 'VERSE 2' | 'VERSE 3' | 'CHORUS' | 'BRIDGE' | 'OUTRO';
  chorus?: boolean;
  rows: LyricRow[];
}

export interface LyricRow {
  chord?: string;      // 和弦標記（INTRO 可只有 chord 沒 line）
  line?: string;       // 歌詞
  startMs?: number;    // 🆕 為 C1 LRC 預留，本期不填
}
```

### Firestore Rules 擴張

```
function isValidSongPayload() {
  let data = request.resource.data;
  return data.title is string && data.title.size() > 0
    && data.artist is string
    && (!('songKey' in data) || data.songKey is string)
    && (!('capo' in data) || (data.capo is int && data.capo >= 0 && data.capo <= 12))
    && (!('bpm' in data) || (data.bpm is int && data.bpm >= 30 && data.bpm <= 250))
    && (!('progression' in data) || data.progression is list)
    && (!('lyricBlocks' in data) || data.lyricBlocks is list)
    && (!('youtubeId' in data) || (data.youtubeId is string && data.youtubeId.size() <= 20))
    ;
}
```

---

## API / Hooks / Components

### `SongDetail/data.ts` 重構

```ts
// 改動方向：getSongDetail 優先讀 song.lyricBlocks / song.bpm / ...，沒有才走 fallback
export function getSongDetail(song: Song): SongDetail {
  return {
    capo: song.capo ?? fallbackCapo(song),
    key: song.songKey ?? fallbackKey(song),
    bpm: song.bpm ?? fallbackBpm(song),
    length: song.length ?? fallbackLength(song),
    progression: song.progression ?? fallbackProgression(song),
    fingerings: COMMON_FINGERINGS,
    lyrics: song.lyricBlocks
      ? song.lyricBlocks
      : song.lyrics
        ? [convertLegacyLyricsString(song.lyrics)]
        : fallbackLyrics(song),
    note: song.kaiNote ?? fallbackNote(song),
    similar: [],  // 由 findSimilarSongs 算
  };
}
```

### Admin EditDialog 加 tab

新元件：`components/admin/SongLyricsEditor.tsx`

```tsx
<Tabs defaultValue="basic">
  <TabsList>
    <TabsTrigger value="basic">基本資料</TabsTrigger>
    <TabsTrigger value="lyrics">🆕 樂譜與歌詞</TabsTrigger>
  </TabsList>

  <TabsContent value="basic">
    {/* 既有的 title / artist / tags / difficulty 等 */}
  </TabsContent>

  <TabsContent value="lyrics">
    <SongLyricsEditor song={editingSong} onChange={...} />
  </TabsContent>
</Tabs>
```

### SongLyricsEditor UI

```ts
interface SongLyricsEditorProps {
  song: Song;
  onChange: (patch: Partial<Song>) => void;
}
```

包含：
- 三欄基本資料：`songKey` / `capo` / `bpm`（input + 預設值）
- `length` `MM:SS` input
- `progression` chips 編輯器（可加可刪）
- `youtubeId` input + 縮圖預覽
- 歌詞區塊編輯器（textarea + 解析）
- `kaiNote` textarea
- 預覽按鈕：右半屏 live render SongDetailModal

---

## UI 草圖

### 「樂譜與歌詞」tab

```
┌──────────────────────┬─────────────────────────┐
│ 音調 [ C ▼ ]          │  ▮ 晴天                  │
│ Capo [ 2 ]            │  ▮ 周杰倫                │
│ BPM  [ 78 ]           │                         │
│ 長度 [ 04:23 ]         │  ┌─────────────────┐    │
│                       │  │ C │ G │ Am │ Em │    │
│ 和弦進行              │  └─────────────────┘    │
│ [C][G][Am][Em][F]    │                         │
│ [Dm][G][C]  [+]      │  Capo 2 · 78 BPM         │
│                       │  ─────────              │
│ YouTube ID             │  [INTRO]                │
│ [ jBZuKpRRZes ]       │  C G Am Em              │
│ [預覽 thumb]          │                         │
│                       │  [VERSE 1]               │
│ 歌詞                  │  故事的小黃花...          │
│ ┌──────────────────┐  │                         │
│ │ [INTRO]            │  │  ...                    │
│ │ C  G  Am  Em        │                         │
│ │                    │  └─── 即時預覽 ───        │
│ │ [VERSE 1]           │                         │
│ │ C       G       Am  │                         │
│ │ 故事的小黃花...      │                         │
│ │                    │                         │
│ │ [CHORUS] ✓ chorus   │                         │
│ │ ...                │                         │
│ └──────────────────┘  │                         │
│ [解析格式]  [清除]    │                         │
│                       │                         │
│ 阿凱筆記              │                         │
│ ┌──────────────────┐  │                         │
│ │ 副歌前那個 Em...    │                         │
│ └──────────────────┘  │                         │
│                       │                         │
│ [儲存]  [取消]        │                         │
└──────────────────────┴─────────────────────────┘
```

### 歌詞解析 mini-DSL

textarea 讓阿凱貼這格式：

```
[INTRO]
C  G  Am  Em

[VERSE 1]
C            G        Am          Em
故事的小黃花  從出生那年  就飄著
F           G          C
童年的盪鞦韆  隨記憶一直晃到現在

[CHORUS]*
C              G               Am          Em
刮風這天 我試過握著你手 但偏偏
```

**規則**：
- `[SECTION_NAME]` 開頭新區塊
- `[CHORUS]*` 加星號標記 `chorus: true`
- 兩行一組 = chord + line
- 一行 = INTRO 或 OUTRO 的純和弦行

「解析格式」按鈕呼叫 `parseLyricsDSL()` 把文字轉成 `LyricBlock[]`。

---

## 實作步驟

1. **Schema + Rules**（30 min）
   - `firestore/types.ts` 加 6 個欄位
   - `firestore.rules` 加驗證
   - 跑 rules 測試（搭配 T2 / Firestore Rules 測試一起做）

2. **`getSongDetail` 重構**（45 min）
   - 改成讀 Firestore 欄位優先，fallback 機制保留
   - **保留現有「晴天」hardcode 作為 fallback 範本**（移到 `EXAMPLE_DATA`，不再硬塞給「晴天」）
   - 加 `convertLegacyLyricsString()` 把舊 `lyrics: string` 自動轉成單一 VERSE block

3. **`parseLyricsDSL()` 解析器**（45 min）
   ```ts
   export function parseLyricsDSL(text: string): LyricBlock[];
   export function serializeLyricsToDSL(blocks: LyricBlock[]): string;
   ```
   - 寫 unit test：5-6 個解析案例（含邊界）

4. **SongLyricsEditor component**（90 min）
   - 三欄基本欄位 + progression chips
   - 歌詞 textarea + 解析 / 序列化
   - YouTube thumbnail 預覽（`https://img.youtube.com/vi/{id}/mqdefault.jpg`）
   - 即時預覽（右半屏 reuse SongDetailModal preview mode）

5. **EditDialog 整合 Tabs**（30 min）
   - 現有表單放 basic tab
   - 加 lyrics tab + 對應 onChange handler

6. **「晴天」資料寫入 Firestore**（15 min）
   - 一次性 admin script 把 `data.ts` 的「晴天」資料 upsert 進對應 Song doc
   - 驗證 SongDetailModal 開「晴天」顯示一樣

7. **歌詞 import 工具（可選）**（30 min）
   - 拖檔 .lrc 或 .txt → 自動解析

---

## 驗收條件

- ✅ Firestore Song doc 可帶 6 個樂譜欄位
- ✅ Rules 阻擋無效資料寫入
- ✅ Admin 可在 EditDialog「樂譜與歌詞」tab 編輯
- ✅ DSL textarea 可雙向轉換（parse + serialize）
- ✅ 即時預覽 work
- ✅ SongDetailModal 讀取真實資料（不再走 fallback for 已填過資料的歌）
- ✅ 沒填資料的歌仍有 fallback（不破壞既有體驗）
- ✅ 「晴天」資料完整遷移進 Firestore
- ✅ 舊 `lyrics: string` 還能用（向後相容）

---

## 風險 / 已知坑

### 🚨 高風險
1. **舊 `lyrics: string` 欄位向後相容**
   - 既有歌曲有 `lyrics: "副歌前那段..."` 純文字
   - 不能砍掉，否則舊資料畫面變空
   - **解法**：`getSongDetail` 邏輯 — `lyricBlocks > lyrics > fallback`
   - 加 admin 「升級」按鈕，把舊 `lyrics` 自動轉 `lyricBlocks` 後刪 `lyrics`

2. **DSL 解析錯誤拋例外**
   - 阿凱貼一段格式錯的，畫面整個炸
   - **解法**：
     - `parseLyricsDSL()` 永遠回傳 `LyricBlock[]`（空陣列 = 失敗）
     - 加 error log 訊息給編輯器：「INTRO 後沒有內容」「VERSE 1 行數不對」

### ⚠️ 中風險
3. **chord 對齊困難**
   - DSL 用空格對齊和弦在 textarea 看起來歪斜（字寬不一）
   - **解法**：
     - 編輯器強制等寬字型 `font-mono`（JetBrains Mono 已載入）
     - 預覽模式用 SongDetailModal 既有的 chord alignment

4. **YouTube thumbnail CORS**
   - 直接 `<img src="https://img.youtube.com/...">` 有時被 CORS 擋
   - **解法**：YouTube 圖片 CORS 開放，但加 referrer policy `<meta name="referrer" content="no-referrer">`

### 💡 小坑
5. `songKey` 命名 — 不能叫 `key` 因為 React/JS reserved，UI 文案叫「音調」
6. progression 陣列在 Firestore 上限 1MB，但一首歌幾個和弦很安全
7. 即時預覽 debounce 300ms，否則打字卡

---

## 估時

| 樂觀 | 預期 | 悲觀 |
|:----:|:----:|:----:|
| 4h | 5h | 7h（含 DSL parser 邊界處理） |

---

## 依賴項

- ✅ **完全獨立** — 可單獨完成
- 🟡 **跟 D5 一起做最有效**：D5 也動 Song schema（mood / era），合併一個 PR 動 schema 比較乾淨
- 🟠 **是 C1 LRC 的前置依賴** — `lyricBlocks` schema 已包含 `startMs?` 給 LRC

---

## 後續延伸

- **C1 LRC 同步**：在 `LyricRow` 上補 `startMs` 後直接可用
- **C4 AI 推薦**：用 progression / songKey 算相似度
- **批次 import**：從 Notion / Google Sheet / .lrc 檔案匯入歌詞
- **歌詞版權聲明**：可在 SongDetailModal 加「歌詞僅供教學使用，原作版權歸詞曲作者」
