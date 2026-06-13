// 快速轉調工具 — 貼上任何吉他譜文字 → 自動偵測調性 → 即時轉調 → 一鍵複製
//
// 📐 設計文件：docs/design/T5-transpose.md
//
// 解決的痛點：網路上的譜常不是原 Key（原曲 G 卻寫成 C），
// 現場彈唱前把譜貼進來，按幾下就拿到目標調的譜，不用手動逐顆改。

import { useCallback, useMemo, useRef, useState } from 'react';
import {
    Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
    transposeChordSheet, transposeChordSymbol, isChordLine,
    extractChords, detectKey, preferFlatForKey, capoSuggestions,
    noteToSemitone, KEY_OPTIONS,
} from '@/lib/transpose';
import type { OcrProgress } from '@/lib/sheetOcr';

interface TransposeToolModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const EXAMPLE_SHEET = `[INTRO]
C  G  Am  Em

[VERSE 1]
C            G        Am          Em
故事的小黃花  從出生那年  就飄著
F           G          C
童年的盪鞦韆  隨記憶一直晃到現在

[CHORUS]*
C              G               Am          Em
刮風這天 我試過握著你手 但偏偏
F              G                C
雨漸漸 大到我看你不見`;

export function TransposeToolModal({ isOpen, onClose }: TransposeToolModalProps) {
    const [input, setInput] = useState('');
    const [steps, setSteps] = useState(0);
    const [copied, setCopied] = useState(false);
    /** OCR 進行中的進度訊息（null = 沒在跑） */
    const [ocrMsg, setOcrMsg] = useState<string | null>(null);
    const [ocrError, setOcrError] = useState<string | null>(null);
    /** 剛完成 OCR（顯示「可修正錯字」提示，使用者一動手編輯就收掉） */
    const [ocrDone, setOcrDone] = useState(false);
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 圖片 → OCR → 文字譜進左欄（91 譜這類只給圖檔的譜直接截圖丟進來）
    const handleImage = useCallback(async (file: File | Blob) => {
        setOcrError(null);
        setOcrMsg('準備辨識引擎…');
        try {
            const { ocrImageToSheet } = await import('@/lib/sheetOcr');
            const sheet = await ocrImageToSheet(file, (p: OcrProgress) => setOcrMsg(p.message));
            if (!sheet.trim()) {
                setOcrError('辨識不到文字 — 試試解析度更高的截圖（文字越清晰效果越好）');
            } else {
                setInput(sheet);
                setSteps(0);
                setOcrDone(true);
            }
        } catch {
            setOcrError('辨識引擎載入失敗 — 請檢查網路後重試（首次使用需下載中文語言檔）');
        } finally {
            setOcrMsg(null);
        }
    }, []);

    const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) void handleImage(file);
        e.target.value = ''; // 同一張圖可重選
    };

    // Ctrl+V 直接貼截圖（整個 modal 範圍都吃）
    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
        if (!item) return;
        const file = item.getAsFile();
        if (file) {
            e.preventDefault();
            void handleImage(file);
        }
    }, [handleImage]);

    // 拖放圖檔到左欄
    const handleDrop = useCallback((e: React.DragEvent) => {
        const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
        if (file) {
            e.preventDefault();
            void handleImage(file);
        }
    }, [handleImage]);

    // 偵測貼進來的譜是什麼調
    const detected = useMemo(() => detectKey(extractChords(input)), [input]);

    // 目前的目標調（沒偵測到原調就只顯示位移量）
    const targetKey = useMemo(() => {
        if (!detected) return null;
        if (steps === 0) return detected.key;
        const rough = transposeChordSymbol(detected.key, steps);
        return transposeChordSymbol(detected.key, steps, { preferFlat: preferFlatForKey(rough) });
    }, [detected, steps]);

    // 轉調後的完整譜面
    const output = useMemo(() => {
        if (!input) return '';
        const preferFlat = targetKey ? preferFlatForKey(targetKey) : undefined;
        return transposeChordSheet(input, steps, { preferFlat });
    }, [input, steps, targetKey]);

    // Capo 等效建議（目標調用開放指型怎麼彈）
    const capos = useMemo(() => {
        if (!targetKey || steps === 0) return [];
        return capoSuggestions(targetKey).filter((c) => c.capo > 0).slice(0, 2);
    }, [targetKey, steps]);

    const handlePickKey = (key: string) => {
        if (!detected) return;
        // 用半音值算位移（同音異名 F# / Gb 也能對上），取 -5 ~ +6 最短路徑
        const from = noteToSemitone(detected.key);
        const to = noteToSemitone(key);
        if (from === null || to === null) return;
        let diff = to - from;
        if (diff > 6) diff -= 12;
        if (diff < -5) diff += 12;
        setSteps(diff);
    };

    /** 同音異名也算同一顆（targetKey 可能拼成 Gb、pill 是 F#） */
    const isActiveKey = (k: string) =>
        targetKey !== null && noteToSemitone(targetKey) === noteToSemitone(k);

    const handleCopy = async () => {
        if (!output) return;
        try {
            await navigator.clipboard.writeText(output);
            setCopied(true);
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
            copyTimerRef.current = setTimeout(() => setCopied(false), 1800);
        } catch {
            // clipboard 失敗（http / 權限）→ 退回選取文字
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-[1100px] w-[96vw] h-[90vh] p-0 overflow-hidden bg-white border-[rgba(17,17,17,0.18)] flex flex-col">
                <DialogTitle className="sr-only">快速轉調工具</DialogTitle>
                <DialogDescription className="sr-only">
                    貼上吉他譜文字，自動偵測調性並即時轉調，完成後可一鍵複製。
                </DialogDescription>

                <div className="ttm-page flex-1 overflow-y-auto" onPaste={handlePaste}>
                    {/* 標題列 */}
                    <div className="ttm-head">
                        <div className="ttm-eyebrow">GUITAR TOOLBOX · 給吉他手的工具</div>
                        <h2 className="ttm-title">快速轉調工具</h2>
                        <p className="ttm-sub">
                            網路上抓的譜不是原 Key？貼文字、<b>截圖直接 Ctrl+V</b>、或上傳譜圖 —
                            自動辨識調性，選目標調，整份譜的和弦立刻轉好，不用再逐顆手改。
                        </p>
                    </div>

                    {/* 控制列 */}
                    <div className="ttm-controls">
                        <div className="ttm-ctrl-group">
                            <span className="ttm-ctrl-label">偵測調性</span>
                            <span className="ttm-detected">
                                {detected
                                    ? <>{detected.key}<em>{Math.round(detected.confidence * 100)}%</em></>
                                    : '—'}
                            </span>
                        </div>

                        <div className="ttm-ctrl-group">
                            <span className="ttm-ctrl-label">半音位移</span>
                            <button
                                className="sdp-trans-btn"
                                onClick={() => setSteps((s) => Math.max(s - 1, -11))}
                                disabled={steps <= -11}
                                aria-label="降半音"
                            >−</button>
                            <span className="ttm-steps">{steps > 0 ? `+${steps}` : steps}</span>
                            <button
                                className="sdp-trans-btn"
                                onClick={() => setSteps((s) => Math.min(s + 1, 11))}
                                disabled={steps >= 11}
                                aria-label="升半音"
                            >＋</button>
                            {steps !== 0 && (
                                <button className="sdp-trans-reset" onClick={() => setSteps(0)}>↺ 歸零</button>
                            )}
                        </div>

                        {detected && (
                            <div className="ttm-ctrl-group ttm-keys" role="group" aria-label="目標調">
                                <span className="ttm-ctrl-label">目標調</span>
                                {KEY_OPTIONS.map((k) => (
                                    <button
                                        key={k}
                                        className={'ttm-key-pill' + (isActiveKey(k) ? ' active' : '')}
                                        onClick={() => handlePickKey(k)}
                                        aria-pressed={isActiveKey(k)}
                                    >
                                        {k}
                                    </button>
                                ))}
                            </div>
                        )}

                        {capos.length > 0 && (
                            <div className="ttm-capo-hint">
                                💡 想留在好彈的指型？{capos.map((c, i) => (
                                    <span key={c.capo}>
                                        {i > 0 && '；或'}夾 CAPO {c.capo} 彈 {c.shapeKey} 指型
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 輸入 / 輸出 雙欄 */}
                    <div className="ttm-panes">
                        <div className="ttm-pane">
                            <div className="ttm-pane-h">
                                <span>貼上原譜（文字或截圖）</span>
                                <span className="ttm-pane-actions">
                                    <button
                                        className="ttm-ocr-btn"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={!!ocrMsg}
                                    >
                                        📷 上傳譜圖
                                    </button>
                                    {!input && !ocrMsg && (
                                        <button className="sdp-trans-reset" onClick={() => setInput(EXAMPLE_SHEET)}>
                                            載入範例
                                        </button>
                                    )}
                                </span>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFilePick}
                                aria-label="選擇譜圖檔案"
                            />
                            {ocrMsg && (
                                <div className="ttm-ocr-status" role="status">
                                    <span className="ttm-ocr-spin" aria-hidden="true" />
                                    {ocrMsg}
                                </div>
                            )}
                            {ocrError && (
                                <div className="ttm-ocr-error" role="alert">⚠ {ocrError}</div>
                            )}
                            <textarea
                                className="ttm-input"
                                value={input}
                                onChange={(e) => { setInput(e.target.value); setOcrDone(false); }}
                                onDrop={handleDrop}
                                onDragOver={(e) => e.preventDefault()}
                                placeholder={'三種餵譜方式：\n\n1. 文字 — 把譜整段貼進來\n2. 截圖 — 直接 Ctrl+V 貼上（91 譜等圖檔譜適用）\n3. 圖檔 — 點「📷 上傳譜圖」或拖放到這裡\n\n辨識結果落在這裡，可直接修正錯字'}
                                spellCheck={false}
                                aria-label="原譜輸入區"
                            />
                            {ocrDone && (
                                <div className="ttm-ocr-tip">
                                    ✓ 辨識完成 — 有小錯字可直接在上面修正，不影響其他行。
                                </div>
                            )}
                        </div>

                        <div className="ttm-pane">
                            <div className="ttm-pane-h">
                                <span>
                                    轉調結果
                                    {targetKey && steps !== 0 && <em className="ttm-pane-key"> → {targetKey} 調</em>}
                                </span>
                                <button
                                    className={'ttm-copy' + (copied ? ' done' : '')}
                                    onClick={handleCopy}
                                    disabled={!output}
                                >
                                    {copied ? '✓ 已複製' : '複製結果'}
                                </button>
                            </div>
                            <pre className="ttm-output" aria-label="轉調結果" aria-live="polite">
                                {output
                                    ? output.split('\n').map((line, i) => (
                                        <div key={i} className={isChordLine(line) ? 'ttm-line-chord' : 'ttm-line-lyric'}>
                                            {line || ' '}
                                        </div>
                                    ))
                                    : <div className="ttm-empty">轉調後的譜會即時出現在這裡</div>}
                            </pre>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default TransposeToolModal;
