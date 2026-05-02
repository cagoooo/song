import { useMemo } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoterLeaderboard } from '@/hooks/useVoterLeaderboard';

interface VoterLeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const RANK_BADGES = [
    { color: 'from-yellow-400 to-amber-500', emoji: '🥇' },
    { color: 'from-slate-300 to-slate-400', emoji: '🥈' },
    { color: 'from-orange-400 to-orange-600', emoji: '🥉' },
];

export function VoterLeaderboardModal({ isOpen, onClose }: VoterLeaderboardModalProps) {
    const { topVoters, totalVotes, totalVoters, yourRank, yourCount } = useVoterLeaderboard(20);

    const youInTop = useMemo(
        () => topVoters.some((v) => v.isYou),
        [topVoters]
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        投票領袖板
                    </DialogTitle>
                    <DialogDescription>
                        累計 <span className="font-semibold text-primary">{totalVotes}</span> 票
                        ・ <span className="font-semibold">{totalVoters}</span> 位投票者
                        {yourRank && (
                            <>
                                ・你目前排第 <span className="font-bold text-amber-600">{yourRank}</span> 名
                                （{yourCount} 票）
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {topVoters.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                        <Crown className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>還沒有投票紀錄</p>
                        <p className="text-xs mt-1">第一票就是你的！🎸</p>
                    </div>
                ) : (
                    <ScrollArea className="h-[400px] pr-3">
                        <div className="space-y-2">
                            <AnimatePresence initial={false}>
                                {topVoters.map((voter, i) => {
                                    const badge = i < 3 ? RANK_BADGES[i] : null;
                                    return (
                                        <motion.div
                                            key={voter.sessionId}
                                            layout
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.2, delay: i * 0.02 }}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                                voter.isYou
                                                    ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300 shadow-md ring-2 ring-amber-200/50'
                                                    : badge
                                                    ? `bg-gradient-to-r ${badge.color}/10 border-amber-200/40`
                                                    : 'bg-card border-slate-200'
                                            }`}
                                        >
                                            {/* 排名 */}
                                            <div className="w-10 text-center shrink-0">
                                                {badge ? (
                                                    <span className="text-2xl">{badge.emoji}</span>
                                                ) : (
                                                    <span className="text-lg font-bold text-muted-foreground">
                                                        {i + 1}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Avatar */}
                                            <div className="text-3xl shrink-0">{voter.avatar}</div>
                                            {/* 名稱 */}
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-bold truncate ${voter.isYou ? 'text-amber-700' : ''}`}>
                                                    {voter.displayName}
                                                </div>
                                                {voter.isYou && (
                                                    <div className="text-xs text-amber-600">就是你！</div>
                                                )}
                                            </div>
                                            {/* 票數 */}
                                            <div className="text-2xl font-black text-primary shrink-0 tabular-nums">
                                                {voter.count}
                                                <span className="text-xs font-medium opacity-60 ml-1">票</span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                        {/* 你不在前 N 名時，最下方顯示自己 */}
                        {!youInTop && yourRank && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-3 pt-3 border-t border-dashed flex items-center gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-200"
                            >
                                <div className="w-10 text-center shrink-0 text-lg font-bold text-amber-700">
                                    {yourRank}
                                </div>
                                <div className="text-3xl shrink-0">⭐</div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-amber-700">你 (本機)</div>
                                    <div className="text-xs text-amber-600">繼續灌票衝榜！</div>
                                </div>
                                <div className="text-2xl font-black text-amber-700 shrink-0 tabular-nums">
                                    {yourCount}
                                </div>
                            </motion.div>
                        )}
                    </ScrollArea>
                )}
            </DialogContent>
        </Dialog>
    );
}
