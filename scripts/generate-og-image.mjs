#!/usr/bin/env node
/**
 * 一次產生：
 *   - client/public/og-preview.png   1200×630  (FB / LINE / Twitter 分享卡片)
 *   - client/public/icon-512.png     512×512   (PWA, maskable)
 *   - client/public/icon-192.png     192×192   (PWA)
 *   - client/public/apple-touch-icon.png  180×180  (iOS 主畫面)
 *   - client/public/favicon-32.png   32×32    (現代瀏覽器)
 *   - client/public/favicon-16.png   16×16    (老瀏覽器)
 *   - client/public/favicon.ico      multi    (含 16 + 32)
 *
 * 字型用 @napi-rs/canvas + registerFromPath() 載入精簡版 Noto Sans TC，
 * 不依賴系統字型，跨平台 (Windows / Linux CI / macOS) 渲染一致。
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
    console.error('❌ 找不到精簡字型，請先執行：npm run subset-og-font');
    process.exit(1);
}
GlobalFonts.registerFromPath(FONT_PATH, 'NotoSansTC');
mkdirSync(PUBLIC, { recursive: true });

// ==================== 主題色 ====================
const THEME = {
    primary: '#f59e0b',     // amber-500
    primaryDark: '#b45309', // amber-700
    accent: '#fbbf24',      // amber-400
    bgFrom: '#fef3c7',      // amber-100
    bgTo: '#fbbf24',        // amber-400
    text: '#1c1917',        // stone-900
    textMuted: '#57534e',   // stone-600
};

// ==================== Helpers ====================
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

/** 在指定中心點畫吉他剪影（用 path 而非 emoji，免依賴 emoji 字型） */
function drawGuitarIcon(ctx, cx, cy, scale, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;

    // 琴身（葫蘆狀）
    ctx.beginPath();
    ctx.ellipse(0, 30, 38, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -25, 28, 36, 0, 0, Math.PI * 2);
    ctx.fill();

    // 音孔（深色圓）
    ctx.fillStyle = THEME.text;
    ctx.beginPath();
    ctx.arc(0, 25, 12, 0, Math.PI * 2);
    ctx.fill();

    // 琴頸
    ctx.fillStyle = color;
    ctx.fillRect(-7, -75, 14, 60);

    // 琴頭
    ctx.fillRect(-12, -90, 24, 18);

    ctx.restore();
}

/** 畫單個音符 ♪（用 Unicode 字元，Noto Sans TC 有） */
function drawNote(ctx, x, y, size, color, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = color;
    ctx.font = `900 ${size}px "NotoSansTC"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♪', 0, 0);
    ctx.restore();
}

// ==================== OG 圖 1200×630 ====================
function generateOgImage() {
    const W = 1200, H = 630;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // 背景：amber 漸層
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, THEME.bgFrom);
    grad.addColorStop(1, THEME.bgTo);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 裝飾音符（背景）
    drawNote(ctx, 100, 120, 80, 'rgba(180,83,9,0.15)', -0.3);
    drawNote(ctx, 1080, 100, 70, 'rgba(180,83,9,0.18)', 0.2);
    drawNote(ctx, 1130, 480, 90, 'rgba(180,83,9,0.12)', -0.15);
    drawNote(ctx, 80, 500, 60, 'rgba(180,83,9,0.18)', 0.25);

    // 左側吉他圖示
    drawGuitarIcon(ctx, 220, 330, 1.6, THEME.primaryDark);

    // 右側文字區塊
    const textX = 420;

    // 主標題
    ctx.fillStyle = THEME.text;
    ctx.font = '900 88px "NotoSansTC"';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('吉他彈唱', textX, 220);
    ctx.fillText('點歌系統', textX, 320);

    // 副標題
    ctx.fillStyle = THEME.textMuted;
    ctx.font = '700 32px "NotoSansTC"';
    ctx.fillText('即時點播・現場互動・社群分享', textX, 400);

    // 網址膠囊
    const urlText = 'cagoooo.github.io/song';
    ctx.font = '800 26px "NotoSansTC"';
    const urlMetrics = ctx.measureText(urlText);
    const padX = 28, padY = 16;
    const capW = urlMetrics.width + padX * 2 + 28; // 28 = 箭頭預留
    const capH = 56;
    const capX = textX, capY = 480;

    ctx.fillStyle = THEME.primaryDark;
    roundRect(ctx, capX, capY, capW, capH, capH / 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(urlText, capX + padX, capY + capH / 2);
    ctx.font = '900 22px "NotoSansTC"';
    ctx.fillText('→', capX + capW - padX - 14, capY + capH / 2);

    // 邊框細節
    ctx.strokeStyle = 'rgba(180,83,9,0.3)';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, W, H);

    return canvas.toBuffer('image/png');
}

// ==================== Favicon (吉他 + 主題色) ====================
/** 產生方形 icon source，後續 sharp resize 出多尺寸 */
function generateFaviconSource(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // 圓角背景
    const r = size * 0.22;
    ctx.fillStyle = THEME.primary;
    roundRect(ctx, 0, 0, size, size, r);
    ctx.fill();

    // 中央吉他剪影
    drawGuitarIcon(ctx, size / 2, size / 2 + size * 0.04, size / 220, '#fff');

    return canvas.toBuffer('image/png');
}

// ==================== 主流程 ====================
async function main() {
    console.log('🎨 開始產生 OG 圖與 favicon...\n');

    // 1) OG 圖
    const ogBuffer = generateOgImage();
    writeFileSync(resolve(PUBLIC, 'og-preview.png'), ogBuffer);
    const ogHash = createHash('sha256').update(ogBuffer).digest('hex').slice(0, 12);
    console.log(`✓ og-preview.png   1200×630   ${(ogBuffer.length / 1024).toFixed(1)} KB   hash=${ogHash}`);

    // 把 index.html 中的 __OG_HASH__ 占位符換成 PNG 內容雜湊。
    // 內容沒變 → 雜湊不變 → URL 不變；內容變 → URL 變 → 強制 FB/LINE 重抓。
    const htmlPath = resolve(ROOT, 'client', 'index.html');
    let html = readFileSync(htmlPath, 'utf8');
    const before = html;
    // 同時處理新檔的 placeholder 與既有的舊 hash（?v=xxx）
    html = html.replace(/og-preview\.png\?v=[a-zA-Z0-9_]+/g, `og-preview.png?v=${ogHash}`);
    if (html !== before) {
        writeFileSync(htmlPath, html);
        console.log(`✓ index.html 的 og:image / twitter:image / linkedin:image 已更新為 ?v=${ogHash}`);
    } else {
        console.log(`✓ index.html cache-bust hash 已是最新 (${ogHash})`);
    }

    // 2) 用 sharp 從一張高解析 source resize 出各尺寸（更銳利）
    const SOURCE_SIZE = 512;
    const sourcePng = generateFaviconSource(SOURCE_SIZE);

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
        console.log(`✓ ${name.padEnd(22)} ${size}×${size}    ${(buf.length / 1024).toFixed(1)} KB`);
    }

    // 3) favicon.ico (含 16 + 32 雙尺寸)
    //    sharp 不直接支援 ico，但現代瀏覽器其實接受 PNG 當 .ico
    //    為了相容老瀏覽器，我們就把 32×32 PNG 命名成 .ico（瀏覽器認 magic byte）
    //    若需要真正多尺寸 .ico，可以另外用 to-ico 套件，但實務上 32×32 已足夠
    const ico32 = await sharp(sourcePng).resize(32, 32).png().toBuffer();
    writeFileSync(resolve(PUBLIC, 'favicon.ico'), ico32);
    console.log(`✓ favicon.ico        32×32     ${(ico32.length / 1024).toFixed(1)} KB  (PNG-as-ICO)`);

    console.log('\n✨ 完成！檔案輸出至 client/public/');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
