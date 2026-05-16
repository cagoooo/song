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
    /** 預估曲長（秒）— admin 開始彈奏時選的；缺值由前端 fallback 到 210 */
    durationSec?: number;
}

/** 演出儀式類型 — 透過 ceremonies/current 廣播給所有訪客 */
export type CeremonyType = 'opening' | 'intermission' | 'song-transition';

export interface CeremonyInfo {
    type: CeremonyType;
    triggeredAt: Date;
    triggeredBy: string;
    payload?: Record<string, unknown>;
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
