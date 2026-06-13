// AI 譜圖辨識（Gemini Vision）— 打 Supabase Edge Function 代理，前端不碰金鑰
//
// 📐 設計文件：docs/design/G3-sheet-ocr.md（G3b-2 AI Vision）
//
// 與 Tesseract（sheetOcr.ts）互補：Tesseract 免費即時當預設，辨識不滿意時
// 按「✨ AI 辨識」走這條 — Gemini 看圖直接出文字譜，連反白段落標籤、手機
// 拍照歪斜的譜都讀得懂，品質接近人工抄譜。
//
// 金鑰：存在後端 RLS 鎖死的 guitar_config 表，edge function 用 service_role
// 讀；前端只帶公開的 anon key（設計上可公開，資料靠 RLS 保護）。

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
 * 用 Gemini Vision 把譜圖辨識成文字譜。
 * @param image File / Blob / dataURL
 * @returns 文字譜（可直接餵 transposeChordSheet）
 * @throws Error（含後端回傳的中文錯誤訊息，如額度用完 429）
 */
export async function aiRecognizeSheet(image: File | Blob | string): Promise<string> {
    const dataUrl = typeof image === 'string' ? image : await blobToDataUrl(image);
    const mime = dataUrl.match(/^data:([^;]+)/)?.[1] || 'image/png';

    const resp = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ image: dataUrl, mime, client: getClientId() }),
    });

    const data = await resp.json().catch(() => ({} as { sheet?: string; error?: string }));
    if (!resp.ok) {
        throw new Error(data?.error || `AI 辨識失敗（${resp.status}）`);
    }
    return (data?.sheet || '').toString();
}
