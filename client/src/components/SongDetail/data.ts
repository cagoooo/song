// 歌曲詳情頁的「樂譜資料」— 目前 Firestore Song schema 沒有 chord/key/BPM 等欄位，
// 先用 mock data 撐起來。後續可擴 schema 改成從 Firestore 讀。

import type { Song } from '@/lib/firestore';

export interface ChordFingering {
    name: string;
    label: string;
    /** 6 = 低音 E（最粗弦） → 1 = 高音 E（最細弦）；值為 fret 數或 0 (open) 或 "x" (mute) */
    dots: Record<1 | 2 | 3 | 4 | 5 | 6, number | 'x'>;
}

export interface LyricRow {
    chord: string;
    line: string;
}
export interface LyricBlock {
    sec: 'INTRO' | 'VERSE 1' | 'VERSE 2' | 'CHORUS' | 'BRIDGE' | 'OUTRO';
    chorus?: boolean;
    rows: LyricRow[];
}

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

/** 詳細資料完整版 — 「晴天」用設計檔原樣 */
const SONG_DETAILS: Record<string, SongDetail> = {
    '晴天': {
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
    },
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

/** 取得歌曲詳情：若沒有實際資料，用 song.id 推導出穩定 fallback */
export function getSongDetail(song: Song): SongDetail {
    const exact = SONG_DETAILS[song.title];
    if (exact) return exact;

    // Fallback — 用 song.id 當 seed 生成穩定的假資料
    const seed = song.id || song.title;
    const seedHash = hashCode(seed);

    return {
        capo: seedHash % 5,                                // 0 ~ 4
        key: pickFromArray(KEYS, seed),
        bpm: 64 + (seedHash % 64),                          // 64 ~ 127
        length: `0${3 + (seedHash % 3)}:${String(10 + (seedHash % 50)).padStart(2, '0')}`, // 03:10 ~ 05:59
        playedTimes: seedHash % 25,
        progression: pickFromArray(PROGRESSIONS, seed),
        fingerings: COMMON_FINGERINGS,
        lyrics: song.lyrics
            ? [{ sec: 'VERSE 1' as const, rows: [{ chord: '—', line: song.lyrics.slice(0, 60) }] }]
            : [
                { sec: 'INTRO' as const, rows: [{ chord: 'C  G  Am  Em', line: '' }] },
                { sec: 'VERSE 1' as const, rows: [
                    { chord: 'C       G       Am       Em', line: '（這首歌的歌詞還沒被收錄）' },
                    { chord: 'F       G       C', line: '請阿凱老師補上 — 編輯歌曲時可加入歌詞' },
                ] },
                { sec: 'CHORUS' as const, chorus: true, rows: [
                    { chord: 'C       G       F       C', line: '副歌段，加上歌詞會自動高亮' },
                ] },
            ],
        note: pickFromArray(KAI_NOTES, seed),
        // similar 留空 — 應該由實際歌單推薦邏輯產生
        similar: [],
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
