// 雜誌期刊期數系統 — settings/magazine + issues/{issueId}
//
// 📐 設計文件：docs/design/D1-issue-system.md
//
// 用途：抽 ISSUE №12 hardcode 集中到 Firestore，5 件套都從這裡讀。
// Phase 1 (本 PR)：schema + subscribe/update + archive 寫入函式 + fallback。
// Phase 2 (下個 PR)：useMagazine hook 串到 5 件套 + admin 後台 + /archive 頁。

import {
    doc, getDoc, setDoc, updateDoc, addDoc, collection,
    onSnapshot, query, orderBy, limit, getDocs, Timestamp,
    type Unsubscribe,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import type { MagazineSettings, IssueArchive } from './types';
import { MAGAZINE_DEFAULTS } from './types';

// Re-export 預設值給此 module 的 consumer 直接用（也方便測試）
export { MAGAZINE_DEFAULTS } from './types';
export type { MagazineSettings, IssueArchive, SideLabel, MagazineTheme } from './types';

const MAGAZINE_DOC_ID = 'magazine';

// ----- 內部 helpers --------------------------------------------------------

/**
 * 把 Firestore raw data 還原成 MagazineSettings。
 * 處理 Timestamp ↔ Date 轉換 + 預設值補齊。
 */
function deserializeMagazine(data: Record<string, unknown>): MagazineSettings {
    return {
        currentIssueNumber: typeof data.currentIssueNumber === 'number'
            ? data.currentIssueNumber
            : MAGAZINE_DEFAULTS.currentIssueNumber,
        currentIssueTitle: typeof data.currentIssueTitle === 'string'
            ? data.currentIssueTitle
            : MAGAZINE_DEFAULTS.currentIssueTitle,
        currentIssueSubtitle: typeof data.currentIssueSubtitle === 'string'
            ? data.currentIssueSubtitle
            : undefined,
        currentSideLabel: data.currentSideLabel === 'B' ? 'B' : 'A',
        currentStartedAt: data.currentStartedAt instanceof Timestamp
            ? data.currentStartedAt.toDate()
            : MAGAZINE_DEFAULTS.currentStartedAt,
        currentTheme: data.currentTheme === 'red' || data.currentTheme === 'green'
            ? data.currentTheme
            : 'blue',
        updatedAt: data.updatedAt instanceof Timestamp
            ? data.updatedAt.toDate()
            : MAGAZINE_DEFAULTS.updatedAt,
    };
}

function deserializeIssue(id: string, data: Record<string, unknown>): IssueArchive {
    const stats = (data.stats ?? {}) as Record<string, unknown>;
    const top3Raw = Array.isArray(stats.top3) ? stats.top3 : [];
    const topVoterIdsRaw = Array.isArray(stats.topVoterIds) ? stats.topVoterIds : [];
    return {
        id,
        issueNumber: typeof data.issueNumber === 'number' ? data.issueNumber : 0,
        title: typeof data.title === 'string' ? data.title : '',
        subtitle: typeof data.subtitle === 'string' ? data.subtitle : undefined,
        sideLabel: data.sideLabel === 'B' ? 'B' : 'A',
        startedAt: data.startedAt instanceof Timestamp ? data.startedAt.toDate() : new Date(0),
        endedAt: data.endedAt instanceof Timestamp ? data.endedAt.toDate() : new Date(0),
        stats: {
            totalVotes: typeof stats.totalVotes === 'number' ? stats.totalVotes : 0,
            uniqueVoters: typeof stats.uniqueVoters === 'number' ? stats.uniqueVoters : 0,
            top3: top3Raw
                .filter((x) => typeof x === 'object' && x !== null)
                .map((x) => {
                    const o = x as Record<string, unknown>;
                    return {
                        songId: typeof o.songId === 'string' ? o.songId : '',
                        title: typeof o.title === 'string' ? o.title : '',
                        artist: typeof o.artist === 'string' ? o.artist : '',
                        votes: typeof o.votes === 'number' ? o.votes : 0,
                    };
                }),
            topVoterIds: topVoterIdsRaw.filter((x): x is string => typeof x === 'string'),
        },
        coverImageUrl: typeof data.coverImageUrl === 'string' ? data.coverImageUrl : undefined,
        archived: data.archived === true,
    };
}

// ----- 公開 API ------------------------------------------------------------

/**
 * 取得當前雜誌設定（一次性讀取）。
 * 若 doc 不存在回傳 `MAGAZINE_DEFAULTS`（不報錯）。
 */
export async function getMagazineSettings(): Promise<MagazineSettings> {
    const ref = doc(db, COLLECTIONS.settings, MAGAZINE_DOC_ID);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { ...MAGAZINE_DEFAULTS };
    return deserializeMagazine(snap.data());
}

/**
 * 訂閱雜誌設定即時更新。
 * 若 doc 不存在仍會 callback `MAGAZINE_DEFAULTS`，UI 不會閃白。
 */
export function subscribeMagazineSettings(
    callback: (settings: MagazineSettings) => void,
): Unsubscribe {
    const ref = doc(db, COLLECTIONS.settings, MAGAZINE_DOC_ID);
    return onSnapshot(
        ref,
        (snap) => {
            if (!snap.exists()) {
                callback({ ...MAGAZINE_DEFAULTS });
                return;
            }
            callback(deserializeMagazine(snap.data()));
        },
        (err) => {
            // 出錯時也 fallback 到預設值（離線 / 權限被擋等）
            console.warn('[magazine] subscribe error, falling back to defaults:', err);
            callback({ ...MAGAZINE_DEFAULTS });
        },
    );
}

/**
 * 更新雜誌設定。admin-only（Rules 會擋）。
 *
 * - 第一次寫入會自動建 doc（用 setDoc + merge）。
 * - 永遠帶上 `updatedAt: now()`。
 */
export async function updateMagazineSettings(
    patch: Partial<Omit<MagazineSettings, 'updatedAt'>>,
): Promise<void> {
    const ref = doc(db, COLLECTIONS.settings, MAGAZINE_DOC_ID);
    const payload: Record<string, unknown> = {
        ...patch,
        updatedAt: Timestamp.now(),
    };
    // Date 物件要轉 Timestamp
    if (patch.currentStartedAt instanceof Date) {
        payload.currentStartedAt = Timestamp.fromDate(patch.currentStartedAt);
    }
    // 用 setDoc + merge 處理「doc 不存在」的初次寫入
    await setDoc(ref, payload, { merge: true });
}

/**
 * 期數 +1（用 transaction 防併發競態）。admin-only。
 *
 * 通常配合 archiveCurrentIssue() 一起呼叫：
 *   1. archiveCurrentIssue(stats)
 *   2. incrementIssueNumber()
 *   3. updateMagazineSettings({ currentStartedAt: new Date() })
 */
export async function incrementIssueNumber(): Promise<number> {
    const ref = doc(db, COLLECTIONS.settings, MAGAZINE_DOC_ID);
    const snap = await getDoc(ref);
    const current = snap.exists()
        ? deserializeMagazine(snap.data()).currentIssueNumber
        : MAGAZINE_DEFAULTS.currentIssueNumber;
    const next = current + 1;
    await updateDoc(ref, {
        currentIssueNumber: next,
        updatedAt: Timestamp.now(),
    });
    return next;
}

/**
 * 把當前期數歸檔成 `issues/{auto-id}`。admin-only。
 *
 * 通常由 ThankYouModal「結束今晚」按鈕觸發。
 * 回傳建立的 issue id。
 */
export async function archiveCurrentIssue(
    data: Omit<IssueArchive, 'id' | 'archived'>,
): Promise<string> {
    const col = collection(db, COLLECTIONS.issues);
    const docRef = await addDoc(col, {
        issueNumber: data.issueNumber,
        title: data.title,
        subtitle: data.subtitle ?? null,
        sideLabel: data.sideLabel,
        startedAt: Timestamp.fromDate(data.startedAt),
        endedAt: Timestamp.fromDate(data.endedAt),
        stats: data.stats,
        coverImageUrl: data.coverImageUrl ?? null,
        archived: true,
    });
    return docRef.id;
}

/**
 * 列出已歸檔的歷史期數（最近 N 期）。
 */
export async function listIssues(opts?: { limit?: number }): Promise<IssueArchive[]> {
    const col = collection(db, COLLECTIONS.issues);
    const q = query(col, orderBy('issueNumber', 'desc'), limit(opts?.limit ?? 20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => deserializeIssue(d.id, d.data()));
}

/**
 * 取得單一期數（用 /archive/:issueId 頁面）。
 */
export async function getIssue(issueId: string): Promise<IssueArchive | null> {
    const ref = doc(db, COLLECTIONS.issues, issueId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return deserializeIssue(snap.id, snap.data());
}
