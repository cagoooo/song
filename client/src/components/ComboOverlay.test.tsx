import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import confetti from 'canvas-confetti';
import { ComboOverlay } from './ComboOverlay';

vi.mock('canvas-confetti', () => ({
    default: vi.fn(),
}));

const combo = {
    songId: 'song-1',
    songTitle: '孤勇者',
    songArtist: '陳奕迅',
    count: 3,
    triggeredAt: Date.now(),
};

describe('ComboOverlay', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('未達三連發時不顯示提示', () => {
        render(<ComboOverlay combo={{ ...combo, count: 2 }} />);

        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(confetti).not.toHaveBeenCalled();
    });

    it('達成連發時顯示角落型小提示，不使用全螢幕中央遮罩', () => {
        render(<ComboOverlay combo={combo} />);

        const status = screen.getByRole('status');
        expect(status).toHaveClass('combo-compact-toast');
        expect(status).not.toHaveClass('inset-0');
        expect(screen.getByText('連發點播')).toBeInTheDocument();
        expect(screen.getByText('x3')).toBeInTheDocument();
        expect(screen.getByText('孤勇者')).toBeInTheDocument();
        expect(screen.getByText('陳奕迅 · 已加入熱度')).toBeInTheDocument();
    });

    it('搜尋輸入期間可抑制彩帶，避免干擾操作', () => {
        render(<ComboOverlay combo={combo} suppressConfetti />);

        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(confetti).not.toHaveBeenCalled();
    });
});
