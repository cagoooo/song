import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, QrCode, X, Copy, Check, Link2, Loader2, Pencil } from 'lucide-react';
import { buildSpacePublicUrl, getCurrentSpacePublicUrl, isValidSlug, normalizeSlug } from '@/lib/spaceUrl';
import { useUser } from '@/hooks/use-user';
import { claimSpaceSlug, releaseSpaceSlug, getSpaceSlug } from '@/lib/firestore/spaceSlugs';
import { useSpaceBranding } from '@/hooks/useSpaceBranding';
import { updateSpaceName, SPACE_NAME_MAX_LENGTH } from '@/lib/firestore/branding';
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
  const { user } = useUser();
  // Phase 3a：租戶擁有者可以設定好記短網址（?space=my-band 取代長串 uid）—
  // 只有在「自己的空間」（isAdmin 且非 root admin）才顯示編輯區
  const isOwnTenantSpace = !!user?.isAdmin && !user.isRootAdmin;
  // Phase 3b：目前空間的管理者（root 在自己的空間、租戶擁有者在自己的空間）都能改品牌名稱
  const canEditBranding = !!user?.isAdmin;
  const branding = useSpaceBranding();
  const brandName = branding.spaceName || '吉他彈唱之夜';
  const [nameInput, setNameInput] = useState('');
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setNameInput(branding.spaceName ?? '');
  }, [open, branding.spaceName]);

  const handleSaveName = async () => {
    setNameBusy(true);
    setNameError(null);
    try {
      await updateSpaceName(nameInput);
    } catch (e) {
      setNameError(e instanceof Error ? e.message : '儲存失敗，請重試');
    } finally {
      setNameBusy(false);
    }
  };
  const [slug, setSlug] = useState<string | null>(null);
  const [slugInput, setSlugInput] = useState('');
  const [slugBusy, setSlugBusy] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !isOwnTenantSpace || !user) return;
    let cancelled = false;
    getSpaceSlug(user.id).then((s) => {
      if (cancelled) return;
      setSlug(s);
      setSlugInput(s ?? '');
    }).catch(() => { /* 讀不到就當沒設定，不擋分享面板使用 */ });
    return () => { cancelled = true; };
  }, [open, isOwnTenantSpace, user]);

  const handleSaveSlug = async () => {
    if (!user) return;
    const normalized = normalizeSlug(slugInput);
    if (!isValidSlug(normalized)) {
      setSlugError('網址代碼需為 3-32 碼小寫英文字母、數字或 -');
      return;
    }
    setSlugBusy(true);
    setSlugError(null);
    try {
      await claimSpaceSlug(user.id, normalized);
      setSlug(normalized);
      setSlugInput(normalized);
    } catch (e) {
      setSlugError(e instanceof Error ? e.message : '設定失敗，請重試');
    } finally {
      setSlugBusy(false);
    }
  };

  const handleClearSlug = async () => {
    if (!user) return;
    setSlugBusy(true);
    setSlugError(null);
    try {
      await releaseSpaceSlug(user.id);
      setSlug(null);
      setSlugInput('');
    } catch (e) {
      setSlugError(e instanceof Error ? e.message : '清除失敗，請重試');
    } finally {
      setSlugBusy(false);
    }
  };

  // U1 Phase 2/3a：分享「目前空間」的公開網址 — 租戶空間帶 ?space={uid}，
  // 若擁有者已設定短網址則優先顯示 slug 版本（更好記）
  const currentUrl = (isOwnTenantSpace && slug)
    ? buildSpacePublicUrl(window.location.origin, window.location.pathname, slug)
    : getCurrentSpacePublicUrl();
  const shareTitle = `來參加${brandName}點歌！`;
  const [copied, setCopied] = useState(false);
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* 剪貼簿不可用時忽略 */ }
  };

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
          aria-label="分享點歌系統"
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
        className="share-cassette-dialog ed-sheet"
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

        <div className="share-cassette-body ed-sheet-body">
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

          {/* Phase 3b：目前空間管理者可自訂品牌名稱（取代預設「吉他彈唱之夜」） */}
          {canEditBranding && (
            <div className="share-cassette-slug">
              <label htmlFor="share-brand-input">
                <Pencil className="h-3.5 w-3.5" />
                空間品牌名稱
              </label>
              <div className="share-cassette-slug-row">
                <input
                  id="share-brand-input"
                  type="text"
                  value={nameInput}
                  onChange={(e) => { setNameInput(e.target.value); setNameError(null); }}
                  placeholder="吉他彈唱之夜"
                  maxLength={SPACE_NAME_MAX_LENGTH}
                  disabled={nameBusy}
                  aria-label="空間品牌名稱"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={nameBusy || nameInput.trim() === (branding.spaceName ?? '')}
                  aria-label="儲存品牌名稱"
                >
                  {nameBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '儲存'}
                </button>
              </div>
              {nameError && <p className="share-cassette-slug-error">{nameError}</p>}
            </div>
          )}

          {/* Phase 3a：租戶擁有者可設定好記短網址 */}
          {isOwnTenantSpace && (
            <div className="share-cassette-slug">
              <label htmlFor="share-slug-input">
                <Link2 className="h-3.5 w-3.5" />
                好記網址代碼
              </label>
              <div className="share-cassette-slug-row">
                <span aria-hidden="true">?space=</span>
                <input
                  id="share-slug-input"
                  type="text"
                  value={slugInput}
                  onChange={(e) => { setSlugInput(e.target.value); setSlugError(null); }}
                  placeholder="my-band"
                  maxLength={32}
                  disabled={slugBusy}
                  aria-label="好記網址代碼"
                />
                <button
                  type="button"
                  onClick={handleSaveSlug}
                  disabled={slugBusy || !slugInput.trim() || normalizeSlug(slugInput) === slug}
                  aria-label="儲存網址代碼"
                >
                  {slugBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '儲存'}
                </button>
                {slug && (
                  <button
                    type="button"
                    onClick={handleClearSlug}
                    disabled={slugBusy}
                    className="share-cassette-slug-clear"
                    aria-label="清除網址代碼"
                  >
                    清除
                  </button>
                )}
              </div>
              {slugError && <p className="share-cassette-slug-error">{slugError}</p>}
            </div>
          )}

          {/* U1 Phase 2：公開網址一鍵複製（租戶空間會帶 ?space=uid，或設定過的 slug） */}
          <button
            type="button"
            onClick={handleCopyUrl}
            className="share-cassette-url"
            aria-label="複製公開網址"
            title={currentUrl}
          >
            {copied ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
            <span>{copied ? '已複製公開網址！' : currentUrl}</span>
          </button>

          <p className="share-cassette-note">
            像傳一捲卡帶給朋友：翻面、按下點播，今晚一起把歌排進歌單。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
