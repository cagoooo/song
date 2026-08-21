import { useEffect, useState } from 'react';
import { lookupAppleMusicSongUrl } from '@/lib/musicSearch';

/**
 * 背景把「快速找音樂」的關鍵字換成 Apple Music 的歌曲連結。
 *
 * 為什麼要「先查好」而不是「按下去才查」：按下去才查就得 await 之後再開新分頁，
 * iOS Safari 會把那個 window.open 當成非使用者觸發而擋掉。改成一進畫面就先查、
 * 查到就把 <a href> 換成真正的歌曲網址，按下去仍是一個普通連結，不會被擋。
 *
 * 查不到 / 失敗 → 維持 null，呼叫端自然退回搜尋網址，不會比現在更糟。
 */
export function useAppleMusicSongUrl(query: string, enabled = true): string | null {
    const [songUrl, setSongUrl] = useState<string | null>(null);

    useEffect(() => {
        const q = query.trim();
        if (!enabled || !q) {
            setSongUrl(null);
            return;
        }
        // 關鍵字會隨使用者打字（歌名 / 歌手欄位）一直變，先等他停手再查
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            void lookupAppleMusicSongUrl(q, { signal: controller.signal }).then((url) => {
                if (!controller.signal.aborted) setSongUrl(url);
            });
        }, 400);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [enabled, query]);

    return songUrl;
}
