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

        // 歌詞行（含中文）
        if (isLyricLine(line)) {
            current.rows.push({
                chord: pendingChord ?? undefined,
                line,
            });
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
