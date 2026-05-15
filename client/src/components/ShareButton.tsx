import { Button } from './ui/button';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger,
} from './ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, QrCode } from 'lucide-react';
import {
  FacebookShareButton,
  TwitterShareButton,
  LineShareButton,
  WhatsappShareButton,
  FacebookIcon,
  TwitterIcon,
  LineIcon,
  WhatsappIcon,
} from 'react-share';

export function ShareButton() {
  const currentUrl = window.location.href;
  const shareTitle = '來參加線上點歌！';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="group flex items-center gap-2.5 px-4 sm:px-5 h-11 sm:h-12 bg-white hover:bg-[#faf7f0] border border-[rgba(17,17,17,0.18)] hover:border-[#2b4dff] hover:text-[#2b4dff] shadow-sm hover:shadow-md transition-all duration-200 rounded-full"
        >
          <Share2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: '-0.01em',
            }}
          >
            分享點歌系統
          </span>
          <span
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2b4dff] text-white"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            <QrCode className="w-3 h-3" />
            QR
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent
        className="w-[calc(100vw-2rem)] max-w-sm p-0 overflow-hidden bg-[#faf7f0] border-[rgba(17,17,17,0.18)]"
        aria-describedby="share-dialog-description"
      >
        <DialogTitle className="sr-only">分享點歌系統</DialogTitle>
        <DialogDescription id="share-dialog-description" className="sr-only">
          掃描 QR Code 或選擇社群媒體分享給朋友
        </DialogDescription>

        {/* 雜誌頂條 */}
        <div className="editorial-modal-flag">
          <span>Nº 12</span>
          <span className="center">Share &amp; Vote</span>
          <span className="text-right">Side A</span>
        </div>

        {/* 章節 + 義式標題 */}
        <div className="px-6 pt-5 pb-3 text-center">
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
            Chapter · 分享
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
            掃這裡，<span style={{ color: '#2b4dff' }}>下一場見</span>
          </h2>
        </div>

        <div className="flex flex-col items-center gap-3 px-6 pb-6">
          {/* QR Code 白色框 + 米色卡內襯 */}
          <div className="bg-white p-3 rounded-md border border-[rgba(17,17,17,0.12)] shadow-[0_24px_50px_-25px_rgba(0,0,0,0.35)] animate-in zoom-in-95 fade-in duration-200">
            <QRCodeSVG
              value={currentUrl}
              size={180}
              level="M"
              includeMargin={false}
              fgColor="#0a0a0c"
              bgColor="#ffffff"
            />
          </div>

          {/* Social Media Share */}
          <div className="w-full mt-2">
            <p
              className="text-center mb-3"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--ed-ink-3)',
              }}
            >
              · Share via Social ·
            </p>
            <div className="flex justify-center gap-3">
              <FacebookShareButton url={currentUrl} hashtag="#線上點歌系統" className="outline-none hover:scale-105 active:scale-95 transition-transform duration-150">
                <FacebookIcon size={42} round className="shadow-md hover:shadow-lg transition-shadow" />
              </FacebookShareButton>

              <TwitterShareButton url={currentUrl} title={shareTitle} className="outline-none hover:scale-105 active:scale-95 transition-transform duration-150">
                <TwitterIcon size={42} round className="shadow-md hover:shadow-lg transition-shadow" />
              </TwitterShareButton>

              <LineShareButton url={currentUrl} title={shareTitle} className="outline-none hover:scale-105 active:scale-95 transition-transform duration-150">
                <LineIcon size={42} round className="shadow-md hover:shadow-lg transition-shadow" />
              </LineShareButton>

              <WhatsappShareButton url={currentUrl} title={shareTitle} className="outline-none hover:scale-105 active:scale-95 transition-transform duration-150">
                <WhatsappIcon size={42} round className="shadow-md hover:shadow-lg transition-shadow" />
              </WhatsappShareButton>
            </div>
          </div>

          <p
            className="text-center mt-2"
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 13,
              color: 'var(--ed-ink-2)',
            }}
          >
            把連結傳給朋友，讓大家一起來點歌。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
