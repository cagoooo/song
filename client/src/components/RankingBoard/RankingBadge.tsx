// 排名圖標元件 (前三名特殊顯示) - 效能優化版
import { memo } from 'react';
import { motion } from 'framer-motion';
import { Crown, Award, Trophy } from 'lucide-react';

interface RankingBadgeProps {
    index: number;
    showRankChange: 'up' | 'down' | null;
}

export const RankingBadge = memo(function RankingBadge({
    index,
    showRankChange
}: RankingBadgeProps) {
    return (
        <div className="relative flex items-center justify-center w-10 h-10">
            {/* 第一名 - 靜態皇冠 */}
            {index === 0 && (
                <div className="relative">
                    <Crown className="w-7 h-7 text-amber-500 drop-shadow-sm" />
                    {/* 靜態光暈效果 */}
                    <div
                        className="absolute inset-0 bg-amber-300/20 rounded-full -z-10 scale-150"
                        style={{ filter: "blur(4px)" }}
                    />
                </div>
            )}

            {/* 第二名 - 靜態獎章 */}
            {index === 1 && (
                <div className="relative">
                    <Award className="w-5 h-5 text-gray-500 drop-shadow-sm" />
                </div>
            )}

            {/* 第三名 - 靜態獎盃 */}
            {index === 2 && (
                <div className="relative">
                    <Trophy className="w-5 h-5 text-orange-500 drop-shadow-sm" />
                </div>
            )}

            {/* 其他名次 - 數字 */}
            {index > 2 && (
                <span className="text-sm font-medium text-gray-600">
                    {index + 1}
                </span>
            )}

            {/* 排名變化指示器 - 保留動畫（只在變化時觸發，非無限循環） */}
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
                        absolute -left-6 text-sm font-bold
                        ${showRankChange === 'up'
                            ? 'text-green-500 bg-green-100/50 px-1.5 py-0.5 rounded-full'
                            : 'text-red-500 bg-red-100/50 px-1.5 py-0.5 rounded-full'}
                    `}
                >
                    {showRankChange === 'up' ? '↑' : '↓'}
                </motion.div>
            )}
        </div>
    );
});
