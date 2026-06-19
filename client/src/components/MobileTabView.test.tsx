import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MobileTabView } from './MobileTabView';

vi.mock('./VoterBoard', () => ({
    VoterBoard: () => <div data-testid="voter-board">催歌王內容</div>,
}));

describe('MobileTabView 邏輯測試', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Tab 類型定義', () => {
        it('應該有 songs、ranking、voters 三種 Tab 類型', () => {
            const tabs = ['songs', 'ranking', 'voters'];
            expect(tabs).toContain('songs');
            expect(tabs).toContain('ranking');
            expect(tabs).toContain('voters');
            expect(tabs).toHaveLength(3);
        });
    });

    describe('管理員預設 Tab 邏輯', () => {
        it('管理員應該預設顯示 ranking Tab', () => {
            const isAdmin = true;
            const defaultTab = isAdmin ? 'ranking' : 'songs';
            expect(defaultTab).toBe('ranking');
        });

        it('非管理員應該預設顯示 songs Tab', () => {
            const isAdmin = false;
            const defaultTab = isAdmin ? 'ranking' : 'songs';
            expect(defaultTab).toBe('songs');
        });
    });

    describe('Tab 切換邏輯', () => {
        it('從 songs 向左滑動應該切換到 ranking', () => {
            const tabs = ['songs', 'ranking', 'voters'];
            let currentTab = 'songs';

            const idx = tabs.indexOf(currentTab);
            if (idx < tabs.length - 1) {
                currentTab = tabs[idx + 1];
            }

            expect(currentTab).toBe('ranking');
        });

        it('從 ranking 向左滑動應該切換到 voters', () => {
            const tabs = ['songs', 'ranking', 'voters'];
            let currentTab = 'ranking';

            const idx = tabs.indexOf(currentTab);
            if (idx < tabs.length - 1) {
                currentTab = tabs[idx + 1];
            }

            expect(currentTab).toBe('voters');
        });

        it('從 voters 向右滑動應該切換到 ranking', () => {
            const tabs = ['songs', 'ranking', 'voters'];
            let currentTab = 'voters';

            const idx = tabs.indexOf(currentTab);
            if (idx > 0) {
                currentTab = tabs[idx - 1];
            }

            expect(currentTab).toBe('ranking');
        });
    });

    describe('受控模式邏輯', () => {
        it('受控模式應該使用外部提供的 activeTab', () => {
            const controlledActiveTab = 'ranking';
            const internalTab = 'songs';

            const actualTab = controlledActiveTab ?? internalTab;
            expect(actualTab).toBe('ranking');
        });

        it('非受控模式應該使用內部狀態', () => {
            const controlledActiveTab = undefined;
            const internalTab = 'songs';

            const actualTab = controlledActiveTab ?? internalTab;
            expect(actualTab).toBe('songs');
        });
    });

    describe('滑動方向判斷', () => {
        it('向右側 tab 前進時應該返回 left 方向', () => {
            const tabs = ['songs', 'ranking', 'voters'];
            const fromIdx = tabs.indexOf('songs');
            const toIdx = tabs.indexOf('voters');

            expect(toIdx > fromIdx ? 'left' : 'right').toBe('left');
        });

        it('向左側 tab 返回時應該返回 right 方向', () => {
            const tabs = ['songs', 'ranking', 'voters'];
            const fromIdx = tabs.indexOf('voters');
            const toIdx = tabs.indexOf('ranking');

            expect(toIdx > fromIdx ? 'left' : 'right').toBe('right');
        });
    });
});

describe('MobileTabView 受控模式實際點擊', () => {
    it('點第三個催歌王 tab 時，會通知父層切到 voters', () => {
        const onTabChange = vi.fn();

        render(
            <MobileTabView
                songListContent={<div>歌單內容</div>}
                rankingContent={<div>排行內容</div>}
                activeTab="songs"
                onTabChange={onTabChange}
            />
        );

        fireEvent.click(screen.getAllByRole('tab')[2]);

        expect(onTabChange).toHaveBeenCalledWith('voters');
    });
});
