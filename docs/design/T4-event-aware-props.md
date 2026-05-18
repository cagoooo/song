# T4 — 5 件套預留 `eventId` props（為 B2 鋪路）

> **狀態**：設計階段 | **估時**：4h | **優先級**：🟡 P2 | **依賴**：無 | **為 v5.0 B2 鋪路**

## TL;DR

在不真正切換活動的前提下，把 5 件套元件 + 12 個 hooks 的 props/參數加一個可選 `eventId?: string`（default = `'default'`），所有 Firestore query 跟 localStorage key 都帶上這個值。**v5.0 B2 上線時只要把這個 prop 從常數變成從 URL 讀，整個應用就支援多活動了**。

---

## 動機

### 現況痛點
- ROADMAP 把 B2「多場活動」估時拉到 12h+，主因是 **5 件套全部 hardcode 假設單一活動**
- 任何改動 → B2 上線時都要重寫一遍
- 即使 v5.0 之前的 v4.7 → v4.9 開發，每加一個 hook / modal 都繼續累積債

### 為什麼是 P2
- 不會立即有功能 — 純架構準備
- 4h 一次性投入，可以讓 B2 估時從 12h 砍到 6-8h
- 不做的話，每加一個新元件就多一筆未來要改

### 為什麼是「現在 B2 之前」做
- 5 件套剛上線、改動成本最低
- D1-D6 之後再做 5 件套元件改動更多，債更深

---

## 影響範圍盤點

### Firestore collection（會跟 eventId scope 的）

| Collection | 現況 | 加 eventId 後 |
|------------|------|---------------|
| `songs` | flat | 仍 flat（歌單可跨活動共用） |
| `votes` | flat | 加 `eventId` 欄位 + 複合索引 |
| `songSuggestions` | flat | 加 `eventId` 欄位 |
| `nowPlaying` | 單一 doc | 改成 `events/{eventId}/nowPlaying/current` |
| `playedSongs` | flat | 加 `eventId` 欄位 |
| `interactions` | flat | 加 `eventId` 欄位 |
| `qrScans` | flat | 加 `eventId` 欄位 |

### Hooks（會帶 eventId 的）

| Hook | 改動 |
|------|------|
| `useVoteHistory` | localStorage key 從 `song_vote_history_v1` → `song_vote_history_v1__{eventId}` |
| `useNowPlaying` | Firestore path 加上 eventId |
| `useDarkHorse` / `useComboCounter` / `useGlobalHype` / `useVoteSurge` | 內部讀 votes 時 filter by eventId |
| `useVoterLeaderboard` | 統計 scope 到 eventId |
| `useSortMode` | URL query 增加 `?event=` |
| `useAllSongTags` | 不影響（歌單跨活動） |
| `useStatsData` | filter by eventId |
| `useServiceWorkerUpdate` | 不影響 |
| `useKeyboardShortcuts` | 不影響 |

### Components（會帶 eventId props 的）

| Component | 用途 | 加 eventId 後 |
|------|------|---------------|
| Home / StagePage | 容器，從 URL 讀 | 加 `useEvent()` hook 從 URL 拿 eventId |
| UpNextBar | 隊列 | 從 eventId scope 的 nowPlaying 讀 |
| ThankYouModal | 結束儀式 | 「結束此活動」而非「結束今晚」 |
| VoterPassportModal | 雙計數：本場 vs 生涯 | 加 `eventId` prop，分兩組統計 |
| ShareCardModal | 分享卡 | event 資料填入 hero |
| OpeningCurtain | 開場 | sessionStorage key 帶 eventId |
| RankingBoard | 排行榜 | filter by eventId |
| StatsDashboard | 統計 | filter by eventId |

---

## 設計策略

### 策略 1：默認常數 + 中央 hook（不做真實切換）

新增一個 hook 暫時永遠回傳 `'default'`：

```ts
// client/src/hooks/useEvent.ts
const DEFAULT_EVENT_ID = 'default';

/**
 * 取得當前活動 ID。
 * 🚧 v4.7 階段永遠回傳 'default'。
 * 🚀 B2 上線後改成從 URL ?event= 讀。
 */
export function useEvent(): { eventId: string; isDefault: boolean } {
  // 未來改：
  // const [params] = useSearchParams();
  // const eventId = params.get('event') ?? DEFAULT_EVENT_ID;

  return { eventId: DEFAULT_EVENT_ID, isDefault: true };
}
```

### 策略 2：所有 Firestore module 加 eventId 參數（可選）

```ts
// firestore/votes.ts
export function subscribeVotes(
  cb: (votes: Vote[]) => void,
  opts?: { eventId?: string }
): Unsubscribe {
  const eventId = opts?.eventId ?? 'default';
  return onSnapshot(
    query(votesCol, where('eventId', '==', eventId)),
    snapshot => cb(snapshot.docs.map(...))
  );
}
```

### 策略 3：寫入時自動填 eventId

```ts
// firestore/votes.ts
export async function castVote(songId: string, opts?: { eventId?: string }): Promise<void> {
  const eventId = opts?.eventId ?? 'default';
  await addDoc(votesCol, {
    songId,
    eventId,
    createdAt: serverTimestamp(),
    voterId: getVoterId(),
  });
}
```

### 策略 4：localStorage key 加後綴

```ts
// useVoteHistory.ts
const STORAGE_KEY_BASE = 'song_vote_history_v1';

function storageKey(eventId: string): string {
  return eventId === 'default'
    ? STORAGE_KEY_BASE  // 向後相容
    : `${STORAGE_KEY_BASE}__${eventId}`;
}

export function useVoteHistory(opts?: { eventId?: string }): UseVoteHistoryReturn {
  const eventId = opts?.eventId ?? 'default';
  const key = storageKey(eventId);
  // ... 用 key 讀寫 localStorage
}
```

---

## 實作步驟

1. **`useEvent()` hook**（10 min）
   - 永遠回 `'default'`，留 TODO

2. **Firestore migration script — 把既有 votes 全部標記 eventId='default'**（45 min）
   ```bash
   # admin-only script
   node scripts/migrate-add-event-id.mjs
   ```
   - 跑一次：把 votes / playedSongs / interactions / suggestions 全加 `eventId: 'default'`
   - 加複合索引：`(eventId, songId, createdAt DESC)` 等
   - **必須在 prod migrate 前，先在 dev branch 跑過**

3. **Firestore module 加 opts**（90 min）
   - 7 個 collection 的 firestore module：subscribe/get/add/update 全加 `opts?.eventId`
   - 預設 `'default'`，向後相容

4. **Rules 擴張**（30 min）
   ```
   match /votes/{voteId} {
     allow create: if isValidVote() && request.resource.data.eventId is string;
   }
   ```

5. **7 個 hook 加參數**（60 min）
   - `useVoteHistory` / `useNowPlaying` / `useDarkHorse` / `useComboCounter` / `useGlobalHype` / `useVoteSurge` / `useVoterLeaderboard` / `useStatsData`
   - 全加 `opts?: { eventId?: string }`
   - 內部用 `opts?.eventId ?? 'default'`

6. **5 件套元件 props**（30 min）
   - UpNextBar / ThankYouModal / VoterPassport / ShareCard / OpeningCurtain
   - 加 `eventId?: string`，default `'default'`
   - sessionStorage key 加後綴

7. **Smoke test**（15 min）
   - 跑 dev server
   - 演出一輪：投票 → 開 SongDetail → 結束 → 看 ShareCard
   - 確認 Firestore 上的 vote doc 都有 `eventId: 'default'`
   - localStorage 看 `song_vote_history_v1`（不該有後綴，向後相容）

---

## 驗收條件

- ✅ 所有 Firestore writes 都帶 `eventId` 欄位
- ✅ 所有 query 都用 `where('eventId', '==', ...)` filter（即使現在永遠 'default'）
- ✅ Hooks 接受 `opts?.eventId` 參數，default `'default'`
- ✅ 5 件套 props 接受 `eventId?`，default `'default'`
- ✅ 既有資料 migrate 過後不破壞功能
- ✅ Firestore 複合索引預先建好
- ✅ Rules 阻擋無 eventId 的寫入
- ✅ B2 上線時只要改 `useEvent()` 一個 hook 就完成切換

---

## 風險 / 已知坑

### 🚨 高風險
1. **Migration script 寫錯資料**
   - 跑一次 update 32 首歌的所有 votes，寫錯不可逆
   - **解法**：
     - dev 先跑一次 + 抽驗 10 筆
     - 用 `update`（不是 `set`）只加欄位不蓋
     - prod 跑之前先 Firestore export backup

2. **複合索引建立時間長**
   - `(eventId, songId, createdAt DESC)` 在 votes collection 大時要幾分鐘
   - **解法**：先在 `firebase.json` 預先註冊，部署一次
   - 等 Firebase Console 顯示 index 完成才繼續

### ⚠️ 中風險
3. **`useVoteHistory` localStorage key 切換**
   - 從 `song_vote_history_v1` 切到 `song_vote_history_v1__abc123` 會丟使用者本地紀錄
   - **解法**：B2 上線時 default eventId 永遠用原 key（不加後綴），其他 event 才加
   - migrate 邏輯：若使用者在 default eventId，localStorage 不變

4. **5 件套 props 介面破壞**
   - 若把 `eventId` 設成 required 會 break 所有 caller
   - **解法**：永遠 `eventId?: string`（optional），預設 `'default'`

5. **Rules 改完未測試**
   - 加 `request.resource.data.eventId is string` 後若忘了 client 端帶值，所有寫入 fail
   - **解法**：T2 補 Firestore Rules 測試一起做

### 💡 小坑
6. **Firestore where eventId == 'default' vs no filter**
   - 早期沒 eventId 的 doc 用 `where('eventId', '==', 'default')` 抓不到（field missing）
   - **解法**：migration script 必須跑完 + 確認所有舊 doc 都有此欄位
7. **VoterPassport 雙計數 v4.7 不做**
   - 「本場 vs 生涯」是 B2 才需要，現在不寫
   - 但 props 介面預留：`<VoterPassport eventId={...} showLifetimeStats?: boolean />`

---

## 估時

| 樂觀 | 預期 | 悲觀 |
|:----:|:----:|:----:|
| 3h | 4h | 6h（含 migration 校對） |

---

## 依賴項

- ✅ **完全獨立** — 不依賴任何項目
- 🟡 **建議跟 D1 一起做**：D1 期刊系統可直接用 `relatedEventId`（不過 default 是 'default'）
- ⚠️ **必須在 B2 之前做** — 否則 B2 工程暴增

---

## B2 上線後的收益對照

| 任務 | 沒做 T4 | 做了 T4 |
|------|--------|---------|
| URL 加 ?event= 參數 | 改 1 處 | 改 1 處 |
| `useEvent()` 從 URL 讀 | — | 改 1 行 |
| 5 件套支援活動切換 | 重寫 9 個元件 ~6h | 0 改動 ✅ |
| Hooks 接受 eventId | 改 7 個 hook ~2h | 0 改動 ✅ |
| Firestore migration | ~3h | 已完成 ✅ |
| 複合索引建立 | 部署等 ~30 min | 已完成 ✅ |
| Rules 改 | ~1h | 已完成 ✅ |
| **B2 估時** | **12-14h** | **6-8h** ✅ |

---

## 後續延伸

- **B2 主體**：URL routing + 活動 CRUD + 切換 UI
- **VoterPassport 雙計數**：本場 vs 生涯（B2 上線時加 `showLifetimeStats` prop）
- **跨活動排行榜**：「全平台累計票數最高」（admin-only 統計頁）
- **活動 archive**：每場活動結束自動 archive + 鎖讀
