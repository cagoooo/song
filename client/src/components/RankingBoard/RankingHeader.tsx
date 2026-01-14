// 排行榜頂部標題裝飾區（效能優化版 - 移除無限循環動畫）
import { Trophy, Flame, Music2 } from 'lucide-react';

interface RankingHeaderProps {
    reduceMotion: boolean;
}

export function RankingHeader({ reduceMotion }: RankingHeaderProps) {
    return (
        <div
            className="mb-4 relative overflow-hidden rounded-xl p-3 sm:p-4 
                bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 
                border-2 border-amber-300/70 shadow-md"
        >
            {/* 靜態背景效果 */}
            <div
                className="absolute inset-0 z-0 bg-gradient-to-br from-yellow-400/10 via-amber-300/5 to-orange-200/10"
                style={{ borderRadius: "inherit" }}
            />

            {/* 標題部分 */}
            <div className="text-center relative z-10 flex flex-col items-center">
                {/* 上部的裝飾性圖標 - 靜態版本 */}
                <div className="flex items-center gap-4 mb-1">
                    <div className="relative">
                        <Music2 className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="relative">
                        <Trophy className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div className="relative">
                        <Flame className="h-5 w-5 text-orange-500" />
                    </div>
                </div>

                {/* 主標題 - 靜態版本 */}
                <div className="relative z-10 mt-1 mb-1">
                    <h2 className="inline-block font-bold text-lg sm:text-xl text-transparent bg-clip-text 
                        bg-gradient-to-r from-amber-800 via-yellow-600 to-amber-700 px-1">
                        🔥 熱門歌曲排行榜 🔥
                    </h2>

                    {/* 下劃線裝飾 - 靜態版本 */}
                    <div className="absolute -bottom-1 left-1/4 right-1/4 h-0.5 rounded-full 
                        bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-60" />
                </div>

                {/* 副標題 */}
                <p className="text-xs sm:text-sm text-amber-800/80 mt-1 mb-0.5 italic font-medium">
                    最受歡迎的點播歌曲實時排名
                </p>
            </div>

            {/* 靜態裝飾性光芒 */}
            <div
                className="absolute top-1/2 left-0 w-20 h-20 -translate-y-1/2 pointer-events-none opacity-20"
                style={{
                    background: "radial-gradient(circle, rgba(251, 191, 36, 0.3), transparent 70%)",
                    filter: "blur(10px)",
                    borderRadius: "50%"
                }}
            />
            <div
                className="absolute top-1/2 right-0 w-20 h-20 -translate-y-1/2 pointer-events-none opacity-15"
                style={{
                    background: "radial-gradient(circle, rgba(251, 191, 36, 0.3), transparent 70%)",
                    filter: "blur(10px)",
                    borderRadius: "50%"
                }}
            />
        </div>
    );
}
