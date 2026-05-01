import {
    collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
    onSnapshot, Timestamp, type Unsubscribe,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import type { SongSuggestion } from './types';
import { addSong } from './songs';

export async function getSuggestions(): Promise<SongSuggestion[]> {
    const suggestionsRef = collection(db, COLLECTIONS.songSuggestions);
    const snapshot = await getDocs(suggestionsRef);
    const suggestions: SongSuggestion[] = [];
    snapshot.forEach((doc) => {
        const data = doc.data();
        suggestions.push({
            id: doc.id,
            title: data.title,
            artist: data.artist,
            suggestedBy: data.suggestedBy,
            notes: data.notes,
            status: data.status,
            createdAt: data.createdAt?.toDate?.() || new Date(),
        });
    });
    suggestions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return suggestions;
}

export function subscribeSuggestions(callback: (suggestions: SongSuggestion[]) => void): Unsubscribe {
    const suggestionsRef = collection(db, COLLECTIONS.songSuggestions);
    return onSnapshot(suggestionsRef, (snapshot) => {
        const suggestions: SongSuggestion[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            suggestions.push({
                id: doc.id,
                title: data.title,
                artist: data.artist,
                suggestedBy: data.suggestedBy,
                notes: data.notes,
                status: data.status,
                createdAt: data.createdAt?.toDate?.() || new Date(),
            });
        });
        suggestions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        callback(suggestions);
    });
}

export async function addSuggestion(
    title: string, artist: string, suggestedBy?: string, notes?: string
): Promise<string> {
    const suggestionsRef = collection(db, COLLECTIONS.songSuggestions);
    const newDoc = await addDoc(suggestionsRef, {
        title: title.trim(),
        artist: artist?.trim() || '不確定',
        suggestedBy: suggestedBy?.trim() || null,
        notes: notes?.trim() || null,
        status: 'pending',
        createdAt: Timestamp.now(),
    });
    return newDoc.id;
}

export async function updateSuggestionStatus(
    suggestionId: string, status: SongSuggestion['status']
): Promise<void> {
    const ref = doc(db, COLLECTIONS.songSuggestions, suggestionId);
    await updateDoc(ref, { status });
}

export async function deleteSuggestion(suggestionId: string): Promise<void> {
    const ref = doc(db, COLLECTIONS.songSuggestions, suggestionId);
    await deleteDoc(ref);
}

export async function addSuggestionToPlaylist(
    suggestionId: string, title: string, artist: string
): Promise<string> {
    const songId = await addSong(title, artist);
    const ref = doc(db, COLLECTIONS.songSuggestions, suggestionId);
    await updateDoc(ref, {
        status: 'added_to_playlist',
        processedAt: Timestamp.now(),
    });
    return songId;
}
