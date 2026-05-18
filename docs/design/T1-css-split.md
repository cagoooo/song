# T1 — `index.css` 拆 5-6 個檔

> **狀態**：設計階段 | **估時**：2h | **優先級**：🔴 P0 | **依賴**：無 | **第一波建議馬上做**

## TL;DR

把 `client/src/index.css`（**實測 4706 行**，原以為 6300+）依現有 22 個 section divider 拆成 5-6 個邏輯檔，用 `@import` 串接。Vite/PostCSS build 時會 inline 合併，bundle 體積不變但編輯效率大幅恢復。

---

## 動機

### 現況痛點
- 單檔 4706 行，VSCode 卡頓、Outline panel 列不完
- 改一個 modal 樣式要 grep 才知道在哪一段
- merge conflict 機率高（5 件套各自 PR 都改同一個檔）
- 新人 onboarding 不知該從哪段讀起
- CI lint-staged 跑 css 需要重新編譯整檔

### 為什麼是 P0
- **影響後續所有 PR** — 不拆，每個新 modal 都會繼續肥同一檔
- 2 小時可以做完
- **0 行為改變** — 純 refactor，build 出來 bundle 大小完全一樣

---

## 既有結構（22 個 section divider，已分得很清楚）

從 `grep -nE "^/\\* ={50,}"` 抓出的真實分區：

| 行區間 | 標題 | 行數 | 屬於 |
|--------|------|:----:|------|
| 1-33 | Editorial design tokens | 33 | base |
| 34-154 | Theme tokens (tailwind 對應) | 121 | base |
| 155-202 | Editorial typography utilities | 48 | base |
| 203-288 | 大標 / 主視覺 hero | 86 | hero |
| 289-447 | Cassette tape 90 MIN | 159 | hero |
| 448-485 | Ticker marquee | 38 | hero |
| 486-536 | Topbar 品牌列 | 51 | hero |
| 537-666 | Song card extras (黑膠 mini) | 130 | card |
| 667-703 | Section head | 37 | card |
| 704-767 | Editorial suggestion card | 64 | card |
| 768-783 | Card 卡片基底 | 16 | card |
| 784-994 | 5 個 Overlays | 211 | overlay |
| 995-1301 | Stats Dashboard | 307 | stats |
| 1302-1384 | QRCodeShareModal | 83 | misc |
| 1385-1518 | LoginForm | 134 | misc |
| **1519-2155** | **Song Detail Modal (.sdp-\*)** | **637** | **modal** |
| **2156-2638** | **Share Card Modal** | **483** | **modal** |
| **2639-3235** | **Thank-you Modal (.ty-\*)** | **597** | **modal** |
| 3236-3277 | App footer | 42 | misc |
| **3278-3759** | **Up Next Bar** | **482** | **ritual** |
| **3760-4320** | **Voter Passport** | **561** | **ritual** |
| **4321-4706** | **Opening Curtain** | **386** | **ritual** |

**觀察**：5 件套 ritual modal 各自佔 386-637 行，光這 5 個就佔 3146 行（67%）。

---

## 拆檔方案

```
client/src/styles/
├── index.css                      ← entry，~30 行（@tailwind + @import）
├── editorial-base.css             ← tokens + theme + typography（1-202）  202 行
├── editorial-hero.css             ← hero + cassette + ticker + topbar + song card（203-666）  463 行
├── editorial-cards.css            ← section head + suggestion + card + overlays + stats + QR + login + footer（667-1518 + 3236-3277）  ~870 行
├── editorial-modals.css           ← SongDetail + ShareCard + ThankYou（1519-3235）  1717 行 ⚠️ 仍偏大
└── editorial-ritual.css           ← UpNextBar + VoterPassport + OpeningCurtain（3278-4706）  1429 行
```

### 若 `editorial-modals.css` 還是太大，再拆三個（建議第二輪做）

```
editorial-modals/
├── song-detail.css       ← .sdp-* (637 行)
├── share-card.css        ← .share-card-* (483 行)
└── thank-you.css         ← .ty-* (597 行)
```

---

## API / 改動點

### 1. 新增資料夾 `client/src/styles/`

### 2. 改 `client/src/index.css`

```css
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

@import './styles/editorial-base.css';
@import './styles/editorial-hero.css';
@import './styles/editorial-cards.css';
@import './styles/editorial-modals.css';
@import './styles/editorial-ritual.css';
```

### 3. 各檔開頭加 docstring

```css
/* ===========================================================================
   editorial-modals.css
   ----------------------------------------------------------------------------
   5 件套儀式 modal 樣式 — 包含 SongDetail / ShareCard / ThankYou。
   每個 modal 各佔約 500-650 行，內部已用 /* ==== Name ==== */ 區隔。
   ---------------------------------------------------------------------------- */
```

### 4. PostCSS / Vite 確認

Vite 預設處理 `@import`，build 時會 inline 合併。**不需改 vite.config.ts**。但確認：

```bash
npm run build
ls -la dist/assets/index-*.css  # 確認還是單檔輸出，size 跟拆檔前一樣
```

---

## 實作步驟

1. **建立 `client/src/styles/` 資料夾**（1 min）

2. **用 `sed` / 手動切檔**（45 min）
   ```bash
   # 用 awk 切片（範例，實際要手動驗）
   awk 'NR>=1 && NR<=202' client/src/index.css > client/src/styles/editorial-base.css
   awk 'NR>=203 && NR<=666' client/src/index.css > client/src/styles/editorial-hero.css
   # ...
   ```
   - 每個檔開頭加 docstring
   - 注意 `@layer base { }` 區塊有大括號要保持配對

3. **重寫 `client/src/index.css`**（5 min）
   - 改成 5 行 `@import`

4. **build 驗證**（5 min）
   - `npm run build`
   - diff 拆檔前後的 `dist/assets/index-*.css`（用 `wc -c` 比 size）
   - 預期：完全一樣（@import 在 build 時 inline）

5. **跑 dev server + 視覺對照**（30 min）
   - 5 件套全開一遍
   - 演出模式 / SongDetail / ShareCard / ThankYou / UpNext / Passport / OpeningCurtain
   - 確認沒有任何視覺漂移

6. **commit + push + Lighthouse 驗證**（15 min）
   - Lighthouse perf 分數不能掉
   - bundle size 跟拆檔前 ±1KB 內

---

## 驗收條件

- ✅ `client/src/index.css` 從 4706 行 → ~30 行 entry
- ✅ 5-6 個拆出來的檔每個 ≤ 1500 行（理想 ≤ 700 行）
- ✅ `npm run build` 輸出的 CSS bundle size 跟拆檔前一樣（±1KB）
- ✅ 5 件套 + 主頁 + 演出模式 + admin 都沒視覺漂移
- ✅ Lighthouse perf 分數 / CLS 不變
- ✅ HMR 仍然 work（改某個檔只觸發那部分 reload）
- ✅ 每個拆出檔開頭有 docstring，1 分鐘內看懂歸誰用

---

## 風險 / 已知坑

### 🚨 高風險
1. **`@layer base { }` 區塊配對**
   - lines 39-117 是 `@layer base { ... }`，切檔時容易切到中間
   - **解法**：以 `@layer base` 為單位切，整段歸 editorial-base.css

2. **CSS 變數定義被切散**
   - `:root { --editorial-blue: #2b4dff; ... }` 若分到兩個檔，第二個檔讀不到
   - **解法**：所有 `:root`、`html`、`body`、`@layer base` 全進 `editorial-base.css`，且 `@import` 順序固定第一個

### ⚠️ 中風險
3. **`@media` 規則跨檔重複**
   - `@media (prefers-reduced-motion: reduce)` 在多檔重複
   - **解法**：保持原樣（不合併），每檔負責自己的 reduced-motion 規則，避免改動行為

4. **HMR 行為改變**
   - 拆檔後 HMR 只 reload 改動的檔
   - 預期更快，但若有跨檔依賴可能會閃一下
   - **解法**：dev 跑一陣子觀察

### 💡 小坑
5. **`@import` 必須在 `@tailwind` 後** — 不然 Tailwind 的 `@layer` 規則順序會錯
6. **build hash 會變** — sw.js 要 bump，但 `npm run prebuild` 已自動處理
7. **PostCSS process order** — 拆檔可能影響 autoprefixer，build 後跑 Lighthouse 確認沒掉效能分

---

## 估時

| 樂觀 | 預期 | 悲觀 |
|:----:|:----:|:----:|
| 1.5h | 2h | 3h（含視覺對照精修） |

---

## 依賴項

- ✅ **完全獨立** — 不依賴任何項目
- 🟡 **建議搭配 D1 的 theme 切換做** — `:root[data-theme="..."]` 變數機制可以在 editorial-base.css 加好

---

## 後續延伸

- **CSS Modules / vanilla-extract 評估**（v6.0+）— 若元件數量再增加，類名管理會崩潰
- **purgecss 確認**：拆檔後跑 `npx purgecss --css dist/*.css --content "src/**/*.tsx"` 看有沒有未使用樣式
- **CSS-in-JS 評估**：editorial 5 件套很多 inline animation keyframe，未來考慮 styled-components 或 Emotion
- **stylelint 加進 CI**：拆完規模單純，可加 lint 防漂移
