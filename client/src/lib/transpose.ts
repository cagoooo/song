// 和弦自動轉調引擎 — 91 譜式「整份譜即時轉調」的核心
//
// 📐 設計文件：docs/design/T5-transpose.md
//
// 能力：
//   • 解析和弦符號（root + 品質後綴 + 分數和弦 bass）：C / Am7 / F#m7-5 / Bb/D / C6/9
//   • 半音移調 + 依目標調性智慧選 #/b 拼法（F 調家族用 b、G 調家族用 #）
//   • 整行和弦移調並「保持對齊」— 和弦名變長/變短時吃掉/補回後方空白，
//     讓下一個和弦盡量停在原本的字元欄位（歌詞對照不跑位）
//   • 和弦行偵測（給貼譜工具分辨「和弦行 vs 歌詞行」，含英文歌詞）
//   • 調性偵測（統計 + 順階和弦比對，猜貼進來的譜是什麼調）
//   • Capo 建議（轉調後想用開放和弦指型 → 告訴你夾第幾格彈什麼指型）
//
// 設計原則：純函式、不碰 DOM、解析失敗永遠安全回傳原字串（絕不丟例外炸 UI）。

// ============================================================================
// 音名 ↔ 半音
// ============================================================================

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const NOTE_TO_SEMITONE: Record<string, number> = {
    'C': 0, 'B#': 0,
    'C#': 1, 'Db': 1,
    'D': 2,
    'D#': 3, 'Eb': 3,
    'E': 4, 'Fb': 4,
    'F': 5, 'E#': 5,
    'F#': 6, 'Gb': 6,
    'G': 7,
    'G#': 8, 'Ab': 8,
    'A': 9,
    'A#': 10, 'Bb': 10,
    'B': 11, 'Cb': 11,
};

/** 每個半音「無調性偏好」時的預設拼法：遵循吉他譜慣例（Bb/Eb/Ab 用 b，F#/C# 用 #） */
const DEFAULT_PREFER_FLAT: readonly boolean[] = [
    false, // 0  C
    true,  // 1  Db（5 個 b 比 C# 7 個 # 好讀）
    false, // 2  D
    true,  // 3  Eb
    false, // 4  E
    false, // 5  F
    false, // 6  F#（6# vs 6b 平手，吉他譜慣用 F#）
    false, // 7  G
    true,  // 8  Ab
    false, // 9  A
    true,  // 10 Bb
    false, // 11 B
];

/** 用 b 記譜的大調主音半音（F / Bb / Eb / Ab / Db / Gb） */
const FLAT_MAJOR_KEYS = new Set([5, 10, 3, 8, 1, 6]);

/** UI 給使用者選的 12 個調（大調表示；小調歌曲用 offset 同步位移即可） */
export const KEY_OPTIONS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

/** 音名（可帶 # / b / ♯ / ♭）→ 半音 0-11，認不得回 null */
export function noteToSemitone(note: string): number | null {
    const normalized = note.replace('♯', '#').replace('♭', 'b');
    const v = NOTE_TO_SEMITONE[normalized];
    return v === undefined ? null : v;
}

function semitoneToNote(semitone: number, preferFlat: boolean): string {
    const idx = ((semitone % 12) + 12) % 12;
    return preferFlat ? FLAT_NAMES[idx] : SHARP_NAMES[idx];
}

// ============================================================================
// 和弦解析
// ============================================================================

export interface ParsedChord {
    /** 根音，例 'C' / 'F#' / 'Bb' */
    root: string;
    /** 品質後綴，例 '' / 'm' / 'maj7' / 'm7-5' / '7sus4' / '6/9' */
    suffix: string;
    /** 分數和弦 bass（沒有則 null），例 'G'（來自 C/G） */
    bass: string | null;
}

// root（A-G + 升降）+ 後綴（6/9 特例先吃掉，其餘不含 /）+ 可選 /bass
const CHORD_RE = /^([A-G][#b♯♭]?)((?:6\/9|[^/\s])*)(?:\/([A-G][#b♯♭]?))?$/;

// 後綴只能由這些 token 組成 — 防止把 'Bridge' / 'Am.' / 'Do' 之類誤判成和弦
const SUFFIX_TOKEN_RE = /^(?:maj|min|dim|aug|sus|add|alt|no|omit|M|m|b|#|♭|♯|\+|-|°|ø|Δ|\(|\)|\d|6\/9|[A-G])*$/;

/**
 * 解析單一和弦符號。不是合法和弦 → null。
 *
 * 接受：C、Cm、C7、Cmaj7、Cm7-5、C#dim、Bbsus4、Cadd9、C/G、C6/9、F#m7b5…
 * 拒絕：歌詞單字（Bridge、Do、Amazing）、小寫 root（c）、空字串。
 */
export function parseChord(symbol: string): ParsedChord | null {
    if (!symbol) return null;
    const m = symbol.match(CHORD_RE);
    if (!m) return null;
    const [, root, suffix, bass] = m;
    if (noteToSemitone(root) === null) return null;
    if (suffix && !SUFFIX_TOKEN_RE.test(suffix)) return null;
    if (bass !== undefined && noteToSemitone(bass) === null) return null;
    return { root, suffix: suffix ?? '', bass: bass ?? null };
}

/** symbol 是否為合法和弦 */
export function isChordSymbol(symbol: string): boolean {
    return parseChord(symbol) !== null;
}

// ============================================================================
// 移調
// ============================================================================

/**
 * 依「目標調」決定整份譜的 #/b 拼法。
 *
 * 規則：目標調根音帶 b → 全用 b；帶 # → 全用 #；
 * 自然音根音 → 大調看五度圈（F 用 b，其餘用 #）、小調換算成關係大調再判斷。
 * 認不得的 key → 跟預設拼法走（per-半音慣例）。
 */
export function preferFlatForKey(key: string | null | undefined): boolean | null {
    if (!key) return null;
    const parsed = parseChord(key.trim());
    if (!parsed) return null;
    if (parsed.root.includes('b') || parsed.root.includes('♭')) return true;
    if (parsed.root.includes('#') || parsed.root.includes('♯')) return false;
    const semitone = noteToSemitone(parsed.root);
    if (semitone === null) return null;
    const isMinor = /^m(?!aj)/.test(parsed.suffix);
    // 小調 +3 = 關係大調（Am→C、Dm→F、Gm→Bb…）
    const majorTonic = isMinor ? (semitone + 3) % 12 : semitone;
    return FLAT_MAJOR_KEYS.has(majorTonic);
}

export interface TransposeOptions {
    /** 強制 #/b 拼法；不給則每個音各自用慣例拼法（DEFAULT_PREFER_FLAT） */
    preferFlat?: boolean | null;
}

function transposeNoteName(note: string, semitones: number, options?: TransposeOptions): string {
    const from = noteToSemitone(note);
    if (from === null) return note;
    const to = ((from + semitones) % 12 + 12) % 12;
    const preferFlat = options?.preferFlat ?? DEFAULT_PREFER_FLAT[to];
    return semitoneToNote(to, preferFlat);
}

/**
 * 移調單一和弦符號。root 與 bass 各移 semitones 個半音，後綴原樣保留。
 * 不是和弦 → 原樣回傳（絕不丟例外）。
 */
export function transposeChordSymbol(symbol: string, semitones: number, options?: TransposeOptions): string {
    // 位移 0 且沒有指定拼法 → 原樣（有指定拼法時仍要重拼，例 A# → Bb）
    if (semitones % 12 === 0 && (options?.preferFlat === undefined || options?.preferFlat === null)) return symbol;
    const parsed = parseChord(symbol);
    if (!parsed) return symbol;
    const root = transposeNoteName(parsed.root, semitones, options);
    const bass = parsed.bass ? transposeNoteName(parsed.bass, semitones, options) : null;
    return root + parsed.suffix + (bass ? '/' + bass : '');
}

// ============================================================================
// 整行移調（保持對齊）
// ============================================================================

/** 和弦行裡允許出現的「非和弦」記號 — 不影響和弦行判定，移調時原樣保留 */
const NEUTRAL_TOKEN_RE = /^(?:\||-|–|—|→|%|\.|,|x\d+|X\d+|N\.?C\.?|\(|\)|\*)+$/i;

// ============================================================================
// Token 裝飾處理 — 91 譜文字格式的「黏寫」慣例
// ============================================================================
// 91 譜等網站的和弦常黏著記號：|Cmaj7（小節線）、(C)（過門）、Em7-Dm7（連寫）。
// [A]、[前奏] 這種「全括號」是段落記號 — 整顆中性，永不移調。

const BRACKETED_TOKEN_RE = /^\[.+\]$/;
const DECOR_TOKEN_RE = /^([|([\]:*#~*\d()]*)(.*?)([|()\[\],.:*]*)$/;

interface ChordToken {
    prefix: string;
    /** 和弦本體：連寫拆解含分隔符（['Em7','-','Dm7']）；單顆就一個元素 */
    parts: string[];
    suffix: string;
}

/** 把 token 拆成 裝飾前綴 + 和弦本體 + 裝飾後綴；不是和弦 token → null */
function parseChordToken(token: string): ChordToken | null {
    if (BRACKETED_TOKEN_RE.test(token)) return null; // [A] 段落記號
    
    let outerPrefix = '';
    let restToken = token;
    
    // 偵測並分離前置的 [段落] 記號，例如 [前奏]|G 拆出 [前奏]
    const bracketMatch = token.match(/^(\[[^\]]+\])(.*)$/);
    if (bracketMatch) {
        outerPrefix = bracketMatch[1];
        restToken = bracketMatch[2];
    }
    
    const m = restToken.match(DECOR_TOKEN_RE);
    if (!m) return null;
    
    let prefix = m[1] || '';
    let core = m[2] || '';
    let suffix = m[3] || '';
    
    if (!core) return null;
    
    // 解決後置裝飾搶走括號的問題：
    // 若 core 不是和弦且有未閉合的括號，且 suffix 以 ) 開頭，把 ) 移回 core
    if (!isChordSymbol(core) && suffix.startsWith(')')) {
        const openCount = (core.match(/\(/g) || []).length;
        const closeCount = (core.match(/\)/g) || []).length;
        if (openCount > closeCount) {
            const tempCore = core + ')';
            const tempSuffix = suffix.slice(1);
            if (isChordSymbol(tempCore)) {
                core = tempCore;
                suffix = tempSuffix;
            }
        }
    }
    
    // 優先：連寫和弦 Em7-Dm7 / C-G — 先拆分驗證，若每部均為和弦則採用
    if (core.includes('-')) {
        const segs = core.split(/(-)/);
        const chords = segs.filter((_, i) => i % 2 === 0);
        if (chords.length > 1 && chords.every((c) => c && isChordSymbol(c))) {
            return { prefix: outerPrefix + prefix, parts: segs, suffix };
        }
    }
    
    // 次之：整顆解析（避免誤拆 Cm7-5）
    if (isChordSymbol(core)) {
        return { prefix: outerPrefix + prefix, parts: [core], suffix };
    }
    
    return null;
}

/** token 分類：中性（| x2 N.C. [A]）/ 和弦（含黏寫裝飾）/ 一般文字（給 UI 標可疑字用） */
export function classifyToken(token: string): 'neutral' | 'chord' | 'word' {
    if (NEUTRAL_TOKEN_RE.test(token) || BRACKETED_TOKEN_RE.test(token)) return 'neutral';
    return parseChordToken(token) ? 'chord' : 'word';
}

/** 一行裡「和弦 token」的數量（OCR 雜訊修正的採用門檻用） */
export function countChordTokens(line: string): number {
    if (!line.trim()) return 0;
    return line.trim().split(/\s+/).filter((t) => classifyToken(t) === 'chord').length;
}

/**
 * 移調一整行和弦（如 'C    G    Am   Em'），盡量保持原本的欄位對齊：
 * 和弦名變長 N 字元 → 從它後面的空白吃掉 N 個（至少留 1 格）；
 * 變短 N 字元 → 補回 N 個空白。這樣下一個和弦的起始欄位盡量不動，
 * 歌詞對照不會跑位。
 */
/**
 * 對一行裡的每顆和弦套用 mapChord，盡量保持原本的欄位對齊：
 * 結果變長 N 字元 → 從後面的空白吃掉 N 個（至少留 1 格）；變短 → 補回。
 * 轉調與級數轉換共用此邏輯（差別只在 mapChord）。
 */
function mapChordLine(line: string, mapChord: (chord: string) => string): string {
    if (!line) return line;
    // 切成 [空白][token][空白][token]… 的序列（保留空白原樣）
    const parts = line.split(/(\s+)/);
    let out = '';
    let debt = 0; // 正 = 前面變長了欠空白（要從後面的空白扣回來）；負 = 變短了要補
    for (const part of parts) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
            let ws = part.length - debt;
            if (ws < 1) {
                // 空白不夠扣 → 至少留 1 格，剩下的欠到下一段空白
                debt = 1 - ws;
                ws = 1;
            } else {
                debt = 0;
            }
            out += ' '.repeat(ws);
            continue;
        }
        const tok = parseChordToken(part);
        const mapped = tok
            ? tok.prefix
              + tok.parts.map((p, i) => (i % 2 === 0 ? mapChord(p) : p)).join('')
              + tok.suffix
            : part;
        debt += mapped.length - part.length;
        out += mapped;
    }
    return out;
}

export function transposeChordLine(line: string, semitones: number, options?: TransposeOptions): string {
    return mapChordLine(line, (c) => transposeChordSymbol(c, semitones, options));
}

// ============================================================================
// 和弦行偵測（貼譜工具用）
// ============================================================================

/**
 * 判斷一行文字是不是「和弦行」。
 *
 * 規則：
 *   • 空行 → 不是
 *   • 行裡只要有「黏寫和弦」（|Am7 / [Cmaj7 — 小節線黏在和弦上）→ 鐵證，
 *     直接判定為和弦行。真實歌詞不會出現這種寫法；這條救回
 *     「OCR 把譜邊註記（參考指法等中文）併進和弦行」的混合行
 *   • 否則把行切 token，扣掉中性記號（| - x2 N.C. [A] …）後，
 *     「能解析成和弦的 token」佔比 ≥ 60% 且至少 1 個 → 和弦行
 *
 * 中文 / 英文歌詞都靠佔比規則排除：歌詞單字（含 CJK token）解析不成和弦，
 * 'Amazing grace how sweet'、'C 大調的歌' 都不會被誤判。
 */
export function isChordLine(line: string): boolean {
    if (!line || !line.trim()) return false;
    const tokens = line.trim().split(/\s+/);
    let chordCount = 0;
    let wordCount = 0;
    let hasGluedChord = false;
    for (const t of tokens) {
        const cls = classifyToken(t);
        if (cls === 'neutral') continue;
        if (cls === 'chord') {
            chordCount++;
            if (/^[|[]/.test(t)) hasGluedChord = true;
        } else {
            wordCount++;
        }
    }
    if (chordCount === 0) return false;
    if (hasGluedChord) return true;
    return chordCount / (chordCount + wordCount) >= 0.6;
}

/** 從多行文字抓出所有和弦符號（依出現順序，重複保留 — 給調性偵測權重用） */
export function extractChords(text: string): string[] {
    const chords: string[] = [];
    for (const line of text.split('\n')) {
        if (hasInlineChords(line)) {
            const INLINE_CHORD_RE = /\[([^\]]+)\]/g;
            let match;
            INLINE_CHORD_RE.lastIndex = 0;
            while ((match = INLINE_CHORD_RE.exec(line)) !== null) {
                const tok = parseChordToken(match[1]);
                if (tok) {
                    tok.parts.forEach((p, i) => {
                        if (i % 2 === 0) chords.push(p);
                    });
                }
            }
        } else if (isChordLine(line)) {
            for (const t of line.trim().split(/\s+/)) {
                const tok = parseChordToken(t);
                if (!tok) continue;
                tok.parts.forEach((p, i) => { if (i % 2 === 0) chords.push(p); });
            }
        }
    }
    return chords;
}

// ============================================================================
// 調性偵測
// ============================================================================

/** 大調順階和弦品質：I ii iii IV V vi vii° */
const MAJOR_SCALE_DEGREES = [0, 2, 4, 5, 7, 9, 11];

function chordQualityClass(suffix: string): 'major' | 'minor' | 'dim' | 'other' {
    if (/^(dim|°|m7b5|m7-5|ø)/.test(suffix)) return 'dim';
    if (/^m(?!aj)/.test(suffix)) return 'minor';
    if (suffix === '' || /^(maj|M|add|sus|6|7|9|11|13|aug|\+|\()/.test(suffix)) return 'major';
    return 'other';
}

export interface DetectedKey {
    /** 大調表示，例 'G' */
    key: string;
    /** 0-1 的信心分數 */
    confidence: number;
}

/**
 * 從一串和弦猜「最可能的大調」。
 *
 * 計分：每個和弦若是該調的順階和弦 → 依級數品質吻合度給分
 * （主和弦 I 與屬和弦 V 加權），第一個與最後一個和弦再加成
 * （流行歌大多以 I 或 vi 開頭/結尾）。
 *
 * 回傳大調表示（小調歌會回傳其關係大調，例 Am 的歌回 'C'）—
 * 轉調只需要相對位移，這樣已足夠。沒和弦 → null。
 */
export function detectKey(chords: string[]): DetectedKey | null {
    const parsed = chords
        .map((c) => parseChord(c))
        .filter((p): p is ParsedChord => p !== null);
    if (parsed.length === 0) return null;

    let bestKey = 0;
    let bestScore = -1;

    for (let tonic = 0; tonic < 12; tonic++) {
        let score = 0;
        for (let i = 0; i < parsed.length; i++) {
            const p = parsed[i];
            const semitone = noteToSemitone(p.root);
            if (semitone === null) continue;
            const degree = ((semitone - tonic) % 12 + 12) % 12;
            const degreeIdx = MAJOR_SCALE_DEGREES.indexOf(degree);
            if (degreeIdx === -1) continue; // 非順階音
            const quality = chordQualityClass(p.suffix);
            // 順階品質吻合表：I IV V 大、ii iii vi 小、vii dim
            const expected: ('major' | 'minor' | 'dim')[] = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'dim'];
            const matches = quality === expected[degreeIdx] || quality === 'other';
            let w = matches ? 2 : 0.5; // 在調內但品質不合（借用和弦）仍給基本分
            if (degreeIdx === 0 && matches) w += 1.5; // 主和弦
            if (degreeIdx === 4 && matches) w += 0.5; // 屬和弦
            // 首尾加成
            if ((i === 0 || i === parsed.length - 1) && (degreeIdx === 0 || degreeIdx === 5)) w += 1.5;
            score += w;
        }
        if (score > bestScore) {
            bestScore = score;
            bestKey = tonic;
        }
    }

    // 滿分估計：每顆和弦最高 ~3.5 + 首尾 3
    const maxPossible = parsed.length * 3.5 + 3;
    return {
        key: semitoneToNote(bestKey, FLAT_MAJOR_KEYS.has(bestKey)),
        confidence: Math.max(0, Math.min(1, bestScore / maxPossible)),
    };
}

// ============================================================================
// Capo 建議
// ============================================================================

/** 開放和弦最好彈的「指型調」（大調） */
const OPEN_SHAPE_KEYS = new Set([0, 7, 2, 9, 4]); // C G D A E

export interface CapoSuggestion {
    /** 夾第幾格（0 = 不夾） */
    capo: number;
    /** 用什麼指型調來彈，例 'C' */
    shapeKey: string;
}

/**
 * 想讓實際音高是 soundingKey（大調表示）時，列出「Capo + 開放指型」的等效彈法。
 *
 * 例：soundingKey = 'E' → [{capo:0,shapeKey:'E'}, {capo:2,shapeKey:'D'},
 * {capo:4,shapeKey:'C'}, {capo:7,shapeKey:'A'}…]，依 capo 由低到高。
 */
export function capoSuggestions(soundingKey: string, maxCapo = 7): CapoSuggestion[] {
    const semitone = noteToSemitone(parseChord(soundingKey)?.root ?? '');
    if (semitone === null) return [];
    const out: CapoSuggestion[] = [];
    for (let capo = 0; capo <= maxCapo; capo++) {
        const shape = ((semitone - capo) % 12 + 12) % 12;
        if (OPEN_SHAPE_KEYS.has(shape)) {
            out.push({ capo, shapeKey: semitoneToNote(shape, false) });
        }
    }
    return out;
}

// ============================================================================
// 整份譜移調（純文字 / LyricBlock）
// ============================================================================

import type { LyricBlock } from '@/lib/firestore';

export function hasInlineChords(line: string): boolean {
    if (!line.includes('[') || !line.includes(']')) return false;
    const INLINE_CHORD_RE = /\[([^\]]+)\]/g;
    let found = false;
    let match;
    INLINE_CHORD_RE.lastIndex = 0;
    while ((match = INLINE_CHORD_RE.exec(line)) !== null) {
        if (parseChordToken(match[1])) {
            found = true;
            break;
        }
    }
    return found;
}

export function transposeInlineChords(line: string, semitones: number, options?: TransposeOptions): string {
    const INLINE_CHORD_RE = /\[([^\]]+)\]/g;
    return line.replace(INLINE_CHORD_RE, (match, p1) => {
        const tok = parseChordToken(p1);
        if (tok) {
            const mapped = tok.prefix
                + tok.parts.map((p, i) => (i % 2 === 0 ? transposeChordSymbol(p, semitones, options) : p)).join('')
                + tok.suffix;
            return `[${mapped}]`;
        }
        return match;
    });
}

export function nashvilleInlineChords(line: string, keyRoot: string): string {
    const INLINE_CHORD_RE = /\[([^\]]+)\]/g;
    return line.replace(INLINE_CHORD_RE, (match, p1) => {
        const tok = parseChordToken(p1);
        if (tok) {
            const mapped = tok.prefix
                + tok.parts.map((p, i) => (i % 2 === 0 ? chordToNashville(p, keyRoot) : p)).join('')
                + tok.suffix;
            return `[${mapped}]`;
        }
        return match;
    });
}

/** 移調整段純文字譜：逐行判斷，內聯和弦與和弦行都移調，其餘保留 */
export function transposeChordSheet(text: string, semitones: number, options?: TransposeOptions): string {
    if (!text) return text;
    return text
        .split('\n')
        .map((line) => {
            if (hasInlineChords(line)) {
                return transposeInlineChords(line, semitones, options);
            }
            if (isChordLine(line)) {
                return transposeChordLine(line, semitones, options);
            }
            return line;
        })
        .join('\n');
}

/** 移調 LyricBlock[]（歌曲詳情頁用）— 回傳新陣列，不改原資料 */
export function transposeLyricBlocks(blocks: LyricBlock[], semitones: number, options?: TransposeOptions): LyricBlock[] {
    if (semitones % 12 === 0) return blocks;
    return blocks.map((b) => ({
        ...b,
        rows: b.rows.map((r) => ({
            ...r,
            chord: r.chord ? transposeChordLine(r.chord, semitones, options) : r.chord,
        })),
    }));
}

/** 移調和弦進行陣列（['C','G','Am'] → ['D','A','Bm']） */
export function transposeProgression(progression: string[], semitones: number, options?: TransposeOptions): string[] {
    if (semitones % 12 === 0) return progression;
    return progression.map((c) => transposeChordSymbol(c, semitones, options));
}

// ============================================================================
// 數字級數（Nashville Number System）
// ============================================================================
// 把和弦改用「相對主音的級數」表示：C 調的 C/F/G/Am → 1/4/5/6m。
// 級數的好處 = 與絕對調無關，看懂一次到處通用，教學/移調思考超直覺。
//
// 慣例：以「大調主音」為 1。小調歌（detectKey 回關係大調）會以關係大調級數
// 表示（Am 的歌主和弦顯示 6m）— 與 91 譜等華語數字譜的標法一致。

const DEGREE_NAMES = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'] as const;

function semitoneToDegree(semitone: number, tonic: number): string {
    return DEGREE_NAMES[((semitone - tonic) % 12 + 12) % 12];
}

/**
 * 單顆和弦 → 級數字串（相對 keyRoot 大調主音）。
 * 後綴原樣保留（Am7 → 6m7、G7 → 57、C/E → 1/3）。非和弦原樣回傳。
 */
export function chordToNashville(symbol: string, keyRoot: string): string {
    const parsed = parseChord(symbol);
    if (!parsed) return symbol;
    const tonic = noteToSemitone(parseChord(keyRoot)?.root ?? keyRoot);
    const rootSemi = noteToSemitone(parsed.root);
    if (tonic === null || rootSemi === null) return symbol;
    let out = semitoneToDegree(rootSemi, tonic) + parsed.suffix;
    if (parsed.bass) {
        const bassSemi = noteToSemitone(parsed.bass);
        if (bassSemi !== null) out += '/' + semitoneToDegree(bassSemi, tonic);
    }
    return out;
}

/** 整行和弦 → 級數（保持欄位對齊；含黏寫 |Cmaj7 / 連寫 Em7-Dm7） */
export function chordLineToNashville(line: string, keyRoot: string): string {
    return mapChordLine(line, (c) => chordToNashville(c, keyRoot));
}

/** 整份譜 → 級數（逐行：和弦行與內聯和弦轉級數，其餘保留） */
export function nashvilleSheet(text: string, keyRoot: string): string {
    if (!text) return text;
    return text
        .split('\n')
        .map((line) => {
            if (hasInlineChords(line)) {
                return nashvilleInlineChords(line, keyRoot);
            }
            if (isChordLine(line)) {
                return chordLineToNashville(line, keyRoot);
            }
            return line;
        })
        .join('\n');
}
