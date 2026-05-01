#!/usr/bin/env node
/**
 * 精簡 Noto Sans TC 字型 — 只保留 OG 圖與 favicon 實際用到的字元，
 * 把 12 MB 的完整字型壓到 ~100-200 KB，方便 commit 進 repo。
 *
 * 重跑時機：當 generate-og-image.mjs 加入新字 → 把新字補進 USED_TEXT 重跑這支。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONT_IN = resolve(__dirname, 'fonts', 'NotoSansTC-Bold.ttf');
const FONT_OUT = resolve(__dirname, 'fonts', 'NotoSansTC-Subset.ttf');

if (!existsSync(FONT_IN)) {
    console.error(`❌ 找不到 ${FONT_IN}`);
    console.error('請先下載：');
    console.error('  curl -sL -o scripts/fonts/NotoSansTC-Bold.ttf \\');
    console.error('    "https://raw.githubusercontent.com/google/fonts/main/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf"');
    process.exit(1);
}

// 列出 OG 圖 + favicon 所有可能用到的中文字（寧多勿少）
const USED_TEXT = `
吉他彈唱點歌系統
即時點播現場互動社群分享
互動式音樂平台
歌曲列表排行榜建議
標籤分類管理
登入登出註冊管理員
立即開啟掃描分享
`;

const chars = Array.from(new Set([
    ...USED_TEXT.replace(/\s/g, ''),
    ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    ...' .,:;!?-_/·+()[]{}@#&*"\'→',
])).join('');

console.log(`字元集大小：${chars.length} 個唯一字元`);

const buffer = readFileSync(FONT_IN);
const subset = await subsetFont(buffer, chars, { targetFormat: 'truetype' });
writeFileSync(FONT_OUT, subset);

console.log(`✓ 精簡完成：${(buffer.length / 1024 / 1024).toFixed(2)} MB → ${(subset.length / 1024).toFixed(1)} KB`);
console.log(`  輸出：${FONT_OUT}`);
