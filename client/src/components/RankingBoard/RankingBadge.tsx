// 排名圖標元件 (前三名特殊顯示) - 現代化設計版
import { memo } from 'react';
import { motion } from 'framer-motion';
import { Crown, Medal, Trophy } from 'lucide-react';

interface RankingBadgeProps {
    index: number;
    showRankChange: 'up' | 'down' | null;
}

export const RankingBadge = memo(function RankingBadge({
    index,
    showRankChange
}: RankingBadgeProps) {
    return (
        <div className="relative flex items-center justify-center shrink-0">
            {/* 第一名 - 金色圓形徽章 */}
            {index === 0 && (
                <div className="relative w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center">
                    {/* 光暈背景 */}
                    <div
                        className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 opacity-30"
                        style={{ transform: 'scale(1.3)' }}
                    />
                    {/* 主徽章 */}
                    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 
                        flex items-center justify-center shadow-lg shadow-amber-300/50
                        ring-2 ring-amber-300/50 ring-offset-1 ring-offset-white">
                        <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-amber-900 drop-shadow-sm" />
                    </div>
                    {/* 閃光點 */}
                    <div className="absolute top-0.5 right-1 w-2 h-2 rounded-full bg-white/70" />
                </div>
            )}

            {/* 第二名 - 銀色圓形徽章 */}
            {index === 1 && (
                <div className="relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center">
                    {/* 主徽章 */}
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-300 via-gray-200 to-slate-400 
                        flex items-center justify-center shadow-md shadow-slate-300/50
                        ring-2 ring-slate-300/50 ring-offset-1 ring-offset-white">
                        <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700 drop-shadow-sm" />
                    </div>
                    {/* 閃光點 */}
                    <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white/60" />
                </div>
            )}

            {/* 第三名 - 銅色圓形徽章 */}
            {index === 2 && (
                <div className="relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center">
                    {/* 主徽章 */}
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-400 via-amber-600 to-orange-500 
                        flex items-center justify-center shadow-md shadow-orange-300/50
                        ring-2 ring-orange-300/50 ring-offset-1 ring-offset-white">
                        <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-orange-900 drop-shadow-sm" />
                    </div>
                    {/* 閃光點 */}
                    <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white/50" />
                </div>
            )}

            {/* 4-10 名 - 漸層數字徽章 */}
            {index >= 3 && index < 10 && (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 
                    flex items-center justify-center shadow-sm
                    ring-1 ring-slate-200/80">
                    <span className="text-sm sm:text-base font-bold text-slate-600">
                        {index + 1}
                    </span>
                </div>
            )}

            {/* 11 名以後 - 簡單數字 */}
            {index >= 10 && (
                <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center">
                    <span className="text-sm font-medium text-slate-500">
                        {index + 1}
                    </span>
                </div>
            )}

            {/* 排名變化指示器 - 保留動畫（只在變化時觸發） */}
            {showRankChange && (
                <motion.div
                    initial={{ opacity: 0, x: showRankChange === 'up' ? -20 : 20, scale: 0.5 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 25
                    }}
                    className={`
                        absolute -left-5 sm:-left-6 text-xs sm:text-sm font-bold
                        ${showRankChange === 'up'
                            ? 'text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full shadow-sm'
                            : 'text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-full shadow-sm'}
                    `}
                >
                    {showRankChange === 'up' ? '↑' : '↓'}
                </motion.div>
            )}
        </div>
    );
});
