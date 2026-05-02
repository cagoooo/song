import { motion, AnimatePresence } from 'framer-motion';
import { SURGE_META, type SurgeLevel } from '@/hooks/useVoteSurge';
import { cn } from '@/lib/utils';

interface SurgeBadgeProps {
    level: SurgeLevel;
    /** 'sm' for SongCard / RankingBoard, 'lg' for StagePage */
    size?: 'sm' | 'lg';
    className?: string;
}

/** 飆升等級徽章 — 只有 level > 0 才會渲染，內建出場/退場動畫 */
export function SurgeBadge({ level, size = 'sm', className }: SurgeBadgeProps) {
    const meta = level > 0 ? SURGE_META[level as Exclude<SurgeLevel, 0>] : null;

    return (
        <AnimatePresence>
            {meta && (
                <motion.span
                    key={level}
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{
                        scale: 1,
                        rotate: 0,
                        transition: { type: 'spring', stiffness: 400, damping: 15 },
                    }}
                    exit={{ scale: 0, opacity: 0 }}
                    className={cn(
                        'inline-flex items-center gap-1 rounded-full font-black shadow-lg',
                        size === 'sm'
                            ? 'px-2 py-0.5 text-[10px]'
                            : 'px-3 py-1 text-base',
                        meta.badgeClass,
                        className
                    )}
                    aria-label={`飆升等級：${meta.label}`}
                >
                    <motion.span
                        animate={{
                            rotate: [0, -10, 10, -10, 0],
                            scale: [1, 1.2, 1, 1.2, 1],
                        }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        {meta.emoji}
                    </motion.span>
                    <span>{meta.label}</span>
                </motion.span>
            )}
        </AnimatePresence>
    );
}
