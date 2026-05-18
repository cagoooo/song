# T2 — 5 件套 Ritual Modal 補單元測試

> **狀態**：設計階段 | **估時**：6h | **優先級**：🔴 P0 | **依賴**：無

## TL;DR

v4.3.0 → v4.6.0 三週新增 9 個元件（其中 5 件套 ritual modal 是核心），**0 個新增單元測試**。預計補 35-40 個測試，把 216 個總數推到 250+，重點覆蓋「狀態切換」、「sessionStorage」、「徽章解鎖邏輯」。

---

## 動機

### 現況痛點
- v4.2.0 testbench 是 **216 個 / 19 個 test files**，這數字從 v4.3.0 起完全沒成長
- 9 個新元件：SongDetailModal、ChordSvg、ShareCardModal、ThankYouModal、UpNextBar、VoterBoard、VoterPassportModal、OpeningCurtain、Home（5 件套整合）
- **覆蓋率比例下降** —— 元件數 +30% 但測試不變
- VoterPassport 的 6 個徽章解鎖邏輯（基於 `useVoteHistory`）**極易回歸**，動 hook 一行就可能算錯
- OpeningCurtain 的 sessionStorage 邏輯出錯沒人發現（每場演出都會多播一次）

### 為什麼是 P0
- 5 件套是 v4.6.0 的旗艦功能，沒測試 = 後續任何 refactor 都會抖
- 6h 投入可以鎖住 35+ 條 invariant，未來修 bug 速度倍增

---

## 測試覆蓋計畫

### 1️⃣ VoterPassportModal — **最高優先（徽章邏輯）** (~10 個測試)

**為什麼最優先**：6 個徽章解鎖條件純函式，極易測，且 hook 行為若 regression，使用者看到的徽章會錯。

```ts
// VoterPassportModal.test.tsx
describe('VoterPassportModal', () => {
  describe('徽章解鎖', () => {
    it('🎤 首次點播：1 票就解鎖', () => {
      const history = [makeVote('s1', '晴天', '周杰倫', daysAgo(0))];
      render(<VoterPassportModal history={history} ... />);
      expect(screen.getByText(/首次點播/)).toHaveAttribute('data-unlocked', 'true');
    });

    it('🔥 熱情歌迷：單日 10 票才解鎖（單日 9 票不解鎖）', () => {
      const today = Array.from({ length: 9 }, (_, i) =>
        makeVote(`s${i}`, '...', '...', daysAgo(0))
      );
      render(<VoterPassportModal history={today} ... />);
      expect(screen.getByText(/熱情歌迷/)).toHaveAttribute('data-unlocked', 'false');
    });

    it('🔥 熱情歌迷：單日 10 票解鎖（跨日 10 票不解鎖）', () => {
      const split = [
        ...Array.from({ length: 5 }, (_, i) => makeVote(`s${i}`, '...', '...', daysAgo(0))),
        ...Array.from({ length: 5 }, (_, i) => makeVote(`s${i+5}`, '...', '...', daysAgo(1))),
      ];
      render(<VoterPassportModal history={split} ... />);
      expect(screen.getByText(/熱情歌迷/)).toHaveAttribute('data-unlocked', 'false');
    });

    it('👑 點歌王：累積 100 票解鎖', () => { ... });
    it('📚 雜學家：投過 N 種不同歌曲解鎖', () => { ... });
    it('🎵 場場到：連續 5 天投票解鎖', () => { ... });
    it('🌙 夜貓子：22:00 後投 20 票解鎖', () => { ... });
  });

  describe('統計卡', () => {
    it('總票數 = history.length', () => { ... });
    it('不同歌曲數 = unique songIds', () => { ... });
    it('到場場次 = distinct days', () => { ... });
  });

  describe('卡片翻面互動', () => {
    it('locked 卡 hover 顯示解鎖條件', () => { ... });
  });
});
```

### 2️⃣ ShareCardModal — **截圖機制** (~6 個測試)

```ts
describe('ShareCardModal', () => {
  it('預設顯示 IG 直式（1080×1350）', () => { ... });

  it('切換到 FB OG 後尺寸變 1200×630', () => {
    fireEvent.click(screen.getByText(/FB OG/));
    expect(screen.getByTestId('share-card')).toHaveStyle({ width: '1200px' });
  });

  it('下載按鈕觸發 html-to-image.toPng', async () => {
    const mockToPng = vi.fn().mockResolvedValue('data:image/png;base64,...');
    vi.doMock('html-to-image', () => ({ toPng: mockToPng, toBlob: vi.fn() }));
    fireEvent.click(screen.getByText(/下載/));
    await waitFor(() => expect(mockToPng).toHaveBeenCalled());
  });

  it('複製按鈕觸發 ClipboardItem API', async () => { ... });

  it('Top 3 顯示金/銀/銅排名', () => {
    render(<ShareCardModal songs={top3} ... />);
    expect(screen.getByText('1')).toHaveClass('gold');
    expect(screen.getByText('2')).toHaveClass('silver');
    expect(screen.getByText('3')).toHaveClass('bronze');
  });

  it('催歌王 panel 顯示 top voterId', () => { ... });
});
```

### 3️⃣ ThankYouModal — **動畫 + 收尾儀式** (~5 個測試)

```ts
describe('ThankYouModal', () => {
  it('isOpen=false 時不渲染', () => { ... });
  it('isOpen=true 顯示 END OF SIDE A', () => { ... });

  it('黑膠盤 + label 兩個獨立 keyframes（Verifier fix #1）', () => {
    render(<ThankYouModal isOpen={true} ... />);
    const disc = screen.getByTestId('ty-disc');
    const label = screen.getByTestId('ty-label');
    expect(disc).toHaveClass('ty-disc-spin');
    expect(label).toHaveClass('ty-label-spin');
  });

  it('動畫結束角度 720°（Verifier fix #2）', () => {
    // 直接 query CSS keyframe rule string
    const stylesheets = document.styleSheets;
    const rule = findKeyframe('ty-disc-spin', stylesheets);
    expect(rule.cssText).toContain('rotate(720deg)');
  });

  it('press ESC 觸發 onClose', () => { ... });
});
```

### 4️⃣ UpNextBar — **三狀態 + RWD** (~6 個測試)

```ts
describe('UpNextBar', () => {
  describe('三狀態', () => {
    it('演出中：顯示 LIVE 脈動 + 進度條', () => {
      render(<UpNextBar status="playing" currentSong={s1} ... />);
      expect(screen.getByText(/LIVE/)).toBeInTheDocument();
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });

    it('觀眾剛投票：黃光 pulse 600ms', () => {
      render(<UpNextBar status="voted" ... />);
      expect(screen.getByTestId('upnext-root')).toHaveClass('upnext-pulse');
    });

    it('待開場：empty state「準備開唱」', () => { ... });
  });

  describe('「你點的還排第 N」tooltip', () => {
    it('voterId 對應到 upNext 中時，tooltip 顯示排名', () => { ... });
    it('voterId 不在 upNext 中時不顯示 tooltip', () => { ... });
  });

  describe('+5 看全部', () => {
    it('點擊切到排行榜 tab + smooth scroll', () => {
      const onJump = vi.fn();
      render(<UpNextBar onJumpToRanking={onJump} ... />);
      fireEvent.click(screen.getByText(/\+5/));
      expect(onJump).toHaveBeenCalled();
    });
  });
});
```

### 5️⃣ OpeningCurtain — **sessionStorage + skip** (~5 個測試)

```ts
describe('OpeningCurtain', () => {
  beforeEach(() => sessionStorage.clear());

  it('首次進站自動播放', () => {
    render(<OpeningCurtain ... />);
    expect(screen.getByTestId('opening-curtain-root')).toBeVisible();
  });

  it('sessionStorage 已標記則跳過', () => {
    sessionStorage.setItem('opening-curtain-shown-v1', '1');
    render(<OpeningCurtain ... />);
    expect(screen.queryByTestId('opening-curtain-root')).not.toBeInTheDocument();
  });

  it('?intro=skip query 強制跳過', () => {
    // mock useSearchParams
    render(<OpeningCurtain ... />);
    expect(screen.queryByTestId('opening-curtain-root')).not.toBeInTheDocument();
  });

  it('?mode=stage 自動跳過', () => { ... });

  it('press ESC 立即關閉並設 sessionStorage', () => {
    render(<OpeningCurtain ... />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(sessionStorage.getItem('opening-curtain-shown-v1')).toBe('1');
  });

  it('prefers-reduced-motion 直接顯示末態（不播動畫）', () => {
    // mock matchMedia
    render(<OpeningCurtain ... />);
    expect(screen.getByTestId('curtain-end-state')).toBeVisible();
  });
});
```

### 6️⃣ SongDetailModal — **切歌 + 投票狀態** (~6 個測試)

```ts
describe('SongDetailModal', () => {
  it('song=null 不渲染', () => { ... });
  it('傳入「晴天」顯示 hardcode 資料', () => {
    render(<SongDetailModal song={s晴天} ... />);
    expect(screen.getByText(/Capo 2/)).toBeInTheDocument();
    expect(screen.getByText(/78 BPM/)).toBeInTheDocument();
  });

  it('傳入其他歌走 fallback（pinyin hash）', () => {
    render(<SongDetailModal song={otherSong} ... />);
    expect(screen.getByText(/這首歌的歌詞還沒被收錄/)).toBeInTheDocument();
  });

  it('切歌時投票狀態 reset', () => {
    const { rerender } = render(<SongDetailModal song={s1} ... />);
    fireEvent.click(screen.getByText(/我要點/));
    expect(screen.getByText(/已點/)).toBeInTheDocument();
    rerender(<SongDetailModal song={s2} ... />);
    expect(screen.queryByText(/已點/)).not.toBeInTheDocument();
  });

  it('和弦圖渲染 6 個 fingering', () => { ... });
  it('點相似歌 onSelectSimilar callback', () => { ... });
});
```

### 7️⃣ ChordSvg — **指型圖** (~3 個測試)

```ts
describe('ChordSvg', () => {
  it('open string (0) 顯示空心圓', () => { ... });
  it('mute string (x) 顯示 ×', () => { ... });
  it('fret 數 1-3 顯示實心圓在對應位置', () => { ... });
});
```

---

## 工具與測試輔助

### 測試 helpers（新增 `client/src/test-utils/`）

```ts
// vote-fixtures.ts
export function makeVote(
  songId: string, title: string, artist: string, timestamp: number | Date
): VoteHistoryEntry {
  return {
    songId, title, artist,
    timestamp: typeof timestamp === 'number' ? timestamp : timestamp.getTime(),
  };
}

export function daysAgo(n: number): number {
  return Date.now() - n * 86400_000;
}

export function makeSong(overrides?: Partial<Song>): Song {
  return {
    id: 's1', title: '晴天', artist: '周杰倫',
    voteCount: 0, isActive: true, createdAt: new Date(),
    ...overrides,
  };
}
```

### Mock framer-motion（沿用既有 TipAnimation.test.tsx pattern）

```ts
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag: string) => ({ children, ...props }: any) => {
      const Tag = tag as keyof JSX.IntrinsicElements;
      return <Tag {...props}>{children}</Tag>;
    },
  }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));
```

### Mock html-to-image

```ts
vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
  toBlob: vi.fn().mockResolvedValue(new Blob(['mock'], { type: 'image/png' })),
}));
```

---

## 實作步驟（建議順序）

1. **建立 test-utils 共用 fixtures**（30 min）
2. **VoterPassportModal 測試**（90 min）— 最高 ROI，純函式好測
3. **OpeningCurtain 測試**（60 min）— sessionStorage 邏輯回歸風險高
4. **UpNextBar 測試**（60 min）— 三狀態切換
5. **ShareCardModal 測試**（60 min）— 截圖 mock
6. **ThankYouModal 測試**（45 min）— 動畫 verifier
7. **SongDetailModal + ChordSvg 測試**（60 min）
8. **跑 coverage report 確認**（15 min）
   ```bash
   npm run test:coverage
   # 目標：總測試從 216 → 250+
   ```

---

## 驗收條件

- ✅ 測試從 216 → 250+
- ✅ 9 個新元件都有對應 .test.tsx
- ✅ CI 全綠
- ✅ 新增的 test-utils 共用 fixtures 至少被 3 個檔引用
- ✅ Coverage report 顯示 5 件套覆蓋率 > 60%
- ✅ VoterPassport 6 個徽章每個都有解鎖 / 不解鎖兩條 path

---

## 風險 / 已知坑

### 🚨 高風險
1. **CSS keyframe 字串 query**
   - 「驗證 720° 兩圈」要 query CSSStyleSheet，jsdom 不一定支援
   - **解法**：改成快照測試 `expect(stylesheet.cssText).toMatchSnapshot()`
   - 或乾脆抽 keyframe 常數到 TS 檔，import 進測試比對

2. **framer-motion mock 漏蓋**
   - 5 件套很多自製 keyframe（不是 framer-motion）
   - **解法**：別測 keyframe 細節，測「elements with class X are rendered」就好

### ⚠️ 中風險
3. **sessionStorage 跨測試污染**
   - 不在 `beforeEach` clear 會被前一個 test 影響
   - **解法**：每個 describe block 都 `beforeEach(() => sessionStorage.clear())`

4. **時區 / 日期邏輯**
   - 「跨日 10 票不解鎖」測試在跨午夜跑會 flaky
   - **解法**：用 `vi.setSystemTime(new Date('2026-05-18T15:00:00+08:00'))` 固定時鐘

5. **html-to-image 在 jsdom 不能跑**
   - 真實截圖會炸
   - **解法**：永遠 mock，測「toPng 被 call」就夠

### 💡 小坑
6. `userEvent` vs `fireEvent` — 偏好 userEvent（更接近真實互動），但 setup 多一步 `userEvent.setup()`
7. `vi.useFakeTimers` 跑動畫測試很方便，但要記得 `vi.useRealTimers()` 在 afterEach

---

## 估時

| 樂觀 | 預期 | 悲觀 |
|:----:|:----:|:----:|
| 5h | 6h | 8h（含 flaky 測試處理） |

---

## 依賴項

- ✅ **完全獨立** — 不依賴任何項目
- 🟡 **建議 T1 之後做** — 拆完檔後測試樣式更穩定

---

## 後續延伸

- **加 vitest-axe** — 對 5 件套跑 a11y check
- **加 Playwright E2E** — 完整流程：投票 → 解鎖 → ThankYou → ShareCard
- **加 Chromatic** — 視覺迴歸測試（5 件套 hero / loading / empty 三狀態快照）
- **Storybook** — 5 件套 story 可雙用：開發 + 測試 fixture
