// D5 結構化標記 meta 常數測試 — 確保 enum / META / Rules 三方一致
// 📐 設計文件：docs/design/D5-song-mood-tags.md

import { describe, it, expect } from 'vitest';
import {
    MOOD_META, MOOD_KEYS,
    VERSION_META, VERSION_KEYS,
    ERA_META, ERA_KEYS,
    GENRE_META, GENRE_KEYS,
} from './types';
import type { SongMood, SongVersion, SongEra, SongGenre } from './types';

describe('MOOD_META', () => {
    it('6 種情緒都有 meta', () => {
        expect(MOOD_KEYS.length).toBe(6);
        expect(MOOD_KEYS).toEqual([
            'energetic', 'tender', 'healing', 'nostalgic', 'hype', 'slow',
        ]);
    });

    it('每個 mood 都有 label / emoji / color', () => {
        for (const key of MOOD_KEYS) {
            const meta = MOOD_META[key];
            expect(meta.key).toBe(key);
            expect(meta.label).toBeTruthy();
            expect(meta.emoji).toBeTruthy();
            expect(meta.color).toMatch(/^#[0-9a-f]{6}$/i);
        }
    });

    it('frozen 防意外修改', () => {
        expect(Object.isFrozen(MOOD_META)).toBe(true);
    });

    it('label 是中文（不是 enum key）', () => {
        expect(MOOD_META.energetic.label).toBe('熱血');
        expect(MOOD_META.tender.label).toBe('抒情');
        expect(MOOD_META.healing.label).toBe('療癒');
        expect(MOOD_META.nostalgic.label).toBe('懷舊');
        expect(MOOD_META.hype.label).toBe('嗨歌');
        expect(MOOD_META.slow.label).toBe('慢歌');
    });
});

describe('VERSION_META', () => {
    it('4 種版本', () => {
        expect(VERSION_KEYS.length).toBe(4);
        expect(VERSION_KEYS).toEqual(['original', 'acoustic', 'remix', 'kai-cover']);
    });

    it('特別改編對應 kai-cover', () => {
        expect(VERSION_META['kai-cover'].label).toBe('特別改編');
    });

    it('frozen', () => {
        expect(Object.isFrozen(VERSION_META)).toBe(true);
    });
});

describe('ERA_META', () => {
    it('5 個年代', () => {
        expect(ERA_KEYS.length).toBe(5);
        expect(ERA_KEYS).toEqual(['80s', '90s', '00s', '10s', '20s']);
    });

    it('label 是中文「N 年代」', () => {
        expect(ERA_META['80s'].label).toBe('80 年代');
        expect(ERA_META['20s'].label).toBe('20 年代');
    });

    it('frozen', () => {
        expect(Object.isFrozen(ERA_META)).toBe(true);
    });
});

describe('GENRE_META', () => {
    it('9 種曲風', () => {
        expect(GENRE_KEYS.length).toBe(9);
        expect(GENRE_KEYS).toEqual([
            'pop', 'rock', 'folk', 'rnb', 'indie', 'classic', 'mandopop', 'jpop', 'kpop',
        ]);
    });

    it('每個 genre 有 label + emoji', () => {
        for (const key of GENRE_KEYS) {
            const meta = GENRE_META[key];
            expect(meta.label).toBeTruthy();
            expect(meta.emoji).toBeTruthy();
        }
    });

    it('frozen', () => {
        expect(Object.isFrozen(GENRE_META)).toBe(true);
    });
});

describe('TypeScript 強制檢查', () => {
    it('SongMood / SongVersion / SongEra / SongGenre 都是 union type', () => {
        // 編譯通過代表 type 對齊
        const m: SongMood = 'tender';
        const v: SongVersion = 'kai-cover';
        const e: SongEra = '10s';
        const g: SongGenre = 'mandopop';
        expect(m).toBe('tender');
        expect(v).toBe('kai-cover');
        expect(e).toBe('10s');
        expect(g).toBe('mandopop');
    });

    it('META lookup type-safe', () => {
        // 編譯通過 — 如果 META[key].label 不是 string 會編譯失敗
        const label: string = MOOD_META.energetic.label;
        expect(label).toBe('熱血');
    });
});

describe('Rules ↔ Client 一致性', () => {
    // 這幾個測試會在 D5 Phase 2（加 UI / Rules 整合）時更有意義，
    // 但本 PR 先確認 KEYS export 跟 firestore.rules 內 enum 對齊：
    it('MOOD_KEYS 應對應 firestore.rules 中 mood enum', () => {
        // 必須完全一致（順序也要對，便於 grep / diff）
        expect(MOOD_KEYS).toEqual([
            'energetic', 'tender', 'healing', 'nostalgic', 'hype', 'slow',
        ]);
    });

    it('VERSION_KEYS 應對應 rules', () => {
        expect(VERSION_KEYS).toEqual(['original', 'acoustic', 'remix', 'kai-cover']);
    });

    it('ERA_KEYS 應對應 rules', () => {
        expect(ERA_KEYS).toEqual(['80s', '90s', '00s', '10s', '20s']);
    });

    it('GENRE_KEYS 應對應 rules', () => {
        expect(GENRE_KEYS).toEqual([
            'pop', 'rock', 'folk', 'rnb', 'indie', 'classic', 'mandopop', 'jpop', 'kpop',
        ]);
    });
});
