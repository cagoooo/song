// LiveRecap 測試 — 現場回顧浮動 pill
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LiveRecap } from './LiveRecap';
import { recordHighlight, resetRecap } from '@/lib/liveRecap';

beforeEach(() => resetRecap());
afterEach(() => { cleanup(); resetRecap(); });

describe('LiveRecap', () => {
    it('無亮點時不渲染', () => {
        const { container } = render(<LiveRecap />);
        expect(container.firstChild).toBeNull();
    });

    it('有亮點時顯示 pill + 未讀數', () => {
        act(() => recordHighlight({ id: 'a', kind: 'darkhorse', title: '🐎 黑馬時刻', detail: '衝進第 2 名', missed: true }));
        render(<LiveRecap />);
        expect(screen.getByText('現場回顧')).toBeInTheDocument();
        // 未讀 badge = 1
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('點開面板顯示時間軸 + 錯過標記，並把未讀歸零', () => {
        act(() => recordHighlight({ id: 'b', kind: 'darkhorse', title: '🐎 黑馬時刻', detail: '「小幸運」衝進第 1 名', missed: true }));
        render(<LiveRecap />);
        // 開啟 popover
        act(() => { fireEvent.click(screen.getByRole('button', { name: '現場回顧' })); });
        expect(screen.getByText('剛剛現場')).toBeInTheDocument();
        expect(screen.getByText('「小幸運」衝進第 1 名')).toBeInTheDocument();
        expect(screen.getAllByText('打字時錯過').length).toBeGreaterThan(0);
        // 開啟後未讀歸零 → badge '1' 不再存在
        expect(screen.queryByText('1')).toBeNull();
    });
});
