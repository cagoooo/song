// batchSuggestions 測試 — 批次審核目標解析
import { describe, it, expect } from 'vitest';
import { resolveBatchTargets } from './batchSuggestions';

const statusById = new Map<string, string>([
    ['a', 'pending'],
    ['b', 'pending'],
    ['c', 'approved'],
    ['d', 'added_to_playlist'],
    ['e', 'rejected'],
]);

describe('resolveBatchTargets', () => {
    it('approve 只對 pending 生效', () => {
        const t = resolveBatchTargets('approve', ['a', 'b', 'c', 'd'], statusById);
        expect(t.sort()).toEqual(['a', 'b']);
    });

    it('reject 只對 pending 生效', () => {
        const t = resolveBatchTargets('reject', ['a', 'c', 'e'], statusById);
        expect(t).toEqual(['a']);
    });

    it('delete 對全部選取生效（不論狀態）', () => {
        const t = resolveBatchTargets('delete', ['a', 'c', 'd', 'e'], statusById);
        expect(t.sort()).toEqual(['a', 'c', 'd', 'e']);
    });

    it('接受 Set 作為選取來源', () => {
        const t = resolveBatchTargets('approve', new Set(['a', 'c']), statusById);
        expect(t).toEqual(['a']);
    });

    it('空選取回空陣列', () => {
        expect(resolveBatchTargets('approve', [], statusById)).toEqual([]);
        expect(resolveBatchTargets('delete', new Set(), statusById)).toEqual([]);
    });

    it('未知 id（不在 statusById）approve/reject 視為非 pending 略過', () => {
        const t = resolveBatchTargets('approve', ['a', 'zzz'], statusById);
        expect(t).toEqual(['a']);
    });
});
