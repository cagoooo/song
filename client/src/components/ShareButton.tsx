import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Share2 } from "lucide-react";

export function ShareButton() {
  const currentUrl = window.location.href;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="w-10 h-10">
          <Share2 className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center justify-center p-6">
          <h2 className="text-lg font-semibold mb-4">掃描QR Code進入點歌系統</h2>
          <div className="p-2 bg-white rounded-lg">
            <QRCodeSVG value={currentUrl} size={200} />
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            掃描上方QR Code即可快速進入本站
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
