import {
    collection, getDocs, addDoc, updateDoc, query, where, orderBy,
    onSnapshot, Timestamp, type Unsubscribe,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import type { TipType, Interaction, RatingStats } from './types';

export async function sendTip(
    songId: string, tipType: TipType, sessionId: string
): Promise<string> {
    const ref = collection(db, COLLECTIONS.interactions);
    const newDoc = await addDoc(ref, {
        songId, type: 'tip', tipType, sessionId, createdAt: Timestamp.now(),
    });
    return newDoc.id;
}

export async function sendRating(
    songId: string, rating: 1 | 2 | 3 | 4 | 5, sessionId: string
): Promise<string> {
    const ref = collection(db, COLLECTIONS.interactions);
    const existingQuery = query(
        ref,
        where('songId', '==', songId),
        where('sessionId', '==', sessionId),
        where('type', '==', 'rating')
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
        const existingDoc = existingSnapshot.docs[0];
        await updateDoc(existingDoc.ref, { rating, createdAt: Timestamp.now() });
        return existingDoc.id;
    }

    const newDoc = await addDoc(ref, {
        songId, type: 'rating', rating, sessionId, createdAt: Timestamp.now(),
    });
    return newDoc.id;
}

export function subscribeInteractions(
    songId: string,
    callback: (interaction: Interaction) => void
): Unsubscribe {
    const ref = collection(db, COLLECTIONS.interactions);
    const songQuery = query(
        ref,
        where('songId', '==', songId),
        orderBy('createdAt', 'desc')
    );

    const processedEvents = new Set<string>();
    let isFirstSnapshot = true;

    return onSnapshot(songQuery, (snapshot) => {
        if (isFirstSnapshot) {
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                const timestamp = data.createdAt?.toMillis?.() || 0;
                processedEvents.add(`${doc.id}_${timestamp}`);
            });
            isFirstSnapshot = false;
            return;
        }

        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
                const docId = change.doc.id;
                const data = change.doc.data();
                const createdAt = data.createdAt?.toDate?.() || new Date();
                const timestamp = data.createdAt?.toMillis?.() || 0;
                const eventKey = `${docId}_${timestamp}`;

                if (!processedEvents.has(eventKey)) {
                    processedEvents.add(eventKey);
                    const ageMs = Date.now() - createdAt.getTime();
                    if (ageMs < 60000) {
                        callback({
                            id: docId,
                            songId: data.songId,
                            type: data.type,
                            tipType: data.tipType,
                            rating: data.rating,
                            sessionId: data.sessionId,
                            createdAt,
                        });
                    }
                }
            }
        });
    });
}

export async function getSongRatingStats(songId: string): Promise<RatingStats> {
    const ref = collection(db, COLLECTIONS.interactions);
    const ratingQuery = query(
        ref,
        where('songId', '==', songId),
        where('type', '==', 'rating')
    );
    const snapshot = await getDocs(ratingQuery);
    if (snapshot.empty) return { average: 0, count: 0, total: 0 };

    let total = 0, count = 0;
    snapshot.forEach((doc) => {
        const rating = doc.data().rating;
        if (rating && rating >= 1 && rating <= 5) {
            total += rating;
            count++;
        }
    });
    return { average: count > 0 ? total / count : 0, count, total };
}

export function subscribeRatingStats(
    songId: string,
    callback: (stats: RatingStats) => void
): Unsubscribe {
    const ref = collection(db, COLLECTIONS.interactions);
    const ratingQuery = query(
        ref,
        where('songId', '==', songId),
        where('type', '==', 'rating')
    );

    return onSnapshot(ratingQuery, (snapshot) => {
        let total = 0, count = 0;
        snapshot.forEach((doc) => {
            const rating = doc.data().rating;
            if (rating && rating >= 1 && rating <= 5) {
                total += rating;
                count++;
            }
        });
        callback({ average: count > 0 ? total / count : 0, count, total });
    });
}
