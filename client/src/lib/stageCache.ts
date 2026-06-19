import type { Song } from './firestore';

const STAGE_SONGS_CACHE_KEY = 'song-stage-songs-cache-v1';
const MAX_STAGE_CACHE_SONGS = 200;

type CachedSong = Omit<Song, 'createdAt'> & { createdAt?: string };

function toCachedSong(song: Song): CachedSong {
    return {
        ...song,
        createdAt: song.createdAt instanceof Date ? song.createdAt.toISOString() : undefined,
        lyrics: undefined,
        lyricBlocks: undefined,
    };
}

function fromCachedSong(song: CachedSong): Song | null {
    if (!song || typeof song.id !== 'string' || typeof song.title !== 'string') return null;
    return {
        ...song,
        artist: typeof song.artist === 'string' ? song.artist : '不確定',
        isActive: song.isActive !== false,
        voteCount: typeof song.voteCount === 'number' ? song.voteCount : 0,
        createdAt: song.createdAt ? new Date(song.createdAt) : new Date(0),
    };
}

export function saveStageSongsCache(songs: Song[]): void {
    if (typeof window === 'undefined' || songs.length === 0) return;

    try {
        const payload = {
            savedAt: Date.now(),
            songs: songs
                .slice(0, MAX_STAGE_CACHE_SONGS)
                .map(toCachedSong),
        };
        window.localStorage.setItem(STAGE_SONGS_CACHE_KEY, JSON.stringify(payload));
    } catch {
        // localStorage may be unavailable in private mode. Stage can still wait for Firestore.
    }
}

export function loadStageSongsCache(): Song[] {
    if (typeof window === 'undefined') return [];

    try {
        const raw = window.localStorage.getItem(STAGE_SONGS_CACHE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as { songs?: CachedSong[] };
        if (!Array.isArray(parsed.songs)) return [];
        return parsed.songs
            .map(fromCachedSong)
            .filter((song): song is Song => song !== null);
    } catch {
        return [];
    }
}
