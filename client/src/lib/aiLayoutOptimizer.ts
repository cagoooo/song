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
 * 自動將 AI 辨識出來、被壓縮在行首的和弦行，均勻分散對齊到下方的歌詞行上方。
 */
export function optimizeAiLayout(text: string): string {
    if (!text) return text;
    const lines = text.split('\n');
    const optimizedLines: string[] = [];

    for (let l = 0; l < lines.length; l++) {
        const line = lines[l];
        const nextLine = lines[l + 1] || '';

        // 判定當前行是否為和弦行，且下一行是歌詞行（且不為空且不是和弦行）
        if (isChordLine(line) && nextLine.trim() && !isChordLine(nextLine)) {
            const nextWidth = getVisualWidth(nextLine);
            const lineLen = getVisualWidth(line);
            
            // 檢查是否被壓縮：沒有連續 3 個或以上的空格，且總長度小於下一行歌詞視覺長度的 80%
            const isCompressed = !/\s{3,}/.test(line) && lineLen < nextWidth * 0.8;

            if (isCompressed) {
                // 1. 提取所有非空格 Token
                const tokens = line.trim().split(/\s+/).filter(Boolean);
                if (tokens.length > 0) {
                    const W = nextWidth;
                    const grid = Array(W).fill(' ');
                    const occupied = Array(W).fill(false);

                    // 2. 均勻分佈擺放每個 Token
                    for (let i = 0; i < tokens.length; i++) {
                        const tok = tokens[i];
                        const tokLen = getVisualWidth(tok);
                        
                        // 計算目標視覺起始位置
                        let targetPos = 0;
                        if (tokens.length > 1) {
                            targetPos = Math.round((W - tokLen) / (tokens.length - 1) * i);
                        }
                        
                        // 防重疊與防越界：尋找可寫入的起始位置
                        let start = Math.max(0, Math.min(targetPos, W - tokLen));
                        // 如果該位置已經被佔用，往右尋找空位
                        while (start < W && occupied.slice(start, start + tokLen).some(x => x)) {
                            start++;
                        }
                        // 如果往右找不到空位，往左尋找空位
                        if (start + tokLen > W) {
                            start = Math.max(0, Math.min(targetPos, W - tokLen));
                            while (start >= 0 && occupied.slice(start, start + tokLen).some(x => x)) {
                                start--;
                            }
                        }

                        // 如果還是找不到完全空閒的空間，就強行寫入在 targetPos
                        const finalStart = (start >= 0 && start + tokLen <= W) ? start : Math.max(0, W - tokLen);

                        // 寫入網格
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
                                    grid[currentIdx + 1] = ''; // CJK 佔用兩格，第二格放空字串
                                    occupied[currentIdx + 1] = true;
                                }
                            }
                            currentIdx += charW;
                        }
                    }

                    // 3. 重組該行
                    optimizedLines.push(grid.join('').trimEnd());
                    continue;
                }
            }
        }

        // 不需要優化，則原樣輸出
        optimizedLines.push(line);
    }

    return optimizedLines.join('\n');
}
