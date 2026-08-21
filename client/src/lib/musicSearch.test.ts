import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    cleanMusicSearchText,
    countCjk,
    stripLyricLineNumber,
    pickLyricSearchPhrase,
    extractMusicSearchQueryFromAiText,
    buildMusicSearchQuery,
    buildMusicServiceLinks,
    isConfidentAppleMusicMatch,
    lookupAppleMusicSongUrl,
} from './musicSearch';

describe('cleanMusicSearchText', () => {
    it('移除和弦、段落標記、豎線', () => {
        expect(cleanMusicSearchText('[前奏] |Gmaj7 A7 D|')).toBe('');
    });
    it('保留中文歌詞', () => {
        expect(cleanMusicSearchText('明明是春天我卻感到絕望')).toBe('明明是春天我卻感到絕望');
    });
    it('移除網址', () => {
        expect(cleanMusicSearchText('https://open.spotify.com/x 你好世界嗎')).toBe('你好世界嗎');
    });
});

describe('countCjk', () => {
    it('數中文字', () => {
        expect(countCjk('明明是春天')).toBe(5);
    });
    it('忽略英數標點', () => {
        expect(countCjk('X2 abc 123')).toBe(0);
    });
});

describe('stripLyricLineNumber', () => {
    it('去掉「1. 」', () => {
        expect(stripLyricLineNumber('1. 明明是春天')).toBe('明明是春天');
    });
    it('去掉「2、」', () => {
        expect(stripLyricLineNumber('2、你走了以後')).toBe('你走了以後');
    });
    it('不誤刪歌詞中的數字', () => {
        expect(stripLyricLineNumber('365 days')).toBe('365 days');
    });
});

describe('pickLyricSearchPhrase — 回歸：別把演奏標記當歌名', () => {
    // 截圖回報的真實案例：前奏行 `[前奏] D D/F# |G A X2 |等2拍`
    // 去掉和弦後剩 `X2 等2拍`，舊版誤當歌名搜尋 → 搜到牛頭不對馬嘴
    const SHEET = `[前奏] D D/F# |G A X2 |等2拍
|Gmaj7 A7 D |Gmaj7 Asus4 D
1. 明明是春天我卻感到絕望  夏天來臨了我還是看不見陽光
2. 你走了以後日子是否無恙  是不是有誰代替我陪在你身旁
|Gmaj7 A7 D |Gmaj7 Asus4 D
1. 秋天的落葉將往事都埋藏  準備好冬天將你的一切遺忘`;

    it('不會回傳演奏標記 X2 / 等2拍', () => {
        const q = pickLyricSearchPhrase(SHEET);
        expect(q).not.toContain('X2');
        expect(q).not.toContain('等2拍');
    });

    it('挑出真正的歌詞句', () => {
        const q = pickLyricSearchPhrase(SHEET);
        expect(q).toContain('明明是春天我卻感到絕望');
    });

    it('去掉行首編號', () => {
        const q = pickLyricSearchPhrase(SHEET);
        expect(q.startsWith('1')).toBe(false);
        expect(q.startsWith('明明')).toBe(true);
    });

    it('純和弦譜回傳空字串', () => {
        expect(pickLyricSearchPhrase('[INTRO]\n|C G Am F|\n|C G F C|')).toBe('');
    });

    it('擋掉只有「等2拍」這種短標記', () => {
        expect(pickLyricSearchPhrase('等2拍\nX4 反覆')).toBe('');
    });
});

describe('extractMusicSearchQueryFromAiText — 結構化欄位優先', () => {
    it('讀歌名 + 歌手欄位', () => {
        const ai = `歌名：應該\n歌手：王菲\n[前奏] X2 等2拍\n明明是春天`;
        expect(extractMusicSearchQueryFromAiText(ai)).toBe('應該 王菲');
    });

    it('沒有欄位時退回挑歌詞句', () => {
        const ai = `[前奏] D X2 等2拍\n明明是春天我卻感到絕望`;
        expect(extractMusicSearchQueryFromAiText(ai)).toContain('明明是春天');
    });

    it('只有演唱欄位無歌名且有歌詞行時，應組合歌詞短句 + 歌手', () => {
        // 模擬「瞬」這首歌的 AI 辨識結果（截圖沒有標題行，只有演唱欄位）
        const ai = `演唱：鄭潤澤\n詞：鄭潤澤 曲：鄭潤澤\n[前奏]|C |Cm |\n不知道是否有一種愛 可以讓我留下來`;
        const q = extractMusicSearchQueryFromAiText(ai);
        // 結果應含歌手名
        expect(q).toContain('鄭潤澤');
        // 結果不應只是歌手名（應有歌詞輔助關鍵字）
        expect(q.length).toBeGreaterThan('鄭潤澤'.length + 1);
    });

    it('只有演唱欄位且整份是純和弦譜（無歌詞）時，至少輸出歌手名', () => {
        const ai = `演唱：萬芳\n[前奏]|C |Am |F |G |\n[主歌]|C |Am |F |G |`;
        const q = extractMusicSearchQueryFromAiText(ai);
        expect(q).toContain('萬芳');
    });
});

describe('buildMusicSearchQuery — 優先序', () => {
    it('使用者明確填的歌名歌手最優先', () => {
        const q = buildMusicSearchQuery({
            explicitTitle: '稻香',
            explicitArtist: '周杰倫',
            aiText: '歌名：別的歌',
            sheet: '明明是春天',
        });
        expect(q).toBe('稻香 周杰倫');
    });

    it('沒有明確欄位時用 AI 結構化欄位', () => {
        const q = buildMusicSearchQuery({ aiText: '歌名：應該\n歌手：王菲' });
        expect(q).toBe('應該 王菲');
    });

    it('都沒有時退回譜面歌詞句', () => {
        const q = buildMusicSearchQuery({ sheet: '[前奏] X2 等2拍\n明明是春天我卻感到絕望' });
        expect(q).toContain('明明是春天');
    });
});

describe('buildMusicServiceLinks — 快速找音樂按鈕', () => {
    it('四個平台都在，且順序固定（Spotify → Apple Music → YouTube Music → YouTube）', () => {
        const links = buildMusicServiceLinks('稻香 周杰倫');
        expect(links.map((l) => l.id)).toEqual(['spotify', 'applemusic', 'ytmusic', 'youtube']);
        expect(links.map((l) => l.label)).toEqual(['Spotify', 'Apple Music', 'YouTube Music', 'YouTube']);
    });

    // 回歸：不帶國別的 https://music.apple.com/search?term=… 會被 Apple 302 去補國別，
    // 而那次轉址把 ?term= 丟掉，使用者只會看到 Apple Music 首頁、沒有搜尋結果（實機回報）
    it('Apple Music 一定要帶 storefront 國別，關鍵字才不會在轉址時被丟掉', () => {
        const apple = buildMusicServiceLinks('稻香 周杰倫').find((l) => l.id === 'applemusic');
        expect(apple?.url).toBe(`https://music.apple.com/tw/search?term=${encodeURIComponent('稻香 周杰倫')}`);
        // 路徑上必須有兩碼國別，不能退回 music.apple.com/search
        expect(apple?.url).toMatch(/^https:\/\/music\.apple\.com\/[a-z]{2}\/search\?term=/);
    });

    it('其他三個平台的網址維持原本行為（YouTube 仍補「歌詞」）', () => {
        const links = buildMusicServiceLinks('稻香 周杰倫');
        const url = (id: string) => links.find((l) => l.id === id)?.url ?? '';
        const q = encodeURIComponent('稻香 周杰倫');
        expect(url('spotify')).toBe(`https://open.spotify.com/search/${q}`);
        expect(url('ytmusic')).toBe(`https://music.youtube.com/search?q=${q}`);
        expect(url('youtube')).toBe(
            `https://www.youtube.com/results?search_query=${encodeURIComponent('稻香 周杰倫 歌詞')}`,
        );
    });

    it('關鍵字為空或只有空白時整組不渲染', () => {
        expect(buildMusicServiceLinks('')).toEqual([]);
        expect(buildMusicServiceLinks('   ')).toEqual([]);
    });

    it('會先修掉關鍵字頭尾空白再編碼', () => {
        const apple = buildMusicServiceLinks('  應該 王菲  ').find((l) => l.id === 'applemusic');
        expect(apple?.url).toBe(`https://music.apple.com/tw/search?term=${encodeURIComponent('應該 王菲')}`);
    });

    it('特殊字元（&、#）不會破壞網址', () => {
        const links = buildMusicServiceLinks('R&B #1');
        for (const link of links) {
            expect(link.url).not.toContain('&B');
            expect(link.url).not.toContain('#1');
        }
    });

    it('串接辨識結果：AI 文字 → 關鍵字 → 四個平台網址', () => {
        const query = buildMusicSearchQuery({ aiText: '歌名：應該\n歌手：王菲' });
        const apple = buildMusicServiceLinks(query).find((l) => l.id === 'applemusic');
        expect(apple?.url).toContain(encodeURIComponent('應該 王菲'));
    });

    it('每個平台的網址都真的把關鍵字帶進 query，不會只剩首頁', () => {
        const links = buildMusicServiceLinks('稻香 周杰倫');
        for (const link of links) {
            const url = new URL(link.url);
            const carriesQuery =
                url.search.length > 1 || url.pathname.replace(/^\/+|\/+$/g, '').split('/').length > 1;
            expect(carriesQuery, `${link.label} 的網址沒帶關鍵字：${link.url}`).toBe(true);
            expect(decodeURIComponent(link.url)).toContain('稻香');
        }
    });
});

describe('buildMusicServiceLinks — 帶入查好的 Apple Music 歌曲連結', () => {
    const SONG_URL = 'https://music.apple.com/tw/album/%E7%A8%BB%E9%A6%99/123?i=456';

    it('有查到歌曲連結時，Apple Music 直接指向那首歌', () => {
        const apple = buildMusicServiceLinks('稻香 周杰倫', { appleMusicSongUrl: SONG_URL })
            .find((l) => l.id === 'applemusic');
        expect(apple?.url).toBe(SONG_URL);
    });

    it('沒查到（null）時退回搜尋網址，不會比現在更糟', () => {
        const apple = buildMusicServiceLinks('稻香 周杰倫', { appleMusicSongUrl: null })
            .find((l) => l.id === 'applemusic');
        expect(apple?.url).toBe(`https://music.apple.com/tw/search?term=${encodeURIComponent('稻香 周杰倫')}`);
    });

    it('歌曲連結不影響其他三個平台', () => {
        const links = buildMusicServiceLinks('稻香 周杰倫', { appleMusicSongUrl: SONG_URL });
        expect(links.find((l) => l.id === 'spotify')?.url).toContain('open.spotify.com');
        expect(links.find((l) => l.id === 'ytmusic')?.url).toContain('music.youtube.com');
        expect(links.find((l) => l.id === 'youtube')?.url).toContain('youtube.com/results');
    });
});

describe('isConfidentAppleMusicMatch — 寧可退回搜尋頁也別開到錯的歌', () => {
    it('明確的「歌名 歌手」→ 有把握', () => {
        expect(isConfidentAppleMusicMatch('稻香 周杰倫', '稻香', '周杰倫')).toBe(true);
    });

    it('iTunes 歌名帶版本後綴時，切掉後綴仍對得起來', () => {
        expect(isConfidentAppleMusicMatch('稻香 周杰倫', '稻香 (Live)', '周杰倫')).toBe(true);
        expect(isConfidentAppleMusicMatch('借口 周杰倫', '借口 - Remastered', '周杰倫')).toBe(true);
        expect(isConfidentAppleMusicMatch('稻香 周杰倫', '稻香【純音樂版】', '周杰倫')).toBe(true);
    });

    it('歌手名用英文譯名不影響判斷（歌名對上就算數）', () => {
        expect(isConfidentAppleMusicMatch('稻香 周杰倫', '稻香', 'Jay Chou')).toBe(true);
    });

    it('切完後綴變空字串時不會誤判成對上', () => {
        expect(isConfidentAppleMusicMatch('稻香 周杰倫', '(Live)', '周杰倫')).toBe(false);
    });

    it('拿歌詞片段去搜、iTunes 硬回一首不相干的歌 → 沒把握，退回搜尋頁', () => {
        expect(isConfidentAppleMusicMatch('明明是春天我卻感到絕望', '不是這首', '某某人')).toBe(false);
    });

    it('單字歌名太容易誤中，要求歌手也對得上', () => {
        expect(isConfidentAppleMusicMatch('瞬 鄭潤澤', '瞬', '鄭潤澤')).toBe(true);
        expect(isConfidentAppleMusicMatch('瞬 鄭潤澤', '瞬', '別人')).toBe(false);
    });

    it('空值一律沒把握', () => {
        expect(isConfidentAppleMusicMatch('', '稻香', '周杰倫')).toBe(false);
        expect(isConfidentAppleMusicMatch('稻香 周杰倫', '', '')).toBe(false);
    });
});

describe('lookupAppleMusicSongUrl — 失敗時一律回 null 讓呼叫端退回搜尋頁', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const stubFetch = (impl: () => unknown) => vi.stubGlobal('fetch', vi.fn(impl));
    const okJson = (body: unknown) => ({ ok: true, json: async () => body });

    it('查到且有把握 → 回歌曲連結，並清掉 Apple 的追蹤參數 uo', async () => {
        stubFetch(() => okJson({
            results: [{
                trackViewUrl: 'https://music.apple.com/tw/album/x/123?i=456&uo=4',
                trackName: '稻香',
                artistName: '周杰倫',
            }],
        }));
        const url = await lookupAppleMusicSongUrl('稻香 周杰倫');
        expect(url).toBe('https://music.apple.com/tw/album/x/123?i=456');
    });

    it('打去的網址帶了 storefront 與 entity=song', async () => {
        const spy = vi.fn(() => okJson({ results: [] }));
        vi.stubGlobal('fetch', spy);
        await lookupAppleMusicSongUrl('稻香 周杰倫');
        const called = String(spy.mock.calls[0][0]);
        expect(called).toContain('itunes.apple.com/search');
        expect(called).toContain('country=tw');
        expect(called).toContain('entity=song');
        expect(called).toContain(encodeURIComponent('稻香 周杰倫'));
    });

    it('沒有結果 → null', async () => {
        stubFetch(() => okJson({ results: [] }));
        expect(await lookupAppleMusicSongUrl('稻香 周杰倫')).toBeNull();
    });

    it('回傳的網址不是 music.apple.com → 不採信（外部資料不能直接塞進 href）', async () => {
        stubFetch(() => okJson({
            results: [{ trackViewUrl: 'javascript:alert(1)', trackName: '稻香', artistName: '周杰倫' }],
        }));
        expect(await lookupAppleMusicSongUrl('稻香 周杰倫')).toBeNull();
    });

    it('比對沒把握 → null', async () => {
        stubFetch(() => okJson({
            results: [{
                trackViewUrl: 'https://music.apple.com/tw/album/x/1?i=2',
                trackName: '完全不相干的歌',
                artistName: '路人',
            }],
        }));
        expect(await lookupAppleMusicSongUrl('明明是春天我卻感到絕望')).toBeNull();
    });

    it('HTTP 非 2xx → null', async () => {
        stubFetch(() => ({ ok: false, json: async () => ({}) }));
        expect(await lookupAppleMusicSongUrl('稻香 周杰倫')).toBeNull();
    });

    it('fetch 直接爆掉（離線 / CORS 被擋）→ null，不會往外丟例外', async () => {
        stubFetch(() => { throw new TypeError('Failed to fetch'); });
        await expect(lookupAppleMusicSongUrl('稻香 周杰倫')).resolves.toBeNull();
    });

    it('關鍵字為空 → 連打都不打', async () => {
        const spy = vi.fn(() => okJson({ results: [] }));
        vi.stubGlobal('fetch', spy);
        expect(await lookupAppleMusicSongUrl('   ')).toBeNull();
        expect(spy).not.toHaveBeenCalled();
    });
});
