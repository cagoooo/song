// 排行榜頂部標題裝飾區（極簡版）
import { Trophy } from 'lucide-react';

interface RankingHeaderProps {
    reduceMotion: boolean;
}

export function RankingHeader({ reduceMotion }: RankingHeaderProps) {
    return (
        <div className="mb-3 flex items-center justify-between px-1">
            {/* 標題 */}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                    <Trophy className="h-4 w-4 text-white" />
                </div>
                <div>
                    <h2 className="font-bold text-base text-slate-800 whitespace-nowrap">
                        熱門歌曲排行榜
                    </h2>
                    <p className="text-xs text-slate-500">
                        即時更新
                    </p>
                </div>
            </div>
        </div>
    );
}
