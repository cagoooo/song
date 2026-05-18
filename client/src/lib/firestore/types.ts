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
}

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
