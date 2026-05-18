// 雜誌期刊期數設定 hook — 5 件套都從這裡讀，避免 ISSUE №12 hardcode
//
// 📐 設計文件：docs/design/D1-issue-system.md
//
// 設計策略：
//   - 第一次 render 立刻用 MAGAZINE_DEFAULTS（不閃白）
//   - 訂閱 Firestore live update（admin 改設定立刻反映）
//   - Firestore doc 不存在 / 出錯 → 仍回 defaults，不會 break UI
//
// Phase 2 才會把 5 件套 hardcode 移除改用這個。
// Phase 1 (本 PR) 僅建立基礎設施 + 測試。

import { useEffect, useState } from 'react';
import { subscribeMagazineSettings, MAGAZINE_DEFAULTS } from '@/lib/firestore';
import type { MagazineSettings } from '@/lib/firestore';

export interface UseMagazineReturn {
    /** 當前設定（永遠有值，不會 null） */
    settings: MagazineSettings;
    /** 是否還在等 Firestore 第一次回應（false 後表示已收到至少一次回應，可能是預設值） */
    loading: boolean;
    /** 格式化的 issue 編號 — "Nº 12" */
    issueNo: string;
    /** 格式化的副標 — "Nº 12 · SIDE A" */
    issueLabel: string;
}

export function useMagazine(): UseMagazineReturn {
    const [settings, setSettings] = useState<MagazineSettings>(MAGAZINE_DEFAULTS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeMagazineSettings((s) => {
            setSettings(s);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const issueNo = `Nº ${settings.currentIssueNumber}`;
    const issueLabel = `${issueNo} · SIDE ${settings.currentSideLabel}`;

    return { settings, loading, issueNo, issueLabel };
}
