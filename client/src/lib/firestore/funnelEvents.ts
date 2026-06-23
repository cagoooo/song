// 跨裝置漏斗彙整（server sink）—— 只上傳 3 個核心轉換事件，append-only。
//
// 本機 funnelAnalytics 只看得到單一裝置；要看「整場」的轉換，需把事件彙整到 server。
// 取捨：只上傳「開啟表單 / 開始打字 / 送出成功」三個關鍵事件控制寫入量；
// best-effort（fire-and-forget），失敗靜默，絕不影響主流程；rules 嚴格驗證欄位。
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import { getSessionId } from './session';

export type CoreFunnelEvent =
    | 'suggestion_form_open'
    | 'suggestion_typing_start'
    | 'suggestion_submit_success';

const CORE_EVENTS = new Set<string>([
    'suggestion_form_open',
    'suggestion_typing_start',
    'suggestion_submit_success',
]);

/** 上傳一個核心漏斗事件（非核心事件忽略；fire-and-forget）。 */
export function sinkFunnelEvent(name: string): void {
    if (!CORE_EVENTS.has(name)) return;
    try {
        void addDoc(collection(db, COLLECTIONS.funnelEvents), {
            event: name,
            sessionId: getSessionId(),
            createdAt: Timestamp.now(),
        }).catch(() => { /* 離線 / 規則 → 靜默 */ });
    } catch {
        /* 初始化問題 → 靜默 */
    }
}

export interface FunnelServerSummary {
    opens: number;
    typed: number;
    submits: number;
    /** 不重複 session 數（粗估觸及人數） */
    sessions: number;
    total: number;
}

/** 讀取並彙整 server 端漏斗事件（admin 用；單純 getDocs 計數）。 */
export async function getFunnelServerSummary(): Promise<FunnelServerSummary> {
    const snap = await getDocs(collection(db, COLLECTIONS.funnelEvents));
    let opens = 0;
    let typed = 0;
    let submits = 0;
    const sessions = new Set<string>();
    snap.forEach((doc) => {
        const d = doc.data();
        if (d.sessionId) sessions.add(d.sessionId);
        if (d.event === 'suggestion_form_open') opens += 1;
        else if (d.event === 'suggestion_typing_start') typed += 1;
        else if (d.event === 'suggestion_submit_success') submits += 1;
    });
    return { opens, typed, submits, sessions: sessions.size, total: snap.size };
}
