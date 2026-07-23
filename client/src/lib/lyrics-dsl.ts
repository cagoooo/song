// 歌詞 mini-DSL — admin 後台貼歌詞的格式，雙向轉換 LyricBlock[]
//
// 📐 設計文件：docs/design/T3-songdetail-firestore.md
//
// DSL 格式範例：
// ```
// [INTRO]
// C  G  Am  Em
//
// [VERSE 1]
// C            G        Am          Em
// 故事的小黃花  從出生那年  就飄著
// F           G          C
// 童年的盪鞦韆  隨記憶一直晃到現在
//
// [CHORUS]*
// C              G               Am          Em
// 刮風這天 我試過握著你手 但偏偏
// ```
//
// 規則：
//   • `[SECTION_NAME]` 開新區塊
//   • `[CHORUS]*` 加星號 → chorus: true
//   • 兩行一組 = chord + line（line 為中文）
//   • 一行不成對 → 純和弦行（INTRO/OUTRO 常見）
//   • 空白行分隔，不影響語意

import type { LyricBlock, LyricRow, LyricSection } from '@/lib/firestore';
import { isChordLine, hasInlineChords } from '@/lib/transpose';
import { getVisualWidth } from '@/lib/aiLayoutOptimizer';

const VALID_SECTIONS: readonly LyricSection[] = [
    'INTRO', 'VERSE 1', 'VERSE 2', 'VERSE 3', 'CHORUS', 'BRIDGE', 'OUTRO',
] as const;

const SECTION_HEADER_RE = /^\[(.+?)\](\*?)\s*$/;
// 判斷是否為「和弦行」: 主要是英文字母 + 數字 + #/b + 空白 + 連字號，沒中文
// (簡單規則：含中文字元就是歌詞 line)
const HAS_CJK_RE = /[一-鿿぀-ヿ가-힯]/;

function normalizeSection(name: string): LyricSection | null {
    const up = name.trim().toUpperCase();
    // 容錯：VERSE1 → VERSE 1 / V1 → VERSE 1
    if (up === 'VERSE 1' || up === 'VERSE1' || up === 'V1') return 'VERSE 1';
    if (up === 'VERSE 2' || up === 'VERSE2' || up === 'V2') return 'VERSE 2';
    if (up === 'VERSE 3' || up === 'VERSE3' || up === 'V3') return 'VERSE 3';
    if (up === 'CHORUS' || up === 'HOOK' || up === 'C') return 'CHORUS';
    if (up === 'BRIDGE' || up === 'B') return 'BRIDGE';
    if (up === 'INTRO' || up === 'I') return 'INTRO';
    if (up === 'OUTRO' || up === 'END' || up === 'O') return 'OUTRO';
    return VALID_SECTIONS.includes(up as LyricSection) ? (up as LyricSection) : null;
}

function isLyricLine(line: string): boolean {
    return HAS_CJK_RE.test(line);
}

const INLINE_CHORD_RE = /\[([^\]]+)\]/g;

/**
 * 把「內嵌和弦」歌詞行拆成「和弦行 + 純歌詞行」配對。
 *
 * AI 辨識常輸出 `我要[C#m]爬過愛情這座[B]山` 這種 inline 格式 —
 * 直接存庫的話和弦會夾在歌詞字串裡，詳情頁沒辦法把和弦排在歌詞上方。
 * 這裡把每顆和弦依「它在純歌詞中的視覺欄位」（中文字算 2 格）放到
 * 和弦行的對應位置，轉成既有的 chord-above-lyric 資料格式。
 *
 * 非和弦的中括號內容（如 [前奏] 標記誤夾在行中）原樣留在歌詞。
 * 回傳 null 表示這行沒有內嵌和弦（呼叫端走原本邏輯）。
 */
export function splitInlineChordRow(line: string): LyricRow | null {
    if (!hasInlineChords(line)) return null;

    let plain = '';
    let chordLine = '';
    let last = 0;
    let match: RegExpExecArray | null;
    INLINE_CHORD_RE.lastIndex = 0;
    while ((match = INLINE_CHORD_RE.exec(line)) !== null) {
        plain += line.slice(last, match.index);
        last = match.index + match[0].length;
        // 逐顆確認是和弦才拆出來（重用 hasInlineChords 的單顆判定）
        if (hasInlineChords(match[0])) {
            // 目標欄位 = 這顆和弦在純歌詞中的視覺位置；已被前一顆佔住則至少隔 1 格
            const targetCol = getVisualWidth(plain);
            const cur = getVisualWidth(chordLine);
            const pad = Math.max(chordLine ? 1 : 0, targetCol - cur);
            chordLine += ' '.repeat(pad) + match[1];
        } else {
            plain += match[0];
        }
    }
    plain += line.slice(last);

    if (!chordLine) return null;
    const lyricText = plain.trimEnd();
    return lyricText
        ? { chord: chordLine, line: lyricText }
        : { chord: chordLine, line: '' };
}

/**
 * 把 DSL 文字解析成 LyricBlock[]。
 *
 * 永遠回傳 array（解析失敗回空陣列），不拋例外。
 */
export function parseLyricsDSL(text: string): LyricBlock[] {
    if (!text || typeof text !== 'string') return [];

    const lines = text.split('\n');
    const blocks: LyricBlock[] = [];
    let current: LyricBlock | null = null;
    let pendingChord: string | null = null;

    const flushPendingChord = () => {
        if (pendingChord !== null && current) {
            current.rows.push({ chord: pendingChord, line: '' });
            pendingChord = null;
        }
    };

    for (const raw of lines) {
        const line = raw.trimEnd();  // 保留前綴空白（和弦對齊用）
        const trimmed = line.trim();

        // 空白行：純和弦行成立 → 寫入
        if (!trimmed) {
            flushPendingChord();
            continue;
        }

        // section header
        const sectionMatch = trimmed.match(SECTION_HEADER_RE);
        if (sectionMatch) {
            // 開新區塊前先把舊區塊的 pendingChord 寫掉
            flushPendingChord();
            const sec = normalizeSection(sectionMatch[1]);
            if (!sec) continue;  // 不認識的 section 跳過
            current = { sec, rows: [] };
            if (sectionMatch[2] === '*') current.chorus = true;
            blocks.push(current);
            continue;
        }

        // 還沒進區塊就有內容 → 自動建一個 VERSE 1
        if (!current) {
            current = { sec: 'VERSE 1', rows: [] };
            blocks.push(current);
        }

        // 內嵌和弦行（AI 辨識常見：我要[C#m]爬過愛情這座[B]山）
        // → 拆成「和弦行 + 純歌詞行」配對，讓詳情頁把和弦排在歌詞上方
        const inlineRow = splitInlineChordRow(line);
        if (inlineRow) {
            flushPendingChord();
            current.rows.push(inlineRow);
            continue;
        }

        // 歌詞行（含中文、且不是「間奏／回拍標記 + 和弦」的混合行）
        // AI 譜常見：|間奏| ||Cmaj7 |Fm...、|Cmaj7 |E7 |(回▲) |
        if (isLyricLine(line) && !isChordLine(line)) {
            current.rows.push(pendingChord === null
                ? { line }
                : { chord: pendingChord, line });
            pendingChord = null;
            continue;
        }

        // 和弦行（沒中文）
        // 若 pendingChord 已有，先寫掉舊的當純和弦行
        if (pendingChord !== null) {
            current.rows.push({ chord: pendingChord, line: '' });
        }
        pendingChord = line;
    }

    // 處理結尾還沒 flush 的和弦
    flushPendingChord();

    // 過濾完全空的 block
    return blocks.filter((b) => b.rows.length > 0);
}

/**
 * 修復舊版已入庫、被「含中文即歌詞」規則誤判的和弦行，
 * 以及「內嵌和弦」直接存進 line 的舊資料（我要[C#m]爬過…[B]山）—
 * 後者拆成 chord-above-lyric，詳情頁才能把和弦排在歌詞上方。
 * 只處理沒有 chord 的 row，一般中文歌詞不受影響。
 */
export function repairMisclassifiedChordRows(blocks: LyricBlock[]): LyricBlock[] {
    return blocks.map((block) => ({
        ...block,
        rows: block.rows.map((row) => {
            if (!row.chord && row.line) {
                if (isChordLine(row.line)) {
                    return { ...row, chord: row.line, line: '' };
                }
                const split = splitInlineChordRow(row.line);
                if (split) {
                    return { ...row, chord: split.chord, line: split.line ?? '' };
                }
            }
            return row;
        }),
    }));
}

/**
 * 清理準備寫入 Firestore 的歌詞區塊。
 * Firestore 不接受任何深度的 undefined；這層防護也能相容舊版解析結果。
 */
export function sanitizeLyricBlocks(blocks: LyricBlock[]): LyricBlock[] {
    return blocks.map((block) => {
        const cleanBlock: LyricBlock = {
            sec: block.sec,
            rows: block.rows.map((row) => {
                const cleanRow: LyricRow = {};
                if (typeof row.chord === 'string') cleanRow.chord = row.chord;
                if (typeof row.line === 'string') cleanRow.line = row.line;
                if (typeof row.startMs === 'number') cleanRow.startMs = row.startMs;
                return cleanRow;
            }),
        };
        if (typeof block.chorus === 'boolean') cleanBlock.chorus = block.chorus;
        return cleanBlock;
    });
}

/**
 * 把 LyricBlock[] 序列化成 DSL 文字（給 admin 編輯時讀回）。
 */
export function serializeLyricsToDSL(blocks: LyricBlock[]): string {
    if (!blocks || !Array.isArray(blocks)) return '';

    const out: string[] = [];
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (i > 0) out.push('');  // block 間空一行
        out.push(`[${block.sec}]${block.chorus ? '*' : ''}`);
        for (const row of block.rows) {
            // 純和弦行（沒 line）
            if (!row.line) {
                if (row.chord) out.push(row.chord);
                continue;
            }
            // 有歌詞 → 和弦行 + 歌詞行 兩行
            if (row.chord && row.chord !== '—') out.push(row.chord);
            out.push(row.line);
        }
    }

    return out.join('\n');
}

/**
 * 估計 LyricBlock[] 是否「夠完整」可上線。
 *
 * 給 admin 預覽 / 警示 — 沒副歌、沒 INTRO 提示 admin。
 */
export function lintLyricBlocks(blocks: LyricBlock[]): string[] {
    const warnings: string[] = [];
    if (blocks.length === 0) {
        warnings.push('沒有任何歌詞區塊');
        return warnings;
    }
    if (!blocks.some((b) => b.chorus || b.sec === 'CHORUS')) {
        warnings.push('沒標記副歌（建議加 [CHORUS]* 或 [CHORUS]）');
    }
    if (blocks.every((b) => b.rows.every((r) => !r.line))) {
        warnings.push('所有區塊都只有和弦行，沒歌詞');
    }
    // row 對齊：和弦行字數 < 歌詞行明顯偏差
    // 暫不做精細對齊，避免錯殺
    return warnings;
}

/**
 * 從舊的純文字 `song.lyrics` 升級到 `LyricBlock[]`。
 *
 * 簡單把整段文字當 VERSE 1 — 沒法智慧切段，僅用作 migration baseline。
 * 進階拆段建議走 admin 後台手動編輯。
 */
export function upgradeLegacyLyrics(legacyText: string): LyricBlock[] {
    if (!legacyText || typeof legacyText !== 'string') return [];
    const lines = legacyText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];
    const rows: LyricRow[] = lines.map((line) => ({ line }));
    return [{ sec: 'VERSE 1', rows }];
}
