// U1 Phase 3b — 目前空間的品牌設定 hook（取代 Home.tsx 原本 hardcode 的品牌名）
import { useEffect, useState } from 'react';
import { subscribeSpaceBranding, SPACE_BRANDING_DEFAULT } from '@/lib/firestore';
import type { SpaceBranding } from '@/lib/firestore';

export function useSpaceBranding(): SpaceBranding {
    const [branding, setBranding] = useState<SpaceBranding>(SPACE_BRANDING_DEFAULT);

    useEffect(() => {
        const unsubscribe = subscribeSpaceBranding(setBranding);
        return () => unsubscribe();
    }, []);

    return branding;
}
