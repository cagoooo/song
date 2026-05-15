import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
    Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { recordQRScan } from '@/lib/firestore';

interface QRCodeShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    songTitle: string;
    songArtist: string;
    shareUrl: string;
    songId: string;
}

export default function QRCodeShareModal({
    isOpen,
    onClose,
    songTitle,
    songArtist,
    shareUrl,
    songId,
}: QRCodeShareModalProps) {
    useEffect(() => {
        if (isOpen && songId) {
            recordQRScan(songId).catch(console.error);
        }
    }, [isOpen, songId]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-[#faf7f0] border-[rgba(17,17,17,0.18)]">
                <DialogTitle className="sr-only">分享歌曲 — {songTitle}</DialogTitle>
                <DialogDescription className="sr-only">
                    掃描 QR Code 立即前往點播這首歌 — {songTitle} by {songArtist}
                </DialogDescription>

                {/* 雜誌頂條 */}
                <div className="editorial-modal-flag">
                    <span>Nº 12</span>
                    <span className="center">Scan to Vote</span>
                    <span className="text-right">Side A</span>
                </div>

                <div className="editorial-qr-card">
                    <div className="editorial-qr-eyebrow">Track Cut · 立即點播</div>
                    <h2 className="editorial-qr-title">用手機掃，1 秒催歌</h2>
                    <p className="editorial-qr-sub">QR 直連這首歌的點播頁，掃完按一下「我要點」即可</p>

                    <motion.div
                        className="editorial-qr-frame"
                        initial={{ scale: 0.92, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', duration: 0.5 }}
                    >
                        <QRCodeSVG
                            value={shareUrl}
                            size={200}
                            level="M"
                            includeMargin={false}
                            fgColor="#0a0a0c"
                            bgColor="#ffffff"
                        />
                    </motion.div>

                    <div className="editorial-qr-songtitle">{songTitle}</div>
                    <div className="editorial-qr-songartist">{songArtist}</div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
