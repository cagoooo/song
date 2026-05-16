// 候場大廳狀態 · lobbyState/current
// admin 設定 openingAt → 所有訪客在開場前看到 LobbyScreen 倒數
import {
    doc, setDoc, deleteDoc, onSnapshot, Timestamp, type Unsubscribe,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';

export interface LobbyStateInfo {
    /** 預計開場時間 — 倒數歸零或 admin 設第一首 nowPlaying 就消失 */
    openingAt: Date;
    setBy: string;
    setAt: Date;
}

const CURRENT_DOC_ID = 'current';

export async function setLobbyOpening(
    openingAt: Date,
    adminUid: string,
): Promise<void> {
    const ref = doc(db, COLLECTIONS.lobbyState, CURRENT_DOC_ID);
    await setDoc(ref, {
        openingAt: Timestamp.fromDate(openingAt),
        setBy: adminUid,
        setAt: Timestamp.now(),
    });
}

export async function clearLobbyOpening(): Promise<void> {
    const ref = doc(db, COLLECTIONS.lobbyState, CURRENT_DOC_ID);
    await deleteDoc(ref);
}

export function subscribeLobbyState(
    callback: (info: LobbyStateInfo | null) => void,
): Unsubscribe {
    const ref = doc(db, COLLECTIONS.lobbyState, CURRENT_DOC_ID);
    return onSnapshot(ref, (snapshot) => {
        if (!snapshot.exists()) {
            callback(null);
            return;
        }
        const data = snapshot.data();
        callback({
            openingAt: data.openingAt?.toDate?.() || new Date(),
            setBy: data.setBy,
            setAt: data.setAt?.toDate?.() || new Date(),
        });
    });
}
