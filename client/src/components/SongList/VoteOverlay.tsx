// 點播成功全螢幕動畫覆蓋層（純 CSS 動畫版 - 更高效能）
import { memo } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';

interface VoteOverlayProps {
    show: boolean;
    songTitle: string;
    songArtist: string;
}

export const VoteOverlay = memo(function VoteOverlay({ show, songTitle, songArtist }: VoteOverlayProps) {
    if (!show) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none
                animate-in fade-in duration-200"
        >
            <div
                className="bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 
                    text-white px-8 py-6 rounded-2xl shadow-2xl
                    flex flex-col items-center gap-3
                    animate-in zoom-in-75 fade-in duration-300
                    will-change-transform"
                style={{
                    animation: 'votePopup 1.5s ease-out forwards'
                }}
            >
                {/* 打勾圖標 */}
                <div className="animate-in zoom-in duration-300">
                    <CheckCircle2 className="h-12 w-12 text-white drop-shadow-lg" />
                </div>

                <p className="text-xl font-bold animate-in slide-in-from-bottom-2 duration-300">
                    點播成功！
                </p>

                <div
                    className="text-center animate-in fade-in slide-in-from-bottom-1 duration-300"
                    style={{ animationDelay: '100ms' }}
                >
                    <p className="text-lg font-semibold">{songTitle}</p>
                    <p className="text-sm opacity-80">{songArtist}</p>
                </div>

                {/* 靜態星星裝飾 */}
                <div className="flex gap-2 mt-1">
                    {[...Array(3)].map((_, i) => (
                        <Sparkles key={i} className="h-5 w-5 text-yellow-300" />
                    ))}
                </div>
            </div>

            {/* CSS 動畫定義 */}
            <style>{`
                @keyframes votePopup {
                    0% {
                        opacity: 0;
                        transform: scale(0.7);
                    }
                    20% {
                        opacity: 1;
                        transform: scale(1.05);
                    }
                    40% {
                        transform: scale(1);
                    }
                    80% {
                        opacity: 1;
                        transform: scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                }
            `}</style>
        </div>
    );
});
