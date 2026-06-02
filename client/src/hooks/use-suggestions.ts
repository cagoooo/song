// 歌曲建議的 Firestore Hook
import { useState, useEffect } from 'react';
import {
    getSuggestions,
    subscribeSuggestions,
    addSuggestion,
    updateSuggestionStatus,
    deleteSuggestion,
    addSuggestionToPlaylist,
    upvoteSuggestion as upvoteSuggestionDoc,
    type SongSuggestion,
} from '@/lib/firestore';

export function useSuggestions() {
    const [suggestions, setSuggestions] = useState<SongSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeSuggestions((data) => {
            setSuggestions(data);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { suggestions, isLoading };
}

export async function submitSuggestion(
    title: string,
    artist: string,
    suggestedBy?: string,
    notes?: string
) {
    return addSuggestion(title, artist, suggestedBy, notes);
}

export async function approveSuggestion(id: string) {
    return updateSuggestionStatus(id, 'approved');
}

export async function rejectSuggestion(id: string) {
    return updateSuggestionStatus(id, 'rejected');
}

export async function removeSuggestion(id: string) {
    return deleteSuggestion(id);
}

export async function addToPlaylist(
    suggestionId: string,
    title: string,
    artist: string
) {
    return addSuggestionToPlaylist(suggestionId, title, artist);
}

/** A2「+1 我也想聽」附議 */
export async function upvoteSuggestion(id: string) {
    return upvoteSuggestionDoc(id);
}

export type { SongSuggestion };
