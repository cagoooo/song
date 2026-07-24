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

const DASH_ONLY_RE = /^[-–—─━]+$/;

/** 和弦行拆成「單顆和弦」清單，保留每顆前面是否有小節線 | */
interface ChordUnit { bar: boolean; text: string; }
function tokenizeChordLine(chordLine: string): { units: ChordUnit[]; trailingBar: boolean } {
    const units: ChordUnit[] = [];
    let pendingBar = false;
    for (let tok of chordLine.split(/\s+/).filter(Boolean)) {
        // 純小節線 / 純破折號（原圖常用來拉開間距）→ 只記錄小節線、不佔和弦
        if (DASH_ONLY_RE.test(tok)) continue;
        // 剝掉黏在前面的小節線（|Am、｜C）
        while (tok.startsWith('|') || tok.startsWith('｜')) { pendingBar = true; tok = tok.slice(1); }
        // 剝掉黏在後面的小節線（C|）→ 留給下一顆
        let trailBar = false;
        while (tok.endsWith('|') || tok.endsWith('｜')) { trailBar = true; tok = tok.slice(0, -1); }
        if (tok && !DASH_ONLY_RE.test(tok)) {
            units.push({ bar: pendingBar, text: tok });
            pendingBar = false;
        }
        if (trailBar) pendingBar = true;
    }
    return { units, trailingBar: pendingBar };
}

/**
 * 把和弦行「逐顆對齊」到下一行歌詞的片語位置上方（跟原圖一樣）。
 *
 * 91 譜等來源的分行譜刻意讓「一顆和弦 = 一個以空白隔開的歌詞片語」，
 * 例：和弦 `C Bm7-5 E |Am Am7/G C |`、歌詞 `數到三 幸福很 簡單 太平凡 也是種 浪漫`。
 * 但 AI 辨識/規整化會把和弦全擠到行首，彈唱者對不到唱到哪換和弦。
 *
 * - 和弦數 == 片語數 → 每顆和弦對齊到對應片語的視覺起始欄位（中文字算 2 格）
 * - 數量不符（如一句長歌詞塞多顆和弦）→ 把和弦均勻分佈到整行歌詞寬度
 *
 * 回傳 null 表示不適合對齊（無和弦 / 歌詞太短），由呼叫端 fallback。
 */
function alignChordLineToLyric(chordLine: string, lyricLine: string): string | null {
    const { units, trailingBar } = tokenizeChordLine(chordLine);
    if (!units.length) return null;

    // 歌詞片語起始欄位（視覺寬度：中文字算 2）
    const anchors: number[] = [];
    let col = 0;
    let inGap = true;
    for (const ch of lyricLine) {
        const isSpace = /\s/.test(ch);
        if (!isSpace && inGap) { anchors.push(col); inGap = false; }
        if (isSpace) inGap = true;
        col += getVisualWidth(ch);
    }
    const lyricWidth = getVisualWidth(lyricLine.trimEnd());
    if (!anchors.length || lyricWidth < 8) return null;

    // 對齊目標欄位：數量相同 → 逐片語；否則 → 均勻分佈到歌詞寬度
    const targets = anchors.length === units.length
        ? anchors
        : units.map((_, i) => Math.round((i * lyricWidth) / units.length));

    let out = '';
    for (let i = 0; i < units.length; i++) {
        const token = (units[i].bar ? '|' : '') + units[i].text;
        const cur = getVisualWidth(out);
        // 小節線 | 直接落在片語起點（chord 緊接其後）；至少留 1 格避免黏連
        const pad = Math.max(out ? 1 : 0, targets[i] - cur);
        out += ' '.repeat(pad) + token;
    }
    return trailingBar ? out + ' |' : out;
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
                // 下一行是歌詞 → 把每個小節對齊到歌詞片語上方（跟原圖一樣好認）
                const nextIsLyric = nextLine.trim()
                    && !isChordLine(nextLine)
                    && !nextLine.trim().startsWith('[');
                if (nextIsLyric) {
                    const aligned = alignChordLineToLyric(line, nextLine);
                    if (aligned) {
                        optimizedLines.push(aligned);
                        continue;
                    }
                }
                // 沒歌詞可對齊（如前奏/間奏行）→ 規整化每個小節，消除多餘空格
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
