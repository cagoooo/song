import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Share2, QrCode } from "lucide-react";
import { motion } from "framer-motion";
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
  const shareDescription = "快來加入線上點歌系統，一起來點歌吧！";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="group relative flex flex-col sm:flex-row items-center gap-2 sm:gap-3 
                    px-4 sm:px-6 py-2.5 sm:py-3
                    border-2 border-indigo-400 bg-gradient-to-r from-white to-indigo-50
                    hover:from-indigo-50 hover:to-indigo-100/90 
                    shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-700 group-hover:scale-110 transition-transform" />
            <span className="text-sm sm:text-base lg:text-lg font-bold bg-gradient-to-r from-indigo-800 to-purple-800 bg-clip-text text-transparent">
              分享點歌系統
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium 
                        bg-indigo-700 text-white px-2 sm:px-2.5 py-0.5 sm:py-1 
                        rounded-full shadow-md mt-1.5 sm:mt-0">
            <QrCode className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>掃描 QR Code</span>
          </div>
          {/* Enhanced glow effect on hover */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-400/20 via-purple-400/20 to-purple-400/20 opacity-0 
                        group-hover:opacity-100 blur-xl transition-opacity duration-500 rounded-lg" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-indigo-50 via-white to-purple-50 border-2 border-indigo-200">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold bg-gradient-to-r from-indigo-800 to-purple-800 bg-clip-text text-transparent">
            分享點歌系統
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-white p-4 rounded-xl shadow-lg"
          >
            <QRCodeSVG
              value={currentUrl}
              size={200}
              level="H"
              includeMargin
              imageSettings={{
                src: "/logo.png",
                x: undefined,
                y: undefined,
                height: 24,
                width: 24,
                excavate: true,
              }}
            />
          </motion.div>

          {/* Social Media Share Buttons */}
          <div className="w-full space-y-4">
            <p className="text-sm text-center font-medium text-muted-foreground mb-4">
              透過社群媒體分享
            </p>
            <div className="flex justify-center gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <FacebookShareButton url={currentUrl} hashtag="#線上點歌系統" className="outline-none">
                  <FacebookIcon size={40} round className="shadow-lg hover:shadow-xl transition-shadow" />
                </FacebookShareButton>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <TwitterShareButton url={currentUrl} title={shareTitle} className="outline-none">
                  <TwitterIcon size={40} round className="shadow-lg hover:shadow-xl transition-shadow" />
                </TwitterShareButton>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <LineShareButton url={currentUrl} title={shareTitle} className="outline-none">
                  <LineIcon size={40} round className="shadow-lg hover:shadow-xl transition-shadow" />
                </LineShareButton>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <WhatsappShareButton url={currentUrl} title={shareTitle} className="outline-none">
                  <WhatsappIcon size={40} round className="shadow-lg hover:shadow-xl transition-shadow" />
                </WhatsappShareButton>
              </motion.div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-6 text-center max-w-[280px]">
            分享這個連結給朋友，讓大家一起來點歌！
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}