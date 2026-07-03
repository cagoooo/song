// U1 — 空間識別格式的唯一定義（零依賴小模組，firebase.ts 與 spaceUrl.ts 共用）
//
// 2026-07-03 實戰教訓：?space= 的網址解析規則（曾要求 ≥6 碼）與 slug 驗證規則
// （≥3 碼）各寫一份，5 碼的 slug「bobby」存得進對照表、卻被網址解析丟棄，
// 整頁 fallback 到根空間。→ 格式定義只能有一份，兩邊都從這裡拿。

/** Firebase Auth uid：固定 28 碼英數字（無 dash，與 slug 格式不重疊可直接分辨） */
const FIREBASE_UID_RE = /^[A-Za-z0-9]{28}$/;

/**
 * ?space= 參數可接受的格式：uid（28 碼）或 slug（3-32 碼小寫英數字 + dash）。
 * 下限 3 必須與 spaceUrl.ts 的 isValidSlug 一致。
 */
const SPACE_PARAM_RE = /^[A-Za-z0-9_-]{3,128}$/;

export function isFirebaseUid(value: string): boolean {
    return FIREBASE_UID_RE.test(value);
}

export function isValidSpaceParam(value: string): boolean {
    return SPACE_PARAM_RE.test(value);
}
