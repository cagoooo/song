// AI sheet image recognition (Gemini Vision) through Supabase Edge Function.
// This is now the only image recognition path used by the transpose tool.
// The legacy browser-side OCR flow was removed because AI recognition is materially more accurate for chord sheets and screenshots.
import { getActiveTenant } from './firebase';

const ENDPOINT = 'https://xcnmmaayrtiklntvhdhc.supabase.co/functions/v1/guitar-ai-sheet';
const ANON_KEY = 'sb_publishable_nDPdupsm5wZI20iddtf12w_iV82XILn';

/** 裝置識別（後端每日限流用）— localStorage 存一個隨機 id */
function getClientId(): string {
    try {
        const KEY = 'guitar:client-id';
        let id = localStorage.getItem(KEY);
        if (!id) {
            id = (typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : String(Date.now()) + Math.round(Math.random() * 1e9)).slice(0, 40);
            localStorage.setItem(KEY, id);
        }
        return id;
    } catch {
        return 'anon';
    }
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('讀取圖片失敗'));
        reader.readAsDataURL(blob);
    });
}

/**
 * 上傳前壓縮圖片 — 手機截圖常是 1080×3000 的 PNG（base64 好幾 MB），
 * 4G 上傳 + Gemini 處理大圖都很慢（曾達 2 分鐘）。縮到最長邊 1600 +
 * JPEG 0.85，上傳量從幾 MB 降到幾百 KB，辨識速度大幅提升；Gemini Vision
 * 辨識譜文字 1600px 已足夠清晰。失敗則退回原圖（不擋流程）。
 */
async function imageToOptimizedDataUrl(image: File | Blob): Promise<string> {
    try {
        if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
            return blobToDataUrl(image);
        }
        const bmp = await createImageBitmap(image);
        const MAX = 1600;
        const longest = Math.max(bmp.width, bmp.height);
        const scale = longest > MAX ? MAX / longest : 1;
        const w = Math.round(bmp.width * scale);
        const h = Math.round(bmp.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return blobToDataUrl(image);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bmp, 0, 0, w, h);
        // 截圖常是肥大 PNG → 一律轉 JPEG 壓掉體積
        return canvas.toDataURL('image/jpeg', 0.85);
    } catch {
        return blobToDataUrl(image);
    }
}

/**
 * 用 Gemini Vision 把譜圖辨識成文字譜。
 * @param image File / Blob / dataURL
 * @returns 文字譜（可直接餵 transposeChordSheet）
 * @throws Error（含後端回傳的中文錯誤訊息，如額度用完 429）
 */
export async function aiRecognizeSheet(image: File | Blob | string): Promise<string> {
    const dataUrl = typeof image === 'string' ? image : await imageToOptimizedDataUrl(image);
    const mime = dataUrl.match(/^data:([^;]+)/)?.[1] || 'image/jpeg';

    // 超時保護：避免極端情況無限等（縮圖後正常 5-15 秒）
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 70000);
    try {
        const resp = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: ANON_KEY,
                Authorization: `Bearer ${ANON_KEY}`,
            },
            // U1 Phase 3c：帶目前空間（租戶 uid，根空間為 null）— 後端依此套用
            // per-space 每日額度，避免單一租戶用光全站共用配額
            body: JSON.stringify({ image: dataUrl, mime, client: getClientId(), space: getActiveTenant() }),
            signal: controller.signal,
        });
        const data = await resp.json().catch(() => ({} as { sheet?: string; error?: string }));
        if (!resp.ok) {
            throw new Error(data?.error || `AI 辨識失敗（${resp.status}）`);
        }
        const sheet = (data?.sheet || '').toString();
        try {
            const { optimizeAiLayout } = await import('./aiLayoutOptimizer');
            return optimizeAiLayout(sheet);
        } catch (e) {
            console.error('Failed to optimize layout:', e);
            return sheet;
        }
    } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
            throw new Error('AI 辨識超時，請換解析度低一點的圖、或稍後再試');
        }
        throw e;
    } finally {
        clearTimeout(timer);
    }
}
