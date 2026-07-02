import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS, col, docRef } from '../firebase';
import { getSessionId } from './session';

export async function recordQRScan(songId: string): Promise<void> {
    const scansRef = col(COLLECTIONS.qrCodeScans);
    await addDoc(scansRef, {
        songId,
        sessionId: getSessionId(),
        userAgent: navigator.userAgent,
        referrer: document.referrer || null,
        createdAt: Timestamp.now(),
    });
}
