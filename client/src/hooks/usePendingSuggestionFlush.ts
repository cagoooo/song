// 離線送出佇列的自動補送：App 啟動 + 恢復連線時，重送尚未送達的點歌建議。
import { useEffect } from 'react';
import { flushPendingSuggestions } from '@/lib/firestore';
import { pendingSuggestionCount } from '@/lib/pendingSuggestions';
import { useToast } from '@/hooks/use-toast';

export function usePendingSuggestionFlush(): void {
    const { toast } = useToast();

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            if (pendingSuggestionCount() === 0) return;
            const { ok } = await flushPendingSuggestions();
            if (!cancelled && ok > 0) {
                toast({
                    title: `已自動補送 ${ok} 首推薦`,
                    description: '剛剛網路不穩暫存的推薦已成功送達阿凱老師。',
                    variant: 'success',
                });
            }
        };

        // 啟動先補送一次（涵蓋上次離線後關掉分頁的殘留），之後每次恢復連線再補送
        void run();
        const onOnline = () => void run();
        window.addEventListener('online', onOnline);
        return () => {
            cancelled = true;
            window.removeEventListener('online', onOnline);
        };
    }, [toast]);
}
