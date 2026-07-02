// U1 Phase 3b — 租戶自訂品牌（settings/branding，單一 doc）
// 設計文件：docs/design/U1-multi-tenant.md
// 每個空間（根空間 = 阿凱、租戶空間各自）都能設定自己的品牌名稱，
// 取代 Home.tsx 原本 hardcode 的「吉他彈唱之夜」。
import {
    onSnapshot, setDoc, Timestamp, type Unsubscribe,
} from 'firebase/firestore';
import { docRef, COLLECTIONS } from '../firebase';
import type { SpaceBranding } from './types';
import { SPACE_BRANDING_DEFAULT } from './types';

const BRANDING_DOC_ID = 'branding';
/** 空間名稱字數上限（rules 同步限制，前端先擋一次給即時錯誤訊息） */
export const SPACE_NAME_MAX_LENGTH = 60;

function deserializeBranding(data: Record<string, unknown> | undefined): SpaceBranding {
    if (!data) return SPACE_BRANDING_DEFAULT;
    return {
        spaceName: typeof data.spaceName === 'string' && data.spaceName.trim() ? data.spaceName : null,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : SPACE_BRANDING_DEFAULT.updatedAt,
    };
}

/** 訂閱目前空間的品牌設定（依 activeTenant 走根集合或租戶子集合） */
export function subscribeSpaceBranding(callback: (branding: SpaceBranding) => void): Unsubscribe {
    const ref = docRef(COLLECTIONS.settings, BRANDING_DOC_ID);
    return onSnapshot(ref, (snap) => callback(deserializeBranding(snap.data())), () => callback(SPACE_BRANDING_DEFAULT));
}

/**
 * 更新目前空間的品牌名稱。傳 null / 空字串會清除自訂名稱（改用預設）。
 * rules 限制：字串或 null，1-60 字。
 */
export async function updateSpaceName(spaceName: string | null): Promise<void> {
    const trimmed = spaceName?.trim() || null;
    if (trimmed && trimmed.length > SPACE_NAME_MAX_LENGTH) {
        throw new Error(`空間名稱最長 ${SPACE_NAME_MAX_LENGTH} 字`);
    }
    const ref = docRef(COLLECTIONS.settings, BRANDING_DOC_ID);
    await setDoc(ref, { spaceName: trimmed, updatedAt: Timestamp.now() }, { merge: true });
}
