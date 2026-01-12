import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { recordQRScan } from "@/lib/firestore";

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
  songId
}: QRCodeShareModalProps) {
  // Track QR code display
  useEffect(() => {
    if (isOpen && songId) {
      recordQRScan(songId).catch(console.error);
    }
  }, [isOpen, songId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md bg-gradient-to-br from-violet-50 via-fuchsia-50 to-pink-50 border-2 border-primary/20"
        aria-describedby="qr-code-modal-description"
      >
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
            分享歌曲
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground" id="qr-code-modal-description">
            掃描 QR Code 立即前往點播這首歌
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white p-4 rounded-xl shadow-lg"
          >
            <QRCodeSVG
              value={shareUrl}
              size={200}
              level="H"
              includeMargin
              imageSettings={{
                src: "/favicon.ico",
                x: undefined,
                y: undefined,
                height: 24,
                width: 24,
                excavate: true,
              }}
            />
          </motion.div>
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-gray-800">{songTitle}</h3>
            <p className="text-gray-600">{songArtist}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}