import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, QrCode, X } from 'lucide-react';
import {
  FacebookShareButton,
  TwitterShareButton,
  LineShareButton,
  WhatsappShareButton,
  FacebookIcon,
  TwitterIcon,
  LineIcon,
  WhatsappIcon
} from 'react-share';

export function ShareButton() {
  const [open, setOpen] = useState(false);
  const currentUrl = window.location.href;
  const shareTitle = '來參加阿凱彈唱之夜點歌！';

  useEffect(() => {
    document.body.classList.toggle('share-dialog-open', open);
    return () => document.body.classList.remove('share-dialog-open');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="share-cassette-trigger group"
        >
          <Share2 className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
          <span className="hidden sm:inline">分享點歌系統</span>
          <span className="share-cassette-trigger-badge">
            <QrCode className="h-3.5 w-3.5" />
            <span>QR</span>
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="share-cassette-dialog"
        aria-describedby="share-dialog-description"
      >
        <DialogClose asChild>
          <button className="share-cassette-close" type="button" aria-label="關閉分享點歌系統">
            <X className="h-4 w-4" />
            <span>關閉</span>
          </button>
        </DialogClose>

        <div className="share-cassette-top" aria-hidden="true">
          <span>SIDE A</span>
          <span>SHARE MODE</span>
          <span>LIVE</span>
        </div>

        <DialogHeader className="share-cassette-header">
          <DialogTitle className="share-cassette-title">
            分享點歌系統
          </DialogTitle>
          <DialogDescription id="share-dialog-description" className="share-cassette-desc">
            掃描 QR Code，或用社群連結邀請大家一起寫進今晚歌單。
          </DialogDescription>
        </DialogHeader>

        <div className="share-cassette-body">
          <div className="share-cassette-qr">
            <QRCodeSVG
              value={currentUrl}
              size={168}
              level="H"
              includeMargin={false}
            />
          </div>

          <div className="share-cassette-reels" aria-hidden="true">
            <span />
            <div />
            <span />
          </div>

          <div className="share-cassette-social">
            <p>選一個頻道分享</p>
            <div className="share-cassette-social-row">
              <FacebookShareButton url={currentUrl} hashtag="#線上點歌系統" className="outline-none hover:scale-105 active:scale-95 transition-transform duration-150">
                <FacebookIcon size={40} round className="shadow-md hover:shadow-lg transition-shadow" />
              </FacebookShareButton>

              <TwitterShareButton url={currentUrl} title={shareTitle} className="outline-none hover:scale-105 active:scale-95 transition-transform duration-150">
                <TwitterIcon size={40} round className="shadow-md hover:shadow-lg transition-shadow" />
              </TwitterShareButton>

              <LineShareButton url={currentUrl} title={shareTitle} className="outline-none hover:scale-105 active:scale-95 transition-transform duration-150">
                <LineIcon size={40} round className="shadow-md hover:shadow-lg transition-shadow" />
              </LineShareButton>

              <WhatsappShareButton url={currentUrl} title={shareTitle} className="outline-none hover:scale-105 active:scale-95 transition-transform duration-150">
                <WhatsappIcon size={40} round className="shadow-md hover:shadow-lg transition-shadow" />
              </WhatsappShareButton>
            </div>
          </div>

          <p className="share-cassette-note">
            像傳一捲卡帶給朋友：翻面、按下點播，今晚一起把歌排進歌單。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
