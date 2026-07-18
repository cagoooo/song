import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { makeSong } from '@/test/fixtures';
import { SongDetailModal } from './SongDetailModal';

const aiSong = makeSong({
    id: 'ai-sheet',
    title: 'AI 收藏譜',
    songKey: 'C',
    progression: ['C', 'G', 'Am', 'F'],
    lyricBlocks: [
        { sec: 'VERSE 1', rows: [{ chord: 'C G Am F', line: '測試歌詞' }] },
    ],
});

describe('收藏 AI 吉他譜顯示控制', () => {
    afterEach(cleanup);

    it('可切換成級數顯示', () => {
        render(<SongDetailModal song={aiSong} onClose={() => {}} />);
        fireEvent.click(screen.getByRole('button', { name: '切換為級數顯示' }));

        expect(document.querySelector('.sdp-lyrics .sdp-lyr-chord')).toHaveTextContent('1 5 6m 4');
        expect(screen.getByRole('button', { name: '切換為級數顯示' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('可放大與重設譜面字級', () => {
        render(<SongDetailModal song={aiSong} onClose={() => {}} />);
        const lyrics = document.querySelector<HTMLElement>('.sdp-lyrics');

        fireEvent.click(screen.getByRole('button', { name: '放大吉他譜字級' }));
        expect(lyrics?.style.getPropertyValue('--sdp-sheet-font-scale')).toBe('1.1');
        expect(screen.getByRole('button', { name: '重設吉他譜字級' })).toHaveTextContent('110%');

        fireEvent.click(screen.getByRole('button', { name: '重設吉他譜字級' }));
        expect(lyrics?.style.getPropertyValue('--sdp-sheet-font-scale')).toBe('1');
    });
});
