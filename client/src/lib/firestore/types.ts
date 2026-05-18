/**
 * 歌詞區塊段別 — 用在結構化歌詞 `lyricBlocks`
 *
 * INTRO / OUTRO 通常只放和弦行，沒 line。
 * VERSE 1-3 / CHORUS / BRIDGE 主歌副歌。
 */
export type LyricSection = 'INTRO' | 'VERSE 1' | 'VERSE 2' | 'VERSE 3' | 'CHORUS' | 'BRIDGE' | 'OUTRO';

/**
 * 歌詞單行 — 一個和弦行 + 對應歌詞
 *
 * - `chord` 可省（INTRO/OUTRO 只有和弦無歌詞時 line 留空）
 * - `line` 可省（純和弦行）
 * - `startMs` 為 LRC 同步預留欄位（v6 C1 會用到）
 */
export interface LyricRow {
    chord?: string;
    line?: string;
    /** 此句開始的 ms（LRC 同步用，T3 不填，C1 LRC 才用） */
    startMs?: number;
}

export interface LyricBlock {
    sec: LyricSection;
    /** 是否為副歌 — UI 上會強調顯示 */
    chorus?: boolean;
    rows: LyricRow[];
}

export interface Song {
    id: string;
    title: string;
    artist: string;
    notes?: string;
    /** @deprecated 改用 lyricBlocks（結構化）。舊資料保留作為 fallback。 */
    lyrics?: string;
    audioUrl?: string;
    isActive: boolean;
    createdAt: Date;
    voteCount: number;
    isPlayed?: boolean;
    isNowPlaying?: boolean;
    /** 演奏難度: 1=入門 ⭐ / 2=中等 ⭐⭐ / 3=進階 ⭐⭐⭐ */
    difficulty?: 1 | 2 | 3;

    // ===== 🆕 T3 樂譜欄位 =====

    /** 音調，例：C / G / Am（避用 `key` 因 React reserved） */
    songKey?: string;
    /** Capo 位置：0 = 不夾 / 1-12 */
    capo?: number;
    /** BPM 拍速（30-250 合理範圍） */
    bpm?: number;
    /** 歌曲長度，格式 `MM:SS` */
    length?: string;
    /** 和弦進行：例 `["C", "G", "Am", "F"]` */
    progression?: string[];
    /** 結構化歌詞區塊（取代純文字 lyrics，向後相容） */
    lyricBlocks?: LyricBlock[];
    /** YouTube ID（給 SongDetail thumbnail / 預覽） */
    youtubeId?: string;
    /** 阿凱主理人筆記（單行短句） */
    kaiNote?: string;

    // ===== 🆕 D5 結構化標記欄位 =====

    /** 版本：原曲 / 不插電 / remix / 阿凱改編 */
    version?: SongVersion;
    /** 情緒：熱血 / 抒情 / 療癒 / 懷舊 / 嗨歌 / 慢歌 */
    mood?: SongMood;
    /** 年代 */
    era?: SongEra;
    /** 曲風（取代雜亂 tags 的結構化版本） */
    genre?: SongGenre;
}

// ============================================================================
// 結構化標記（D5）
// ============================================================================
// 設計文件：docs/design/D5-song-mood-tags.md
//
// 取代既有自由文字 `tags: string[]`（保留向後相容）的結構化標記。
// 4 個維度都選填，admin 後台可隨時補 — 為 C4 AI 推薦 + StatsDashboard
// 情緒雷達圖鋪路。

export type SongVersion = 'original' | 'acoustic' | 'remix' | 'kai-cover';
export type SongMood = 'energetic' | 'tender' | 'healing' | 'nostalgic' | 'hype' | 'slow';
export type SongEra = '80s' | '90s' | '00s' | '10s' | '20s';
export type SongGenre = 'pop' | 'rock' | 'folk' | 'rnb' | 'indie' | 'classic' | 'mandopop' | 'jpop' | 'kpop';

export interface DimensionMeta<TKey extends string> {
    /** enum key（寫入 Firestore 用） */
    key: TKey;
    /** 中文 label（UI 顯示） */
    label: string;
    /** Emoji 圖示（UI 顯示） */
    emoji?: string;
    /** 雜誌風 hex 顏色（StatsDashboard 雷達圖用） */
    color?: string;
}

export const MOOD_META: Readonly<Record<SongMood, DimensionMeta<SongMood>>> = Object.freeze({
    energetic: { key: 'energetic', label: '熱血', emoji: '🔥', color: '#dc2626' },
    tender:    { key: 'tender',    label: '抒情', emoji: '🌙', color: '#2b4dff' },
    healing:   { key: 'healing',   label: '療癒', emoji: '🌿', color: '#10b981' },
    nostalgic: { key: 'nostalgic', label: '懷舊', emoji: '📻', color: '#a16207' },
    hype:      { key: 'hype',      label: '嗨歌', emoji: '⚡', color: '#f59e0b' },
    slow:      { key: 'slow',      label: '慢歌', emoji: '🕯️', color: '#6366f1' },
});

export const VERSION_META: Readonly<Record<SongVersion, DimensionMeta<SongVersion>>> = Object.freeze({
    'original':  { key: 'original',  label: '原曲',     emoji: '🎵' },
    'acoustic':  { key: 'acoustic',  label: '不插電',   emoji: '🪕' },
    'remix':     { key: 'remix',     label: 'Remix',   emoji: '🎛️' },
    'kai-cover': { key: 'kai-cover', label: '阿凱改編', emoji: '🎸' },
});

export const ERA_META: Readonly<Record<SongEra, DimensionMeta<SongEra>>> = Object.freeze({
    '80s': { key: '80s', label: '80 年代', emoji: '📻' },
    '90s': { key: '90s', label: '90 年代', emoji: '💿' },
    '00s': { key: '00s', label: '00 年代', emoji: '🎧' },
    '10s': { key: '10s', label: '10 年代', emoji: '📱' },
    '20s': { key: '20s', label: '20 年代', emoji: '✨' },
});

export const GENRE_META: Readonly<Record<SongGenre, DimensionMeta<SongGenre>>> = Object.freeze({
    pop:      { key: 'pop',      label: '流行',   emoji: '🎤' },
    rock:     { key: 'rock',     label: '搖滾',   emoji: '🎸' },
    folk:     { key: 'folk',     label: '民謠',   emoji: '🪕' },
    rnb:      { key: 'rnb',      label: 'R&B',   emoji: '🎷' },
    indie:    { key: 'indie',    label: '獨立',   emoji: '🎼' },
    classic:  { key: 'classic',  label: '經典',   emoji: '🎻' },
    mandopop: { key: 'mandopop', label: '華語',   emoji: '🎙️' },
    jpop:     { key: 'jpop',     label: '日韓',   emoji: '🌸' },
    kpop:     { key: 'kpop',     label: 'K-pop', emoji: '⭐' },
});

/** 所有合法 mood key（給 Rules 驗證 / 自動完成用） */
export const MOOD_KEYS: readonly SongMood[] = Object.freeze(Object.keys(MOOD_META) as SongMood[]);
export const VERSION_KEYS: readonly SongVersion[] = Object.freeze(Object.keys(VERSION_META) as SongVersion[]);
export const ERA_KEYS: readonly SongEra[] = Object.freeze(Object.keys(ERA_META) as SongEra[]);
export const GENRE_KEYS: readonly SongGenre[] = Object.freeze(Object.keys(GENRE_META) as SongGenre[]);

export interface NowPlayingInfo {
    songId: string;
    song: Song | null;
    startedAt: Date;
    startedBy: string;
}

export interface SongSuggestion {
    id: string;
    title: string;
    artist: string;
    suggestedBy?: string;
    notes?: string;
    status: 'pending' | 'approved' | 'rejected' | 'added_to_playlist';
    createdAt: Date;
    processedAt?: Date;
}

export interface Tag {
    id: string;
    name: string;
}

export type TipType = '❤️' | '🌟' | '🎉' | '🔥' | '💎';

export interface Interaction {
    id: string;
    songId: string;
    type: 'tip' | 'rating';
    tipType?: TipType;
    rating?: 1 | 2 | 3 | 4 | 5;
    sessionId: string;
    createdAt: Date;
}

export interface RatingStats {
    average: number;
    count: number;
    total: number;
}

// ============================================================================
// 雜誌期數系統（D1）
// ============================================================================
// 設計文件：docs/design/D1-issue-system.md
//
// 把散落在 5 件套 ritual modal 的 `ISSUE №12 · MAY 2026 · 阿凱彈唱之夜`
// 等 hardcode 字串，集中到 `settings/magazine` 單一 doc。
// 「結束今晚」時自動把當前期數凍結成 `issues/{issueId}` 並 +1 期數。

/** 卡帶 Side A / B */
export type SideLabel = 'A' | 'B';

/** 主題色（給 OpeningCurtain / Topbar 動態變色用，Phase 2 才會接） */
export type MagazineTheme = 'blue' | 'red' | 'green';

/**
 * 雜誌設定 — Firestore 路徑 `settings/magazine`（單一 doc）。
 * 5 件套都從此處讀，admin 後台可修改。
 */
export interface MagazineSettings {
    /** 期數，例 12 */
    currentIssueNumber: number;
    /** 期刊標題，例「阿凱彈唱之夜」 */
    currentIssueTitle: string;
    /** 副標題，例「MAY 2026 · SIDE A」（選填，沒填則由 sideLabel 自動帶） */
    currentIssueSubtitle?: string;
    /** Side A / B */
    currentSideLabel: SideLabel;
    /** 當期開始時間 */
    currentStartedAt: Date;
    /** 主題色（Phase 2 才會接，預設 blue） */
    currentTheme?: MagazineTheme;
    /** 最後一次更新時間 */
    updatedAt: Date;
}

/**
 * 歸檔的單一期數 — Firestore 路徑 `issues/{issueId}`。
 * 「結束今晚」時凍結當期統計寫入此處。
 */
export interface IssueArchive {
    id: string;
    issueNumber: number;
    title: string;
    subtitle?: string;
    sideLabel: SideLabel;
    startedAt: Date;
    endedAt: Date;
    /** 凍結的當期統計（不依賴 votes 即時查詢，避免歷史變動） */
    stats: {
        totalVotes: number;
        uniqueVoters: number;
        /** Top 3 歌曲快照（含 title / artist，不只 songId，避免之後改歌名對不上） */
        top3: Array<{
            songId: string;
            title: string;
            artist: string;
            votes: number;
        }>;
        /** 催歌王前 N 名 voterId（admin-only 看得到誰） */
        topVoterIds: string[];
    };
    /** ShareCard 截圖存 Storage 路徑（選填，未來 D6 可放精選時刻截圖） */
    coverImageUrl?: string;
    /** 是否已封存（封存後不可刪、不可改 stats） */
    archived: boolean;
}

/**
 * 沒設定時的預設值 — 用在 useMagazine 首次掛載 / Firestore doc 不存在時。
 *
 * 對應原本散落在程式碼裡的 hardcode：
 *   - Nº 12 → currentIssueNumber: 12
 *   - 阿凱彈唱之夜 → currentIssueTitle
 *   - Side A → currentSideLabel
 */
export const MAGAZINE_DEFAULTS: Readonly<MagazineSettings> = Object.freeze({
    currentIssueNumber: 12,
    currentIssueTitle: '阿凱彈唱之夜',
    currentSideLabel: 'A' as const,
    currentStartedAt: new Date('2026-05-01T00:00:00+08:00'),
    currentTheme: 'blue' as const,
    updatedAt: new Date('2026-05-01T00:00:00+08:00'),
});
