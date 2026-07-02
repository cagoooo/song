// U1 Phase 2 — 租戶公開網址工具
// 設計文件：docs/design/U1-multi-tenant.md
// 每個租戶空間的正式入口是「站台網址 + ?space={uid}」；根空間（阿凱）
// 則是乾淨的站台網址。分享按鈕 / QR / 演出模式都用這裡組網址，
// 避免直接分享 window.location.href 把 ?mode=stage 之類的參數帶出去。
import { getActiveTenant } from './firebase';

/** 組出指定空間的公開網址（純函式，方便測試）。spaceId 可以是 uid 或 Phase 3a 短網址 slug */
export function buildSpacePublicUrl(
    origin: string,
    pathname: string,
    spaceId: string | null,
): string {
    const base = `${origin}${pathname}`;
    return spaceId ? `${base}?space=${encodeURIComponent(spaceId)}` : base;
}

// Phase 3a：好記短網址（?space=my-band 取代一長串 uid）
// 3-32 碼小寫英數字 + dash，且不能以 dash 開頭/結尾/連續 —
// 這個格式跟 Firebase Auth uid（固定 28 碼英數字，無 dash）不會混淆。
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MIN = 3;
const SLUG_MAX = 32;

export function isValidSlug(slug: string): boolean {
    return slug.length >= SLUG_MIN && slug.length <= SLUG_MAX && SLUG_RE.test(slug);
}

/** 把使用者輸入正規化成合法 slug 候選（小寫、空白轉 dash、去除不合法字元）— 不保證結果通過 isValidSlug（太短仍會失敗） */
export function normalizeSlug(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, SLUG_MAX);
}

/** 組出指定空間的演出模式網址（?mode=stage 開新分頁 / 投影用） */
export function buildSpaceStageUrl(spaceId: string | null): string {
    return spaceId ? `?mode=stage&space=${encodeURIComponent(spaceId)}` : '?mode=stage';
}

/** 目前空間的公開網址 — 訪客掃 QR / 點連結會直接落在同一個空間 */
export function getCurrentSpacePublicUrl(): string {
    return buildSpacePublicUrl(
        window.location.origin,
        window.location.pathname,
        getActiveTenant(),
    );
}
