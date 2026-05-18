# D2 — 主理人專欄內容系統

> **狀態**：設計階段 | **估時**：6-8h | **優先級**：🟡 P2 | **依賴**：D1（共用 `<MagazineHeader />`）

## TL;DR

讓阿凱老師能在後台寫 Markdown 短文，發布到「主理人手記」頁，把現在 StatsDashboard 的「主理人 pull-quote」延伸成一個有期數累積的迷你部落格。

---

## 動機

### 現況痛點
- StatsDashboard 已有「阿凱主理人 pull-quote」，但只是裝飾，沒有累積
- 阿凱老師演出後常有「想對學生說的話」、「下次想唱什麼」、「演出心得」，目前只能寫在 LINE
- editorial 雜誌風品牌缺一個「文字內容」維度，現在全部是「資料視覺化」

### 為什麼現在做
- D1 期刊系統會把「期數」抽出來，文章可以掛 issueNumber
- editorial 風格本來就適合長文閱讀
- 阿凱老師有書寫意願，且文字能讓家長 / 學生看到他的教學理念

---

## 資料模型

### Firestore

```
posts/{postId}
  ├─ title: string                    // 「彈唱第十二夜的觀察」
  ├─ subtitle?: string                // 副標
  ├─ slug: string                     // URL 用，唯一
  ├─ content: string                  // Markdown 原文
  ├─ coverImageUrl?: string           // Storage 路徑
  ├─ excerpt: string                  // 自動截前 140 字
  ├─ tags: string[]                   // ["演出心得", "教學筆記", "曲目分析"]
  ├─ relatedIssueId?: string          // 關聯期刊期數
  ├─ relatedSongIds?: string[]        // 關聯歌曲
  ├─ status: 'draft' | 'published'
  ├─ publishedAt?: Timestamp
  ├─ updatedAt: Timestamp
  ├─ authorUid: string                // 限管理員
  ├─ readMinutes?: number             // 自動計算（content / 250 字）
  └─ viewCount?: number               // 累積閱讀數
```

### TypeScript

```ts
export interface Post {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  content: string;
  coverImageUrl?: string;
  excerpt: string;
  tags: string[];
  relatedIssueId?: string;
  relatedSongIds?: string[];
  status: 'draft' | 'published';
  publishedAt?: Date;
  updatedAt: Date;
  authorUid: string;
  readMinutes?: number;
  viewCount?: number;
}
```

---

## API / Hooks / Components

### Firestore module
```ts
// client/src/lib/firestore/posts.ts
export function subscribePublishedPosts(opts?: { limit?: number }): ...;
export function getPostBySlug(slug: string): Promise<Post | null>;
export function createPost(data: Omit<Post, 'id'>): Promise<string>;
export function updatePost(id: string, patch: Partial<Post>): Promise<void>;
export function publishPost(id: string): Promise<void>;
export function deletePost(id: string): Promise<void>;
export function incrementViewCount(slug: string): Promise<void>;
```

### Hook
```ts
export function usePosts(opts?: { limit?: number }): {
  posts: Post[];
  loading: boolean;
};

export function usePost(slug: string): {
  post: Post | null;
  loading: boolean;
};
```

### Components 新增
- `pages/JournalPage.tsx` — 列表頁 `/journal`
- `pages/PostPage.tsx` — 單篇 `/journal/:slug`
- `components/Journal/PostCard.tsx` — 文章卡片
- `components/Journal/PostEditor.tsx` — 後台 Markdown 編輯器
- `components/Journal/MarkdownRenderer.tsx` — 用 `react-markdown` + GFM
- `components/Journal/PostMeta.tsx` — 期數 / 日期 / 閱讀時間

### npm deps
- `react-markdown@9.x`（~30KB gzip）
- `remark-gfm@4.x`（GitHub-flavored markdown，表格 / checkbox）
- `rehype-sanitize@6.x`（**重要！防 XSS**）
- 可選：`@uiw/react-md-editor`（後台編輯器，~45KB gzip，lazy load）

---

## UI 草圖

### 列表頁 `/journal`
```
═══════════════════════════════════════════════
  JOURNAL  ·  主理人手記
  阿凱 · Guitar Singalong  ·  共 8 篇
═══════════════════════════════════════════════

┌──────────────────────────────────────────────┐
│  № 03                                        │
│  ▮ 彈唱第十二夜的觀察                          │
│  ▮ 為什麼這次大家都點抒情歌                    │
│                                              │
│  「演出當下沒注意到，看完票數曲線才發現...」    │
│                                              │
│  2026-05-16 · 4 min read · 87 票期 № 12      │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  № 02                                        │
│  ▮ 給剛開始學吉他的學生                         │
│  ...                                         │
└──────────────────────────────────────────────┘
```

### 單篇頁 `/journal/:slug`
```
< 回主理人手記                       JOURNAL № 03
═══════════════════════════════════════════════

【封面圖】16:9

  ▮ 彈唱第十二夜的觀察
  ▮ 為什麼這次大家都點抒情歌

  阿凱 · 2026-05-16 · 4 min read
  關聯期數 № 12 · 標籤：#演出心得 #曲目分析
  ─────────────────────────────────────────

  演出當下沒注意到，看完票數曲線才發現
  抒情歌獨佔前五名，跟前兩場熱血搖滾的氛圍...

  ## 觀察一：星期五晚上的場域氛圍
  ...

  > 引文用 editorial 雜誌風

  ## 觀察二：點歌與年齡層的關係
  ...

  ─────────────────────────────────────────
  相關歌曲 ← 推薦點開 SongDetailModal
  • 〈晴天〉— 周杰倫
  • 〈倒數〉— G.E.M.

  ─────────────────────────────────────────
  此期完整節目單 → 跳 ShareCardModal
═══════════════════════════════════════════════
```

### 後台編輯器
```
┌────────────────────┬─────────────────────────┐
│  Markdown 編輯區   │  即時預覽                │
│                    │                         │
│  # 標題             │  ▮ 標題                 │
│                    │  雜誌風渲染             │
│  > 引文             │                         │
│  ...               │  > 引文（藍邊）          │
└────────────────────┴─────────────────────────┘

📎 關聯期刊：[№ 12 ▼]
📎 關聯歌曲：[+ 加入] 晴天, 稻香
📎 標籤：    [演出心得] [+]
📎 封面圖：  [上傳]  [預覽 1200×630]

[ 存為草稿 ]  [ 預覽 ]  [ 發布 ]
```

---

## 實作步驟

1. **Firestore module + Rules**（30 min）
   ```
   match /posts/{postId} {
     allow read: if resource.data.status == 'published' || isAdmin();
     allow create, update, delete: if isAdmin();
   }
   ```

2. **MarkdownRenderer + sanitize**（45 min）
   - 用 `react-markdown` + `remark-gfm` + `rehype-sanitize`
   - 自定 components：`h1/h2/h3` 用 Playfair italic、`blockquote` 用雜誌風藍邊
   - Code block 用 `react-syntax-highlighter`（可選，lazy load）

3. **JournalPage 列表**（60 min）
   - PostCard 雜誌風 grid（mobile 1 欄 / desktop 2 欄）
   - chapter header № N 編號
   - 標籤篩選

4. **PostPage 單篇**（90 min）
   - SEO meta（title / description / og:image = coverImage）
   - 「相關歌曲」點擊開 SongDetailModal
   - 結尾「此期完整節目單」按鈕跳對應 issue 的 ShareCardModal
   - 加 `incrementViewCount` 在 mount 時呼叫一次

5. **後台編輯器**（120 min）
   - 用 `@uiw/react-md-editor` 或 textarea + live preview
   - 圖片上傳走 Firebase Storage
   - slug 自動 generate（中文 → pinyin-pro，已有依賴）
   - 「儲存為草稿 / 發布」兩個 CTA

6. **首頁加「最新主理人手記」區塊**（30 min）
   - editorial 風格 pull-quote 卡片
   - 顯示最新 1 篇 published post 的標題 + excerpt

7. **RSS feed**（45 min）— 可選
   - `public/rss.xml` 用 build-time 生成（或 Cloud Function 動態產生）

---

## 驗收條件

- ✅ 後台可寫 Markdown + 預覽 + 存草稿 + 發布
- ✅ `/journal` 列表頁列出所有 published posts
- ✅ `/journal/:slug` 可點開單篇，meta 完整
- ✅ Markdown 渲染安全（不會 XSS）
- ✅ 文章可關聯期數 + 歌曲
- ✅ 訪客看不到 draft 文章
- ✅ Firebase Analytics 記錄 `post_viewed` 事件

---

## 風險 / 已知坑

### 🚨 高風險
1. **XSS 攻擊**
   - 阿凱老師若貼到 `<script>` tag，沒 sanitize 直接出事
   - **解法**：強制 `rehype-sanitize`，禁止所有 HTML tag 通過
   - 測試：寫一則 post 內含 `<img src=x onerror=alert(1)>`，確認被過濾

2. **bundle 膨脹**
   - `react-markdown` + `@uiw/react-md-editor` 加總可能 80KB+ gzip
   - **解法**：
     - 編輯器只在 admin 載入（路由 lazy）
     - MarkdownRenderer 用 dynamic import，只在 PostPage 載入

### ⚠️ 中風險
3. **slug 衝突**
   - 中文標題 → pinyin slug 可能撞名
   - **解法**：寫入前 check 唯一，撞名加 `-2` `-3` 後綴

4. **草稿沒備份**
   - 編輯到一半 close tab，東西全沒
   - **解法**：localStorage 自動每 5 秒備份 draft，重開時 prompt restore

### 💡 小坑
5. `readMinutes` 中文計算公式：`Math.ceil(中文字數 / 350)`，英文 250
6. coverImageUrl 上傳要走 Firebase Storage，要先確認 storage.rules
7. `viewCount` 不要做防灌票（沒商業價值），直接每次 mount +1 即可

---

## 估時

| 樂觀 | 預期 | 悲觀 |
|:----:|:----:|:----:|
| 6h | 7h | 10h（含後台編輯器精修） |

---

## 依賴項

- 🟡 **依賴 D1**：`relatedIssueId` 串到期刊系統
- 🟢 **可獨立做**：不靠 D1 也能跑（先 hardcode issueNumber）

---

## 後續延伸

- **C2 社群登入**後加「訂閱主理人手記」郵件清單
- **D4 讀者來信**整合：每篇 post 下方可留言
- **AI 摘要**：每期演出結束後自動產生 draft（用 Gemini Free Tier，套 `gemini-free-tier-first` skill）
