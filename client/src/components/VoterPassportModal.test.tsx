// VoterPassportModal 單元測試 — 6 個徽章解鎖條件 + 統計卡 + 翻面互動
// 📐 設計文件：docs/design/T2-ritual-modal-tests.md
//
// 6 個徽章解鎖條件（依 VoterPassportModal.tsx 實作）：
//   • first-call    首發點播  — totalVotes ≥ 1
//   • five-star     評星達人  — uniqueSongs ≥ 10
//   • full-deck     點滿一場  — maxDayUnique ≥ 5（單日不同歌曲 ≥ 5）
//   • vote-storm    灌票王    — maxDayCount ≥ 50（單日票數 ≥ 50）
//   • final-encore  看完一場  — maxDayCount ≥ 16
//   • three-shows   連續 3 場 — showsAttended ≥ 3（不同日期數 ≥ 3）

import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoterPassportModal } from './VoterPassportModal';
import {
    daysAgo,
    makeVote,
    manyVotesOf,
    uniqueVotes,
} from '@/test/fixtures';

/** 從徽章名稱找到該徽章 cell，回傳 { cell, isUnlocked } */
function findBadge(name: string) {
    const nameEl = screen.getByText(name);
    const cell = nameEl.closest('.vb-cell') as HTMLElement | null;
    expect(cell).not.toBeNull();
    const isUnlocked = !cell!.classList.contains('locked');
    return { cell: cell!, isUnlocked };
}

describe('VoterPassportModal', () => {
    beforeEach(() => {
        // 固定時鐘：2026-05-18 15:00:00 +08:00（避免跨日測試 flaky）
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-18T15:00:00+08:00'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('開關狀態', () => {
        it('isOpen=false 時不渲染', () => {
            render(<VoterPassportModal isOpen={false} onClose={() => {}} history={[]} />);
            expect(screen.queryByText('催歌履歷 · Voter Passport')).not.toBeInTheDocument();
        });

        it('isOpen=true 顯示護照標題', () => {
            render(<VoterPassportModal isOpen={true} onClose={() => {}} history={[]} />);
            expect(screen.getByText('催歌履歷 · Voter Passport')).toBeInTheDocument();
        });
    });

    describe('統計卡（3 格數字）', () => {
        it('空 history → 三個數字都是 0', () => {
            render(<VoterPassportModal isOpen={true} onClose={() => {}} history={[]} />);
            const totalCard = screen.getByText('Total Votes').closest('.vb-stat')!;
            const uniqueCard = screen.getByText('Unique Songs').closest('.vb-stat')!;
            const showsCard = screen.getByText('Shows Attended').closest('.vb-stat')!;
            expect(within(totalCard as HTMLElement).getByText('0')).toBeInTheDocument();
            expect(within(uniqueCard as HTMLElement).getByText('0')).toBeInTheDocument();
            expect(within(showsCard as HTMLElement).getByText('0')).toBeInTheDocument();
        });

        it('混合 history → 對應計算正確', () => {
            // 5 票同首歌 + 3 票不同歌（共 8 票、4 首不同歌、1 場）
            const history = [
                ...manyVotesOf('s1', 5),
                makeVote('s2', 'B', 'X', Date.now()),
                makeVote('s3', 'C', 'X', Date.now()),
                makeVote('s4', 'D', 'X', Date.now()),
            ];
            render(<VoterPassportModal isOpen={true} onClose={() => {}} history={history} />);
            const totalCard = screen.getByText('Total Votes').closest('.vb-stat')!;
            const uniqueCard = screen.getByText('Unique Songs').closest('.vb-stat')!;
            const showsCard = screen.getByText('Shows Attended').closest('.vb-stat')!;
            expect(within(totalCard as HTMLElement).getByText('8')).toBeInTheDocument();
            expect(within(uniqueCard as HTMLElement).getByText('4')).toBeInTheDocument();
            expect(within(showsCard as HTMLElement).getByText('1')).toBeInTheDocument();
        });
    });

    describe('徽章解鎖 — first-call（首發點播：totalVotes ≥ 1）', () => {
        it('1 票就解鎖', () => {
            render(
                <VoterPassportModal
                    isOpen={true}
                    onClose={() => {}}
                    history={[makeVote('s1', '晴天', '周杰倫', Date.now())]}
                />,
            );
            expect(findBadge('首發點播').isUnlocked).toBe(true);
        });

        it('0 票時 lock 住', () => {
            render(<VoterPassportModal isOpen={true} onClose={() => {}} history={[]} />);
            expect(findBadge('首發點播').isUnlocked).toBe(false);
        });
    });

    describe('徽章解鎖 — five-star（評星達人：uniqueSongs ≥ 10）', () => {
        it('10 首不同歌曲解鎖', () => {
            render(
                <VoterPassportModal
                    isOpen={true}
                    onClose={() => {}}
                    history={uniqueVotes(10)}
                />,
            );
            expect(findBadge('評星達人').isUnlocked).toBe(true);
        });

        it('9 首不同歌曲不解鎖，顯示進度 9/10', () => {
            render(
                <VoterPassportModal
                    isOpen={true}
                    onClose={() => {}}
                    history={uniqueVotes(9)}
                />,
            );
            expect(findBadge('評星達人').isUnlocked).toBe(false);
            expect(screen.getByText(/9.*\/.*10/)).toBeInTheDocument();
        });

        it('同首歌投 100 次不算 unique，只算 1 → 不解鎖', () => {
            render(
                <VoterPassportModal
                    isOpen={true}
                    onClose={() => {}}
                    history={manyVotesOf('s1', 100)}
                />,
            );
            expect(findBadge('評星達人').isUnlocked).toBe(false);
        });
    });

    describe('徽章解鎖 — full-deck（點滿一場：maxDayUnique ≥ 5）', () => {
        it('同一天投 5 首不同歌解鎖', () => {
            render(
                <VoterPassportModal
                    isOpen={true}
                    onClose={() => {}}
                    history={uniqueVotes(5, Date.now())}
                />,
            );
            expect(findBadge('點滿一場').isUnlocked).toBe(true);
        });

        it('跨日投滿 5 首不解鎖（每天只 2-3 首）', () => {
            const history = [
                ...uniqueVotes(3, daysAgo(0)),
                ...uniqueVotes(3, daysAgo(1)).map((v, i) => ({ ...v, songId: `b${i}` })),
                ...uniqueVotes(3, daysAgo(2)).map((v, i) => ({ ...v, songId: `c${i}` })),
            ];
            render(<VoterPassportModal isOpen={true} onClose={() => {}} history={history} />);
            // 每天最多 3 首不同 < 5，所以 locked
            expect(findBadge('點滿一場').isUnlocked).toBe(false);
        });
    });

    describe('徽章解鎖 — vote-storm（灌票王：單日 ≥ 50 票）', () => {
        it('單日 50 票解鎖', () => {
            render(
                <VoterPassportModal
                    isOpen={true}
                    onClose={() => {}}
                    history={manyVotesOf('s1', 50)}
                />,
            );
            expect(findBadge('灌票王').isUnlocked).toBe(true);
        });

        it('單日 49 票不解鎖，顯示進度 49/50', () => {
            render(
                <VoterPassportModal
                    isOpen={true}
                    onClose={() => {}}
                    history={manyVotesOf('s1', 49)}
                />,
            );
            expect(findBadge('灌票王').isUnlocked).toBe(false);
            expect(screen.getByText(/49.*\/.*50/)).toBeInTheDocument();
        });

        it('跨兩天各 30 票（共 60）不解鎖（最大單日 30 < 50）', () => {
            const history = [
                ...manyVotesOf('s1', 30, daysAgo(0)),
                ...manyVotesOf('s2', 30, daysAgo(1)),
            ];
            render(<VoterPassportModal isOpen={true} onClose={() => {}} history={history} />);
            expect(findBadge('灌票王').isUnlocked).toBe(false);
        });
    });

    describe('徽章解鎖 — final-encore（看完一場：單日 ≥ 16 票）', () => {
        it('單日 16 票解鎖', () => {
            render(
                <VoterPassportModal
                    isOpen={true}
                    onClose={() => {}}
                    history={manyVotesOf('s1', 16)}
                />,
            );
            expect(findBadge('看完一場').isUnlocked).toBe(true);
        });

        it('單日 15 票不解鎖', () => {
            render(
                <VoterPassportModal
                    isOpen={true}
                    onClose={() => {}}
                    history={manyVotesOf('s1', 15)}
                />,
            );
            expect(findBadge('看完一場').isUnlocked).toBe(false);
        });
    });

    describe('徽章解鎖 — three-shows（連續 3 場：showsAttended ≥ 3）', () => {
        it('3 個不同日期解鎖', () => {
            const history = [
                makeVote('s1', 'A', 'X', daysAgo(0)),
                makeVote('s2', 'B', 'X', daysAgo(1)),
                makeVote('s3', 'C', 'X', daysAgo(2)),
            ];
            render(<VoterPassportModal isOpen={true} onClose={() => {}} history={history} />);
            expect(findBadge('連續 3 場').isUnlocked).toBe(true);
        });

        it('2 個不同日期不解鎖，顯示進度 2/3', () => {
            const history = [
                makeVote('s1', 'A', 'X', daysAgo(0)),
                makeVote('s2', 'B', 'X', daysAgo(1)),
            ];
            render(<VoterPassportModal isOpen={true} onClose={() => {}} history={history} />);
            expect(findBadge('連續 3 場').isUnlocked).toBe(false);
            expect(screen.getByText(/2.*\/.*3/)).toBeInTheDocument();
        });

        it('同一天 100 票只算 1 場，不解鎖', () => {
            render(
                <VoterPassportModal
                    isOpen={true}
                    onClose={() => {}}
                    history={manyVotesOf('s1', 100)}
                />,
            );
            expect(findBadge('連續 3 場').isUnlocked).toBe(false);
        });
    });

    describe('解鎖總數摘要', () => {
        it('全 0 票：unlockedBadges.length = 0，「已蓋上的章」section 不渲染', () => {
            render(<VoterPassportModal isOpen={true} onClose={() => {}} history={[]} />);
            expect(screen.queryByText('已蓋上的章')).not.toBeInTheDocument();
            expect(screen.getByText('還沒蓋上的章')).toBeInTheDocument();
        });

        it('1 票：first-call 解鎖，其他 5 個 locked → 兩個 section 都渲染', () => {
            render(
                <VoterPassportModal
                    isOpen={true}
                    onClose={() => {}}
                    history={[makeVote('s1', '晴天', '周杰倫', Date.now())]}
                />,
            );
            expect(screen.getByText('已蓋上的章')).toBeInTheDocument();
            expect(screen.getByText('還沒蓋上的章')).toBeInTheDocument();
            // 「§ 01 · Collected」+ 「§ 02 · Locked」兩個 eyebrow 同時存在
            expect(screen.getByText('§ 01 · Collected')).toBeInTheDocument();
            expect(screen.getByText('§ 02 · Locked')).toBeInTheDocument();
        });

        it('全 100 票都同首歌 → 只解鎖 first-call + vote-storm + final-encore（共 3 個）', () => {
            render(
                <VoterPassportModal
                    isOpen={true}
                    onClose={() => {}}
                    history={manyVotesOf('s1', 100)}
                />,
            );
            // 同首歌：uniqueSongs=1（< 10，five-star 不開）、maxDayUnique=1（< 5，full-deck 不開）、showsAttended=1（< 3，three-shows 不開）
            // 開：first-call (≥1)、vote-storm (≥50)、final-encore (≥16)
            expect(findBadge('首發點播').isUnlocked).toBe(true);
            expect(findBadge('灌票王').isUnlocked).toBe(true);
            expect(findBadge('看完一場').isUnlocked).toBe(true);
            expect(findBadge('評星達人').isUnlocked).toBe(false);
            expect(findBadge('點滿一場').isUnlocked).toBe(false);
            expect(findBadge('連續 3 場').isUnlocked).toBe(false);
        });
    });

    describe('分享按鈕', () => {
        it('傳入 onShare 顯示「分享我的催歌履歷」按鈕', () => {
            const onShare = vi.fn();
            render(
                <VoterPassportModal
                    isOpen={true}
                    onClose={() => {}}
                    history={[makeVote('s1', 'A', 'X', Date.now())]}
                    onShare={onShare}
                />,
            );
            expect(screen.getByText('分享我的催歌履歷')).toBeInTheDocument();
        });

        it('沒傳 onShare 不顯示分享按鈕', () => {
            render(
                <VoterPassportModal
                    isOpen={true}
                    onClose={() => {}}
                    history={[makeVote('s1', 'A', 'X', Date.now())]}
                />,
            );
            expect(screen.queryByText('分享我的催歌履歷')).not.toBeInTheDocument();
        });
    });
});
