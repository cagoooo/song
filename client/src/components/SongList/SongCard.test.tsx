// SongCard 元件單元測試
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SongCard } from './SongCard';
import type { Song } from '@/lib/firestore';
import type { AppUser } from '@/lib/auth';

// 建立測試用的歌曲資料
const createMockSong = (overrides?: Partial<Song>): Song => ({
    id: 'song-1',
    title: '測試歌曲',
    artist: '測試歌手',
    voteCount: 10,
    createdAt: new Date('2026-01-01'),
    isActive: true,
    ...overrides,
} as Song);

// 建立測試用的使用者資料
const createMockUser = (isAdmin = false): AppUser => ({
    id: 'user-1',
    email: 'test@example.com',
    isAdmin,
});

describe('SongCard', () => {
    const defaultProps = {
        song: createMockSong(),
        index: 0,
        user: null,
        votingId: null,
        clickCount: {},
        buttonRefs: { current: {} },
        reduceMotion: false,
        onVote: vi.fn(),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('渲染', () => {
        it('應該顯示歌曲標題', () => {
            render(<SongCard {...defaultProps} />);
            expect(screen.getByText('測試歌曲')).toBeInTheDocument();
        });

        it('應該顯示歌手名稱', () => {
            render(<SongCard {...defaultProps} />);
            expect(screen.getByText('測試歌手')).toBeInTheDocument();
        });

        it('應該顯示點播按鈕', () => {
            render(<SongCard {...defaultProps} />);
            // 使用 aria-label 包含歌曲標題來查找投票按鈕
            expect(screen.getByRole('button', { name: /投票/i })).toBeInTheDocument();
        });

        it('應該設定正確的 id 屬性', () => {
            const { container } = render(<SongCard {...defaultProps} />);
            expect(container.querySelector('#song-song-1')).toBeInTheDocument();
        });
    });

    describe('顏色變化', () => {
        it('index 0 應該有 rose 邊框', () => {
            const { container } = render(<SongCard {...defaultProps} index={0} />);
            const card = container.firstChild as HTMLElement;
            expect(card.className).toContain('border-l-rose-400');
        });

        it('index 1 應該有 blue 邊框', () => {
            const { container } = render(<SongCard {...defaultProps} index={1} />);
            const card = container.firstChild as HTMLElement;
            expect(card.className).toContain('border-l-blue-400');
        });

        it('index 2 應該有 violet 邊框', () => {
            const { container } = render(<SongCard {...defaultProps} index={2} />);
            const card = container.firstChild as HTMLElement;
            expect(card.className).toContain('border-l-violet-400');
        });

        it('index 5 應該循環回 rose 邊框', () => {
            const { container } = render(<SongCard {...defaultProps} index={5} />);
            const card = container.firstChild as HTMLElement;
            expect(card.className).toContain('border-l-rose-400');
        });
    });

    describe('按鈕互動', () => {
        it('點擊點播按鈕應該觸發 onVote', () => {
            const onVote = vi.fn();
            render(<SongCard {...defaultProps} onVote={onVote} />);

            // 使用 aria-label 查找投票按鈕
            fireEvent.click(screen.getByRole('button', { name: /投票/i }));

            expect(onVote).toHaveBeenCalledTimes(1);
            expect(onVote).toHaveBeenCalledWith('song-1', defaultProps.song);
        });

        it('點播按鈕應該有正確的 aria-label', () => {
            render(<SongCard {...defaultProps} />);
            expect(screen.getByRole('button', { name: /為「測試歌曲」投票/i })).toBeInTheDocument();
        });
    });

    describe('管理員功能', () => {
        it('非管理員不應該看到編輯和刪除按鈕', () => {
            render(<SongCard {...defaultProps} user={null} />);

            expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /trash/i })).not.toBeInTheDocument();
        });

        it('一般使用者不應該看到編輯和刪除按鈕', () => {
            render(<SongCard {...defaultProps} user={createMockUser(false)} />);

            // 只有點播按鈕
            const buttons = screen.getAllByRole('button');
            expect(buttons).toHaveLength(1);
        });

        it('管理員應該看到編輯和刪除按鈕', () => {
            render(<SongCard {...defaultProps} user={createMockUser(true)} />);

            // 點播 + 編輯 + 刪除 = 3 個按鈕
            const buttons = screen.getAllByRole('button');
            expect(buttons).toHaveLength(3);
        });

        it('點擊編輯按鈕應該觸發 onEdit', () => {
            const onEdit = vi.fn();
            render(<SongCard {...defaultProps} user={createMockUser(true)} onEdit={onEdit} />);

            // 找到編輯按鈕（第二個按鈕）
            const buttons = screen.getAllByRole('button');
            fireEvent.click(buttons[1]);

            expect(onEdit).toHaveBeenCalledTimes(1);
            expect(onEdit).toHaveBeenCalledWith(defaultProps.song);
        });

        it('點擊刪除按鈕應該觸發 onDelete', () => {
            const onDelete = vi.fn();
            render(<SongCard {...defaultProps} user={createMockUser(true)} onDelete={onDelete} />);

            // 找到刪除按鈕（第三個按鈕）
            const buttons = screen.getAllByRole('button');
            fireEvent.click(buttons[2]);

            expect(onDelete).toHaveBeenCalledTimes(1);
            expect(onDelete).toHaveBeenCalledWith('song-1');
        });
    });

    describe('動畫設定', () => {
        it('reduceMotion 為 false 時應該有動畫延遲', () => {
            const { container } = render(<SongCard {...defaultProps} index={5} reduceMotion={false} />);
            const card = container.firstChild as HTMLElement;

            expect(card.style.animationDelay).toBe('100ms');
        });

        it('reduceMotion 為 true 時動畫延遲應為 0ms', () => {
            const { container } = render(<SongCard {...defaultProps} index={5} reduceMotion={true} />);
            const card = container.firstChild as HTMLElement;

            expect(card.style.animationDelay).toBe('0ms');
        });

        it('reduceMotion 為 true 時動畫時長應減少', () => {
            const { container } = render(<SongCard {...defaultProps} reduceMotion={true} />);
            const card = container.firstChild as HTMLElement;

            expect(card.style.animationDuration).toBe('100ms');
        });

        it('動畫延遲不應超過 300ms', () => {
            const { container } = render(<SongCard {...defaultProps} index={100} reduceMotion={false} />);
            const card = container.firstChild as HTMLElement;

            expect(card.style.animationDelay).toBe('300ms');
        });
    });

    describe('投票狀態', () => {
        it('votingId 匹配時按鈕應該有 ring 樣式', () => {
            render(<SongCard {...defaultProps} votingId="song-1" />);

            // 使用 aria-label 查找投票按鈕
            const button = screen.getByRole('button', { name: /投票/i });
            expect(button.className).toContain('ring-2');
        });

        it('有點擊計數時按鈕應該有 ring 樣式', () => {
            render(<SongCard {...defaultProps} clickCount={{ 'song-1': 3 }} />);

            // 使用 aria-label 查找投票按鈕
            const button = screen.getByRole('button', { name: /投票/i });
            expect(button.className).toContain('ring-2');
        });
    });
});
