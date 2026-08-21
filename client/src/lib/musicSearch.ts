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

    // Fallback: 如果找不到明確的歌名欄位，我們從前 5 行中尋找最可能是歌名的一行
    if (!title) {
        for (let i = 0; i < Math.min(lines.length, 5); i++) {
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
            // 放寬長度限制至 25（部分歌名含英文副標如「STAY feat. The Kid」）
            if (line.length > 25) continue;
            // 排除只含符號的行
            const cleaned = cleanMusicSearchText(line);
            if (!cleaned) continue;

            title = cleaned;
            break;
        }
    }

    if (title || artist) {
        // 只有歌手名、沒有歌名時，補充歌詞短句讓搜尋更精準。
        // 例如：只有「鄭潤澤」→ 加上歌詞片段 → 「有一種愛 鄭潤澤」命中率更高。
        if (!title && artist) {
            const lyricPhrase = pickLyricSearchPhrase(text);
            if (lyricPhrase) {
                const shortPhrase = lyricPhrase.slice(0, 10).trim();
                return [shortPhrase, artist].filter(Boolean).join(' ');
            }
        }
        return [title, artist].filter(Boolean).join(' ');
    }

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
    const explicit = buildSongSearchQuery(opts.explicitTitle, opts.explicitArtist);
    if (explicit) return explicit;

    const fromAi = extractMusicSearchQueryFromAiText(opts.aiText || '');
    if (fromAi) return fromAi;

    return pickLyricSearchPhrase(opts.sheet || '');
}

/**
 * 這些不是歌手名，是歌手欄位留空時寫進資料庫的佔位字串
 * （見 firestore/songs.ts、suggestions.ts 的 `artist.trim() || '不確定'`）。
 *
 * 實機回報：〈牧羊座的浪漫〉的歌手是「不確定」，結果四個平台都拿
 * 「牧羊座的浪漫 不確定」去搜 —— iTunes 查不到、Spotify / YouTube 也被這三個
 * 字污染。這種佔位字串一律不要進搜尋關鍵字。
 */
export const PLACEHOLDER_ARTISTS = ['不確定', '多人翻唱', '經典老歌', '未知歌手'];

/** 取得可用來搜尋的歌手名 — 佔位字串一律當成「沒有歌手」 */
export function getValidArtist(artist: string | undefined | null): string {
    const a = (artist || '').trim();
    return !a || PLACEHOLDER_ARTISTS.includes(a) ? '' : a;
}

/** 由歌名 + 歌手組出搜尋關鍵字（自動濾掉佔位歌手） */
export function buildSongSearchQuery(
    title: string | undefined | null,
    artist?: string | undefined | null,
): string {
    return [(title || '').trim(), getValidArtist(artist)].filter(Boolean).join(' ');
}

/**
 * 「快速找音樂」按鈕資料 — 一鍵跳到串流平台搜尋這首歌。
 * id 同時當成 CSS class 修飾詞（.ttm-music-link.applemusic …）。
 */
export interface MusicServiceLink {
    id: 'spotify' | 'applemusic' | 'ytmusic' | 'youtube';
    label: string;
    url: string;
}

/**
 * Apple Music 的搜尋網址一定要帶 storefront（國別）。
 *
 * 踩過的雷：曾經用不帶國別的 `https://music.apple.com/search?term=…`，想說讓
 * Apple 自己依使用者帳號導到對的商店。結果 Apple 會先 302 去補上國別，
 * 而那次轉址會把 `?term=` 整個丟掉 —— 使用者按下去只會看到 Apple Music 首頁，
 * 搜尋關鍵字完全沒帶進去（實機回報）。
 *
 * 帶了國別就不會被轉址、關鍵字保得住；已登入其他地區商店的使用者，Apple 會
 * 自動把他導到自己商店的對應頁面，所以寫死 tw 不會害到海外使用者。
 */
const APPLE_MUSIC_STOREFRONT = 'tw';

/**
 * 依搜尋關鍵字組出各平台的搜尋網址。
 * 關鍵字為空 → 回傳空陣列（呼叫端據此整組不渲染）。
 *
 * 註：YouTube 額外補「歌詞」是為了優先命中有字幕的演唱影片。
 */
export function buildMusicServiceLinks(
    query: string,
    opts?: { appleMusicSongUrl?: string | null },
): MusicServiceLink[] {
    const q = query.trim();
    if (!q) return [];
    const encoded = encodeURIComponent(q);
    return [
        { id: 'spotify', label: 'Spotify', url: `https://open.spotify.com/search/${encoded}` },
        {
            id: 'applemusic',
            label: 'Apple Music',
            // 查得到確切的歌就直接開歌曲頁（iPhone 上 App 才吃得到）；
            // 查不到就退回搜尋頁，至少還是會開到 Apple Music 的搜尋畫面
            url: opts?.appleMusicSongUrl
                || `https://music.apple.com/${APPLE_MUSIC_STOREFRONT}/search?term=${encoded}`,
        },
        { id: 'ytmusic', label: 'YouTube Music', url: `https://music.youtube.com/search?q=${encoded}` },
        {
            id: 'youtube',
            label: 'YouTube',
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${q} 歌詞`)}`,
        },
    ];
}

/**
 * ── 為什麼還要多打一支 API 才能開 Apple Music ──────────────────────────
 *
 * iPhone / iPad 上，music.apple.com 的連結會被 Apple Music App 以 universal
 * link 攔截。但 App 支援的路徑只有 playlist / song / album / station /
 * profile / music-video —— `search` 不在其中。所以丟搜尋網址給它，App 會打開
 * 「搜尋」分頁卻把 `?term=` 丟掉，使用者看到的是一個空的搜尋框（實機回報）。
 * Apple 至今沒有 Spotify `spotify:search:` 那樣的搜尋 deep link。
 *
 * 解法：先用 Apple 公開的 iTunes Search API 把「歌名 歌手」換成真正的歌曲
 * 連結（album/<id>?i=<song-id>，是 App 支援的路徑），按下去就直接到那首歌。
 * 查不到、查失敗、被 CORS 擋 → 一律回 null，呼叫端自動退回搜尋網址，
 * 也就是維持現狀，不會比現在更糟。
 */
const ITUNES_SEARCH_ENDPOINT = 'https://itunes.apple.com/search';

/** 切掉歌名的版本後綴：「稻香 (Live)」→「稻香」、「借口 - Remastered」→「借口」 */
function stripTrackNameSuffix(trackName: string): string {
    const stripped = trackName
        .replace(/\s*[(（[【][^)）\]】]*[)）\]】]\s*$/g, '')
        .replace(/\s+-\s+.*$/, '')
        .trim();
    return stripped || trackName;
}

/** 比對用正規化：去大小寫、去空白與標點 */
function normalizeForMatch(text: string): string {
    return text
        .toLowerCase()
        .replace(/[\s\u3000]/g, '')
        .replace(/[!-/:-@[-`{-~？！，。、《》「」『』（）·—–…]/g, '');
}

/**
 * 這筆 iTunes 結果可信嗎？
 *
 * 關鍵字若是明確的「歌名 歌手」（最常見），歌名一定會出現在關鍵字裡 → 直接開歌曲頁。
 * 但辨識不到歌名時我們會拿歌詞片段去搜，iTunes 仍會硬回一首八竿子打不著的歌；
 * 那種情況寧可退回搜尋頁讓使用者自己挑，也不要把人直接丟到錯的歌。
 */
export function isConfidentAppleMusicMatch(
    query: string,
    trackName: string,
    artistName: string,
): boolean {
    const q = normalizeForMatch(query);
    // iTunes 的歌名常帶版本後綴（「稻香 (Live)」「借口 - Remastered」），
    // 使用者搜的是乾淨歌名，先把後綴切掉才對得起來
    const track = normalizeForMatch(stripTrackNameSuffix(trackName || ''));
    const artist = normalizeForMatch(artistName || '');
    if (!q || !track) return false;
    if (!q.includes(track)) return false;
    // 單字歌名（「瞬」「浪」）太容易誤中，要求歌手也對得上
    if (track.length < 2) return Boolean(artist) && q.includes(artist);
    return true;
}

/**
 * 用 iTunes Search API 把搜尋關鍵字換成 Apple Music 的歌曲連結。
 * 查不到 / 不夠有把握 / 網路或 CORS 失敗 → 回 null（呼叫端退回搜尋網址）。
 */
export async function lookupAppleMusicSongUrl(
    query: string,
    opts?: { signal?: AbortSignal; fallbackQuery?: string },
): Promise<string | null> {
    const primary = await lookupOnce(query, opts?.signal);
    if (primary) return primary;
    // 「歌名 歌手」查不到時，用只有歌名再試一次 —— iTunes 收錄的歌手名常和我們
    // 存的不一樣（英文團名、Feat. 標法），只用歌名反而找得到
    const fallback = (opts?.fallbackQuery || '').trim();
    if (fallback && fallback !== query.trim()) return lookupOnce(fallback, opts?.signal);
    return null;
}

async function lookupOnce(query: string, signal?: AbortSignal): Promise<string | null> {
    const q = query.trim();
    if (!q || typeof fetch !== 'function') return null;
    const url =
        `${ITUNES_SEARCH_ENDPOINT}?term=${encodeURIComponent(q)}`
        + `&country=${APPLE_MUSIC_STOREFRONT}&media=music&entity=song&limit=1`;
    try {
        const resp = await fetch(url, { signal });
        if (!resp.ok) return null;
        const data = (await resp.json()) as {
            results?: { trackViewUrl?: unknown; trackName?: unknown; artistName?: unknown }[];
        };
        const track = data?.results?.[0];
        const raw = typeof track?.trackViewUrl === 'string' ? track.trackViewUrl : '';
        // 只信任 music.apple.com 的網址 —— 回應是外部資料，不能直接塞進 href
        if (!raw.startsWith('https://music.apple.com/')) return null;
        const trackName = typeof track?.trackName === 'string' ? track.trackName : '';
        const artistName = typeof track?.artistName === 'string' ? track.artistName : '';
        if (!isConfidentAppleMusicMatch(q, trackName, artistName)) return null;
        try {
            // 去掉 Apple 帶的追蹤參數 uo，網址乾淨一點
            const parsed = new URL(raw);
            parsed.searchParams.delete('uo');
            return parsed.toString();
        } catch {
            return raw;
        }
    } catch {
        return null;
    }
}
