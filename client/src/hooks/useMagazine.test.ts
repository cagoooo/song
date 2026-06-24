// useMagazine 單元測試 — 雜誌期刊期數設定 hook
// 📐 設計文件：docs/design/D1-issue-system.md

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMagazine } from './useMagazine';
import { MAGAZINE_DEFAULTS } from '@/lib/firestore';
import type { MagazineSettings } from '@/lib/firestore';

// Mock subscribeMagazineSettings — 測試環境不該真的連 Firestore
let mockSettings: MagazineSettings | null = null;
let mockShouldError = false;
let mockUnsubscribeCalled = false;

vi.mock('@/lib/firestore', async () => {
    const actual = await vi.importActual<typeof import('@/lib/firestore')>('@/lib/firestore');
    return {
        ...actual,
        subscribeMagazineSettings: (cb: (s: MagazineSettings) => void) => {
            mockUnsubscribeCalled = false;
            // 模擬 Firestore 立刻 callback 一次
            queueMicrotask(() => {
                if (mockShouldError) {
                    cb({ ...actual.MAGAZINE_DEFAULTS });
                } else if (mockSettings) {
                    cb(mockSettings);
                } else {
                    cb({ ...actual.MAGAZINE_DEFAULTS });
                }
            });
            return () => {
                mockUnsubscribeCalled = true;
            };
        },
    };
});

describe('useMagazine', () => {
    beforeEach(() => {
        mockSettings = null;
        mockShouldError = false;
        mockUnsubscribeCalled = false;
    });

    describe('初始值與預設 fallback', () => {
        it('首次 render 立刻有預設值（不會 null）', () => {
            const { result } = renderHook(() => useMagazine());
            expect(result.current.settings).toBeDefined();
            expect(result.current.settings.currentIssueNumber).toBe(
                MAGAZINE_DEFAULTS.currentIssueNumber,
            );
        });

        it('loading=true 直到 Firestore 第一次回應', async () => {
            const { result } = renderHook(() => useMagazine());
            // 首次 render 應該是 loading=true（Firestore 還沒回）
            expect(result.current.loading).toBe(true);
            // 等 microtask flush → loading=false
            await waitFor(() => expect(result.current.loading).toBe(false));
        });

        it('Firestore 出錯時 fallback 到預設值且 loading=false', async () => {
            mockShouldError = true;
            const { result } = renderHook(() => useMagazine());
            await waitFor(() => expect(result.current.loading).toBe(false));
            expect(result.current.settings.currentIssueTitle).toBe(
                MAGAZINE_DEFAULTS.currentIssueTitle,
            );
        });
    });

    describe('從 Firestore 同步資料', () => {
        it('Firestore 有資料 → settings 對應更新', async () => {
            mockSettings = {
                currentIssueNumber: 99,
                currentIssueTitle: '特別場：聖誕之夜',
                currentSideLabel: 'B',
                currentStartedAt: new Date('2026-12-24T18:00:00+08:00'),
                currentTheme: 'red',
                updatedAt: new Date('2026-12-24T17:00:00+08:00'),
            };
            const { result } = renderHook(() => useMagazine());
            await waitFor(() => {
                expect(result.current.settings.currentIssueNumber).toBe(99);
            });
            expect(result.current.settings.currentIssueTitle).toBe('特別場：聖誕之夜');
            expect(result.current.settings.currentSideLabel).toBe('B');
            expect(result.current.settings.currentTheme).toBe('red');
        });
    });

    describe('格式化 helper', () => {
        it('issueNo 預設 = "Nº 12"', async () => {
            const { result } = renderHook(() => useMagazine());
            await waitFor(() => expect(result.current.loading).toBe(false));
            expect(result.current.issueNo).toBe('Nº 12');
        });

        it('issueLabel 預設 = "Nº 12 · SIDE A"', async () => {
            const { result } = renderHook(() => useMagazine());
            await waitFor(() => expect(result.current.loading).toBe(false));
            expect(result.current.issueLabel).toBe('Nº 12 · SIDE A');
        });

        it('side=B → label 變 SIDE B', async () => {
            mockSettings = {
                ...MAGAZINE_DEFAULTS,
                currentIssueNumber: 13,
                currentSideLabel: 'B',
            };
            const { result } = renderHook(() => useMagazine());
            await waitFor(() => {
                expect(result.current.issueLabel).toBe('Nº 13 · SIDE B');
            });
        });
    });

    describe('cleanup', () => {
        it('unmount 時取消 Firestore 訂閱', async () => {
            const { unmount } = renderHook(() => useMagazine());
            await waitFor(() => {
                // 等待訂閱已建立
                expect(mockUnsubscribeCalled).toBe(false);
            });
            unmount();
            expect(mockUnsubscribeCalled).toBe(true);
        });
    });

    describe('MAGAZINE_DEFAULTS 不可變', () => {
        it('預設值符合既有 5 件套 hardcode（Nº 12 / 吉他彈唱之夜 / Side A）', () => {
            expect(MAGAZINE_DEFAULTS.currentIssueNumber).toBe(12);
            expect(MAGAZINE_DEFAULTS.currentIssueTitle).toBe('吉他彈唱之夜');
            expect(MAGAZINE_DEFAULTS.currentSideLabel).toBe('A');
        });

        it('MAGAZINE_DEFAULTS 是 frozen object（防意外修改）', () => {
            expect(Object.isFrozen(MAGAZINE_DEFAULTS)).toBe(true);
        });
    });
});
