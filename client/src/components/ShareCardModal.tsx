// 演唱會節目單分享卡 — IG 直式 1080×1350 / FB OG 1200×630
// 設計來源：Claude Design handoff (BUbgjRhp0yyupyORkomjgg) share-card.html
import { useMemo, useRef, useState, useEffect } from 'react';
import {
    Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Copy, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Song } from '@/lib/firestore';
import { useVoterLeaderboard } from '@/hooks/useVoterLeaderboard';

interface ShareCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    songs: Song[];
}

type SizeMode = 'portrait' | 'landscape';

const SIZE_META = {
    portrait: { w: 1080, h: 1350, label: 'IG · 1080×1350' },
    landscape: { w: 1200, h: 630, label: 'FB OG · 1200×630' },
};

function formatDate(d: Date): string {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function ShareCardModal({ isOpen, onClose, songs }: ShareCardModalProps) {
    const [size, setSize] = useState<SizeMode>('portrait');
    const [downloading, setDownloading] = useState(false);
    const [copying, setCopying] = useState(false);
    const [previewScale, setPreviewScale] = useState(1);
    const cardRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const { topVoters, totalVotes, totalVoters } = useVoterLeaderboard(3);

    // 排序後的 Top N + 完整 setlist (取前 18 首)
    const ranked = useMemo(
        () => [...songs].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0)),
        [songs]
    );
    const top3 = ranked.slice(0, 3);
    const setlist = ranked.slice(0, 18);

    const today = useMemo(() => new Date(), []);
    const dateStr = formatDate(today);

    const voteUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : 'https://cagoooo.github.io/song/';

    // 動態計算預覽縮放（讓卡片塞進 stage 容器）
    useEffect(() => {
        if (!isOpen) return;
        const computeScale = () => {
            const stage = stageRef.current;
            if (!stage) return;
            const { w, h } = SIZE_META[size];
            const availW = stage.clientWidth - 48;
            const availH = stage.clientHeight - 48;
            const scale = Math.min(availW / w, availH / h, 1);
            setPreviewScale(scale);
        };
        computeScale();
        window.addEventListener('resize', computeScale);
        return () => window.removeEventListener('resize', computeScale);
    }, [isOpen, size]);

    const handleDownload = async () => {
        const card = cardRef.current;
        if (!card) return;
        setDownloading(true);
        try {
            // 動態 import 減少首屏 bundle
            const { toPng } = await import('html-to-image');
            const dataUrl = await toPng(card, {
                pixelRatio: 2, // 2x 解析度
                cacheBust: true,
                backgroundColor: '#ffffff',
            });
            const link = document.createElement('a');
            link.download = `setlist-N12-${size}-${dateStr.replace(/ /g, '-')}.png`;
            link.href = dataUrl;
            link.click();
            toast({
                title: '✓ 已下載',
                description: `${SIZE_META[size].label} · 2× 高解析度 PNG`,
            });
        } catch (e) {
            toast({
                title: '下載失敗',
                description: e instanceof Error ? e.message : 'PNG 產生時出錯',
                variant: 'destructive',
            });
        } finally {
            setDownloading(false);
        }
    };

    const handleCopy = async () => {
        const card = cardRef.current;
        if (!card) return;
        setCopying(true);
        try {
            const { toBlob } = await import('html-to-image');
            const blob = await toBlob(card, {
                pixelRatio: 2,
                cacheBust: true,
                backgroundColor: '#ffffff',
            });
            if (!blob) throw new Error('產生 blob 失敗');
            if (!navigator.clipboard || !window.ClipboardItem) {
                throw new Error('瀏覽器不支援剪貼簿圖片');
            }
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob }),
            ]);
            toast({
                title: '✓ 已複製',
                description: '可貼到 LINE / IG / 訊息',
            });
        } catch (e) {
            toast({
                title: '複製失敗',
                description: e instanceof Error ? e.message : '可能瀏覽器不支援圖片剪貼簿',
                variant: 'destructive',
            });
        } finally {
            setCopying(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-[1100px] w-[96vw] h-[92vh] p-0 overflow-hidden flex flex-col">
                <DialogTitle className="sr-only">演唱會節目單分享卡</DialogTitle>
                <DialogDescription className="sr-only">
                    產生今晚的 setlist 分享卡，IG 直式或 FB OG 兩種尺寸，可下載 PNG 或複製到剪貼簿分享到社群。
                </DialogDescription>

                <div className="share-modal-body flex-1 overflow-y-auto">
                    {/* Toolbar */}
                    <div className="share-modal-toolbar">
                        <div className="share-modal-sizes" role="tablist">
                            {(['portrait', 'landscape'] as const).map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    role="tab"
                                    aria-selected={size === s}
                                    onClick={() => setSize(s)}
                                    className={size === s ? 'active' : ''}
                                >
                                    {SIZE_META[s].label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopy}
                                disabled={copying || downloading}
                                className="h-9 px-3 rounded-full"
                            >
                                {copying ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                                複製到剪貼簿
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleDownload}
                                disabled={downloading || copying}
                                className="h-9 px-4 rounded-full bg-[#2b4dff] hover:bg-[#1d3bd8] text-white"
                            >
                                {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                                下載 PNG（2×）
                            </Button>
                        </div>
                    </div>

                    {/* 卡片預覽 stage */}
                    <div
                        ref={stageRef}
                        className="share-card-stage"
                        style={{
                            height: size === 'portrait' ? 720 : 380,
                        }}
                    >
                        {/* 縮放後的 wrapper */}
                        <div
                            style={{
                                width: SIZE_META[size].w * previewScale,
                                height: SIZE_META[size].h * previewScale,
                                position: 'relative',
                            }}
                        >
                            <div
                                ref={cardRef}
                                className={`share-card ${size}`}
                                style={{
                                    transform: `scale(${previewScale})`,
                                    transformOrigin: 'top left',
                                }}
                            >
                                {/* 1. 雜誌頂條 */}
                                <div className="share-flag">
                                    <span>Nº 12</span>
                                    <span className="center">SIDE A · 阿凱彈唱之夜</span>
                                    <span className="right">{dateStr}</span>
                                </div>

                                {/* 2. Hero — 標題 + 副標 + 黑膠 */}
                                <div className="share-hero">
                                    <div>
                                        <div className="share-hero-eyebrow">
                                            <span className="live-dot" aria-hidden="true" />
                                            <span>TONIGHT&apos;S SET · {setlist.length} TRACKS</span>
                                        </div>
                                        <h1 className="share-hero-title">
                                            今晚這 {setlist.length} 首歌，<br />
                                            謝謝 <span className="you">你</span>
                                        </h1>
                                        <p className="share-hero-sub">
                                            {totalVotes.toLocaleString()} 票 · {totalVoters} 位歌迷一起寫進這份節目單
                                        </p>
                                    </div>

                                    <div className="share-vinyl" aria-hidden="true">
                                        <div className="share-vinyl-label">
                                            <div className="num">N°12</div>
                                            <div className="side">Side A</div>
                                        </div>
                                    </div>

                                    {/* FINAL SET 紅圓印章（portrait only） */}
                                    {size === 'portrait' && (
                                        <div className="share-stamp" aria-hidden="true">
                                            <div>
                                                <div className="t1">FINAL</div>
                                                <div className="t2">SET</div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 3. Top 3 + 催歌王 */}
                                <div className="share-podium-row">
                                    {/* Top 3 */}
                                    <div>
                                        <div className="share-panel-h">
                                            <span className="chap">№ 01</span>
                                            <h3>今晚 Top 3</h3>
                                        </div>
                                        {top3.length > 0 ? (
                                            <ul className="share-top3">
                                                {top3.map((s, i) => (
                                                    <li key={s.id}>
                                                        <span className="rank">{String(i + 1).padStart(2, '0')}</span>
                                                        <div>
                                                            <div className="ttl">{s.title}</div>
                                                            <div className="art">{s.artist}</div>
                                                        </div>
                                                        <span className="v">{s.voteCount || 0}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-slate-400 italic py-3">沒有票數資料</p>
                                        )}
                                    </div>

                                    {/* 催歌王 Top 3 */}
                                    <div>
                                        <div className="share-panel-h">
                                            <span className="chap">№ 02</span>
                                            <h3>催歌王 Top 3</h3>
                                        </div>
                                        {topVoters.length > 0 ? (
                                            <ul className="share-voters">
                                                {topVoters.slice(0, 3).map((v, i) => (
                                                    <li key={v.sessionId}>
                                                        <span className="rank">{String(i + 1).padStart(2, '0')}</span>
                                                        <span className="avatar">{v.avatar}</span>
                                                        <span className="name">{v.displayName}</span>
                                                        <span className="v">{v.count} 票</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-slate-400 italic py-3">沒有投票者資料</p>
                                        )}
                                    </div>
                                </div>

                                {/* 4. 完整 setlist（portrait only） */}
                                {size === 'portrait' && setlist.length > 0 && (
                                    <div className="share-setlist">
                                        <div className="share-panel-h">
                                            <span className="chap">№ 03</span>
                                            <h3>完整 setlist</h3>
                                        </div>
                                        <ul className="share-setlist-grid">
                                            {setlist.map((s, i) => (
                                                <li key={s.id}>
                                                    <span className="n">{String(i + 1).padStart(2, '0')}</span>
                                                    <div>
                                                        <div className="t">{s.title}</div>
                                                        <div className="a">{s.artist}</div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* 5. 底部 QR + 頁尾 */}
                                <div className="share-foot">
                                    <div className="share-foot-qr">
                                        <QRCodeSVG
                                            value={voteUrl}
                                            size={size === 'portrait' ? 124 : 80}
                                            level="M"
                                            includeMargin={false}
                                            bgColor="#ffffff"
                                            fgColor="#0a0a0c"
                                        />
                                    </div>
                                    <div className="share-foot-msg">
                                        掃這裡，下一場見
                                        <span className="sub">song.smes.tyc.edu.tw</span>
                                    </div>
                                    <div className="share-foot-by">
                                        阿凱老師
                                        <span className="sub">Made with ♥</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 說明文字 */}
                    <p
                        className="mt-4 text-center"
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            color: 'var(--ed-ink-3)',
                        }}
                    >
                        · 2× 高解析度輸出 · 下載後可貼到 LINE / IG / FB ·
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
