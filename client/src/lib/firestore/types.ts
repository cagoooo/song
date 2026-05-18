/**
 * 歌詞區塊段別 — 用在結構化歌詞 `lyricBlocks`
 *
 * INTRO / OUTRO 通常只放和弦行，沒 line。
 * VERSE 1-3 / CHORUS / BRIDGE 主歌副歌。
 */
export type LyricSection = 'INTRO' | 'VERSE 1' | 'VERSE 2' | 'VERSE 3' | 'CHORUS' | 'BRIDGE' | 'OUTRO';

/**
 * 歌詞單行 — 一個和弦行 + 對應歌詞
 *
 * - `chord` 可省（INTRO/OUTRO 只有和弦無歌詞時 line 留空）
 * - `line` 可省（純和弦行）
 * - `startMs` 為 LRC 同步預留欄位（v6 C1 會用到）
 */
export interface LyricRow {
    chord?: string;
    line?: string;
    /** 此句開始的 ms（LRC 同步用，T3 不填，C1 LRC 才用） */
    startMs?: number;
}

export interface LyricBlock {
    sec: LyricSection;
    /** 是否為副歌 — UI 上會強調顯示 */
    chorus?: boolean;
    rows: LyricRow[];
}

export interface Song {
    id: string;
    title: string;
    artist: string;
    notes?: string;
    /** @deprecated 改用 lyricBlocks（結構化）。舊資料保留作為 fallback。 */
    lyrics?: string;
    audioUrl?: string;
    isActive: boolean;
    createdAt: Date;
    voteCount: number;
    isPlayed?: boolean;
    isNowPlaying?: boolean;
    /** 演奏難度: 1=入門 ⭐ / 2=中等 ⭐⭐ / 3=進階 ⭐⭐⭐ */
    difficulty?: 1 | 2 | 3;

    // ===== 🆕 T3 樂譜欄位 =====

    /** 音調，例：C / G / Am（避用 `key` 因 React reserved） */
    songKey?: string;
    /** Capo 位置：0 = 不夾 / 1-12 */
    capo?: number;
    /** BPM 拍速（30-250 合理範圍） */
    bpm?: number;
    /** 歌曲長度，格式 `MM:SS` */
    length?: string;
    /** 和弦進行：例 `["C", "G", "Am", "F"]` */
    progression?: string[];
    /** 結構化歌詞區塊（取代純文字 lyrics，向後相容） */
    lyricBlocks?: LyricBlock[];
    /** YouTube ID（給 SongDetail thumbnail / 預覽） */
    youtubeId?: string;
    /** 阿凱主理人筆記（單行短句） */
    kaiNote?: string;
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
