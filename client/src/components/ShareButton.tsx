import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Share2 } from "lucide-react";
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
          size="icon" 
          className="w-10 h-10 border-2 border-primary/20 bg-white/80 hover:bg-white/90
                    shadow-[0_2px_10px_rgba(var(--primary),0.1)]
                    hover:shadow-[0_2px_20px_rgba(var(--primary),0.2)]
                    transition-all duration-300"
        >
          <Share2 className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md border-2 border-primary/20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25
          }}
          className="flex flex-col items-center justify-center p-6"
        >
          <h2 className="text-xl font-semibold mb-2 bg-gradient-to-r from-primary to-purple-600 
                        bg-clip-text text-transparent">
            分享點歌系統
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            掃描QR Code或透過社群媒體分享
          </p>

          {/* QR Code Section */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 
                          opacity-30 blur-xl animate-pulse rounded-full" />
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="relative p-4 bg-white rounded-xl shadow-[0_8px_32px_rgba(var(--primary),0.2)]
                        border-2 border-primary/10"
            >
              <QRCodeSVG 
                value={currentUrl} 
                size={200}
                level="H"
                includeMargin={true}
                className="rounded-lg"
              />
            </motion.div>
          </div>

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
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}