// 歌曲詳情頁的「樂譜資料」
//
// T3 改造：優先讀 Firestore Song 欄位（songKey / capo / bpm / progression /
// lyricBlocks / kaiNote），沒填的歌走 hash-based fallback 撐起完整 UI。
//
// 設計文件：docs/design/T3-songdetail-firestore.md
//
// 向後相容：
//   • 既有 song.lyrics: string → 轉成單一 VERSE 1 LyricBlock
//   • 完全沒填樂譜的歌 → 依 song.id 推導穩定 fallback（同一首歌每次相同）

import type { Song, LyricBlock, LyricRow } from '@/lib/firestore';

export interface ChordFingering {
    name: string;
    label: string;
    /** 6 = 低音 E（最粗弦） → 1 = 高音 E（最細弦）；值為 fret 數或 0 (open) 或 "x" (mute) */
    dots: Record<1 | 2 | 3 | 4 | 5 | 6, number | 'x'>;
    /**
     * 把位（封閉和弦用）：dots 的 1 = 第 baseFret 格。
     * 省略 = 1（開放把位，頂線畫 nut 粗線）。
     */
    baseFret?: number;
}

// 重新 export 給其他模組（保留歷史 import 路徑相容）
export type { LyricBlock, LyricRow } from '@/lib/firestore';

export interface SongDetail {
    capo: number;
    key: string;
    bpm: number;
    length: string;
    playedTimes: number;
    progression: string[];
    fingerings: ChordFingering[];
    lyrics: LyricBlock[];
    /** 阿凱筆記，主理人引文 */
    note: string;
    /** 推薦相似的歌（最多 3 首） */
    similar: { title: string; artist: string; year: number; pill: string }[];
    /** 從哪一個來源拿到的（'firestore' = 真實資料 / 'fallback' = hash 推導） */
    source: 'firestore' | 'fallback' | 'mixed';
}

// 6 個常用和弦的指型圖（C / G / Am / Em / F / Dm）— 用 fallback 給每首歌
const COMMON_FINGERINGS: ChordFingering[] = [
    { name: 'C',  label: 'C Major', dots: { 1: 0, 2: 1, 3: 0, 4: 2, 5: 3, 6: 'x' } },
    { name: 'G',  label: 'G Major', dots: { 1: 3, 2: 0, 3: 0, 4: 0, 5: 2, 6: 3 } },
    { name: 'Am', label: 'A Minor', dots: { 1: 0, 2: 1, 3: 2, 4: 2, 5: 0, 6: 'x' } },
    { name: 'Em', label: 'E Minor', dots: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 2, 6: 0 } },
    { name: 'F',  label: 'F Major', dots: { 1: 1, 2: 1, 3: 2, 4: 3, 5: 3, 6: 1 } },
    { name: 'Dm', label: 'D Minor', dots: { 1: 1, 2: 3, 3: 2, 4: 0, 5: 'x', 6: 'x' } },
];

// 阿凱常用語錄（每首隨機抽一句作為 fallback）
const KAI_NOTES = [
    '主歌可以放低吟唱、副歌再扛起來。讓全場有跟著起伏的空間。',
    '和弦進行很標準，重點放在 strum pattern 與情緒收放。',
    '副歌前的那個關鍵和弦卡半拍給它，整首歌的張力就出來了。前奏可以放慢一點點，讓觀眾跟上。',
    '間奏可以彈長一點，留時間讓觀眾合唱副歌。',
    '速度別飆，這首歌就是要慢、要把字唱清楚。',
];

const KAI_SIMILAR_LABELS = ['同樣 C 調', '同樣抒情', '同樣 78 BPM', '相近年代', '同樣經典', '相似情緒'];

/**
 * 範例資料 —「晴天」完整版型示範。
 *
 * 在 T3 schema 落地後，這份資料應該被當作 admin 後台寫入 Firestore 的「範本」。
 * 未來 admin 後台 SongLyricsEditor 應 expose「載入範本」按鈕，把這份貼進 form。
 */
export const EXAMPLE_FULL_DETAIL: SongDetail = {
    capo: 2,
    key: 'C',
    bpm: 78,
    length: '04:23',
    playedTimes: 14,
    progression: ['C', 'G', 'Am', 'Em', 'F', 'Dm', 'G', 'C'],
    fingerings: COMMON_FINGERINGS,
    lyrics: [
        { sec: 'INTRO', rows: [{ chord: 'C       G       Am      Em', line: '' }] },
        { sec: 'VERSE 1', rows: [
            { chord: 'C            G        Am          Em', line: '故事的小黃花  從出生那年  就飄著' },
            { chord: 'F           G          C', line: '童年的盪鞦韆  隨記憶一直晃到現在' },
        ] },
        { sec: 'CHORUS', chorus: true, rows: [
            { chord: 'C              G               Am          Em', line: '刮風這天 我試過握著你手 但偏偏' },
            { chord: 'F              G                C', line: '雨漸漸 大到我看你不見' },
        ] },
        { sec: 'VERSE 2', rows: [
            { chord: 'C           G          Am         Em', line: '從前從前 有個人愛你很久' },
            { chord: 'F            G           C', line: '但偏偏 風漸漸 把距離吹得好遠' },
        ] },
        { sec: 'BRIDGE', rows: [
            { chord: 'Am          Em          F           G', line: '好不容易 又能再多愛一天' },
        ] },
        { sec: 'OUTRO', rows: [{ chord: 'C   G   Am   Em   F   C', line: '' }] },
    ],
    note: '副歌前的那個 Em 卡半拍給它，整首歌的張力就出來了。前奏可以放慢一點點，讓觀眾跟上。',
    similar: [
        { title: '稻香',     artist: '周杰倫',         year: 2008, pill: '同樣 C 調' },
        { title: '倒數',     artist: 'G.E.M. 鄧紫棋', year: 2018, pill: '同樣抒情' },
        { title: '你的答案', artist: '阿冗',          year: 2020, pill: '同樣 78 BPM' },
    ],
    source: 'firestore',
};

// 簡單 hash — 讓同一首歌每次得到一致的 fallback 值
function hashCode(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h) + s.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}

function pickFromArray<T>(arr: T[], seed: string): T {
    return arr[hashCode(seed) % arr.length];
}

const KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Am', 'Em'];
const PROGRESSIONS = [
    ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'C'],
    ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'],
    ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'G'],
    ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G'],
];

const FALLBACK_LYRICS: LyricBlock[] = [
    { sec: 'INTRO', rows: [{ chord: 'C  G  Am  Em', line: '' }] },
    { sec: 'VERSE 1', rows: [
        { chord: 'C       G       Am       Em', line: '（這首歌的歌詞還沒被收錄）' },
        { chord: 'F       G       C', line: '請阿凱老師補上 — 編輯歌曲時可加入歌詞' },
    ] },
    { sec: 'CHORUS', chorus: true, rows: [
        { chord: 'C       G       F       C', line: '副歌段，加上歌詞會自動高亮' },
    ] },
];

/**
 * 把舊欄位 song.lyrics: string 轉成單一 VERSE 1 LyricBlock。
 *
 * 取前 60 字避免過長 — 完整轉換建議走 admin 後台 SongLyricsEditor（Phase 2）。
 */
function convertLegacyLyricsString(lyrics: string): LyricBlock[] {
    return [{
        sec: 'VERSE 1' as const,
        rows: [{ chord: '—', line: lyrics.slice(0, 60) }],
    }];
}

/**
 * 取得歌曲詳情。
 *
 * 來源優先序：
 *   1. song 上對應 Firestore 欄位（T3 後新增）
 *   2. song.lyrics 舊純文字（向後相容）
 *   3. hash 推導 fallback（同一首歌每次相同）
 *
 * 回傳的 `source` 欄位標明資料來源：
 *   - 'firestore' = 至少有 songKey + lyricBlocks 都有真實資料
 *   - 'fallback'  = 完全沒填，全部 hash 推導
 *   - 'mixed'     = 部分填了（例如有 songKey 但沒 lyricBlocks）
 */
export function getSongDetail(song: Song): SongDetail {
    const seed = song.id || song.title;
    const seedHash = hashCode(seed);

    // 用 song.songKey / song.capo 等 Firestore 欄位優先
    const hasRealLyrics = !!song.lyricBlocks && song.lyricBlocks.length > 0;
    const hasLegacyLyrics = !!song.lyrics && song.lyrics.length > 0;
    const hasMeta = !!(song.songKey || song.bpm || song.capo !== undefined || song.progression?.length);

    let source: SongDetail['source'];
    if (hasRealLyrics && hasMeta) {
        source = 'firestore';
    } else if (hasRealLyrics || hasMeta || hasLegacyLyrics) {
        source = 'mixed';
    } else {
        source = 'fallback';
    }

    return {
        capo: song.capo ?? (seedHash % 5),                                // 0 ~ 4
        key: song.songKey ?? pickFromArray(KEYS, seed),
        bpm: song.bpm ?? (64 + (seedHash % 64)),                          // 64 ~ 127
        length: song.length ?? `0${3 + (seedHash % 3)}:${String(10 + (seedHash % 50)).padStart(2, '0')}`,
        playedTimes: seedHash % 25,
        progression: song.progression && song.progression.length > 0
            ? song.progression
            : pickFromArray(PROGRESSIONS, seed),
        fingerings: COMMON_FINGERINGS,
        lyrics: hasRealLyrics
            ? song.lyricBlocks!
            : hasLegacyLyrics
                ? convertLegacyLyricsString(song.lyrics!)
                : FALLBACK_LYRICS,
        note: song.kaiNote ?? pickFromArray(KAI_NOTES, seed),
        similar: [],  // 由 findSimilarSongs 算
        source,
    };
}

/** 計算「真實」相似歌曲：從整首歌單中找標題 / 歌手 / 年份相近的 3 首 */
export function findSimilarSongs(song: Song, allSongs: Song[]): SongDetail['similar'] {
    const others = allSongs.filter(s => s.id !== song.id);
    if (others.length === 0) return [];

    // 簡單推薦：同歌手 → 同年份 → 隨機
    const sameArtist = others.filter(s => s.artist === song.artist).slice(0, 3);
    const pool: { title: string; artist: string; year: number; pill: string }[] = [];

    sameArtist.forEach((s) => {
        pool.push({ title: s.title, artist: s.artist, year: 0, pill: '同個歌手' });
    });

    // 補滿 3 首
    if (pool.length < 3) {
        const restPool = others.filter(s => !sameArtist.includes(s));
        const seed = hashCode(song.id);
        // 取 shuffle 後的 3 首
        const shuffled = [...restPool].sort((a, b) => {
            return ((hashCode(a.id) + seed) % 100) - ((hashCode(b.id) + seed) % 100);
        });
        shuffled.slice(0, 3 - pool.length).forEach(s => {
            pool.push({
                title: s.title,
                artist: s.artist,
                year: 0,
                pill: pickFromArray(KAI_SIMILAR_LABELS, song.id + s.id),
            });
        });
    }

    return pool.slice(0, 3);
}
