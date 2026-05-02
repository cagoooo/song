export interface Song {
    id: string;
    title: string;
    artist: string;
    notes?: string;
    lyrics?: string;
    audioUrl?: string;
    isActive: boolean;
    createdAt: Date;
    voteCount: number;
    isPlayed?: boolean;
    isNowPlaying?: boolean;
    /** 演奏難度: 1=入門 ⭐ / 2=中等 ⭐⭐ / 3=進階 ⭐⭐⭐ */
    difficulty?: 1 | 2 | 3;
}

export interface NowPlayingInfo {
    songId: string;
    song: Song | null;
    startedAt: Date;
    startedBy: string;
}

export interface SongSuggestion {
    id: string;
    title: string;
    artist: string;
    suggestedBy?: string;
    notes?: string;
    status: 'pending' | 'approved' | 'rejected' | 'added_to_playlist';
    createdAt: Date;
    processedAt?: Date;
}

export interface Tag {
    id: string;
    name: string;
}

export type TipType = '❤️' | '🌟' | '🎉' | '🔥' | '💎';

export interface Interaction {
    id: string;
    songId: string;
    type: 'tip' | 'rating';
    tipType?: TipType;
    rating?: 1 | 2 | 3 | 4 | 5;
    sessionId: string;
    createdAt: Date;
}

export interface RatingStats {
    average: number;
    count: number;
    total: number;
}
