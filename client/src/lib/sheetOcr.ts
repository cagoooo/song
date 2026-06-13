// 譜圖 OCR — 把吉他譜「截圖 / 圖檔」辨識成可轉調的文字譜
//
// 📐 設計文件：docs/design/G3-sheet-ocr.md
//
// 管線：圖片 → Tesseract.js（瀏覽器端 WASM，免費、圖不離開裝置）
//        → word bounding box → 版面重建（保留和弦↔歌詞的欄位對齊）
//        → 全形轉半形 + OCR 雜訊修正 → 餵給 transpose.ts 既有轉調流程
//
// 設計原則：
//   • 版面重建是純函式（可單元測試），Tesseract 只是薄包裝
//   • OCR 結果本來就會有小錯字 — 落地到「可編輯的 textarea」讓使用者修，
//     不追求 100% 正確，追求「比手打快 10 倍」
//   • worker 模組級快取：同一個 session 第二張圖不用重新下載語言檔

import { isChordLine, isChordSymbol, countChordTokens } from '@/lib/transpose';

// ============================================================================
// 型別（與 tesseract.js Page/Line/Word 對齊，但只取需要的欄位）
// ============================================================================

export interface OcrWord {
    text: string;
    x0: number;
    x1: number;
}

export interface OcrLine {
    /** 行的垂直位置（排序用） */
    y0: number;
    words: OcrWord[];
}

export type OcrProgress = {
    /** 階段：init 下載引擎/語言檔、recognize 辨識中 */
    stage: 'init' | 'recognize';
    /** 0-1 */
    progress: number;
    /** 給 UI 顯示的中文訊息 */
    message: string;
};

// ============================================================================
// 純函式：正規化 + 版面重建
// ============================================================================

const HAS_CJK_RE = /[一-鿿぀-ヿ가-힯]/;

/**
 * 全形 → 半形：OCR 中文模型常把和弦吐成全形（Ｃｍａｊ７ / － / ｜ / （））。
 * 範圍：全形 ASCII（U+FF01-FF5E）→ 半形；全形空白 → 半形空白。
 */
export function toHalfWidth(s: string): string {
    return s
        .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
        .replace(/　/g, ' ');
}

/** 視覺寬度：CJK 字元算 2 格（對齊用半形欄位計算） */
export function visualWidth(s: string): number {
    let w = 0;
    for (const ch of s) w += HAS_CJK_RE.test(ch) ? 2 : 1;
    return w;
}

/**
 * OCR 雜訊修正 — 針對 91 譜這類「|和弦」黏寫譜的常見誤認：
 *
 *   • 小節線 | → I / l / 1 / ! / [ / ]（lGmaj7 → |Gmaj7、[Bm7 → |Bm7）
 *   • 分數和弦的 / → I（CID → C/D）
 *   • 7 → ?（Bm? → Bm7）、maj 的 j → i（Cmai7 → Cmaj7）
 *   • 和弦被認成小寫（cm → Cm；但 a/am/em 等真實英文字不動）
 *
 * 安全閘門：整行修完必須「變成和弦行」且和弦數不減少才採用 —
 * 英文歌詞行（I love you）修了也變不成和弦行，會原樣保留。
 * 含 CJK 的行（歌詞）與 [INTRO] 區段標頭整行跳過。
 */

/** 容易跟真實英文單字撞名的小寫核心 — 不做大寫修正（a → A 和弦太危險） */
const LOWERCASE_BLOCKLIST = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'am', 'em']);

/** 修單一 token 的「和弦核心」；修不成合法和弦 → null */
function fixCore(core: string): string | null {
    let c = core
        .replace(/mai(?=\d)/, 'maj')   // Cmai7 → Cmaj7（j 認成 i）
        .replace(/\?$/, '7');          // Bm? → Bm7（7 認成 ?）
    // 小寫和弦 → 首字大寫（cm → Cm），但排除真實英文字
    if (/^[a-g]/.test(c) && !LOWERCASE_BLOCKLIST.has(core.toLowerCase())) {
        c = c[0].toUpperCase() + c.slice(1);
    }
    // 分數和弦的 / 認成 I/l/1：CID → C/D
    const slash = c.match(/^([A-G][#b♯♭]?)[Il1]([A-G][#b♯♭]?)$/);
    if (slash) c = `${slash[1]}/${slash[2]}`;
    if (isChordSymbol(c)) return c;
    // 連寫和弦 Em7-Dm7
    if (c.includes('-')) {
        const parts = c.split('-');
        if (parts.length > 1 && parts.every((p) => p && isChordSymbol(p))) return c;
    }
    return null;
}

/** 可能是「| 誤認」的雜訊字元（黏在和弦前後 / 獨立成 token） */
const NOISE_RUN_RE = /^[Il1!|｜\[\]]+$/;
const NOISE_PREFIX_RE = /^[Il1!|｜\[\]]+/;
const NOISE_SUFFIX_RE = /[!|｜\[\]]+$/;

function fixToken(tok: string): string {
    if (NOISE_RUN_RE.test(tok)) return '|';            // 純雜訊 run → 單一小節線
    if (/^\[.+\]$/.test(tok)) return tok;              // [A] 段落記號整顆保留
    let core = tok;
    let pre = '';
    let post = '';
    const pm = core.match(NOISE_PREFIX_RE);
    if (pm) { pre = '|'; core = core.slice(pm[0].length); }
    const sm = core.match(NOISE_SUFFIX_RE);
    if (sm) { post = '|'; core = core.slice(0, core.length - sm[0].length); }
    if (!core) return pre || post ? '|' : tok;
    const fixed = fixCore(core);
    return fixed ? pre + fixed + post : tok;
}

export function fixChordLineNoise(line: string): string {
    const trimmed = line.trim();
    if (!trimmed || /^\[.+\]\*?$/.test(trimmed) || HAS_CJK_RE.test(line)) return line;
    const fixed = line
        .split(/(\s+)/)
        .map((tok) => (!tok || /^\s+$/.test(tok) ? tok : fixToken(tok)))
        .join('');
    if (fixed === line) return line;
    // 安全閘門：修完要是和弦行、且和弦數不能變少
    if (isChordLine(fixed) && countChordTokens(fixed) >= countChordTokens(line)) return fixed;
    return line;
}

/**
 * 版面重建：把帶座標的 OCR 行還原成「空白對齊」的文字譜。
 *
 * 核心：用「半形字元寬」當欄位單位，把每個 word 放到
 * `round((x0 - originX) / charW)` 的欄位上 — 和弦行與歌詞行共用同一個
 * 原點與單位，OCR 前的視覺對齊就會映射成文字欄位對齊，
 * 接到 transpose.ts 的 transposeChordLine 後對齊還能繼續保持。
 */
export function reconstructSheet(lines: OcrLine[]): string {
    if (lines.length === 0) return '';

    // 估「半形字元寬」：取所有純 ASCII word 的 (寬/字數) 中位數；
    // 沒有 ASCII word 就用 CJK word 的一半。
    const samples: number[] = [];
    for (const line of lines) {
        for (const w of line.words) {
            const text = toHalfWidth(w.text);
            const px = w.x1 - w.x0;
            if (px <= 0 || text.length === 0) continue;
            if (!HAS_CJK_RE.test(text)) samples.push(px / text.length);
            else samples.push(px / visualWidth(text));
        }
    }
    if (samples.length === 0) return '';
    samples.sort((a, b) => a - b);
    const charW = samples[Math.floor(samples.length / 2)];
    if (!(charW > 0)) return '';

    const originX = Math.min(...lines.map((l) => (l.words.length ? Math.min(...l.words.map((w) => w.x0)) : Infinity)));

    const out: string[] = [];
    const sorted = [...lines].sort((a, b) => a.y0 - b.y0);
    for (const line of sorted) {
        const words = [...line.words].sort((a, b) => a.x0 - b.x0);
        let row = '';
        let pos = 0;
        for (const w of words) {
            const text = toHalfWidth(w.text).trim();
            if (!text) continue;
            const col = Math.round((w.x0 - originX) / charW);
            const pad = Math.max(col - pos, row ? 1 : 0);
            row += ' '.repeat(pad) + text;
            pos = col >= pos ? col + visualWidth(text) : pos + pad + visualWidth(text);
        }
        out.push(fixChordLineNoise(row.trimEnd()));
    }
    return out.join('\n');
}

// ============================================================================
// Tesseract.js 包裝（動態載入，不進主 bundle）
// ============================================================================

/** tesseract.js 的 Page.blocks 結構（最小化型別，避免 import 型別拉進 bundle） */
interface TessBlocks {
    blocks: Array<{
        paragraphs: Array<{
            lines: Array<{
                bbox: { y0: number };
                words: Array<{ text: string; bbox: { x0: number; x1: number } }>;
            }>;
        }>;
    }> | null;
}

/** tesseract Page.blocks → OcrLine[]（flatten） */
export function blocksToOcrLines(data: TessBlocks): OcrLine[] {
    const lines: OcrLine[] = [];
    for (const block of data.blocks ?? []) {
        for (const para of block.paragraphs) {
            for (const line of para.lines) {
                const words = line.words
                    .map((w) => ({ text: w.text, x0: w.bbox.x0, x1: w.bbox.x1 }))
                    .filter((w) => w.text.trim().length > 0);
                if (words.length > 0) lines.push({ y0: line.bbox.y0, words });
            }
        }
    }
    return lines;
}

// 模組級 worker 快取 — 語言檔（eng + chi_tra ~15MB）只下載一次。
// logger 是 worker 層級的，用可換的 currentProgressCb 轉發，
// 避免第二張圖的進度被第一次呼叫的閉包（可能已 unmount）吃掉。
let workerPromise: Promise<import('tesseract.js').Worker> | null = null;
let currentProgressCb: ((p: OcrProgress) => void) | null = null;

function getWorker(): Promise<import('tesseract.js').Worker> {
    if (!workerPromise) {
        workerPromise = (async () => {
            const { createWorker } = await import('tesseract.js');
            return createWorker(['eng', 'chi_tra'], 1, {
                logger: (m: { status: string; progress: number }) => {
                    if (m.status === 'recognizing text') {
                        currentProgressCb?.({ stage: 'recognize', progress: m.progress, message: `辨識中 ${Math.round(m.progress * 100)}%` });
                    } else {
                        currentProgressCb?.({ stage: 'init', progress: m.progress, message: '首次使用：下載辨識引擎與中文語言檔…' });
                    }
                },
            });
        })();
        // 建立失敗（離線等）→ 清掉快取讓下次能重試
        workerPromise.catch(() => { workerPromise = null; });
    }
    return workerPromise;
}

/**
 * 圖片 → 文字譜。
 *
 * @param image File / Blob / dataURL（拖放、上傳、剪貼簿貼上都吃）
 * @returns 重建好對齊的文字譜（直接可餵 transposeChordSheet）
 */
export async function ocrImageToSheet(
    image: File | Blob | string,
    onProgress?: (p: OcrProgress) => void,
): Promise<string> {
    currentProgressCb = onProgress ?? null;
    try {
        onProgress?.({ stage: 'init', progress: 0, message: '準備辨識引擎…' });
        const worker = await getWorker();
        const { data } = await worker.recognize(image, {}, { blocks: true, text: true });
        return reconstructSheet(blocksToOcrLines(data as unknown as TessBlocks));
    } finally {
        currentProgressCb = null;
    }
}
