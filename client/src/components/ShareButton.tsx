import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "./ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Share2, QrCode } from "lucide-react";
import {
  FacebookShareButton,
  TwitterShareButton,
  LineShareButton,
  WhatsappShareButton,
  FacebookIcon,
  TwitterIcon,
  LineIcon,
  WhatsappIcon
} from "react-share";

export function ShareButton() {
  const currentUrl = window.location.href;
  const shareTitle = "來參加線上點歌！";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="group relative flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 
                    border-2 border-violet-400 bg-gradient-to-r from-violet-200/90 to-fuchsia-200/90
                    hover:from-violet-300/90 hover:to-fuchsia-300/90 
                    shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-violet-700 group-hover:scale-110 transition-transform duration-200" />
            <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-violet-700 to-fuchsia-700 bg-clip-text text-transparent">
              分享點歌系統
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium bg-violet-600 text-white px-2.5 py-1 rounded-full shadow-md">
            <QrCode className="w-3.5 h-3.5" />
            <span>掃描 QR Code</span>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="w-[calc(100vw-2rem)] max-w-sm bg-gradient-to-br from-violet-100 via-fuchsia-100 to-pink-100 border-2 border-violet-300/40 p-4 sm:p-6"
        aria-describedby="share-dialog-description"
      >
        <DialogHeader className="pb-2">
          <DialogTitle className="text-center text-lg sm:text-xl font-bold bg-gradient-to-r from-violet-700 to-pink-700 bg-clip-text text-transparent">
            分享點歌系統
          </DialogTitle>
          <DialogDescription id="share-dialog-description" className="text-center text-xs sm:text-sm text-muted-foreground">
            掃描 QR Code 或選擇社群媒體分享給朋友
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3">
          {/* QR Code - 純 CSS 動畫 */}
          <div
            className="bg-white p-3 rounded-xl shadow-lg animate-in zoom-in-95 fade-in duration-200"
          >
            <QRCodeSVG
              value={currentUrl}
              size={160}
              level="H"
              includeMargin={false}
            />
          </div>

          {/* Social Media Share Buttons */}
          <div className="w-full">
            <p className="text-xs sm:text-sm text-center font-medium text-violet-700 mb-3">
              透過社群媒體分享
            </p>
            <div className="flex justify-center gap-3">
              <FacebookShareButton url={currentUrl} hashtag="#線上點歌系統" className="outline-none hover:scale-105 active:scale-95 transition-transform duration-150">
                <FacebookIcon size={44} round className="shadow-md hover:shadow-lg transition-shadow" />
              </FacebookShareButton>

              <TwitterShareButton url={currentUrl} title={shareTitle} className="outline-none hover:scale-105 active:scale-95 transition-transform duration-150">
                <TwitterIcon size={44} round className="shadow-md hover:shadow-lg transition-shadow" />
              </TwitterShareButton>

              <LineShareButton url={currentUrl} title={shareTitle} className="outline-none hover:scale-105 active:scale-95 transition-transform duration-150">
                <LineIcon size={44} round className="shadow-md hover:shadow-lg transition-shadow" />
              </LineShareButton>

              <WhatsappShareButton url={currentUrl} title={shareTitle} className="outline-none hover:scale-105 active:scale-95 transition-transform duration-150">
                <WhatsappIcon size={44} round className="shadow-md hover:shadow-lg transition-shadow" />
              </WhatsappShareButton>
            </div>
          </div>

          <p className="text-xs text-violet-600 text-center">
            分享這個連結給朋友，讓大家一起來點歌！
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}