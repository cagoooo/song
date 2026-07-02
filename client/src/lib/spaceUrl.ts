// U1 Phase 2 — 租戶公開網址工具
// 設計文件：docs/design/U1-multi-tenant.md
// 每個租戶空間的正式入口是「站台網址 + ?space={uid}」；根空間（阿凱）
// 則是乾淨的站台網址。分享按鈕 / QR / 演出模式都用這裡組網址，
// 避免直接分享 window.location.href 把 ?mode=stage 之類的參數帶出去。
import { getActiveTenant } from './firebase';

/** 組出指定空間的公開網址（純函式，方便測試） */
export function buildSpacePublicUrl(
    origin: string,
    pathname: string,
    spaceId: string | null,
): string {
    const base = `${origin}${pathname}`;
    return spaceId ? `${base}?space=${encodeURIComponent(spaceId)}` : base;
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
