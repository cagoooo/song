// funnelAnalytics 測試 — 推薦/防干擾漏斗埋點
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

let mod: typeof import('./funnelAnalytics');

beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    mod = await import('./funnelAnalytics');
});

afterEach(() => {
    localStorage.clear();
});

describe('funnelAnalytics', () => {
    it('trackEvent 累積計數', () => {
        mod.trackEvent('suggestion_form_open');
        mod.trackEvent('suggestion_form_open');
        mod.trackEvent('suggestion_typing_start');
        const s = mod.getFunnelSummary();
        expect(s.counts.suggestion_form_open).toBe(2);
        expect(s.counts.suggestion_typing_start).toBe(1);
    });

    it('getFunnelSummary 算出轉換率', () => {
        // 開 4 次、打字 3 次、送出 2 次、放棄 1 次
        for (let i = 0; i < 4; i++) mod.trackEvent('suggestion_form_open');
        for (let i = 0; i < 3; i++) mod.trackEvent('suggestion_typing_start');
        for (let i = 0; i < 2; i++) mod.trackEvent('suggestion_submit_success');
        mod.trackEvent('suggestion_close_without_submit');
        const f = mod.getFunnelSummary().funnel;
        expect(f.開啟表單).toBe(4);
        expect(f.開始打字).toBe(3);
        expect(f.送出成功).toBe(2);
        expect(f.打字轉換率).toBe(75);  // 3/4
        expect(f.送出轉換率).toBe(50);  // 2/4
        expect(f.打字後放棄率).toBeCloseTo(33.3, 1); // 1/3
    });

    it('無資料時轉換率為 0（不除以零）', () => {
        const f = mod.getFunnelSummary().funnel;
        expect(f.送出轉換率).toBe(0);
        expect(f.打字後放棄率).toBe(0);
    });

    it('recent 保留最近事件（上限 50）', () => {
        for (let i = 0; i < 60; i++) mod.trackEvent('composing_focus_session');
        const s = mod.getFunnelSummary();
        expect(s.recent.length).toBe(50);
        expect(s.recent[0].e).toBe('composing_focus_session');
    });

    it('resetFunnel 清空', () => {
        mod.trackEvent('suggestion_form_open');
        mod.resetFunnel();
        expect(mod.getFunnelSummary().counts.suggestion_form_open).toBeUndefined();
    });

    it('localStorage 不可用時靜默不丟錯', () => {
        const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('quota');
        });
        expect(() => mod.trackEvent('suggestion_form_open')).not.toThrow();
        spy.mockRestore();
    });

    it('window.songFunnel 可在 console 取用', () => {
        expect(typeof (window as unknown as { songFunnel?: unknown }).songFunnel).toBe('function');
    });
});
