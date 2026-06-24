#!/usr/bin/env node
/**
 * Generate social preview and app icons for GitHub Pages:
 * - client/public/og-preview.png        1200x630 for LINE / Facebook / Twitter
 * - client/public/favicon.ico, png favicons, apple-touch-icon
 * - client/public/icon-192.png, icon-512.png, maskable icons
 * - client/public/screenshot-narrow.png, screenshot-wide.png for PWA manifest
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PUBLIC = resolve(ROOT, 'client', 'public');
const FONT_PATH = resolve(__dirname, 'fonts', 'NotoSansTC-Subset.ttf');

if (!existsSync(FONT_PATH)) {
    console.error('找不到 OG 字型子集，請先執行 npm run subset-og-font');
    process.exit(1);
}

GlobalFonts.registerFromPath(FONT_PATH, 'NotoSansTC');
mkdirSync(PUBLIC, { recursive: true });

const SITE_TITLE = '吉他彈唱之夜 · Guitar Singalong';
const SITE_NAME = '吉他彈唱點歌系統';
const SITE_DESC = '翻面、按下錄音鍵，把想聽的歌寫進今晚歌單。';
const SITE_URL = 'cagoooo.github.io/song';

const THEME = {
    ink: '#111111',
    paper: '#faf6ee',
    paper2: '#f0e7d9',
    blue: '#2f55ff',
    red: '#ff3b30',
    muted: '#6f6a60',
    line: 'rgba(17,17,17,0.16)',
};

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function fillRoundRect(ctx, x, y, w, h, r, color) {
    ctx.fillStyle = color;
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();
}

function strokeRoundRect(ctx, x, y, w, h, r, color, lineWidth = 2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    roundRect(ctx, x, y, w, h, r);
    ctx.stroke();
}

function setFont(ctx, weight, size, family = 'NotoSansTC') {
    ctx.font = `${weight} ${size}px "${family}"`;
}

function drawPaperTexture(ctx, w, h) {
    ctx.fillStyle = THEME.paper;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(17,17,17,0.035)';
    for (let y = 18; y < h; y += 18) {
        for (let x = 18; x < w; x += 18) {
            ctx.fillRect(x, y, 1.2, 1.2);
        }
    }
}

function drawCassette(ctx, x, y, w, h, scale = 1) {
    fillRoundRect(ctx, x, y, w, h, 18 * scale, THEME.ink);
    strokeRoundRect(ctx, x + 4 * scale, y + 4 * scale, w - 8 * scale, h - 8 * scale, 14 * scale, 'rgba(255,255,255,0.16)', 1.5 * scale);

    const labelX = x + 38 * scale;
    const labelY = y + 34 * scale;
    const labelW = w - 76 * scale;
    const labelH = h * 0.33;
    fillRoundRect(ctx, labelX, labelY, labelW, labelH, 8 * scale, THEME.blue);

    ctx.fillStyle = '#ffffff';
    setFont(ctx, 900, 18 * scale);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('SIDE A · 90 MIN', labelX + 26 * scale, labelY + labelH / 2);
    setFont(ctx, 900, 44 * scale);
    ctx.textAlign = 'right';
    ctx.fillText('N°12', labelX + labelW - 24 * scale, labelY + labelH / 2 + 2 * scale);

    const deckY = y + h * 0.55;
    const deckH = h * 0.27;
    fillRoundRect(ctx, labelX, deckY, labelW, deckH, 8 * scale, '#fff8ea');
    ctx.fillStyle = THEME.ink;
    setFont(ctx, 800, 16 * scale);
    ctx.textAlign = 'center';
    ctx.fillText('HIGH-BIAS', labelX + 78 * scale, deckY + 32 * scale);
    ctx.fillText('type II', labelX + labelW / 2, deckY + 32 * scale);
    ctx.fillText('DOLBY NR', labelX + labelW - 78 * scale, deckY + 32 * scale);

    const reelR = 42 * scale;
    const leftReel = labelX + 95 * scale;
    const rightReel = labelX + labelW - 95 * scale;
    const reelY = deckY + deckH * 0.62;
    [leftReel, rightReel].forEach((cx) => {
        ctx.fillStyle = '#f5ead8';
        ctx.beginPath();
        ctx.arc(cx, reelY, reelR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = THEME.ink;
        ctx.lineWidth = 4 * scale;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, reelY, reelR * 0.34, 0, Math.PI * 2);
        ctx.stroke();
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
            ctx.beginPath();
            ctx.moveTo(cx, reelY);
            ctx.lineTo(cx + Math.cos(a) * reelR * 0.72, reelY + Math.sin(a) * reelR * 0.72);
            ctx.stroke();
        }
    });

    ctx.strokeStyle = THEME.ink;
    ctx.lineWidth = 10 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(leftReel + 62 * scale, reelY);
    ctx.lineTo(rightReel - 62 * scale, reelY);
    ctx.stroke();
    ctx.strokeStyle = THEME.blue;
    ctx.lineWidth = 8 * scale;
    ctx.beginPath();
    ctx.moveTo(leftReel + 62 * scale, reelY);
    ctx.lineTo(leftReel + 152 * scale, reelY);
    ctx.stroke();
}

function drawIconMark(ctx, size, maskable = false) {
    ctx.fillStyle = maskable ? THEME.blue : THEME.ink;
    ctx.fillRect(0, 0, size, size);

    // 吉他撥片（pick）+ 三條琴弦 — 對應品牌「吉他彈唱」。
    // 全程用向量繪製，不依賴音符字型字符（OG 子集字型未含 ♪/♫，會缺字）。
    const cx = size / 2;
    const reach = maskable ? 0.6 : 0.78;        // maskable 需留安全邊距
    const top = size * (0.5 - 0.31 * reach);
    const bottom = size * (0.5 + 0.33 * reach);
    const halfW = size * 0.3 * reach;
    const h = bottom - top;

    // 撥片外形：上寬下尖的圓角三角
    ctx.beginPath();
    ctx.moveTo(cx, bottom);
    ctx.quadraticCurveTo(cx - halfW * 1.55, top + h * 0.26, cx - halfW, top);
    ctx.quadraticCurveTo(cx, top - h * 0.14, cx + halfW, top);
    ctx.quadraticCurveTo(cx + halfW * 1.55, top + h * 0.26, cx, bottom);
    ctx.closePath();
    ctx.fillStyle = THEME.paper;
    ctx.fill();
    ctx.lineWidth = size * 0.028;
    ctx.strokeStyle = maskable ? '#ffffff' : THEME.blue;
    ctx.stroke();

    // 三條琴弦（藍）
    ctx.strokeStyle = THEME.blue;
    ctx.lineWidth = size * 0.028;
    ctx.lineCap = 'round';
    const sTop = top + h * 0.2;
    const sBot = bottom - h * 0.16;
    [-1, 0, 1].forEach((i) => {
        const sx = cx + i * halfW * 0.46;
        ctx.beginPath();
        ctx.moveTo(sx, sTop);
        ctx.lineTo(sx, sBot);
        ctx.stroke();
    });
}

function generateOgImage() {
    const W = 1200;
    const H = 630;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    drawPaperTexture(ctx, W, H);

    ctx.fillStyle = THEME.ink;
    ctx.fillRect(0, 0, W, 58);
    ctx.fillRect(0, H - 58, W, 58);
    ctx.fillStyle = '#ffffff';
    setFont(ctx, 800, 20);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DARK HORSE  ·  LIVE SETLIST  ·  SIDE A  ·  GUITAR SINGALONG', W / 2, 29);
    ctx.fillText('DARK HORSE  ·  LIVE SETLIST  ·  SIDE B  ·  AUDIENCE REQUEST', W / 2, H - 29);

    ctx.fillStyle = THEME.red;
    ctx.beginPath();
    ctx.arc(82, 116, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = THEME.muted;
    setFont(ctx, 700, 18);
    ctx.textAlign = 'left';
    ctx.fillText('ISSUE N°12 · SIDE A · 90 MIN', 104, 117);

    ctx.fillStyle = THEME.ink;
    setFont(ctx, 900, 84);
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('吉他彈唱', 72, 230);
    ctx.fillStyle = THEME.blue;
    ctx.fillText('點歌系統', 72, 318);

    ctx.fillStyle = THEME.ink;
    setFont(ctx, 700, 28);
    ctx.fillText('翻面、按下錄音鍵，', 76, 376);
    ctx.fillText('把想聽的歌寫進今晚歌單。', 76, 414);
    ctx.fillStyle = THEME.muted;
    setFont(ctx, 700, 22);
    ctx.fillText('現場投票 · 即時排行 · QR 分享', 76, 452);

    const statY = 504;
    const stats = [
        ['377', 'SETLIST'],
        ['LIVE', 'VOTING'],
        ['QR', 'SHARE'],
    ];
    stats.forEach(([num, label], i) => {
        const x = 82 + i * 170;
        ctx.fillStyle = THEME.ink;
        setFont(ctx, 900, i === 0 ? 44 : 34);
        ctx.fillText(num, x, statY);
        if (i < stats.length - 1) {
            ctx.fillStyle = THEME.line;
            ctx.fillRect(x + 120, statY - 38, 2, 44);
        }
    });

    fillRoundRect(ctx, 76, 524, 306, 40, 20, THEME.ink);
    ctx.fillStyle = '#ffffff';
    setFont(ctx, 800, 19);
    ctx.fillText(SITE_URL, 104, 550);

    drawCassette(ctx, 670, 150, 430, 330, 0.82);

    ctx.strokeStyle = THEME.line;
    ctx.lineWidth = 2;
    ctx.strokeRect(42, 88, W - 84, H - 176);

    return canvas.toBuffer('image/png');
}

function generateFaviconSource(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    drawIconMark(ctx, size, false);
    return canvas.toBuffer('image/png');
}

function generateMaskableIconSource(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    drawIconMark(ctx, size, true);
    return canvas.toBuffer('image/png');
}

function generateScreenshot(width, height, formFactor) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    drawPaperTexture(ctx, width, height);

    ctx.fillStyle = THEME.ink;
    ctx.fillRect(0, 0, width, Math.round(height * 0.08));
    ctx.fillStyle = '#ffffff';
    setFont(ctx, 900, Math.max(20, Math.round(width * 0.035)));
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Guitar Singalong', 32, Math.round(height * 0.04));

    const heroY = Math.round(height * 0.13);
    setFont(ctx, 900, Math.max(34, Math.round(width * 0.055)));
    ctx.fillStyle = THEME.ink;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('吉他彈唱', 32, heroY + 54);
    ctx.fillStyle = THEME.blue;
    ctx.fillText('點歌系統', 32, heroY + 112);

    setFont(ctx, 700, Math.max(16, Math.round(width * 0.018)));
    ctx.fillStyle = THEME.muted;
    ctx.fillText('翻面、按下錄音鍵，把想聽的歌寫進今晚的歌單。', 34, heroY + 160);

    const cassetteW = Math.min(width - 64, formFactor === 'wide' ? 460 : width - 96);
    const cassetteH = cassetteW * 0.55;
    drawCassette(ctx, width - cassetteW - 32, heroY + 190, cassetteW, cassetteH, cassetteW / 520);

    const listY = heroY + 210 + cassetteH;
    const cardW = width - 64;
    const cardH = formFactor === 'wide' ? 76 : 86;
    const songs = [
        ['01', '想聽的歌還沒有？', '推薦一首，下一場可能就會排進歌單'],
        ['02', '可選歌單', '搜尋、模糊查找、立即投票'],
        ['03', '人氣點播排行榜', '即時更新今晚最想聽的歌'],
    ];
    songs.forEach(([no, title, sub], i) => {
        const y = listY + i * (cardH + 14);
        fillRoundRect(ctx, 32, y, cardW, cardH, 12, '#ffffff');
        strokeRoundRect(ctx, 32, y, cardW, cardH, 12, THEME.line, 1);
        ctx.fillStyle = THEME.blue;
        setFont(ctx, 900, 18);
        ctx.fillText(no, 56, y + 33);
        ctx.fillStyle = THEME.ink;
        setFont(ctx, 900, 22);
        ctx.fillText(title, 108, y + 32);
        ctx.fillStyle = THEME.muted;
        setFont(ctx, 700, 15);
        ctx.fillText(sub, 108, y + 58);
    });

    return canvas.toBuffer('image/png');
}

async function main() {
    console.log('開始產生卡帶風 OG 圖與 favicon...\n');

    const ogBuffer = generateOgImage();
    writeFileSync(resolve(PUBLIC, 'og-preview.png'), ogBuffer);
    const ogHash = createHash('sha256').update(ogBuffer).digest('hex').slice(0, 12);
    console.log(`og-preview.png        1200x630   ${(ogBuffer.length / 1024).toFixed(1)} KB   hash=${ogHash}`);

    const htmlPath = resolve(ROOT, 'client', 'index.html');
    let html = readFileSync(htmlPath, 'utf8');
    const before = html;
    html = html.replace(/og-preview\.png\?v=[a-zA-Z0-9_-]+/g, `og-preview.png?v=${ogHash}`);
    if (html !== before) {
        writeFileSync(htmlPath, html);
        console.log(`index.html OG cache-bust updated to ${ogHash}`);
    } else {
        console.log(`index.html OG cache-bust already ${ogHash}`);
    }

    const sourcePng = generateFaviconSource(512);
    const sizes = [
        { name: 'icon-512.png', size: 512 },
        { name: 'icon-192.png', size: 192 },
        { name: 'apple-touch-icon.png', size: 180 },
        { name: 'favicon-32.png', size: 32 },
        { name: 'favicon-16.png', size: 16 },
    ];
    for (const { name, size } of sizes) {
        const buf = await sharp(sourcePng).resize(size, size).png().toBuffer();
        writeFileSync(resolve(PUBLIC, name), buf);
        console.log(`${name.padEnd(24)} ${size}x${size}   ${(buf.length / 1024).toFixed(1)} KB`);
    }

    const ico32 = await sharp(sourcePng).resize(32, 32).png().toBuffer();
    writeFileSync(resolve(PUBLIC, 'favicon.ico'), ico32);
    console.log(`favicon.ico             32x32    ${(ico32.length / 1024).toFixed(1)} KB`);

    const maskableSource = generateMaskableIconSource(512);
    const maskableSizes = [
        { name: 'icon-maskable-512.png', size: 512 },
        { name: 'icon-maskable-192.png', size: 192 },
    ];
    for (const { name, size } of maskableSizes) {
        const buf = await sharp(maskableSource).resize(size, size).png().toBuffer();
        writeFileSync(resolve(PUBLIC, name), buf);
        console.log(`${name.padEnd(24)} ${size}x${size}   ${(buf.length / 1024).toFixed(1)} KB`);
    }

    const screenshots = [
        { name: 'screenshot-narrow.png', width: 540, height: 720, formFactor: 'narrow' },
        { name: 'screenshot-wide.png', width: 1280, height: 720, formFactor: 'wide' },
    ];
    for (const { name, width, height, formFactor } of screenshots) {
        const buf = generateScreenshot(width, height, formFactor);
        writeFileSync(resolve(PUBLIC, name), buf);
        console.log(`${name.padEnd(24)} ${width}x${height}   ${(buf.length / 1024).toFixed(1)} KB`);
    }

    console.log('\n完成，檔案已輸出至 client/public/');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
