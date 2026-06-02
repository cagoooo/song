// 超寬螢幕欄數 —— 演出投影常是 1920+，主歌單在 2xl（≥1536px）排雙欄善用空間。
// 回傳目前欄數（1 或 2），隨視窗寬度即時更新。
import { useEffect, useState } from 'react';

const WIDE_QUERY = '(min-width: 1536px)'; // Tailwind 2xl

export function useWideColumns(): number {
    const [cols, setCols] = useState<number>(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return 1;
        return window.matchMedia(WIDE_QUERY).matches ? 2 : 1;
    });

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia(WIDE_QUERY);
        const onChange = () => setCols(mq.matches ? 2 : 1);
        onChange();
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    return cols;
}
