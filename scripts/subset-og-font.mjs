#!/usr/bin/env node
/**
 * Build a tiny Noto Sans TC subset for the generated OG image, favicons, and PWA screenshots.
 * The full font is kept out of runtime assets; only this subset is used by @napi-rs/canvas.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONT_IN = resolve(__dirname, 'fonts', 'NotoSansTC-Bold.ttf');
const FONT_OUT = resolve(__dirname, 'fonts', 'NotoSansTC-Subset.ttf');

if (!existsSync(FONT_IN)) {
    console.error(`找不到字型檔：${FONT_IN}`);
    console.error('請先下載 Noto Sans TC：');
    console.error('  curl -sL -o scripts/fonts/NotoSansTC-Bold.ttf \\');
    console.error('    "https://raw.githubusercontent.com/google/fonts/main/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf"');
    process.exit(1);
}

const USED_TEXT = `
吉他彈唱之夜 · Guitar Singalong 吉他彈唱點歌系統
像一卷 90 分鐘卡帶 翻面 按下錄音鍵 把你想聽的歌寫進今晚的歌單
現場即時投票 排行 點歌 分享 LINE Facebook 社群分享卡片
ISSUE N°12 SIDE A SIDE B HI-FI SETLIST VOTES TONIGHT ACTIVE LIVE
手機版點歌與排行畫面 桌面版現場點歌系統畫面 cagoooo.github.io/song
`;

const chars = Array.from(new Set([
    ...USED_TEXT.replace(/\s/g, ''),
    ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    ...' .,:;!?-_/·｜+()[]{}@#&*"\'%°',
])).join('');

console.log(`正在建立 OG 字型子集：${chars.length} 個字元`);

const buffer = readFileSync(FONT_IN);
const subset = await subsetFont(buffer, chars, { targetFormat: 'truetype' });
writeFileSync(FONT_OUT, subset);

console.log(`完成：${(buffer.length / 1024 / 1024).toFixed(2)} MB -> ${(subset.length / 1024).toFixed(1)} KB`);
console.log(`輸出：${FONT_OUT}`);
