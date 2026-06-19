// PrintProgram 單元測試 — A4 列印節目單
// 📐 設計文件：docs/design/D3-pdf-print.md

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrintProgram } from './PrintProgram';
import { makeSong } from '@/test/fixtures';
import type { VoterStat } from '@/hooks/useVoterLeaderboard';

const TOP_VOTERS: VoterStat[] = [
    { sessionId: 'v1', count: 18, isYou: false, avatar: '🎸', displayName: '投票者-01' },
    { sessionId: 'v2', count: 12, isYou: true, avatar: '🎤', displayName: '投票者-02' },
    { sessionId: 'v3', count: 8, isYou: false, avatar: '🎷', displayName: '投票者-03' },
];

describe('PrintProgram', () => {
    beforeEach(() => {
        // 預設不在 print-mode（測試實際 hidden 行為要 mock CSS）
        document.body.classList.remove('print-mode');
    });

    afterEach(() => {
        cleanup();
        document.body.classList.remove('print-mode');
    });

    describe('基本結構', () => {
        it('渲染 data-testid="print-program" 容器', () => {
            render(
                <PrintProgram
                    songs={[]}
                    totalVotes={0}
                    totalVoters={0}
                    topVoters={[]}
                />,
            );
            expect(screen.getByTestId('print-program')).toBeInTheDocument();
        });

        it('預設帶 aria-hidden（列印用，不在無障礙樹）', () => {
            render(
                <PrintProgram
                    songs={[]}
                    totalVotes={0}
                    totalVoters={0}
                    topVoters={[]}
                />,
            );
            expect(screen.getByTestId('print-program')).toHaveAttribute('aria-hidden', 'true');
        });

        it('portal 到 document.body，避免 print-mode 隱藏 App 外層造成空白', () => {
            render(
                <PrintProgram
                    songs={[]}
                    totalVotes={0}
                    totalVoters={0}
                    topVoters={[]}
                />,
            );
            expect(screen.getByTestId('print-program').parentElement).toBe(document.body);
        });
    });

    describe('期刊資訊', () => {
        it('預設期數 Nº 12 + SIDE A + 阿凱彈唱之夜', () => {
            render(
                <PrintProgram
                    songs={[]}
                    totalVotes={0}
                    totalVoters={0}
                    topVoters={[]}
                />,
            );
            expect(screen.getByText('Nº 12')).toBeInTheDocument();
            expect(screen.getByText('SIDE A')).toBeInTheDocument();
            expect(screen.getByText(/阿凱彈唱之夜/)).toBeInTheDocument();
        });

        it('可覆寫 issueNumber / issueTitle / sideLabel', () => {
            render(
                <PrintProgram
                    songs={[]}
                    totalVotes={0}
                    totalVoters={0}
                    topVoters={[]}
                    issueNumber={42}
                    issueTitle="特別場：聖誕之夜"
                    sideLabel="B"
                />,
            );
            expect(screen.getByText('Nº 42')).toBeInTheDocument();
            expect(screen.getByText('SIDE B')).toBeInTheDocument();
            expect(screen.getByText(/特別場/)).toBeInTheDocument();
        });
    });

    describe('KPI 統計', () => {
        it('總票數 + 歌迷數 + 歌單長度顯示在 KPI 區', () => {
            const songs = [
                makeSong({ id: 'a', voteCount: 10 }),
                makeSong({ id: 'b', voteCount: 5 }),
            ];
            render(
                <PrintProgram
                    songs={songs}
                    totalVotes={15}
                    totalVoters={3}
                    topVoters={TOP_VOTERS}
                />,
            );
            const kpisSection = document.querySelector('.pp-kpis');
            expect(kpisSection?.textContent).toContain('15');
            expect(kpisSection?.textContent).toContain('3');
            expect(kpisSection?.textContent).toContain('2');
        });
    });

    describe('Top N 排行榜', () => {
        it('依 voteCount 降序排，預設取前 20 首', () => {
            const songs = [
                makeSong({ id: 'low', title: 'Low', voteCount: 1 }),
                makeSong({ id: 'high', title: 'High', voteCount: 100 }),
                makeSong({ id: 'mid', title: 'Mid', voteCount: 50 }),
            ];
            render(
                <PrintProgram
                    songs={songs}
                    totalVotes={151}
                    totalVoters={3}
                    topVoters={[]}
                />,
            );
            const rows = document.querySelectorAll('.pp-row');
            expect(rows.length).toBe(3);
            expect(rows[0].textContent).toContain('High');
            expect(rows[1].textContent).toContain('Mid');
            expect(rows[2].textContent).toContain('Low');
        });

        it('topN=5 只列 5 首', () => {
            const songs = Array.from({ length: 30 }, (_, i) =>
                makeSong({ id: `s${i}`, title: `Song ${i}`, voteCount: 100 - i }),
            );
            render(
                <PrintProgram
                    songs={songs}
                    totalVotes={1000}
                    totalVoters={50}
                    topVoters={[]}
                    topN={5}
                />,
            );
            expect(document.querySelectorAll('.pp-row').length).toBe(5);
            // 排第 1 是 voteCount 最高的 Song 0
            expect(screen.getByText('Song 0')).toBeInTheDocument();
            // 第 6 首不該出現
            expect(screen.queryByText('Song 5')).not.toBeInTheDocument();
        });

        it('空 songs → 顯示「尚無投票紀錄」', () => {
            render(
                <PrintProgram
                    songs={[]}
                    totalVotes={0}
                    totalVoters={0}
                    topVoters={[]}
                />,
            );
            expect(screen.getByText('尚無投票紀錄')).toBeInTheDocument();
        });
    });

    describe('催歌王', () => {
        it('傳入 topVoters → 顯示 3 個 voter + 金銀銅 emoji', () => {
            render(
                <PrintProgram
                    songs={[]}
                    totalVotes={38}
                    totalVoters={3}
                    topVoters={TOP_VOTERS}
                />,
            );
            expect(screen.getByText('🥇')).toBeInTheDocument();
            expect(screen.getByText('🥈')).toBeInTheDocument();
            expect(screen.getByText('🥉')).toBeInTheDocument();
            expect(screen.getByText('投票者-01')).toBeInTheDocument();
            expect(screen.getByText('18 票')).toBeInTheDocument();
        });

        it('空 topVoters → 「催歌王」section 不渲染', () => {
            render(
                <PrintProgram
                    songs={[]}
                    totalVotes={0}
                    totalVoters={0}
                    topVoters={[]}
                />,
            );
            expect(screen.queryByText('催歌王')).not.toBeInTheDocument();
            expect(screen.queryByText('🥇')).not.toBeInTheDocument();
        });
    });

    describe('主理人寄語', () => {
        it('預設顯示 DEFAULT_KAI_NOTE（兩行）', () => {
            render(
                <PrintProgram
                    songs={[]}
                    totalVotes={0}
                    totalVoters={0}
                    topVoters={[]}
                />,
            );
            expect(screen.getByText(/副歌前的那個關鍵和弦/)).toBeInTheDocument();
            expect(screen.getByText(/感謝今晚每個跟著哼唱/)).toBeInTheDocument();
        });

        it('可自訂 kaiNote', () => {
            render(
                <PrintProgram
                    songs={[]}
                    totalVotes={0}
                    totalVoters={0}
                    topVoters={[]}
                    kaiNote="今晚的觀眾很投入，謝謝！"
                />,
            );
            expect(screen.getByText(/今晚的觀眾很投入/)).toBeInTheDocument();
        });
    });

    describe('Footer 署名', () => {
        it('包含「阿凱老師」+「桃園市龍潭區石門國民小學」', () => {
            render(
                <PrintProgram
                    songs={[]}
                    totalVotes={0}
                    totalVoters={0}
                    topVoters={[]}
                />,
            );
            expect(screen.getByText(/阿凱老師/)).toBeInTheDocument();
            expect(screen.getByText('桃園市龍潭區石門國民小學')).toBeInTheDocument();
        });
    });
});
