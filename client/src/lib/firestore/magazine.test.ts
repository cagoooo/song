// magazine module 整合測試（Phase 1）— 主要測 type 一致性與預設值
// 📐 設計文件：docs/design/D1-issue-system.md
//
// 注意：actual subscribe/update/archive 是 thin wrapper over firebase SDK，
// 真實連線測試會在 v4.9 Firestore Rules unit test 階段補（用
// @firebase/rules-unit-testing 跑 emulator）。
//
// 本檔聚焦在 export 介面正確性 + MAGAZINE_DEFAULTS 不變性。

import { describe, it, expect } from 'vitest';
import {
    MAGAZINE_DEFAULTS,
    getMagazineSettings,
    subscribeMagazineSettings,
    updateMagazineSettings,
    incrementIssueNumber,
    archiveCurrentIssue,
    listIssues,
    getIssue,
} from './magazine';

describe('magazine module exports', () => {
    it('所有公開函式都正確 export', () => {
        expect(typeof getMagazineSettings).toBe('function');
        expect(typeof subscribeMagazineSettings).toBe('function');
        expect(typeof updateMagazineSettings).toBe('function');
        expect(typeof incrementIssueNumber).toBe('function');
        expect(typeof archiveCurrentIssue).toBe('function');
        expect(typeof listIssues).toBe('function');
        expect(typeof getIssue).toBe('function');
    });
});

describe('MAGAZINE_DEFAULTS', () => {
    it('預設值對應既有 5 件套 hardcode', () => {
        expect(MAGAZINE_DEFAULTS.currentIssueNumber).toBe(12);
        expect(MAGAZINE_DEFAULTS.currentIssueTitle).toBe('阿凱彈唱之夜');
        expect(MAGAZINE_DEFAULTS.currentSideLabel).toBe('A');
        expect(MAGAZINE_DEFAULTS.currentTheme).toBe('blue');
    });

    it('frozen 防意外修改', () => {
        expect(Object.isFrozen(MAGAZINE_DEFAULTS)).toBe(true);
    });

    it('currentStartedAt 是 Date 物件', () => {
        expect(MAGAZINE_DEFAULTS.currentStartedAt).toBeInstanceOf(Date);
    });

    it('updatedAt 是 Date 物件', () => {
        expect(MAGAZINE_DEFAULTS.updatedAt).toBeInstanceOf(Date);
    });
});

describe('TypeScript 型別檢查（編譯通過即測試通過）', () => {
    it('MagazineSettings 必填欄位齊全', () => {
        // 用 TypeScript 強制檢查 — 編譯通過代表型別正確
        const required: {
            currentIssueNumber: number;
            currentIssueTitle: string;
            currentSideLabel: 'A' | 'B';
            currentStartedAt: Date;
            updatedAt: Date;
        } = MAGAZINE_DEFAULTS;
        expect(required).toBeDefined();
    });
});
