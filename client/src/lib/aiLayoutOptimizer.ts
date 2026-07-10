import { isChordLine } from './transpose';

/**
 * 計算字串的視覺寬度（中文字/全形字算 2，其他算 1）
 */
export function getVisualWidth(str: string): number {
    let width = 0;
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (
            (code >= 0x4e00 && code <= 0x9fff) || // CJK 統一漢字
            (code >= 0x3000 && code <= 0x303f) || // CJK 符號和標點
            (code >= 0xff00 && code <= 0xffef)    // 半形/全形形式
        ) {
            width += 2;
        } else {
            width += 1;
        }
    }
    return width;
}

/**
 * 判斷和弦行是否「已格式化」：含有 | 分隔符的和弦行已有正確的小節結構。
 */
function isFormattedChordLine(line: string): boolean {
    return /[|｜]/.test(line);
}

/**
 * 規整化含有 | 小節分隔符的和弦行：
 * - 把多餘空格（3+ 個）壓縮，讓 | 符號之間維持適度間距
 * - 重新格式化成「|chord |chord2 |」的標準格式
 * - 這樣在等寬字型下每小節和弦距離適中，不會超寬
 */
function normalizeBarChordLine(line: string): string {
    // 分割成小節（以 | 或 ｜ 分隔）
    // 例：「|G         |Bm7 Em7 |A7  D  |G |」→ ['', 'G', 'Bm7 Em7', 'A7  D', 'G ', '']
    const BAR_SEP = /[|｜]/;
    const parts = line.split(BAR_SEP);

    if (parts.length < 2) {
        // 沒有實際分隔到多個小節，只壓縮多餘空格
        return line.replace(/ {3,}/g, ' ').trimEnd();
    }

    // 每個部分（小節內容）做清理：
    // 1. 去頭尾空白
    // 2. 把多個連續空格壓縮成單一空格
    const cleanedParts = parts.map(p => p.replace(/ {2,}/g, ' ').trim());

    // 重組：|part1 |part2 |part3 ...
    // 第一個 part 通常是空字串（行首就是 |），或是段落標記（如「[前奏]」）
    const result: string[] = [];
    for (let i = 0; i < cleanedParts.length; i++) {
        const p = cleanedParts[i];
        if (i === 0) {
            // 行首：如有內容（如段落標記 [前奏]）則保留
            if (p) result.push(p + ' ');
        } else if (i === cleanedParts.length - 1) {
            // 行尾：如有內容則加上尾部 |
            if (p) result.push('|' + p + ' |');
            else result.push('|');
        } else {
            // 中間小節
            if (p) result.push('|' + p + ' ');
            else result.push('|');
        }
    }

    return result.join('').trimEnd();
}

/**
 * 自動將 AI 辨識出來的和弦譜做排版優化：
 *
 * 策略分兩類：
 * 1. 含 | 分隔符的和弦行（已有小節結構）→ 「規整化」：
 *    每個小節重新格式化成「|chord 」的緊湊格式，消除多餘空格帶來的超大間距。
 * 2. 沒有 | 且被壓縮在一起的和弦行 → 均勻分佈到下方歌詞的寬度（舊邏輯保留）。
 *
 * 這樣能避免「|G      |Bm7 Em7」中間出現超大空隙的問題。
 */
export function optimizeAiLayout(text: string): string {
    if (!text) return text;
    const lines = text.split('\n');
    const optimizedLines: string[] = [];

    for (let l = 0; l < lines.length; l++) {
        const line = lines[l];
        const nextLine = lines[l + 1] || '';

        // 判定當前行是否為和弦行
        if (isChordLine(line)) {
            if (isFormattedChordLine(line)) {
                // ── 策略 1：已含 | 的和弦行 ──
                // 規整化每個小節，消除多餘空格，不做均勻展開
                optimizedLines.push(normalizeBarChordLine(line));
                continue;
            }

            // ── 策略 2：無 | 的壓縮和弦行 ──
            // 與下一行歌詞行配對，把 token 均勻分佈到歌詞行寬度
            if (nextLine.trim() && !isChordLine(nextLine)) {
                const nextWidth = getVisualWidth(nextLine);
                const lineLen = getVisualWidth(line);

                // 確認確實是被壓縮的（沒有連續 3 個空格，且長度明顯小於下方歌詞）
                const isCompressed = !/\s{3,}/.test(line) && lineLen < nextWidth * 0.8;

                if (isCompressed) {
                    const tokens = line.trim().split(/\s+/).filter(Boolean);
                    if (tokens.length > 1) {
                        const W = nextWidth;
                        const grid = Array(W).fill(' ');
                        const occupied = Array(W).fill(false);

                        for (let i = 0; i < tokens.length; i++) {
                            const tok = tokens[i];
                            const tokLen = getVisualWidth(tok);

                            let targetPos = 0;
                            if (tokens.length > 1) {
                                targetPos = Math.round((W - tokLen) / (tokens.length - 1) * i);
                            }

                            let start = Math.max(0, Math.min(targetPos, W - tokLen));
                            while (start < W && occupied.slice(start, start + tokLen).some(x => x)) {
                                start++;
                            }
                            if (start + tokLen > W) {
                                start = Math.max(0, Math.min(targetPos, W - tokLen));
                                while (start >= 0 && occupied.slice(start, start + tokLen).some(x => x)) {
                                    start--;
                                }
                            }

                            const finalStart = (start >= 0 && start + tokLen <= W)
                                ? start
                                : Math.max(0, W - tokLen);

                            let currentIdx = finalStart;
                            for (let c = 0; c < tok.length; c++) {
                                const char = tok[c];
                                const charCode = char.charCodeAt(0);
                                const charW = (
                                    (charCode >= 0x4e00 && charCode <= 0x9fff) ||
                                    (charCode >= 0x3000 && charCode <= 0x303f) ||
                                    (charCode >= 0xff00 && charCode <= 0xffef)
                                ) ? 2 : 1;

                                if (currentIdx < W) {
                                    grid[currentIdx] = char;
                                    occupied[currentIdx] = true;
                                    if (charW === 2 && currentIdx + 1 < W) {
                                        grid[currentIdx + 1] = '';
                                        occupied[currentIdx + 1] = true;
                                    }
                                }
                                currentIdx += charW;
                            }
                        }

                        optimizedLines.push(grid.join('').trimEnd());
                        continue;
                    }
                }
            }
        }

        // 其他行（歌詞行、空行、標題行）：原樣輸出
        optimizedLines.push(line);
    }

    return optimizedLines.join('\n');
}
