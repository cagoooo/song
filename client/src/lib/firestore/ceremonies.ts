// 演出儀式廣播 — 管理員按下「開場」時寫入 ceremonies/current
// 所有訪客 onSnapshot 同步觸發儀式畫面
import {
    doc, setDoc, onSnapshot, Timestamp, type Unsubscribe,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import type { CeremonyInfo, CeremonyType } from './types';

const CURRENT_DOC_ID = 'current';

/**
 * 廣播一場儀式給所有訪客。
 * 寫入 ceremonies/current，所有 onSnapshot listener 立即收到。
 */
export async function triggerCeremony(
    type: CeremonyType,
    adminUid: string,
    payload?: Record<string, unknown>,
): Promise<void> {
    const ref = doc(db, COLLECTIONS.ceremonies, CURRENT_DOC_ID);
    await setDoc(ref, {
        type,
        triggeredBy: adminUid,
        triggeredAt: Timestamp.now(),
        ...(payload ? { payload } : {}),
    });
}

/**
 * 訂閱 ceremonies/current。callback 收到的 CeremonyInfo 是最新一筆，
 * 由訂閱者自行判斷是否要播放（比 triggeredAt 是否 > 自己掛載時間）。
 */
export function subscribeCeremony(
    callback: (info: CeremonyInfo | null) => void,
): Unsubscribe {
    const ref = doc(db, COLLECTIONS.ceremonies, CURRENT_DOC_ID);
    return onSnapshot(ref, (snapshot) => {
        if (!snapshot.exists()) {
            callback(null);
            return;
        }
        const data = snapshot.data();
        callback({
            type: data.type,
            triggeredAt: data.triggeredAt?.toDate?.() || new Date(),
            triggeredBy: data.triggeredBy,
            payload: data.payload,
        });
    });
}
