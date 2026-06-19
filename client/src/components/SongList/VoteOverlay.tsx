import { memo } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface VoteOverlayProps {
    show: boolean;
    songTitle: string;
    songArtist: string;
}

export const VoteOverlay = memo(function VoteOverlay({ show, songTitle, songArtist }: VoteOverlayProps) {
    if (!show) return null;

    return (
        <div
            className="pointer-events-none fixed inset-x-3 bottom-[calc(46px+max(12px,env(safe-area-inset-bottom)))] z-[70]
                mx-auto max-w-[420px] animate-in fade-in slide-in-from-bottom-2 duration-150
                sm:left-auto sm:right-5 sm:bottom-5 sm:mx-0 sm:w-[360px]"
            role="status"
            aria-live="polite"
        >
            <div
                className="flex items-center gap-3 rounded-lg border-2 border-[#111] bg-[#fffaf0]/95 px-3 py-2
                    text-[#111] shadow-[0_12px_28px_-18px_rgba(17,17,17,0.55)] backdrop-blur-sm"
                style={{
                    animation: 'voteToast 1.15s ease-out forwards',
                }}
            >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#2f55ff] text-white">
                    <CheckCircle2 className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#2f55ff]">
                        點播成功
                    </p>
                    <p className="truncate font-serif text-lg font-black italic leading-tight">
                        {songTitle}
                    </p>
                    <p className="truncate text-xs font-medium text-[#6f6a60]">{songArtist}</p>
                </div>
            </div>

            <style>{`
                @keyframes voteToast {
                    0% {
                        opacity: 0;
                        transform: translateY(8px) scale(0.98);
                    }
                    14% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                    82% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(6px) scale(0.99);
                    }
                }
            `}</style>
        </div>
    );
});
