# D4 — 演出後感讀者來信

> **狀態**：設計階段 | **估時**：5-6h | **優先級**：🟢 P3 | **依賴**：D1（期數關聯）、D2（顯示於主理人手記下）

## TL;DR

ThankYouModal 結束儀式後跳出「給今晚的一句話」textarea（50 字內），觀眾匿名 / 暱稱二選一留訊。阿凱老師後台可精選 5 句發布到「讀者回響」頁，像雜誌讀者來信欄。

---

## 動機

### 現況痛點
- 演出結束沒有「最後一哩」收集觀眾即時感受
- 阿凱想知道觀眾今晚聽得開不開心，但沒有低門檻管道
- ThankYouModal 是情感收尾的高點，**錯過這時刻使用者離開後就不會再回來留訊**

### 為什麼是 P3 而非更高
- 內容平台類功能，沒有立刻的功能性
- 需要防灌票 / 髒話過濾機制，工程比想像複雜
- 阿凱可能用 LINE / Google Form 也能達到類似效果

### 設計靈感
雜誌風格本來就有「讀者回響欄」「給編輯部的信」這種版位，editorial 主題天然適合。

---

## 資料模型

### Firestore

```
letters/{letterId}
  ├─ content: string                  // 50 字內，前端 + rule 雙重限制
  ├─ nickname?: string                // 留空 = 匿名
  ├─ relatedIssueId?: string          // 哪一場演出的
  ├─ voterId: string                  // 從本機 useVoteHistory 拿
  ├─ submittedAt: Timestamp
  ├─ status: 'pending' | 'featured' | 'hidden'
  ├─ featuredAt?: Timestamp           // 被精選的時間
  ├─ featuredOrder?: number           // 1-5 排序
  └─ adminNote?: string               // 阿凱的私下備註
```

### TypeScript

```ts
export interface ReaderLetter {
  id: string;
  content: string;
  nickname?: string;
  relatedIssueId?: string;
  voterId: string;
  submittedAt: Date;
  status: 'pending' | 'featured' | 'hidden';
  featuredAt?: Date;
  featuredOrder?: number;
  adminNote?: string;
}
```

---

## API / Hooks / Components

### Firestore module
```ts
// client/src/lib/firestore/letters.ts
export function submitLetter(data: {
  content: string;
  nickname?: string;
  relatedIssueId?: string;
}): Promise<string>;

export function subscribeFeaturedLetters(issueId?: string): ...;
export function listAllLetters(opts?: { status?, limit? }): Promise<ReaderLetter[]>;
export function featureLetter(id: string, order: number): Promise<void>;
export function hideLetter(id: string): Promise<void>;
```

### Hook
```ts
export function useFeaturedLetters(issueId?: string): {
  letters: ReaderLetter[];
  loading: boolean;
};
```

### Components 新增
- `components/Letters/LetterPromptModal.tsx` — ThankYou 後跳出的留訊 modal
- `components/Letters/LetterCard.tsx` — 雜誌風「讀者來信」卡片
- `components/Letters/FeaturedLetters.tsx` — 列表元件（嵌在 JournalPage / archive）
- `components/admin/LettersManager.tsx` — 後台管理

---

## UI 草圖

### 1️⃣ 觸發時機：ThankYouModal 關閉後 1.5 秒

```
┌─────────────────────────────────────────────┐
│                                             │
│      ▮ 給今晚的一句話                          │
│      ▮ A NOTE TO TONIGHT                    │
│                                             │
│      ────────────────────                   │
│                                             │
│      ┌───────────────────────────────────┐  │
│      │                                   │  │
│      │  在這留下你對今晚的感受...           │  │
│      │                                   │  │
│      │                       0 / 50      │  │
│      └───────────────────────────────────┘  │
│                                             │
│      署名：                                  │
│      ◉ 匿名訪客                              │
│      ○ 用暱稱: [______________]              │
│                                             │
│      [略過]              [送出 →]            │
│                                             │
│   ※ 你的訊息可能會被精選刊登在「讀者回響」     │
│      送出即代表同意公開                       │
│                                             │
└─────────────────────────────────────────────┘
```

### 2️⃣ 主理人手記下方「讀者回響」欄

```
═══════════════════════════════════════════════
  LETTERS  ·  讀者回響
  Issue Nº 12 · 共 32 封來信，5 封精選
═══════════════════════════════════════════════

  「副歌大合唱那段，我感動到差點掉眼淚。」
  ─── 匿名訪客 · MAY 16

  「沒想到稻香被當開場，太懂。」
  ─── 阿香媽 · MAY 16

  「下次想聽老師唱五月天〈倔強〉。」
  ─── 匿名訪客 · MAY 16

  ... 5 封
═══════════════════════════════════════════════
```

### 3️⃣ 後台「來信管理」tab

```
┌────────────────────────────────────────────┐
│ INBOX  · 32 封 · 5 待精選                   │
│                                            │
│ ☐ 「副歌大合唱那段...」                      │
│    匿名 · 22:14 · Nº 12                    │
│    [精選] [隱藏] [備註: __________]          │
│                                            │
│ ☐ 「下次想聽老師唱五月天〈倔強〉。」          │
│    匿名 · 22:16 · Nº 12                    │
│    [精選] [隱藏]                            │
│                                            │
│ ...                                        │
└────────────────────────────────────────────┘
```

---

## 實作步驟

1. **Firestore module + Rules**（45 min）
   ```
   match /letters/{letterId} {
     allow read: if resource.data.status == 'featured' || isAdmin();
     allow create: if isValidLetter();
     allow update, delete: if isAdmin();
   }

   function isValidLetter() {
     return request.resource.data.content is string
       && request.resource.data.content.size() > 0
       && request.resource.data.content.size() <= 50
       && request.resource.data.status == 'pending';
   }
   ```

2. **LetterPromptModal**（90 min）
   - 50 字計數 + 即時顯示
   - 防護：髒話過濾（簡單 keyword list）
   - submit 後 toast「謝謝你的訊息，下次見」
   - **可略過**：sessionStorage 記錄已略過，本場不再跳

3. **整合 ThankYouModal**（30 min）
   - ThankYou 關閉後延遲 1500ms 跳 LetterPrompt
   - 若使用者已在本場 submit 過則不再跳

4. **FeaturedLetters 元件**（45 min）
   - 雜誌風卡片陣列
   - 嵌入 PostPage 文末 / archive 單期詳情頁

5. **後台 LettersManager**（90 min）
   - 列表 + 篩選（pending / featured / hidden）
   - 一鍵精選（指定 order 1-5）
   - 隱藏（永遠不顯示但不刪除，留底）

6. **濫用防護**（45 min）
   - **客端**：50 字限制 + 髒話 list（中文 dirty-words）
   - **規則端**：`content.size() <= 50`
   - **頻率限制**：同一 voterId 5 分鐘只能 submit 1 次（搭配 `rateLimits/{voterId}`）
   - **舉報機制**：精選卡片角落小 icon「檢舉」→ 通知 admin

---

## 驗收條件

- ✅ ThankYouModal 後 1.5s 自動跳 LetterPrompt
- ✅ 字數即時顯示，超 50 字禁送
- ✅ 匿名 / 暱稱二選一
- ✅ 略過後本場不再跳（sessionStorage）
- ✅ Submit 成功 toast「謝謝你的訊息」
- ✅ 後台可精選 5 封並排序
- ✅ 精選的 letters 公開可見，pending / hidden 訪客看不到
- ✅ 髒話自動過濾不能送出
- ✅ 同一 voterId 5 分鐘只能送 1 封

---

## 風險 / 已知坑

### 🚨 高風險
1. **公開留言區的法律 / 道德風險**
   - 若有人寫人身攻擊 / 騷擾內容，責任在阿凱
   - **解法**：
     - **精選制** — 阿凱手動選才公開（不是自動發布）
     - 留言提交時加同意條款「送出即同意公開、可被編輯精選」
     - 50 字限制本身就降低風險（短訊息難寫長篇人身攻擊）

2. **未成年保護**
   - 學生家長若知道孩子留訊在公開頁面會擔心
   - **解法**：
     - 留訊 modal 開頭明確標示「12 歲以下請問家長」
     - 不要求姓名（匿名為主）

### ⚠️ 中風險
3. **灌訊息攻擊**
   - 一個 voterId 5 分鐘 1 封規則太鬆，可開無痕模式重來
   - **解法**：
     - rules 加 IP-based rate limit（Firebase 不直接支援，需 Cloud Functions）
     - 或加 Cloudflare Turnstile（搭配 skill `cloudflare-turnstile-integration`）

4. **內容審核負擔**
   - 32 封來信阿凱要手動讀完才精選，演出後 1 小時可能來不及
   - **解法**：
     - 加 AI 預篩（Gemini Free Tier，搭配 `gemini-free-tier-first` skill）
     - AI 標 sentiment / spam 分數，admin 看 sorted 後的列表

### 💡 小坑
5. **暱稱重複** — 兩個人都叫「阿香媽」，怎麼分？→ 不解決，匿名社群本來就接受
6. **50 字計算中英文** — 中文 1 字、英文 1 字母都算 1 個 character，用 `[...str].length` 處理 emoji
7. **emoji 過多** — 一封 50 個 🎉 算不算濫用？→ 限制 emoji ≤ 3 個

---

## 估時

| 樂觀 | 預期 | 悲觀 |
|:----:|:----:|:----:|
| 5h | 6h | 8h（含 AI 預篩） |

---

## 依賴項

- 🟡 **D1**：`relatedIssueId` 串期數
- 🟡 **D2**：精選 letters 嵌在 PostPage 文末
- 🟢 **可獨立做**：不靠 D1 / D2 也跑得起來

---

## 後續延伸

- **AI 自動摘要每場精選來信** — 第 5 期後自動產生「歷期讀者最常提到的 5 個關鍵字」
- **回信機制** — 阿凱可選一封 letter，公開回覆，變成迷你對話
- **匿名 voter 累積** — 同一 voterId 多次留訊累積成「常客」標記
- **音訊留言**（C7 商業版才考慮）— 30 秒語音
