// @vitest-environment node
//
// 譜圖 OCR 端對端煙霧測試 — 真實 Tesseract 引擎（會下載 ~20MB 語言檔）
//
// 預設跳過（CI / 一般 vitest run 不跑）；本機驗證時：
//   PowerShell:  $env:OCR_IT='1'; npx vitest run client/src/lib/sheetOcr.integration.test.ts
//
// 流程：@napi-rs/canvas 合成「和弦行在歌詞行正上方」的譜圖（模擬 91 譜版面）
//       → tesseract.js（eng + chi_tra）→ blocksToOcrLines → reconstructSheet
//       → 驗證和弦抓得到、行對齊、可直接轉調
import { describe, it, expect } from 'vitest';
import { tmpdir } from 'node:os';
import { blocksToOcrLines, reconstructSheet } from './sheetOcr';
import { isChordLine, extractChords, transposeChordSheet, detectKey } from './transpose';

const RUN = !!process.env.OCR_IT;

describe.skipIf(!RUN)('OCR 端對端（真實 Tesseract）', () => {
    it('合成譜圖 → 辨識 → 重建 → 轉調', { timeout: 300_000 }, async () => {
        const { createCanvas } = await import('@napi-rs/canvas');
        const canvas = createCanvas(900, 300);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 900, 300);
        ctx.fillStyle = '#111111';

        // 模擬 91 譜：和弦行（Latin）在歌詞行（CJK）正上方
        ctx.font = '26px Arial';
        ctx.fillText('Cmaj7', 40, 50);
        ctx.fillText('Bm7', 260, 50);
        ctx.fillText('Em7', 420, 50);
        ctx.fillText('Am7', 580, 50);
        ctx.font = '26px "Microsoft JhengHei"';
        ctx.fillText('愛一個人或許要慷慨', 40, 100);

        ctx.font = '26px Arial';
        ctx.fillText('F', 40, 190);
        ctx.fillText('G', 260, 190);
        ctx.fillText('C', 420, 190);
        ctx.font = '26px "Microsoft JhengHei"';
        ctx.fillText('童年的盪鞦韆隨記憶晃', 40, 240);

        const png = canvas.toBuffer('image/png');

        const { createWorker } = await import('tesseract.js');
        // cachePath 指到 tmp，避免 traineddata 下載到 repo 根目錄
        const worker = await createWorker(['eng', 'chi_tra'], 1, { cachePath: tmpdir() });
        try {
            const { data } = await worker.recognize(png, {}, { blocks: true, text: true });
            const sheet = reconstructSheet(blocksToOcrLines(data as Parameters<typeof blocksToOcrLines>[0]));
            // eslint-disable-next-line no-console
            console.log('--- OCR 重建結果 ---\n' + sheet + '\n--------------------');

            const lines = sheet.split('\n').filter((l) => l.trim());
            // 1) 和弦抓得到：4 + 3 顆中至少 5 顆活下來
            const chords = extractChords(sheet);
            expect(chords.length).toBeGreaterThanOrEqual(5);
            expect(chords).toContain('Cmaj7');

            // 2) 至少一行被判定為和弦行、至少一行是 CJK 歌詞
            expect(lines.some((l) => isChordLine(l))).toBe(true);
            expect(lines.some((l) => /[一-鿿]/.test(l))).toBe(true);

            // 3) 調性偵測 + 轉調直通
            const key = detectKey(chords);
            expect(key).not.toBeNull();
            const transposed = transposeChordSheet(sheet, 2, { preferFlat: false });
            expect(extractChords(transposed)).toContain('Dmaj7');
        } finally {
            await worker.terminate();
        }
    });
});
