// 推薦 / 防干擾漏斗埋點（輕量版）
//
// 目的：用資料回答「這批輸入/防干擾優化到底有沒有用」。
// 設計取捨：零新依賴、零 Firestore rules、零成本 —— 事件聚合計數存 localStorage，
// 可立即在 console 用 `window.songFunnel()` 查看本機累積漏斗。
// （單機資料，適合單一營運者自我檢視；未來要跨使用者聚合可在 track() 內加 server sink。）
//
// 所有操作包 try/catch，隱私模式 / 配額爆掉時靜默失敗，絕不影響主流程。

export type FunnelEvent =
    // 推薦表單漏斗
    | 'suggestion_form_open'
    | 'suggestion_typing_start'
    | 'suggestion_submit_success'
    | 'suggestion_close_without_submit'
    | 'suggestion_draft_restored'
    // 即時重複偵測
    | 'duplicate_hint_shown'
    | 'duplicate_hint_click'
    // 防干擾
    | 'composing_focus_session'
    | 'missed_replay_shown';

interface FunnelStore {
    counts: Record<string, number>;
    firstAt: number;
    lastAt: number;
    recent: Array<{ e: string; t: number }>;
}

const KEY = 'song-funnel-v1';
const RECENT_MAX = 50;

function read(): FunnelStore {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed.counts === 'object') return parsed as FunnelStore;
        }
    } catch {
        /* ignore */
    }
    return { counts: {}, firstAt: 0, lastAt: 0, recent: [] };
}

function write(store: FunnelStore): void {
    try {
        localStorage.setItem(KEY, JSON.stringify(store));
    } catch {
        /* 配額 / 隱私模式 → 放棄 */
    }
}

/** 記錄一個漏斗事件（聚合計數 + 滾動近期紀錄）。 */
export function trackEvent(name: FunnelEvent): void {
    try {
        const now = Date.now();
        const s = read();
        s.counts[name] = (s.counts[name] || 0) + 1;
        if (!s.firstAt) s.firstAt = now;
        s.lastAt = now;
        s.recent.unshift({ e: name, t: now });
        if (s.recent.length > RECENT_MAX) s.recent.length = RECENT_MAX;
        write(s);
        if (import.meta.env.DEV) console.debug('[funnel]', name);
    } catch {
        /* 埋點永不影響主流程 */
    }
    // 跨裝置彙整：核心轉換事件 best-effort 上傳 Firestore（動態載入避免耦合 firebase）
    try {
        void import('./firestore/funnelEvents').then((m) => m.sinkFunnelEvent(name)).catch(() => {});
    } catch {
        /* 忽略 */
    }
}

/** 取得本機累積漏斗摘要（含轉換率），供 console / 後台檢視。 */
export function getFunnelSummary() {
    const s = read();
    const c = s.counts;
    const opens = c.suggestion_form_open || 0;
    const submits = c.suggestion_submit_success || 0;
    const abandons = c.suggestion_close_without_submit || 0;
    const typed = c.suggestion_typing_start || 0;
    const pct = (n: number, d: number) => (d > 0 ? Number(((n / d) * 100).toFixed(1)) : 0);
    return {
        counts: c,
        funnel: {
            開啟表單: opens,
            開始打字: typed,
            送出成功: submits,
            打字轉換率: pct(typed, opens),       // 開啟→開始打字
            送出轉換率: pct(submits, opens),     // 開啟→送出
            打字後放棄率: pct(abandons, typed),  // 打了字卻關掉
        },
        重複提示: {
            顯示: c.duplicate_hint_shown || 0,
            點擊前往點播: c.duplicate_hint_click || 0,
        },
        防干擾: {
            專注輸入次數: c.composing_focus_session || 0,
            補播錯過高潮: c.missed_replay_shown || 0,
        },
        firstAt: s.firstAt,
        lastAt: s.lastAt,
        recent: s.recent,
    };
}

/** 清除本機漏斗資料。 */
export function resetFunnel(): void {
    try {
        localStorage.removeItem(KEY);
    } catch {
        /* ignore */
    }
}

// 方便在瀏覽器 console 直接查看：輸入 songFunnel()
if (typeof window !== 'undefined') {
    (window as unknown as { songFunnel?: () => unknown }).songFunnel = getFunnelSummary;
}
