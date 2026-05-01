import { History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface VoteHistoryButtonProps {
    todayCount: number;
    totalCount: number;
    onClick: () => void;
}

export function VoteHistoryButton({ todayCount, totalCount, onClick }: VoteHistoryButtonProps) {
    if (totalCount === 0) return null;

    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClick}
            aria-label={`點播歷史，今日 ${todayCount} 次`}
            className="relative h-8 px-2 text-xs gap-1.5 shrink-0"
        >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">歷史</span>
            <AnimatePresence>
                {todayCount > 0 && (
                    <motion.span
                        key={todayCount}
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="ml-0.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold"
                    >
                        {todayCount > 99 ? '99+' : todayCount}
                    </motion.span>
                )}
            </AnimatePresence>
        </Button>
    );
}
