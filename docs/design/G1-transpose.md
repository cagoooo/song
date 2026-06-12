# G1 — 自動轉調系統（吉他手工具線 第一彈）

> **撰寫日期**：2026-06-13
> **狀態**：✅ Phase 1 已實作（轉調引擎 + 歌曲詳情頁即時轉調 + 貼譜快速轉調工具）
> **發起背景**：阿凱老師需求 — 網路上的譜常不是原 Key（原曲 G 卻寫成 C），現場要靠移調夾湊；
> 希望像「91 譜」那樣選目標調就整份轉好，而且**免費**。

---

## 🎯 目標

1. **歌曲詳情頁即時轉調**：點開任何一首歌，按 −/＋ 半音，和弦進行、歌詞和弦行、指型圖全部即時跟著轉（91 譜式體驗，免費版）。
2. **貼譜快速轉調工具**：把網路上抓的任何吉他譜文字貼進來 → 自動偵測調性 → 選目標調 → 一鍵複製轉好的譜。現場彈唱前 30 秒搞定，不用逐顆手改。
3. **吉他手工具線（G 系列）**：本站主打吉他手，G1 是第一個純工具功能，後續 G2（自動採譜）等延續此線。

範例（使用者原話）：`C、Dm、Am` 轉 D 大調 → `D、Em、Bm` ✅（已實測通過）

---

## 🏗️ Phase 1 架構（已落地）

### 1. 轉調引擎 [client/src/lib/transpose.ts](../../client/src/lib/transpose.ts)

純函式、零依賴、47 個單元測試。

| 函式 | 作用 |
|------|------|
| `parseChord` | 解析和弦符號：root + 品質後綴 + 分數和弦 bass（`F#m7-5`、`C/G`、`C6/9` 都吃） |
| `transposeChordSymbol` | 單顆和弦移調，後綴原樣保留 |
| `transposeChordLine` | **整行移調保持對齊** — 和弦名變長吃後方空白、變短補回，下一顆和弦欄位不跑位 |
| `transposeChordSheet` / `transposeLyricBlocks` | 整份譜移調（純文字 / Firestore LyricBlock） |
| `isChordLine` | 和弦行偵測 — 含 CJK 即歌詞；英文歌詞用「和弦 token 佔比 ≥ 60%」規則排除 |
| `detectKey` | 調性偵測 — 12 個大調逐一給分（順階和弦品質吻合 + 主/屬和弦加權 + 首尾和弦加成） |
| `preferFlatForKey` | 依目標調決定整份譜 #/b 拼法（F 調家族用 b、G 調家族用 #、小調換算關係大調） |
| `capoSuggestions` | Capo 等效建議（目標 E 調 → 夾 4 彈 C 指型 / 夾 7 彈 A 指型…） |

**防呆原則**：解析失敗永遠原樣回傳，絕不丟例外炸 UI；`Bridge`、`Do`、`Amazing` 等歌詞單字不會被誤判成和弦（後綴 token 白名單驗證）。

### 2. 指型字典 [chordShapes.ts](../../client/src/components/SongDetail/chordShapes.ts)

轉調後出現 `Db`、`F#m` 這種開放把位彈不出來的和弦，指型圖要跟上：

- **開放和弦字典**（30 個常用指型：大/小三和弦、屬七、小七、大七、sus、add9）
- **封閉和弦自動產生**：E-shape（root 在 6 弦）/ A-shape（root 在 5 弦）模板 × `'' / m / 7 / m7 / maj7` 五種品質，自動挑把位較低的；`ChordFingering.baseFret` + `ChordSvg` 把位數字標示
- 拼法無關（`Db` 和 `C#` 同指型）、分數和弦用本體查、**查不到就略過不畫錯誤指型**

附帶升級：指型卡從「寫死 6 張常用和弦」改為**依當前（轉調後）進行 + 歌詞和弦實際推導**。

### 3. 歌曲詳情頁整合（[SongDetailModal.tsx](../../client/src/components/SongDetail/SongDetailModal.tsx)）

- 「No. 01 / 和弦」區新增**轉調控制列**：− / 當前調（含 +n 標示）/ ＋ / ↺ 回原調 / Capo 等效提示
- KEY meta cell 顯示轉調後的調 + 「原 X」小標
- 切歌自動歸零；位移範圍 ±11 半音
- 小調歌正確處理（Em +2 → F#m，實測通過）

### 4. 貼譜快速轉調工具（[TransposeToolModal.tsx](../../client/src/components/TransposeToolModal.tsx)）

- 入口：首頁 topbar「🎸 轉調工具」（所有人可用，不限管理員；lazy load 不進首屏 bundle）
- 左貼右出雙欄即時預覽，和弦行藍色高亮
- 自動偵測調性（含信心 %）→ 12 鍵目標調 pill 一鍵切換（同音異名 F#/Gb 以半音值比對）
- Capo 等效建議 + 一鍵複製結果
- 「載入範例」一鍵 demo（晴天 C 調片段）

### 測試

全套 468 → **530**（+62）：transpose 47、chordShapes 15。

---

## 🔮 Phase 2 — 候選延伸（依價值排序）

| 項目 | 內容 | 估時 |
|------|------|------|
| **G1.5 轉調直通點歌流程** | 貼譜工具加「存成歌曲建議」；admin 歌詞編輯器（T3 Phase 2 的 SongLyricsEditor）內建轉調按鈕，貼錯調的譜入庫前直接轉好 | 3-4h |
| **G1.6 個人慣用調記憶** | localStorage 記每首歌上次轉到哪個調，下次點開自動套用（現場歌單翻頁神器） | 2h |
| **G1.7 投影模式同步轉調** | `?mode=stage` 演出投影也吃轉調狀態（跨分頁 BroadcastChannel） | 3h |

---

## 🎧 G2 — Chordify 式自動採譜（研究筆記）

> 使用者想知道 Chordify 怎麼「聽音樂自動變吉他譜」，能不能自己做。

### Chordify 的原理（公開資訊整理）

1. **Chromagram（色度圖）**：把音訊做短時傅立葉變換（STFT），將頻譜能量折疊到 12 個半音類（C, C#, D…B），得到每個時間片的「12 維音高能量向量」。
2. **節拍追蹤（beat tracking）**：先抓 BPM 與拍點，把 chromagram 按拍切段（和弦多在拍點上換）。
3. **和弦分類**：每拍的色度向量跟和弦模板比對（C 大三和弦 ≈ C+E+G 三維高能量），現代做法用 CNN/CRNN + HMM/CRF 平滑（避免逐拍亂跳），這正是 Chordify 與 MIREX「Audio Chord Estimation」賽道的主流架構。
4. **後處理**：對齊小節、輸出和弦序列 + 拍號網格。

### 我們能怎麼做（三階段，全免費路線）

| 階段 | 做法 | 成本/難度 | 準確度預期 |
|------|------|----------|-----------|
| **G2a 瀏覽器端 MVP** | [essentia.js](https://mtg.github.io/essentia.js/)（WASM，AGPL）內建 `ChordsDetection`（chromagram + 模板比對），純前端、零後端費用。使用者丟 mp3 / YouTube 音訊 → 輸出和弦時間軸 → 串 G1 轉調引擎直接轉調 | 1-2 天 spike | 流行歌大三/小三和弦 ~60-75%，堪用但需人工校對 |
| **G2b 模型升級** | TensorFlow.js 跑開源 chord recognition 模型（如 BTC / CRNN 系列權重轉換），或 [basic-pitch](https://github.com/spotify/basic-pitch)（Spotify 開源，有 TFJS 版）轉 MIDI 再推和弦 | 1-2 週 | ~75-85% |
| **G2c 伺服器端** | Cloud Functions / Cloud Run 跑 Python（madmom / autochord / chord-extractor），準確度最高但有運算費用與版權上傳疑慮 | 視預算 | 85%+ |

### 建議

- **先做 G2a spike**：essentia.js 在瀏覽器端零成本驗證體驗，輸出「和弦 + 時間軸」後接 G1 的轉調/指型管線，等於 Chordify 免費版的 80% 體驗。
- **版權注意**：使用者上傳音訊只在瀏覽器本機分析、不存伺服器 → 避開重製疑慮（這也是純前端路線的隱藏優勢）。
- **AGPL 注意**：essentia.js 是 AGPL-3.0，本專案 MIT 開源公開 repo，相容無虞，但要在 README 標注。

---

## ⚠️ 風險與已知限制

1. **調性偵測是啟發式**：轉位/借用和弦多的歌可能猜錯（工具有顯示信心 %，且使用者可直接用半音位移不理偵測）。
2. **對齊保持是「盡量」**：中文字寬 ≠ 半形空白寬，原始資料的對齊本來就是視覺近似；引擎保證「位移量不疊加擴散」（變長吃空白、變短補回）。
3. **罕見和弦品質**（aug9、13b9…）指型卡會略過不畫 — 寧缺勿錯。
4. **歌曲詳情頁的轉調是 view-only**：不寫回 Firestore，重開歸零（G1.6 會解決）。
