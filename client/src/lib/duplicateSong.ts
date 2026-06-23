// 歌曲重複偵測 — 用「標準化後相等」或「高度相似」判斷，避免子字串包含造成的誤判
//
// 舊版用 `includes()` 子字串比對：「再見的時候」包含「再見」就被誤判成同一首。
// 短歌名（如「再見」）會誤命中一堆包含它的長歌名。改為：
//   1. 標準化（去空白/標點/括號內容、轉小寫）後完全相同 → exact
//   2. 否則用字元 bigram 的 Dice 相似度，達門檻才算 partial（拼字差異、些微變體）
import type { Song } from '@/lib/firestore';

export interface MatchedSong {
    song: Song;
    matchType: 'exact' | 'partial';
}

// 預設相似度門檻：夠高才提示，寧可漏抓也不要誤判（誤判會擋到使用者點不同的歌）
export const DEFAULT_SIMILARITY_THRESHOLD = 0.8;

/**
 * 標準化歌名／歌手：
 *  - 轉小寫、去頭尾空白
 *  - 移除括號與其內容（(Live)、(電影主題曲)、【伴奏】…）
 *  - 移除空白與常見標點，讓「演員 (Live)」≈「演員」、「Yes, Sir」≈「yessir」
 */
export function normalizeTitle(s: string): string {
    return (s || '')
        .toLowerCase()
        .replace(/[（(【[｛{].*?[)）】\]｝}]/g, '') // 去括號與內容
        .replace(/[\s\-_~!?.,；;:：，。、！？．…「」『』"'“”‘’()（）]/g, '')
        .trim();
}

/**
 * 字元 bigram 的 Dice 係數（0~1），對中英文都堪用。
 * 單字元字串退化為相等比較。
 */
export function titleSimilarity(a: string, b: string): number {
    if (a === b) return a.length > 0 ? 1 : 0;
    if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;

    const bigrams = (s: string): Map<string, number> => {
        const m = new Map<string, number>();
        for (let i = 0; i < s.length - 1; i++) {
            const g = s.slice(i, i + 2);
            m.set(g, (m.get(g) || 0) + 1);
        }
        return m;
    };

    const A = bigrams(a);
    const B = bigrams(b);
    let intersection = 0;
    A.forEach((count, g) => {
        intersection += Math.min(count, B.get(g) || 0);
    });
    const total = a.length - 1 + (b.length - 1);
    return (2 * intersection) / total;
}

/**
 * 在歌單中尋找與輸入歌名重複/相似的歌。
 * @returns 命中的歌與類型（exact/partial），找不到回 null。
 */
export function findDuplicateSong(
    inputTitle: string,
    inputArtist: string,
    songs: Song[],
    threshold: number = DEFAULT_SIMILARITY_THRESHOLD,
): MatchedSong | null {
    const t = normalizeTitle(inputTitle);
    if (!t || songs.length === 0) return null;
    const a = normalizeTitle(inputArtist);

    let partial: MatchedSong | null = null;
    for (const song of songs) {
        const st = normalizeTitle(song.title);
        if (!st) continue;
        const sa = normalizeTitle(song.artist || '');

        // 1) 標準化後完全相同 → 確定重複
        if (st === t) {
            return { song, matchType: 'exact' };
        }

        // 2) 高度相似才提示（拼字差異/些微變體），避免「再見的時候」被「再見」誤判
        if (titleSimilarity(t, st) >= threshold) {
            // 歌手也相符 → 視為高度匹配
            if (a && sa && (sa === a || titleSimilarity(a, sa) >= threshold)) {
                return { song, matchType: 'exact' };
            }
            if (!partial) partial = { song, matchType: 'partial' };
        }
    }
    return partial;
}
