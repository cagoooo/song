// 快速轉調工具 — 貼上任何吉他譜文字 → 自動偵測調性 → 即時轉調 → 一鍵複製
//
// 📐 設計文件：docs/design/T5-transpose.md
//
// 解決的痛點：網路上的譜常不是原 Key（原曲 G 卻寫成 C），
// 現場彈唱前把譜貼進來，按幾下就拿到目標調的譜，不用手動逐顆改。

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
    transposeChordSheet, transposeChordSymbol, isChordLine,
    extractChords, detectKey, preferFlatForKey, capoSuggestions,
    noteToSemitone, KEY_OPTIONS, nashvilleSheet, classifyToken,
} from '@/lib/transpose';
import { getRememberedSteps, rememberSteps, sheetMemoryKey } from '@/lib/transposeMemory';
import { buildChartFromSheet } from '@/lib/songChart';
import { addSongWithChart } from '@/lib/firestore';
import type { OcrProgress } from '@/lib/sheetOcr';

const HAS_CJK_RE = /[一-鿿぀-ヿ가-힯]/;

/** 把一行裡第 idx 個「非空白 token」換成 newTok（保留原空白對齊） */
function replaceNonSpaceToken(line: string, idx: number, newTok: string): string {
    const parts = line.split(/(\s+)/);
    let n = -1;
    for (let i = 0; i < parts.length; i++) {
        if (parts[i] && !/^\s+$/.test(parts[i])) {
            n++;
            if (n === idx) { parts[i] = newTok; break; }
        }
    }
    return parts.join('');
}

interface TransposeToolModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** 管理員可把轉好的譜一鍵存進歌庫（rules 限制 songs 寫入為 admin） */
    isAdmin?: boolean;
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

export function TransposeToolModal({ isOpen, onClose, isAdmin = false }: TransposeToolModalProps) {
    const [input, setInput] = useState('');
    const [steps, setSteps] = useState(0);
    const [copied, setCopied] = useState(false);
    /** OCR 進行中的進度訊息（null = 沒在跑） */
    const [ocrMsg, setOcrMsg] = useState<string | null>(null);
    const [ocrError, setOcrError] = useState<string | null>(null);
    /** 剛完成 OCR（顯示「可修正錯字」提示，使用者一動手編輯就收掉） */
    const [ocrDone, setOcrDone] = useState(false);
    /** 上傳的原圖（object URL）— OCR 後左欄直接顯示原圖（取代辨識文字） */
    const [srcImageUrl, setSrcImageUrl] = useState<string | null>(null);
    /** 圖片模式下切回文字編輯（修正辨識錯字用） */
    const [showOcrText, setShowOcrText] = useState(false);
    /** 顯示模式：false = 和弦、true = 數字級數（Nashville） */
    const [showDegrees, setShowDegrees] = useState(false);
    /** 上一份譜的記憶 key — 內容真的變才重設位移（只是 steps 變不動） */
    const lastSheetKeyRef = useRef('');

    // object URL 生命週期：換圖或關閉 modal 時釋放
    useEffect(() => {
        return () => { if (srcImageUrl) URL.revokeObjectURL(srcImageUrl); };
    }, [srcImageUrl]);
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 圖片 → OCR → 文字譜進左欄（91 譜這類只給圖檔的譜直接截圖丟進來）
    const handleImage = useCallback(async (file: File | Blob) => {
        setOcrError(null);
        setSrcImageUrl(URL.createObjectURL(file));
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
                setShowOcrText(false); // 回到原圖模式 — 辨識文字不用再看，結果在右欄
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

    // 新譜貼入 → 套用上次記住的調（同份譜重貼免重設；只是改位移不觸發）
    useEffect(() => {
        const key = input.trim() ? sheetMemoryKey(input) : '';
        if (key === lastSheetKeyRef.current) return;
        lastSheetKeyRef.current = key;
        if (key) setSteps(getRememberedSteps(key) ?? 0);
    }, [input]);

    // 使用者實際操作轉調才存記憶（OCR / 貼入造成的位移重設不會誤存）。
    // functional updater 讀最新值，快速連點也不丟。
    const changeSteps = useCallback((next: number | ((s: number) => number)) => {
        setSteps((prev) => {
            const raw = typeof next === 'function' ? next(prev) : next;
            const clamped = Math.max(-11, Math.min(11, raw));
            if (input.trim()) rememberSteps(sheetMemoryKey(input), clamped);
            return clamped;
        });
    }, [input]);

    // 目前的目標調（沒偵測到原調就只顯示位移量）
    const targetKey = useMemo(() => {
        if (!detected) return null;
        if (steps === 0) return detected.key;
        const rough = transposeChordSymbol(detected.key, steps);
        return transposeChordSymbol(detected.key, steps, { preferFlat: preferFlatForKey(rough) });
    }, [detected, steps]);

    // 右欄譜面：級數模式顯示 Nashville 數字級數（與位移無關，相對偵測調）；
    // 否則顯示轉調後的和弦
    const output = useMemo(() => {
        if (!input) return '';
        if (showDegrees) return detected ? nashvilleSheet(input, detected.key) : input;
        const preferFlat = targetKey ? preferFlatForKey(targetKey) : undefined;
        return transposeChordSheet(input, steps, { preferFlat });
    }, [input, steps, targetKey, showDegrees, detected]);

    // Capo 等效建議（目標調用開放指型怎麼彈）
    const capos = useMemo(() => {
        if (!targetKey || steps === 0) return [];
        return capoSuggestions(targetKey).filter((c) => c.capo > 0).slice(0, 2);
    }, [targetKey, steps]);

    // 位移 ≠ 0 卻一行都沒變 → 沒有任何行被判定成「和弦行」，給使用者線索
    const nothingTransposed = !showDegrees && steps !== 0 && input.trim() !== '' && output === input;

    const handlePickKey = (key: string) => {
        if (!detected) return;
        // 用半音值算位移（同音異名 F# / Gb 也能對上），取 -5 ~ +6 最短路徑
        const from = noteToSemitone(detected.key);
        const to = noteToSemitone(key);
        if (from === null || to === null) return;
        let diff = to - from;
        if (diff > 6) diff -= 12;
        if (diff < -5) diff += 12;
        changeSteps(diff);
    };

    // 就地修正可疑字：點右欄黃字 → 變 input → 改完寫回原譜對應 token → 重新轉調。
    // 因為轉調不增減 token，「output 行第 t 個非空白 token」對應「input 同行第 t 個」。
    const [editing, setEditing] = useState<{ line: number; tokenIdx: number; value: string } | null>(null);
    const commitEdit = useCallback(() => {
        if (!editing) return;
        const lines = input.split('\n');
        if (editing.line < lines.length) {
            const next = [...lines];
            next[editing.line] = replaceNonSpaceToken(next[editing.line], editing.tokenIdx, editing.value.trim());
            const joined = next.join('\n');
            if (joined !== input) {
                // 修錯字是「同一份譜的微調」— 先更新記憶 key，避免 input effect
                // 把它當新譜而把目前轉調位移歸零
                lastSheetKeyRef.current = sheetMemoryKey(joined);
                setInput(joined);
                setOcrDone(false);
            }
        }
        setEditing(null);
    }, [editing, input]);

    /** 右欄逐行渲染：和弦行內辨識不出的 token 標黃且可「就地點擊修正」，級數模式不標 */
    const renderOutputLines = () => {
        const outLines = output.split('\n');
        const refLines = showDegrees ? input.split('\n') : outLines;
        return outLines.map((line, i) => {
            const isChord = isChordLine(refLines[i] ?? line);
            if (showDegrees || !isChord) {
                return <div key={i} className={isChord ? 'ttm-line-chord' : 'ttm-line-lyric'}>{line || ' '}</div>;
            }
            let nonSpace = -1;
            return (
                <div key={i} className="ttm-line-chord">
                    {line.split(/(\s+)/).map((tok, j) => {
                        if (!tok || /^\s+$/.test(tok)) return tok;
                        nonSpace++;
                        const idx = nonSpace;
                        const suspect = classifyToken(tok) === 'word' && !HAS_CJK_RE.test(tok);
                        if (!suspect) return tok;
                        if (editing && editing.line === i && editing.tokenIdx === idx) {
                            return (
                                <input
                                    key={j}
                                    className="ttm-suspect-input"
                                    value={editing.value}
                                    autoFocus
                                    size={Math.max(editing.value.length, 2)}
                                    onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                                        else if (e.key === 'Escape') { e.preventDefault(); setEditing(null); }
                                    }}
                                    onBlur={commitEdit}
                                    aria-label={`修正辨識字 ${tok}`}
                                />
                            );
                        }
                        return (
                            <span
                                key={j}
                                className="ttm-suspect"
                                title="點我就地修正辨識錯字"
                                role="button"
                                tabIndex={0}
                                onClick={() => setEditing({ line: i, tokenIdx: idx, value: tok })}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setEditing({ line: i, tokenIdx: idx, value: tok });
                                    }
                                }}
                            >
                                {tok}
                            </span>
                        );
                    })}
                </div>
            );
        });
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

    /** 結果調性標籤（檔名 / 分享標題用） */
    const resultLabel = showDegrees ? '級數' : (targetKey ? `${targetKey}調` : '原調');

    // 下載成 .txt（檔名帶調性，現場存檔 / 傳團員）
    const handleDownload = () => {
        if (!output) return;
        const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `吉他譜_${resultLabel}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // 分享（手機可直接傳 LINE / 訊息）— 不支援 Web Share 的桌機改走複製
    const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    const handleShare = async () => {
        if (!output) return;
        try {
            await navigator.share({ title: `吉他譜（${resultLabel}）`, text: output });
        } catch {
            // 使用者取消 / 不支援 → 靜默退回複製
            void handleCopy();
        }
    };

    // ===== 存進歌庫（admin）— 把轉好的譜沉澱成歌庫資產 =====
    const [saveOpen, setSaveOpen] = useState(false);
    const [saveTitle, setSaveTitle] = useState('');
    const [saveArtist, setSaveArtist] = useState('');
    const [saveNote, setSaveNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);
    const songKeyForSave = targetKey ?? detected?.key ?? null;

    const handleSaveToLibrary = async () => {
        if (!saveTitle.trim() || saving) return;
        setSaving(true);
        setSaveResult(null);
        try {
            // 存「和弦版」的目前調（不管畫面是否在級數模式）
            const preferFlat = songKeyForSave ? preferFlatForKey(songKeyForSave) : undefined;
            const chordSheet = transposeChordSheet(input, steps, { preferFlat });
            const { progression, lyricBlocks } = buildChartFromSheet(chordSheet);
            await addSongWithChart({
                title: saveTitle,
                artist: saveArtist,
                songKey: songKeyForSave,
                progression,
                lyricBlocks,
                kaiNote: saveNote,
            });
            setSaveResult({ ok: true, msg: `✓ 已存進歌庫（${songKeyForSave ?? '原'}調）— 歌單與詳情頁立即可見` });
            setSaveOpen(false);
            setSaveTitle(''); setSaveArtist(''); setSaveNote('');
        } catch (e) {
            setSaveResult({ ok: false, msg: e instanceof Error ? e.message : '存入失敗，請重試' });
        } finally {
            setSaving(false);
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
                                onClick={() => changeSteps((s) => s - 1)}
                                disabled={steps <= -11 || showDegrees}
                                aria-label="降半音"
                            >−</button>
                            <span className="ttm-steps">{steps > 0 ? `+${steps}` : steps}</span>
                            <button
                                className="sdp-trans-btn"
                                onClick={() => changeSteps((s) => s + 1)}
                                disabled={steps >= 11 || showDegrees}
                                aria-label="升半音"
                            >＋</button>
                            {steps !== 0 && (
                                <button className="sdp-trans-reset" onClick={() => changeSteps(0)}>↺ 歸零</button>
                            )}
                        </div>

                        <div className="ttm-ctrl-group" role="group" aria-label="顯示模式">
                            <span className="ttm-ctrl-label">顯示</span>
                            <button
                                className={'ttm-toggle' + (!showDegrees ? ' active' : '')}
                                onClick={() => setShowDegrees(false)}
                                aria-pressed={!showDegrees}
                            >♪ 和弦</button>
                            <button
                                className={'ttm-toggle' + (showDegrees ? ' active' : '')}
                                onClick={() => setShowDegrees(true)}
                                disabled={!detected}
                                aria-pressed={showDegrees}
                                title={detected ? '用數字級數表示（1-4-5-6m），教學/移調思考超直覺' : '偵測不到調性，無法顯示級數'}
                            >🔢 級數</button>
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
                                <span>{srcImageUrl ? '原圖參照' : '貼上原譜（文字或截圖）'}</span>
                                <span className="ttm-pane-actions">
                                    <button
                                        className="ttm-ocr-btn"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={!!ocrMsg}
                                    >
                                        📷 上傳譜圖
                                    </button>
                                    {srcImageUrl && (
                                        <>
                                            <button
                                                className="ttm-ocr-btn"
                                                onClick={() => setShowOcrText((v) => !v)}
                                            >
                                                {showOcrText ? '🖼️ 看原圖' : '✏️ 修正辨識文字'}
                                            </button>
                                            <button
                                                className="sdp-trans-reset"
                                                onClick={() => { setSrcImageUrl(null); setShowOcrText(false); }}
                                                aria-label="清除圖片，回到文字輸入"
                                            >
                                                ✕ 清除圖片
                                            </button>
                                        </>
                                    )}
                                    {!srcImageUrl && !input && !ocrMsg && (
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
                            {srcImageUrl && !showOcrText ? (
                                /* 圖片模式：原圖完整呈現（辨識文字不用再看，轉調結果在右欄） */
                                <div className="ttm-img-full">
                                    <img src={srcImageUrl} alt="上傳的譜圖原圖" />
                                </div>
                            ) : (
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
                            )}
                            {ocrDone && (
                                <div className="ttm-ocr-tip">
                                    ✓ 辨識完成 — 右欄<b>黃色字</b>是可能辨識錯的，直接點它就能就地修正。
                                </div>
                            )}
                        </div>

                        <div className="ttm-pane">
                            <div className="ttm-pane-h">
                                <span>
                                    {showDegrees
                                        ? <>數字級數{detected && <em className="ttm-pane-key"> 以 {detected.key} 調為 1</em>}</>
                                        : <>轉調結果{targetKey && steps !== 0 && <em className="ttm-pane-key"> → {targetKey} 調</em>}</>}
                                </span>
                                <span className="ttm-out-actions">
                                    <button
                                        className="ttm-copy"
                                        onClick={handleDownload}
                                        disabled={!output}
                                        title="下載成 .txt 檔（現場存檔 / 傳團員）"
                                    >
                                        ⬇ 下載
                                    </button>
                                    {canShare && (
                                        <button
                                            className="ttm-copy"
                                            onClick={handleShare}
                                            disabled={!output}
                                            title="分享（手機可直接傳 LINE / 訊息）"
                                        >
                                            ↗ 分享
                                        </button>
                                    )}
                                    <button
                                        className={'ttm-copy' + (copied ? ' done' : '')}
                                        onClick={handleCopy}
                                        disabled={!output}
                                    >
                                        {copied ? '✓ 已複製' : '複製結果'}
                                    </button>
                                </span>
                            </div>
                            {nothingTransposed && (
                                <div className="ttm-ocr-error" role="alert">
                                    ⚠ 沒有偵測到可轉調的「和弦行」— 確認和弦行裡沒夾中文字，
                                    或修掉黏在和弦上的怪符號（OCR 偶爾把 | 認成 I / l / 1）。
                                </div>
                            )}
                            <pre className="ttm-output" aria-label="轉調結果" aria-live="polite">
                                {output
                                    ? renderOutputLines()
                                    : <div className="ttm-empty">轉調後的譜會即時出現在這裡</div>}
                            </pre>

                            {/* 存進歌庫（admin）— 把轉好的譜沉澱成歌庫資產 */}
                            {isAdmin && output && (
                                <div className="ttm-save">
                                    {!saveOpen ? (
                                        <button className="ttm-save-toggle" onClick={() => { setSaveOpen(true); setSaveResult(null); }}>
                                            💾 存進歌庫
                                        </button>
                                    ) : (
                                        <div className="ttm-save-form">
                                            <div className="ttm-save-h">
                                                存進歌庫
                                                <em>{songKeyForSave ? `${songKeyForSave} 調` : ''}</em>
                                            </div>
                                            <input
                                                className="ttm-save-input"
                                                placeholder="歌名（必填）"
                                                value={saveTitle}
                                                onChange={(e) => setSaveTitle(e.target.value)}
                                                maxLength={100}
                                                aria-label="歌名"
                                            />
                                            <input
                                                className="ttm-save-input"
                                                placeholder="歌手（留空為「不確定」）"
                                                value={saveArtist}
                                                onChange={(e) => setSaveArtist(e.target.value)}
                                                maxLength={50}
                                                aria-label="歌手"
                                            />
                                            <input
                                                className="ttm-save-input"
                                                placeholder="阿凱筆記（選填）"
                                                value={saveNote}
                                                onChange={(e) => setSaveNote(e.target.value)}
                                                maxLength={500}
                                                aria-label="阿凱筆記"
                                            />
                                            <div className="ttm-save-actions">
                                                <button
                                                    className="ttm-copy"
                                                    onClick={handleSaveToLibrary}
                                                    disabled={!saveTitle.trim() || saving}
                                                >
                                                    {saving ? '存入中…' : '確認存入'}
                                                </button>
                                                <button className="sdp-trans-reset" onClick={() => setSaveOpen(false)}>
                                                    取消
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {saveResult && (
                                        <div className={saveResult.ok ? 'ttm-save-ok' : 'ttm-save-err'} role="status">
                                            {saveResult.ok ? saveResult.msg : `⚠ ${saveResult.msg}`}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default TransposeToolModal;
