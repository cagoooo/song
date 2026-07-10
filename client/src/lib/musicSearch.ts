/**
 * musicSearch.ts — 從和弦譜 / AI 辨識結果產生「搜尋音樂」關鍵字
 *
 * 為什麼需要這支：和弦譜裡混雜了和弦（D、Gmaj7）、段落標記（[前奏]）、
 * 演奏標記（X2 重複、等2拍）等「不是歌詞」的東西。早期版本只挑「第一個夠長
 * 且非純和弦」的行，結果把前奏行 `[前奏] D D/F# |G A X2 |等2拍` 去掉和弦後剩下
 * 的 `X2 等2拍` 當成歌名拿去搜尋，搜到牛頭不對馬嘴的歌。
 *
 * 改良策略：
 *   1. AI 有結構化「歌名 / 歌手」欄位 → 直接用（最準）。
 *   2. 否則逐行評分，挑「最像歌詞」的一句：去行首編號、去和弦、跳過段落標記與
 *      演奏標記，再用中文字密度評分，取分數最高那行的第一個樂句。
 */

/** 清掉網址、和弦、段落標記、標點，只留歌詞 / 歌名可用的字 */
export function cleanMusicSearchText(text: string): string {
    return text
        .replace(/https?:\/\/\S+/gi, ' ')
        .replace(/\b(?:www\.)?\w+\.(?:com|tw|net|org)\b/gi, ' ')
        .replace(/\[[^\]]+\]/g, ' ')
        .replace(/[｜|]+/g, ' ')
        .replace(/\b[A-G](?:#|b)?(?:maj|min|m|dim|aug|sus|add)?\d*(?:\/[A-G](?:#|b)?)?\b/gi, ' ')
        .replace(/[^\w\s　㐀-鿿，。！？、-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** 計算中日韓字數 — 歌詞密度指標（越高越像歌詞，越不像和弦 / 演奏標記） */
export function countCjk(text: string): number {
    const matches = text.match(/[぀-ヿ㐀-鿿가-힯]/g);
    return matches ? matches.length : 0;
}

/** 去掉行首歌詞編號：「1. 」「2、」「（3）」「１．」「1 」(後接中文) 等 */
export function stripLyricLineNumber(text: string): string {
    return text
        .replace(/^\s*[（(]?\s*[0-9０-９]{1,2}\s*[)）.、．:：]\s*/, '')
        .replace(/^\s*[0-9０-９]{1,2}\s+(?=[㐀-鿿])/, '');
}

/** 段落標記（前奏 / 副歌 / Verse…）— 不是歌詞 */
const SECTION_LABEL_RE =
    /^(?:intro|verse|chorus|bridge|outro|solo|pre-?chorus|interlude|hook|前奏|主歌|副歌|間奏|尾奏|導歌|橋段|過門|和聲|口白)\s*\d*$/i;

/** 演奏標記（X2 重複、等N拍、反覆、Capo…）— 是演奏指示不是歌詞，絕不能拿去搜尋 */
const PERFORMANCE_NOISE_RE =
    /(?:^|\s)(?:[xX×*]\s?\d+|\d+\s?[xX×]|等\s*\d+\s*(?:拍|小節|下)|重複|反覆|repeat|rit\.?|fine|d\.?[cs]\.?|coda|capo|變調夾|slow(?:ly)?|fast)(?:\s|$)/i;

/**
 * 從整份譜挑出「最像歌詞」的一句當搜尋關鍵字。
 * 回傳空字串代表整份譜找不到可用歌詞（例如純和弦譜）。
 */
export function pickLyricSearchPhrase(text: string): string {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    let best = '';
    let bestScore = 0;
    for (const raw of lines) {
        if (SECTION_LABEL_RE.test(raw)) continue;
        const noNum = stripLyricLineNumber(raw);
        // 和弦譜常以多個空白分隔樂句；去和弦前先切第一句，保留樂句邊界更精準
        const firstSeg = noNum.split(/\s{2,}|　{2,}/)[0] || noNum;
        const cleaned = cleanMusicSearchText(firstSeg);
        if (!cleaned || PERFORMANCE_NOISE_RE.test(cleaned)) continue;
        const cjk = countCjk(cleaned);
        const latinWords = (cleaned.match(/[A-Za-z]{2,}/g) || []).length;
        // 至少 4 個中文字、或 3 個英文單字，才算一句歌詞（擋掉 "X2 等2拍" 這種雜訊）
        if (cjk < 4 && latinWords < 3) continue;
        const score = cjk * 2 + latinWords;
        if (score > bestScore) {
            bestScore = score;
            best = cleaned;
        }
    }
    return best ? best.slice(0, 28).trim() : '';
}

/**
 * 從 AI 辨識文字產生搜尋關鍵字：
 * 優先讀「歌名 / 歌手」結構化欄位，沒有就退回挑歌詞句。
 */
export function extractMusicSearchQueryFromAiText(text: string): string {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const readField = (patterns: RegExp[]) => {
        for (const line of lines) {
            for (const pattern of patterns) {
                const match = line.match(pattern);
                const value = cleanMusicSearchText(match?.[1] ?? '');
                if (value && value.length <= 60) return value;
            }
        }
        return '';
    };
    let title = readField([
        /(?:歌名|歌曲名稱|曲名|title)\s*[：:]\s*(.+)$/i,
        /(?:^|\s)(?:歌名|曲名)\s+(.+)$/i,
    ]);
    const artist = readField([
        /(?:歌手|演唱|原唱|artist|singer)\s*[：:]\s*(.+)$/i,
        /(?:^|\s)(?:歌手|演唱|原唱)\s+(.+)$/i,
    ]);

    // Fallback: 如果找不到明確的歌名欄位，我們從前 3 行中尋找最可能是歌名的一行
    if (!title) {
        for (let i = 0; i < Math.min(lines.length, 3); i++) {
            const line = lines[i].trim();
            if (!line) continue;
            // 排除含有冒號的行（代表是欄位，如 歌手：萬芳、編配者：xxx）
            if (line.includes(':') || line.includes('：')) continue;
            // 排除段落標記與包含段落指示的行
            if (SECTION_LABEL_RE.test(line)) continue;
            if (/(?:前奏|間奏|尾奏|主歌|副歌|過門|口白|intro|outro|solo|bridge|verse|chorus)/i.test(line)) continue;
            // 排除包含演奏標記的行（如 X2 等2拍）
            if (PERFORMANCE_NOISE_RE.test(line)) continue;
            
            // 排除和弦行：如果一行裡含有多個 A-G 字母，且沒有任何中文字
            const hasCjk = /[一-鿿぀-ヿ가-힯]/.test(line);
            const hasChordLetters = /[A-G]/.test(line);
            if (hasChordLetters && !hasCjk) continue;
            // 排除內聯和弦行：如果一行裡包含中括號且括號內有 A-G
            if (/\[[A-G][#b♯♭]?[^\]]*\]/.test(line)) continue;
            // 排除長度過長的行
            if (line.length > 20) continue;
            // 排除只含符號的行
            const cleaned = cleanMusicSearchText(line);
            if (!cleaned) continue;

            title = cleaned;
            break;
        }
    }

    if (title || artist) return [title, artist].filter(Boolean).join(' ');

    return pickLyricSearchPhrase(text);
}

/**
 * 主要入口：給定使用者明確填的歌名 / 歌手、AI 辨識文字、譜面內容，
 * 回傳最適合的搜尋關鍵字（明確欄位 > AI 結構化欄位 > 歌詞句）。
 */
export function buildMusicSearchQuery(opts: {
    explicitTitle?: string;
    explicitArtist?: string;
    aiText?: string;
    sheet?: string;
}): string {
    const explicit = [opts.explicitTitle?.trim(), opts.explicitArtist?.trim()]
        .filter(Boolean)
        .join(' ');
    if (explicit) return explicit;

    const fromAi = extractMusicSearchQueryFromAiText(opts.aiText || '');
    if (fromAi) return fromAi;

    return pickLyricSearchPhrase(opts.sheet || '');
}
