// 空狀態提示元件（效能優化版）
import { motion } from 'framer-motion';
import { Music, Search, Lightbulb, Inbox } from 'lucide-react';

type EmptyStateVariant = 'no-songs' | 'no-results' | 'no-suggestions' | 'no-data';

interface EmptyStateProps {
    variant: EmptyStateVariant;
    searchTerm?: string;
    className?: string;
}

const configs: Record<EmptyStateVariant, {
    icon: typeof Music;
    title: string | ((term?: string) => string);
    description: string;
    emoji: string;
}> = {
    'no-songs': {
        icon: Music,
        title: '目前還沒有歌曲',
        description: '管理員可以透過上傳功能新增歌曲',
        emoji: '🎸',
    },
    'no-results': {
        icon: Search,
        title: (term) => `找不到「${term || ''}」`,
        description: '試試其他關鍵字或切換至模糊搜尋模式',
        emoji: '🔍',
    },
    'no-suggestions': {
        icon: Lightbulb,
        title: '還沒有人建議歌曲',
        description: '成為第一個建議新歌的人吧！',
        emoji: '💡',
    },
    'no-data': {
        icon: Inbox,
        title: '暫無資料',
        description: '目前沒有可顯示的內容',
        emoji: '📭',
    },
};

export function EmptyState({ variant, searchTerm, className = '' }: EmptyStateProps) {
    const config = configs[variant];
    const Icon = config.icon;
    const title = typeof config.title === 'function'
        ? config.title(searchTerm)
        : config.title;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
        >
            {/* 靜態 Emoji（移除無限循環動畫） */}
            <div className="text-6xl mb-4">
                {config.emoji}
            </div>

            <div className="relative mb-4">
                {/* 靜態背景圓（移除無限循環動畫） */}
                <div className="absolute inset-0 rounded-full bg-gray-100" />
                <Icon className="relative w-12 h-12 text-gray-300" />
            </div>

            <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {title}
            </h3>

            <p className="text-sm text-gray-500 max-w-xs">
                {config.description}
            </p>

            {variant === 'no-results' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 text-xs text-gray-400"
                >
                    💡 提示：模糊搜尋可以容忍打字錯誤
                </motion.div>
            )}
        </motion.div>
    );
}

export default EmptyState;
