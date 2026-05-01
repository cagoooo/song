#!/usr/bin/env node
/**
 * 圖片 → WebP 批次轉換工具
 *
 * 用途：把 client/public/*.png 轉為 .webp（壓縮 ~70%），保留原檔做 fallback。
 * 安裝：npm i -D sharp
 * 使用：node scripts/convert-to-webp.mjs
 *
 * 為什麼要做：
 *   - playground.png ~85KB → playground.webp ~25KB (≈70% 縮減)
 *   - 直接影響 OG 圖載入、社群分享預覽速度
 *   - 配合 <picture><source type="image/webp">...</picture> 漸進增強
 */

import { readdir, stat } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';

const PUBLIC_DIR = 'client/public';
const QUALITY = 82; // 視覺幾乎無差，檔案大幅縮減

async function main() {
    let sharp;
    try {
        sharp = (await import('sharp')).default;
    } catch {
        console.error('❌ 請先安裝：npm i -D sharp');
        process.exit(1);
    }

    const entries = await readdir(PUBLIC_DIR);
    const images = entries.filter((f) => /\.(png|jpe?g)$/i.test(f));

    if (images.length === 0) {
        console.log('沒有找到 PNG/JPEG 檔案');
        return;
    }

    console.log(`找到 ${images.length} 張圖，開始轉換 → WebP (quality=${QUALITY})...\n`);

    let totalOrig = 0, totalWebp = 0;
    for (const file of images) {
        const inPath = join(PUBLIC_DIR, file);
        const outPath = join(PUBLIC_DIR, basename(file, extname(file)) + '.webp');
        const origSize = (await stat(inPath)).size;

        await sharp(inPath).webp({ quality: QUALITY }).toFile(outPath);
        const newSize = (await stat(outPath)).size;

        totalOrig += origSize;
        totalWebp += newSize;
        const saved = ((1 - newSize / origSize) * 100).toFixed(1);
        console.log(`✓ ${file.padEnd(30)} ${(origSize / 1024).toFixed(1)}KB → ${(newSize / 1024).toFixed(1)}KB  (-${saved}%)`);
    }

    const totalSaved = ((1 - totalWebp / totalOrig) * 100).toFixed(1);
    console.log(`\n📊 總計：${(totalOrig / 1024).toFixed(1)}KB → ${(totalWebp / 1024).toFixed(1)}KB (節省 ${totalSaved}%)`);
    console.log('\n💡 接著請在 index.html 把 og:image / twitter:image 改成 .webp');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
