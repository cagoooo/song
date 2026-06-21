// 歌曲建議通知覆蓋層 — 全螢幕中央卡帶風通知，管理員專用
// 卡帶設計：黑色外殼 + 四角螺絲 + 雙轉軸磁帶 + 米白標籤紙（歌名寫在標籤上）
// 與 UpdatePrompt 卡帶呼應（它是 SIDE A · NEW VERSION，這個是 SIDE B · NEW REQUEST）
import { motion, AnimatePresence } from 'framer-motion';
import { Music, X, User } from 'lucide-react';
import { CassetteScrews } from './CassetteShell';
import { Z } from '@/lib/z';

interface SuggestionNotificationProps {
    isVisible: boolean;
    suggestion: {
        title: string;
        artist: string;
        suggestedBy?: string;
        notes?: string;
    } | null;
    onClose: () => void;
}

export function SuggestionNotificationOverlay({
    isVisible,
    suggestion,
    onClose,
}: SuggestionNotificationProps) {
    if (!suggestion) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    style={{ zIndex: Z.toast }}
                    onClick={onClose}
                >
                    {/* 卡帶通知卡 */}
                    <motion.div
                        initial={{ scale: 0.85, y: 24, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.85, y: 24, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="sno-cassette"
                        onClick={(e) => e.stopPropagation()}
                        role="alertdialog"
                        aria-label="新歌曲建議"
                    >
                        <CassetteScrews />

                        {/* 上標籤條 */}
                        <div className="sno-toplabel">
                            <span className="sno-side">
                                <span className="sno-live-dot" aria-hidden="true" />
                                SIDE B · NEW REQUEST
                            </span>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="關閉通知"
                                className="sno-close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* 雙轉軸 + 磁帶 */}
                        <div className="sno-inner" aria-hidden="true">
                            <span className="sno-reel" />
                            <span className="sno-tape"><i /></span>
                            <span className="sno-reel" />
                        </div>

                        {/* 標題 */}
                        <div className="sno-head">
                            <div className="sno-eyebrow">🎵 新歌曲建議</div>
                            <div className="sno-sub">訪客推薦了一首歌曲</div>
                        </div>

                        {/* 歌曲資訊 — 米白卡帶標籤紙（歌名像手寫在標籤上） */}
                        <div className="sno-label-card">
                            <div className="sno-label-icon">
                                <Music className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div className="sno-label-text">
                                <div className="sno-song-title">{suggestion.title}</div>
                                <div className="sno-song-artist">{suggestion.artist}</div>

                                {suggestion.suggestedBy && (
                                    <div className="sno-meta">
                                        <User className="h-3.5 w-3.5" aria-hidden="true" />
                                        <span>推薦者：{suggestion.suggestedBy}</span>
                                    </div>
                                )}

                                {suggestion.notes && (
                                    <p className="sno-note">💬 {suggestion.notes}</p>
                                )}
                            </div>
                        </div>

                        {/* 動作鍵 */}
                        <button type="button" onClick={onClose} className="sno-action">
                            我知道了
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
