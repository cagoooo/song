// 快速轉調工具 — 貼上任何吉他譜文字 → 自動偵測調性 → 即時轉調 → 一鍵複製
//
// 📐 設計文件：docs/design/T5-transpose.md
//
// 解決的痛點：網路上的譜常不是原 Key（原曲 G 卻寫成 C），
// 現場彈唱前把譜貼進來，按幾下就拿到目標調的譜，不用手動逐顆改。

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { extractMusicSearchQueryFromAiText, pickLyricSearchPhrase } from '@/lib/musicSearch';

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

// extractMusicSearchQueryFromAiText / cleanMusicSearchText 已抽到 @/lib/musicSearch

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
    const [aiRecognizedText, setAiRecognizedText] = useState('');
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
    /** 控制列（半音/目標調/結果）— 辨識完成後自動捲到這，控制列+結果同框可見 */
    const controlsRef = useRef<HTMLDivElement>(null);
    /** 保留原始圖檔給 AI Vision 用（srcImageUrl 是 object URL，AI 要原始資料） */
    const srcFileRef = useRef<File | Blob | null>(null);

    // 辨識完成後自動捲到控制列（控制列 + 轉調結果同框）— 等 React 渲染出結果再捲
    const scrollToResult = useCallback(() => {
        setTimeout(() => {
            controlsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 220);
    }, []);
    /** AI 辨識進行中 */
    const [aiBusy, setAiBusy] = useState(false);
    /** AI 辨識模擬進度 0-100（單一 fetch 無真實進度，用緩升動畫讓使用者知道在跑） */
    const [aiProgress, setAiProgress] = useState(0);
    const aiTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // 卸載時清掉進度計時器
    useEffect(() => () => { if (aiTimerRef.current) clearInterval(aiTimerRef.current); }, []);

    useEffect(() => {
        document.body.classList.toggle('transpose-dialog-open', isOpen);
        return () => document.body.classList.remove('transpose-dialog-open');
    }, [isOpen]);

    // Image upload / paste / drop now uses AI Vision directly. Legacy OCR is disabled.
    const handleImage = useCallback(async (file: File | Blob) => {
        if (aiBusy) return;

        setOcrError(null);
        srcFileRef.current = file;
        setSrcImageUrl(URL.createObjectURL(file));
        setAiRecognizedText('');
        setInput('');
        setSteps(0);
        setOcrDone(false);
        setShowOcrText(false);
        setOcrMsg(null);
        setAiBusy(true);
        setAiProgress(6);

        if (aiTimerRef.current) clearInterval(aiTimerRef.current);
        aiTimerRef.current = setInterval(() => {
            setAiProgress((p) => (p >= 92 ? p : Math.min(92, p + (p < 50 ? 4 : p < 75 ? 2 : 1))));
        }, 350);

        try {
            const { aiRecognizeSheet } = await import('@/lib/aiSheetOcr');
            const sheet = await aiRecognizeSheet(file);

            if (sheet.trim()) {
                setAiProgress(100);
                setAiRecognizedText(sheet);
                setInput(sheet);
                setOcrDone(true);
                setShowOcrText(false);
                scrollToResult();
            } else {
                setOcrError('AI 沒辨識出內容，請換更清楚的圖片或裁切掉多餘背景後再試。');
            }
        } catch (e) {
            setOcrError(e instanceof Error ? e.message : 'AI 辨識失敗，請稍後再試。');
        } finally {
            if (aiTimerRef.current) {
                clearInterval(aiTimerRef.current);
                aiTimerRef.current = null;
            }
            setAiBusy(false);
            setOcrMsg(null);
            setTimeout(() => setAiProgress(0), 600);
        }
    }, [aiBusy, scrollToResult]);

    // 辨識失敗 → 用同一張原圖再辨識一次（免重新上傳，提升 UX）
    const retryRecognition = useCallback(() => {
        const file = srcFileRef.current;
        if (file && !aiBusy) void handleImage(file);
    }, [aiBusy, handleImage]);

    // 「清除」→ 完整歸零：圖片、辨識文字、輸入框、轉調位移、狀態提示全清空
    const clearAll = useCallback(() => {
        setSrcImageUrl(null);
        srcFileRef.current = null;
        setShowOcrText(false);
        setInput('');
        setAiRecognizedText('');
        setSteps(0);
        setOcrError(null);
        setOcrDone(false);
        setOcrMsg(null);
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

    // ===== 多格式下載（純文字 / 圖片 / PDF）=====
    const [dlMenuOpen, setDlMenuOpen] = useState(false);
    const [dlBusy, setDlBusy] = useState<string | null>(null);
    const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
    const [fullscreenZoom, setFullscreenZoom] = useState(1);
    // 字級與縮放解耦：字級調整實際 font-size（清晰不糊），zoom 走 transform 供整體俯瞰
    const [fullscreenFontScale, setFullscreenFontScale] = useState(1);
    // 沉浸看譜：無操作時自動收起工具列，輕點譜面再喚回，讓譜面接近滿版
    const [toolbarHidden, setToolbarHidden] = useState(false);
    const [fullscreenContentSize, setFullscreenContentSize] = useState({ width: 0, height: 0 });
    const dlRef = useRef<HTMLDivElement>(null);
    const outputRef = useRef<HTMLPreElement>(null);
    const pinchStartDistanceRef = useRef<number | null>(null);
    const pinchStartZoomRef = useRef(1);
    const fullscreenScrollRef = useRef<HTMLDivElement>(null);
    const fullscreenOutputRef = useRef<HTMLPreElement>(null);
    const zoomPointerHandledRef = useRef(false);
    const hideToolbarTimerRef = useRef<number | null>(null);
    const sheetTapRef = useRef<{ x: number; y: number; t: number; moved: boolean } | null>(null);
    const singleTouchStartRef = useRef<{
        x: number;
        y: number;
        scrollLeft: number;
        scrollTop: number;
    } | null>(null);

    const clampFullscreenZoom = useCallback((zoom: number) => Math.max(0.4, Math.min(2.8, zoom)), []);
    const changeFullscreenZoom = useCallback((delta: number) => {
        setFullscreenZoom((zoom) => clampFullscreenZoom(Number((zoom + delta).toFixed(2))));
    }, [clampFullscreenZoom]);
    const resetFullscreenZoom = useCallback(() => {
        setFullscreenZoom(1);
    }, []);

    // ===== 字級控制（與 zoom 解耦）=====
    const clampFontScale = useCallback((s: number) => Math.max(0.7, Math.min(2.4, s)), []);
    const changeFontScale = useCallback((delta: number) => {
        setFullscreenFontScale((s) => clampFontScale(Number((s + delta).toFixed(2))));
    }, [clampFontScale]);
    const resetFontScale = useCallback(() => setFullscreenFontScale(1), []);

    // ===== 工具列自動隱藏 / 喚回 =====
    const clearHideToolbarTimer = useCallback(() => {
        if (hideToolbarTimerRef.current != null) {
            window.clearTimeout(hideToolbarTimerRef.current);
            hideToolbarTimerRef.current = null;
        }
    }, []);
    const scheduleHideToolbar = useCallback(() => {
        clearHideToolbarTimer();
        hideToolbarTimerRef.current = window.setTimeout(() => setToolbarHidden(true), 4000);
    }, [clearHideToolbarTimer]);
    const revealToolbar = useCallback(() => {
        setToolbarHidden(false);
        scheduleHideToolbar();
    }, [scheduleHideToolbar]);
    const handleFullscreenZoomPointer = useCallback((
        e: React.PointerEvent<HTMLButtonElement>,
        action: 'in' | 'out' | 'reset',
    ) => {
        e.preventDefault();
        e.stopPropagation();
        zoomPointerHandledRef.current = true;
        window.setTimeout(() => {
            zoomPointerHandledRef.current = false;
        }, 350);
        if (action === 'reset') {
            resetFullscreenZoom();
            return;
        }
        changeFullscreenZoom(action === 'in' ? 0.1 : -0.1);
    }, [changeFullscreenZoom, resetFullscreenZoom]);
    const handleFullscreenZoomClick = useCallback((
        e: React.MouseEvent<HTMLButtonElement>,
        action: 'in' | 'out' | 'reset',
    ) => {
        if (zoomPointerHandledRef.current && e.detail !== 0) return;
        if (action === 'reset') {
            resetFullscreenZoom();
            return;
        }
        changeFullscreenZoom(action === 'in' ? 0.1 : -0.1);
    }, [changeFullscreenZoom, resetFullscreenZoom]);

    const handleFullscreenWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        const next = e.deltaY > 0 ? -0.08 : 0.08;
        changeFullscreenZoom(next);
    }, [changeFullscreenZoom]);

    const getTouchDistance = (touches: React.TouchList) => {
        if (touches.length < 2) return null;
        const [a, b] = [touches[0], touches[1]];
        return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };

    const handleFullscreenTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const scrollEl = fullscreenScrollRef.current;
            singleTouchStartRef.current = {
                x: touch.clientX,
                y: touch.clientY,
                scrollLeft: scrollEl?.scrollLeft ?? 0,
                scrollTop: scrollEl?.scrollTop ?? 0,
            };
            pinchStartDistanceRef.current = null;
            return;
        }
        const distance = getTouchDistance(e.touches);
        if (!distance) return;
        singleTouchStartRef.current = null;
        pinchStartDistanceRef.current = distance;
        pinchStartZoomRef.current = fullscreenZoom;
    }, [fullscreenZoom]);

    const handleFullscreenTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length === 1 && singleTouchStartRef.current && fullscreenScrollRef.current) {
            const touch = e.touches[0];
            const start = singleTouchStartRef.current;
            fullscreenScrollRef.current.scrollLeft = start.scrollLeft - (touch.clientX - start.x);
            fullscreenScrollRef.current.scrollTop = start.scrollTop - (touch.clientY - start.y);
            e.preventDefault();
            return;
        }
        const startDistance = pinchStartDistanceRef.current;
        const distance = getTouchDistance(e.touches);
        if (!startDistance || !distance) return;
        e.preventDefault();
        const ratio = distance / startDistance;
        setFullscreenZoom(clampFullscreenZoom(Number((pinchStartZoomRef.current * ratio).toFixed(2))));
    }, [clampFullscreenZoom]);

    const handleFullscreenTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length === 0) {
            singleTouchStartRef.current = null;
        }
        if (e.touches.length < 2) {
            pinchStartDistanceRef.current = null;
            pinchStartZoomRef.current = fullscreenZoom;
        }
    }, [fullscreenZoom]);

    // 輕點譜面（非拖曳、非縮放）= 切換工具列顯示；拖曳捲動 / 雙指縮放不觸發
    const handleSheetPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        sheetTapRef.current = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false };
    }, []);
    const handleSheetPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const start = sheetTapRef.current;
        if (!start) return;
        if (Math.abs(e.clientX - start.x) > 10 || Math.abs(e.clientY - start.y) > 10) {
            start.moved = true;
        }
    }, []);
    const handleSheetPointerUp = useCallback(() => {
        const start = sheetTapRef.current;
        sheetTapRef.current = null;
        if (!start || start.moved || Date.now() - start.t > 400) return;
        setToolbarHidden((hidden) => {
            if (hidden) {
                scheduleHideToolbar();
                return false;
            }
            clearHideToolbarTimer();
            return true;
        });
    }, [scheduleHideToolbar, clearHideToolbarTimer]);

    const measureFullscreenOutput = useCallback(() => {
        const el = fullscreenOutputRef.current;
        if (!el) return;
        const width = Math.ceil(Math.max(el.scrollWidth, el.offsetWidth));
        const height = Math.ceil(Math.max(el.scrollHeight, el.offsetHeight));
        setFullscreenContentSize((current) => (
            current.width === width && current.height === height ? current : { width, height }
        ));
    }, []);

    useLayoutEffect(() => {
        if (!isFullScreenOpen || !output) {
            setFullscreenContentSize({ width: 0, height: 0 });
            return undefined;
        }

        measureFullscreenOutput();
        const el = fullscreenOutputRef.current;
        const timer = window.setTimeout(measureFullscreenOutput, 0);
        window.addEventListener('resize', measureFullscreenOutput);

        const ResizeObserverCtor = window.ResizeObserver;
        const observer = el && ResizeObserverCtor ? new ResizeObserverCtor(measureFullscreenOutput) : null;
        if (el && observer) observer.observe(el);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('resize', measureFullscreenOutput);
            observer?.disconnect();
        };
    }, [isFullScreenOpen, measureFullscreenOutput, output]);

    const fullscreenCanvasStyle = useMemo(() => {
        const width = fullscreenContentSize.width
            ? `${Math.ceil(fullscreenContentSize.width * fullscreenZoom)}px`
            : undefined;
        const height = fullscreenContentSize.height
            ? `${Math.ceil(fullscreenContentSize.height * fullscreenZoom)}px`
            : undefined;
        return {
            '--ttm-fullscreen-zoom': fullscreenZoom,
            '--ttm-fullscreen-font-scale': fullscreenFontScale,
            width,
            height,
        } as React.CSSProperties;
    }, [fullscreenContentSize.height, fullscreenContentSize.width, fullscreenZoom, fullscreenFontScale]);

    useEffect(() => {
        if (!isFullScreenOpen) return;
        setFullscreenZoom(1);
        setFullscreenFontScale(1);
        setToolbarHidden(false);
        scheduleHideToolbar();
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsFullScreenOpen(false);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            clearHideToolbarTimer();
        };
    }, [isFullScreenOpen, scheduleHideToolbar, clearHideToolbarTimer]);

    // 全螢幕看譜時請求螢幕常亮（Wake Lock），避免彈唱中手機自動鎖屏；不支援則靜默降級
    useEffect(() => {
        if (!isFullScreenOpen) return undefined;
        const nav = navigator as Navigator & {
            wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
        };
        if (!nav.wakeLock?.request) return undefined;
        let sentinel: { release: () => Promise<void> } | null = null;
        let cancelled = false;
        const acquire = async () => {
            try {
                const lock = await nav.wakeLock!.request('screen');
                if (cancelled) {
                    void lock.release();
                } else {
                    sentinel = lock;
                }
            } catch {
                /* 不支援或被拒，靜默降級 */
            }
        };
        // 切到背景再回前景時 Wake Lock 會自動釋放，需重新請求
        const onVisibility = () => {
            if (document.visibilityState === 'visible' && !cancelled) void acquire();
        };
        void acquire();
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', onVisibility);
            try { void sentinel?.release(); } catch { /* noop */ }
            sentinel = null;
        };
    }, [isFullScreenOpen]);

    // 點選單外面就關閉
    useEffect(() => {
        if (!dlMenuOpen) return;
        const onDocClick = (e: MouseEvent) => {
            if (dlRef.current && !dlRef.current.contains(e.target as Node)) setDlMenuOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [dlMenuOpen]);

    const triggerDownload = (href: string, filename: string) => {
        const a = document.createElement('a');
        a.href = href;
        a.download = filename;
        a.click();
    };

    // 下載 .txt
    const handleDownloadTxt = () => {
        if (!output) return;
        const url = URL.createObjectURL(new Blob([output], { type: 'text/plain;charset=utf-8' }));
        triggerDownload(url, `吉他譜_${resultLabel}.txt`);
        URL.revokeObjectURL(url);
        setDlMenuOpen(false);
    };

    // 把轉調結果譜面渲染成 PNG dataURL（中文走瀏覽器渲染，不會 tofu；展開完整高度）
    const renderOutputPng = async (): Promise<string | null> => {
        const el = outputRef.current;
        if (!el) return null;
        setEditing(null); // 別把編輯中的 input 也截進去
        // 截圖前暫時展開（移除限高/捲動）以截完整譜面，截完恢復 —
        // 用 DOM 直接改比傳 toPng 的 width/height/style 可靠（後者會 hang）
        const prevMaxH = el.style.maxHeight;
        const prevOverflow = el.style.overflow;
        el.style.maxHeight = 'none';
        el.style.overflow = 'visible';
        try {
            const { toPng } = await import('html-to-image');
            // fontEmbedCSS:'' — embedWebFonts 看到非 null 就直接用它、完全不去
            // 讀/fetch Google Fonts（否則 cross-origin fetch 會拖慢甚至卡住）。
            // 字型在同瀏覽器渲染本已載入，不需 inline。
            return await toPng(el, {
                pixelRatio: 2,
                cacheBust: true,
                backgroundColor: '#ffffff',
                fontEmbedCSS: '',
            });
        } finally {
            el.style.maxHeight = prevMaxH;
            el.style.overflow = prevOverflow;
        }
    };

    // 下載圖片 .png
    const handleDownloadPng = async () => {
        if (!output || dlBusy) return;
        setDlBusy('png');
        setDlMenuOpen(false);
        try {
            const dataUrl = await renderOutputPng();
            if (dataUrl) triggerDownload(dataUrl, `吉他譜_${resultLabel}.png`);
        } catch { /* 產圖失敗忽略 */ } finally { setDlBusy(null); }
    };

    // 下載 PDF（A4 直式，整張譜面置中縮放；中文是圖片不會 tofu）
    const handleDownloadPdf = async () => {
        if (!output || dlBusy) return;
        setDlBusy('pdf');
        setDlMenuOpen(false);
        try {
            const dataUrl = await renderOutputPng();
            if (!dataUrl) return;
            const img = new Image();
            img.src = dataUrl;
            await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); });
            const { jsPDF } = await import('jspdf');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const margin = 10;
            let w = pageW - margin * 2;
            let h = (img.height / img.width) * w;
            const usableH = pageH - margin * 2;
            if (h > usableH) { h = usableH; w = (img.width / img.height) * h; }
            pdf.addImage(dataUrl, 'PNG', (pageW - w) / 2, margin, w, h);
            pdf.save(`吉他譜_${resultLabel}.pdf`);
        } catch { /* 產 PDF 失敗忽略 */ } finally { setDlBusy(null); }
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
    const saveSectionRef = useRef<HTMLDivElement>(null);
    const saveTitleInputRef = useRef<HTMLInputElement>(null);
    const songKeyForSave = targetKey ?? detected?.key ?? null;
    const musicSearchQuery = useMemo(() => {
        const explicit = [saveTitle.trim(), saveArtist.trim()].filter(Boolean).join(' ');
        if (explicit) return explicit;
        return pickLyricSearchPhrase(output || input);
    }, [input, output, saveArtist, saveTitle]);

    const musicSearchQueryFromAi = useMemo(() => {
        const explicit = [saveTitle.trim(), saveArtist.trim()].filter(Boolean).join(' ');
        if (explicit) return explicit;
        return extractMusicSearchQueryFromAiText(aiRecognizedText || input);
    }, [aiRecognizedText, input, saveArtist, saveTitle]);

    const renderMusicSearchButtons = (variant: 'result' | 'fullscreen') => {
        const query = musicSearchQueryFromAi.trim() || musicSearchQuery.trim();
        if (!query) return null;
        const encoded = encodeURIComponent(query);
        const label = variant === 'fullscreen' ? '搜尋音樂' : '快速找音樂';

        return (
            <div className={`ttm-music-search ttm-music-search-${variant}`} aria-label={`${label}：${query}`}>
                <span>{label}</span>
                <a
                    href={`https://open.spotify.com/search/${encoded}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ttm-music-link spotify"
                >
                    Spotify
                </a>
                <a
                    href={`https://music.youtube.com/search?q=${encoded}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ttm-music-link youtube"
                >
                    YouTube Music
                </a>
                <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${query} 歌詞`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ttm-music-link youtube"
                >
                    YouTube
                </a>
            </div>
        );
    };

    const openSaveForm = useCallback(() => {
        setSaveOpen(true);
        setSaveResult(null);
    }, []);

    useEffect(() => {
        if (!saveOpen) return;
        const timer = window.setTimeout(() => {
            saveSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            saveTitleInputRef.current?.focus({ preventScroll: true });
        }, 80);
        return () => window.clearTimeout(timer);
    }, [saveOpen]);

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
            <DialogContent className={`max-w-[1100px] w-[96vw] h-[90vh] p-0 overflow-hidden bg-white border-[rgba(17,17,17,0.18)] flex flex-col${isFullScreenOpen && output ? ' ttm-dialog-fullscreen-shell' : ''}`}>
                <DialogTitle className="sr-only">快速轉調工具</DialogTitle>
                <DialogDescription className="sr-only">
                    貼上吉他譜文字，自動偵測調性並即時轉調，完成後可一鍵複製。
                </DialogDescription>

                <button
                    type="button"
                    className="ttm-modal-close"
                    onClick={onClose}
                    aria-label="關閉快速轉調工具"
                >
                    ×
                    <span>關閉</span>
                </button>

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
                    <div className="ttm-controls" ref={controlsRef}>
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
                    <div className={'ttm-panes' + (output ? ' has-result' : '')}>
                        <div className="ttm-pane ttm-pane-source">
                            <div className="ttm-pane-h">
                                <span className="ttm-pane-title">{srcImageUrl ? '🖼️ 原圖參照' : '📋 貼上原譜'}</span>
                                <span className="ttm-pane-actions">
                                    <button
                                        className="ttm-pane-btn primary"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={!!ocrMsg}
                                    >
                                        📷 上傳譜圖
                                    </button>
                                    {srcImageUrl && (
                                        <button
                                            className="ttm-pane-btn"
                                            onClick={() => setShowOcrText((v) => !v)}
                                        >
                                            {showOcrText ? '🖼️ 看原圖' : '✏️ 修正文字'}
                                        </button>
                                    )}
                                    {(srcImageUrl || input) && (
                                        <button
                                            className="ttm-pane-btn danger"
                                            onClick={clearAll}
                                            aria-label="清除全部，清空輸入框與圖片"
                                        >
                                            ✕ 清除
                                        </button>
                                    )}
                                    {!srcImageUrl && !input && !ocrMsg && (
                                        <button className="ttm-pane-btn ghost" onClick={() => { setAiRecognizedText(''); setInput(EXAMPLE_SHEET); }}>
                                            ＋ 載入範例
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
                            {aiBusy && (
                                <div className="ttm-ai-progress" role="status" aria-live="polite">
                                    <div className="ttm-ai-progress-label">
                                        <span>✨ AI 辨識中…</span>
                                        <span className="ttm-ai-progress-pct">{aiProgress}%</span>
                                    </div>
                                    <div className="ttm-ai-progress-track">
                                        <div className="ttm-ai-progress-bar" style={{ width: `${aiProgress}%` }} />
                                    </div>
                                    <div className="ttm-ai-progress-hint">看圖辨識中，請稍候…（圖較大時多等幾秒）</div>
                                </div>
                            )}
                            {ocrError && (
                                <div className="ttm-ocr-error" role="alert">
                                    <span className="ttm-ocr-error-msg">⚠ {ocrError}</span>
                                    {srcFileRef.current && (
                                        <button
                                            type="button"
                                            className="ttm-ocr-retry"
                                            onClick={retryRecognition}
                                            disabled={aiBusy}
                                        >
                                            🔄 重新辨識一次
                                        </button>
                                    )}
                                </div>
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
                                    onChange={(e) => { setAiRecognizedText(''); setInput(e.target.value); setOcrDone(false); }}
                                    onDrop={handleDrop}
                                    onDragOver={(e) => e.preventDefault()}
                                    placeholder={'三種餵譜方式：\n\n1. 文字 — 把譜整段貼進來\n2. 截圖 — 直接 Ctrl+V 貼上，會自動啟動 AI 辨識\n3. 圖檔 — 點「📷 上傳譜圖」或拖放到這裡，會自動啟動 AI 辨識\n\nAI 辨識結果會落在這裡，可直接修正錯字'}
                                    spellCheck={false}
                                    aria-label="原譜輸入區"
                                />
                            )}
                            {ocrDone && (
                                <div className="ttm-ocr-tip">
                                    ✓ AI 辨識完成 — 右欄<b>黃色字</b>可直接點它就地修正。
                                </div>
                            )}
                        </div>

                        <div className="ttm-pane ttm-pane-result">
                            <div className="ttm-pane-h">
                                <span className="ttm-pane-title">
                                    {showDegrees
                                        ? <>🔢 數字級數{detected && <em className="ttm-pane-key"> 以 {detected.key} 調為 1</em>}</>
                                        : <>🎼 轉調結果{targetKey && steps !== 0 && <em className="ttm-pane-key"> → {targetKey} 調</em>}</>}
                                </span>
                                <span className="ttm-out-actions">
                                    <button
                                        className="ttm-copy ttm-fullscreen-trigger ttm-fullscreen-trigger-new"
                                        onClick={() => setIsFullScreenOpen(true)}
                                        disabled={!output}
                                        title="放大成全螢幕看譜"
                                    >
                                        ⛶ 放大全螢幕
                                    </button>
                                    <button
                                        className="ttm-copy ttm-fullscreen-trigger"
                                        onClick={() => setIsFullScreenOpen(true)}
                                        disabled={!output}
                                        title="放大成全螢幕看譜"
                                    >
                                        全螢幕看譜
                                    </button>
                                    <span className="ttm-dl" ref={dlRef}>
                                        <button
                                            className="ttm-copy"
                                            onClick={() => setDlMenuOpen((v) => !v)}
                                            disabled={!output || !!dlBusy}
                                            aria-haspopup="menu"
                                            aria-expanded={dlMenuOpen}
                                            title="下載成 文字 / 圖片 / PDF"
                                        >
                                            {dlBusy === 'png' ? '產圖中…' : dlBusy === 'pdf' ? '產 PDF 中…' : '⬇ 下載 ▾'}
                                        </button>
                                        {dlMenuOpen && (
                                            <div className="ttm-dl-menu" role="menu">
                                                <button role="menuitem" onClick={handleDownloadTxt}>📄 純文字 .txt</button>
                                                <button role="menuitem" onClick={handleDownloadPng}>🖼️ 圖片 .png</button>
                                                <button role="menuitem" onClick={handleDownloadPdf}>📕 PDF .pdf</button>
                                            </div>
                                        )}
                                    </span>
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
                            <pre className="ttm-output" aria-label="轉調結果" aria-live="polite" ref={outputRef}>
                                {output
                                    ? renderOutputLines()
                                    : <div className="ttm-empty">轉調後的譜會即時出現在這裡</div>}
                            </pre>
                            {output && renderMusicSearchButtons('result')}

                            {/* 存進歌庫（admin）— 把轉好的譜沉澱成歌庫資產 */}
                            {isAdmin && output && (
                                <div className="ttm-save" ref={saveSectionRef}>
                                    {!saveOpen ? (
                                        <button className="ttm-save-toggle" onClick={openSaveForm}>
                                            💾 存進歌庫
                                        </button>
                                    ) : (
                                        <div className="ttm-save-form">
                                            <div className="ttm-save-h">
                                                存進歌庫
                                                <em>{songKeyForSave ? `${songKeyForSave} 調` : ''}</em>
                                            </div>
                                            <input
                                                ref={saveTitleInputRef}
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
                                                placeholder="主理人筆記（選填）"
                                                value={saveNote}
                                                onChange={(e) => setSaveNote(e.target.value)}
                                                maxLength={500}
                                                aria-label="主理人筆記"
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
            {isFullScreenOpen && output && (
                <div
                    className={`ttm-fullscreen${toolbarHidden ? ' is-immersive' : ''}`}
                    role="dialog"
                    aria-modal="true"
                    aria-label="全螢幕轉調結果"
                >
                    <button
                        type="button"
                        className="ttm-fullscreen-grip"
                        onClick={revealToolbar}
                        aria-label="顯示工具列"
                    >
                        ⋯ 工具列
                    </button>
                    <div
                        className="ttm-fullscreen-bar"
                        onPointerDown={revealToolbar}
                    >
                        <div className="ttm-fullscreen-title">
                            <span>全螢幕看譜</span>
                            <em>
                                {showDegrees
                                    ? `數字級數${detected ? ` · ${detected.key} 調` : ''}`
                                    : targetKey
                                        ? `${targetKey} 調`
                                        : '轉調結果'}
                            </em>
                        </div>
                        {detected && (
                            <div className="ttm-fullscreen-transpose ttm-fullscreen-mode" role="group" aria-label="全螢幕顯示模式">
                                <span>顯示</span>
                                <button
                                    type="button"
                                    className={!showDegrees ? 'active' : ''}
                                    onClick={() => setShowDegrees(false)}
                                    aria-pressed={!showDegrees}
                                    title="顯示和弦名稱"
                                >
                                    ♪ 和弦
                                </button>
                                <button
                                    type="button"
                                    className={showDegrees ? 'active' : ''}
                                    onClick={() => setShowDegrees(true)}
                                    aria-pressed={showDegrees}
                                    title={`用數字級數表示（以 ${detected.key} 調為 1），吉他手移調思考超直覺`}
                                >
                                    🔢 級數
                                </button>
                            </div>
                        )}
                        {detected && !showDegrees && (
                            <div className="ttm-fullscreen-transpose" role="group" aria-label="全螢幕目標調">
                                <span>轉調</span>
                                {KEY_OPTIONS.map((k) => (
                                    <button
                                        key={k}
                                        type="button"
                                        className={isActiveKey(k) ? 'active' : ''}
                                        onClick={() => handlePickKey(k)}
                                        aria-pressed={isActiveKey(k)}
                                    >
                                        {k}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="ttm-fullscreen-actions">
                            {renderMusicSearchButtons('fullscreen')}
                            <div className="ttm-fullscreen-font" aria-label="全螢幕看譜字級控制">
                                <button
                                    type="button"
                                    className="ttm-fullscreen-btn compact"
                                    onClick={() => changeFontScale(-0.1)}
                                    disabled={fullscreenFontScale <= 0.7}
                                    aria-label="縮小字級"
                                >
                                    A－
                                </button>
                                <button
                                    type="button"
                                    className="ttm-fullscreen-btn compact"
                                    onClick={resetFontScale}
                                    aria-label="重設字級"
                                >
                                    A
                                </button>
                                <button
                                    type="button"
                                    className="ttm-fullscreen-btn compact"
                                    onClick={() => changeFontScale(0.1)}
                                    disabled={fullscreenFontScale >= 2.4}
                                    aria-label="放大字級"
                                >
                                    A＋
                                </button>
                            </div>
                            <div className="ttm-fullscreen-zoom" aria-label="全螢幕看譜縮放控制">
                                <button
                                    type="button"
                                    className="ttm-fullscreen-btn compact"
                                    onPointerDown={(e) => handleFullscreenZoomPointer(e, 'out')}
                                    onClick={(e) => handleFullscreenZoomClick(e, 'out')}
                                    disabled={fullscreenZoom <= 0.4}
                                    aria-label="縮小看譜"
                                >
                                    －
                                </button>
                                <button
                                    type="button"
                                    className="ttm-fullscreen-btn compact"
                                    onPointerDown={(e) => handleFullscreenZoomPointer(e, 'reset')}
                                    onClick={(e) => handleFullscreenZoomClick(e, 'reset')}
                                    aria-label="重設看譜縮放"
                                >
                                    {Math.round(fullscreenZoom * 100)}%
                                </button>
                                <button
                                    type="button"
                                    className="ttm-fullscreen-btn compact"
                                    onPointerDown={(e) => handleFullscreenZoomPointer(e, 'in')}
                                    onClick={(e) => handleFullscreenZoomClick(e, 'in')}
                                    disabled={fullscreenZoom >= 2.8}
                                    aria-label="放大看譜"
                                >
                                    ＋
                                </button>
                            </div>
                            <button
                                type="button"
                                className="ttm-fullscreen-btn"
                                onClick={handleCopy}
                            >
                                {copied ? '已複製' : '複製'}
                            </button>
                            <button
                                type="button"
                                className="ttm-fullscreen-btn primary"
                                onClick={() => setIsFullScreenOpen(false)}
                                autoFocus
                            >
                                關閉
                            </button>
                        </div>
                    </div>
                    <div
                        ref={fullscreenScrollRef}
                        className="ttm-fullscreen-scroll"
                        onWheel={handleFullscreenWheel}
                        onTouchStart={handleFullscreenTouchStart}
                        onTouchMove={handleFullscreenTouchMove}
                        onTouchEnd={handleFullscreenTouchEnd}
                        onPointerDown={handleSheetPointerDown}
                        onPointerMove={handleSheetPointerMove}
                        onPointerUp={handleSheetPointerUp}
                    >
                        <div className="ttm-fullscreen-canvas" style={fullscreenCanvasStyle}>
                            <pre
                                ref={fullscreenOutputRef}
                                className="ttm-output ttm-output-fullscreen"
                                aria-label="全螢幕轉調結果，可上下左右滑移，桌機可用滑鼠滾輪縮放，手機平板可用兩指縮放"
                            >
                                {renderOutputLines()}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
            </DialogContent>
        </Dialog>
    );
}

export default TransposeToolModal;
