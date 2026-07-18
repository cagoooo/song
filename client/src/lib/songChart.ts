// 譜文字 → 歌庫樂譜欄位 — 把轉調工具的純文字譜轉成 Firestore Song 的結構化欄位
//
// 📐 設計文件：docs/design/G-toolbox-roadmap.md（P1-3 存進歌庫）
//
// 讓「轉調工具 → 一鍵入庫」成立：辛苦轉好的譜沉澱成歌庫資產，
// 詳情頁拿得到 progression（和弦進行）+ lyricBlocks（結構化歌詞）。

import { extractChords } from '@/lib/transpose';
import { parseLyricsDSL } from '@/lib/lyrics-dsl';
import type { LyricBlock, Song } from '@/lib/firestore';

export interface SheetChart {
    /** 和弦進行（去重、保序，最多 8 顆 — 詳情頁「彈這幾個就夠了」） */
    progression: string[];
    /** 結構化歌詞區塊（和弦行 + 歌詞行配對） */
    lyricBlocks: LyricBlock[];
}

/**
 * 判斷歌曲是否真的存有歌庫樂譜。
 *
 * 不能只看 songKey / capo，因為一般歌曲也可能只有這些基本資料；
 * 有和弦進行或結構化歌詞，才把「吉他譜」導向站內看譜頁。
 */
export function hasStoredSongChart(
    song: Pick<Song, 'progression' | 'lyricBlocks'>,
): boolean {
    return Boolean(song.progression?.length || song.lyricBlocks?.length);
}

/**
 * 把純文字譜（轉調工具的 output）拆成歌庫樂譜欄位。
 *
 * - progression：抓所有和弦行的和弦，去重保序取前 8 顆
 * - lyricBlocks：沿用 lyrics-DSL 解析（和弦行 + 中文歌詞行配對，無 section 自動建 VERSE 1）
 */
export function buildChartFromSheet(sheet: string): SheetChart {
    const seen = new Set<string>();
    const progression: string[] = [];
    for (const c of extractChords(sheet)) {
        if (seen.has(c)) continue;
        seen.add(c);
        progression.push(c);
        if (progression.length >= 8) break;
    }
    return { progression, lyricBlocks: parseLyricsDSL(sheet) };
}
