// 正在彈奏中 Hook - 供訪客使用即時接收通知
import { useState, useEffect } from 'react';
import { subscribeNowPlaying, type NowPlayingInfo } from '@/lib/firestore';

export function useNowPlaying() {
    const [nowPlaying, setNowPlaying] = useState<NowPlayingInfo | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeNowPlaying(setNowPlaying);
        return () => unsubscribe();
    }, []);

    return nowPlaying;
}
