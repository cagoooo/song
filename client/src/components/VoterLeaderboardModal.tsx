import {
    Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { VoterBoard } from './VoterBoard';

interface VoterLeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function VoterLeaderboardModal({ isOpen, onClose }: VoterLeaderboardModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-0 overflow-hidden bg-[#faf7f0] border-[rgba(17,17,17,0.18)]">
                <DialogTitle className="sr-only">投票領袖板 — 今晚最會催歌的人</DialogTitle>
                <DialogDescription className="sr-only">
                    所有觀眾的點播次數排名，前 3 名顯示金/銀/銅色。
                </DialogDescription>

                {/* 雜誌頂條 */}
                <div className="editorial-modal-flag">
                    <span>Nº 12</span>
                    <span className="center">Voter Board</span>
                    <span className="text-right">Side A</span>
                </div>

                {/* 章節 + 義式標題 */}
                <div className="px-6 sm:px-8 pt-5 pb-3">
                    <div
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            letterSpacing: '0.24em',
                            textTransform: 'uppercase',
                            color: 'var(--ed-ink-3)',
                            marginBottom: 4,
                        }}
                    >
                        Chapter · 催歌王
                    </div>
                    <h2
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontStyle: 'italic',
                            fontWeight: 900,
                            fontSize: 26,
                            letterSpacing: '-0.02em',
                            color: 'var(--ed-ink-1)',
                            margin: 0,
                            lineHeight: 1.15,
                        }}
                    >
                        今晚最會<span style={{ color: 'var(--ed-accent)' }}>催歌</span>的人
                    </h2>
                </div>

                <div className="px-4 sm:px-6 pb-5">
                    <VoterBoard topN={20} height={360} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
