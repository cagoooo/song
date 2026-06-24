// 建議新歌曲表單對話框 - 含重複檢測功能
import { useState, useCallback, memo, useMemo, useEffect, useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { beginComposing } from '@/lib/composingGuard';
import { loadDraft, saveDraft, clearDraft } from '@/lib/draftStorage';
import { useScrollFocusedIntoView } from '@/hooks/useScrollFocusedIntoView';
import { trackEvent } from '@/lib/funnelAnalytics';
import { addMySuggestion } from '@/lib/mySuggestions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Lightbulb, Plus, Music2, FileText, PlusCircle, Sparkles, CheckCircle, ThumbsUp, RotateCcw, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { submitSuggestion } from '@/hooks/use-suggestions';
import { findDuplicateSong, type MatchedSong } from '@/lib/duplicateSong';
import type { Song } from '@/lib/firestore';

interface SuggestionFormProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    songs?: Song[];
    onNavigateToSong?: (songId: string) => void;
    /** 送出成功且關閉表單後通知父層（帶新 doc id）：展開清單、捲到該卡引導「+1 揪人」 */
    onSubmitted?: (suggestionId: string) => void;
}

// 表單草稿：打到一半誤關 / 切走 / 重新整理也不消失
const DRAFT_KEY = 'song-suggestion-draft-v1';
// 記住「你的稱呼」：送出成功後保留，下次開表單自動帶回（常客免每次重打）
const NAME_KEY = 'song-suggestion-name-v1';
// 重複偵測門檻（集中管理，方便依現場誤判率調整）：
//   - LIVE_HINT_THRESHOLD：打字時的「柔性提示」門檻，較寬鬆，只提示不擋送出
//   - 送出時「硬擋」只在標準化完全相同（matchType === 'exact'）才跳確認框，
//     避免相似歌名（如「再見的時候」vs「再見」）擋住使用者點不同的歌
const LIVE_HINT_THRESHOLD = 0.6;
interface SuggestionDraft {
    title: string;
    artist: string;
    suggestedBy: string;
    notes: string;
}

// 歌手選項按鈕 — Editorial 雜誌風 chip
const ArtistOption = memo(function ArtistOption({
    option,
    isSelected,
    onClick
}: {
    option: string;
    isSelected: boolean;
    onClick: () => void;
}) {
    const labels: Record<string, string> = {
        '不確定': '🤔 不確定歌手',
        '多人翻唱': '🎤 多人翻唱',
        '經典老歌': '🎵 經典老歌'
    };

    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors duration-150
                ${isSelected
                    ? 'bg-[#2b4dff] text-white border-[#2b4dff]'
                    : 'bg-white text-slate-600 border-[rgba(17,17,17,0.18)] hover:border-[#2b4dff] hover:text-[#2b4dff]'}`}
        >
            {labels[option] || option}
        </button>
    );
});

export function SuggestionForm({ isOpen, onOpenChange, songs = [], onNavigateToSong, onSubmitted }: SuggestionFormProps) {
    // 初始值從 localStorage 草稿回填（lazy initializer，只在 mount 時讀一次）
    const initialDraft = useMemo(() => loadDraft<SuggestionDraft>(DRAFT_KEY), []);
    const [title, setTitle] = useState(initialDraft?.title ?? '');
    const [artist, setArtist] = useState(initialDraft?.artist ?? '');
    const [suggestedBy, setSuggestedBy] = useState(initialDraft?.suggestedBy ?? loadDraft<string>(NAME_KEY) ?? '');
    const [notes, setNotes] = useState(initialDraft?.notes ?? '');
    // 是否有回填草稿 → 顯示「已回填上次草稿」提示，可一鍵清除
    const [draftRestored, setDraftRestored] = useState(
        !!(initialDraft && (initialDraft.title || initialDraft.artist || initialDraft.suggestedBy || initialDraft.notes))
    );
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
    const [matchedSong, setMatchedSong] = useState<MatchedSong | null>(null);
    // 送出成功儀式：顯示「已投遞」印章動畫，短暫停留後自動關閉
    const [submitted, setSubmitted] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // 表單開啟期間進入「專注輸入」模式 → 暫停全站慶祝／互動全螢幕覆蓋層，避免蓋住輸入框干擾打字
    useEffect(() => {
        if (!isOpen) return;
        const release = beginComposing();
        return release;
    }, [isOpen]);

    // 開表單時若「稱呼」是空的，自動帶回上次記住的名字（表單一直掛載，送出後會被清空）
    useEffect(() => {
        if (!isOpen) return;
        setSuggestedBy((prev) => prev || loadDraft<string>(NAME_KEY) || '');
    }, [isOpen]);

    // 漏斗埋點：本次開啟的 session 狀態（是否打過字 / 是否已送出）
    const typedThisSessionRef = useRef(false);
    const submittedThisSessionRef = useRef(false);
    const hintShownThisSessionRef = useRef(false);
    useEffect(() => {
        if (isOpen) {
            // 開啟表單
            typedThisSessionRef.current = false;
            submittedThisSessionRef.current = false;
            hintShownThisSessionRef.current = false;
            trackEvent('suggestion_form_open');
            if (draftRestored) trackEvent('suggestion_draft_restored');
            return () => {
                // 關閉表單：打了字卻沒送出 → 記為放棄
                if (typedThisSessionRef.current && !submittedThisSessionRef.current) {
                    trackEvent('suggestion_close_without_submit');
                }
            };
        }
        // isOpen=false 不重複註冊
        return undefined;
        // 只在 isOpen 變化時觸發（draftRestored 於開啟當下讀取即可）
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // 第一次打字時記一次 typing_start
    const markTyping = useCallback(() => {
        if (!typedThisSessionRef.current) {
            typedThisSessionRef.current = true;
            trackEvent('suggestion_typing_start');
        }
    }, []);

    // 手機鍵盤彈出時，把聚焦欄位自動捲進可視區，避免被鍵盤遮住
    useScrollFocusedIntoView(isOpen);

    // 自動暫存草稿（debounce 400ms）；全部清空時移除草稿
    useEffect(() => {
        const isEmpty = !title && !artist && !suggestedBy && !notes;
        if (isEmpty) {
            clearDraft(DRAFT_KEY);
            return;
        }
        const timer = setTimeout(() => {
            saveDraft<SuggestionDraft>(DRAFT_KEY, { title, artist, suggestedBy, notes });
        }, 400);
        return () => clearTimeout(timer);
    }, [title, artist, suggestedBy, notes]);

    // 清空表單 + 草稿（送出成功 / 手動清除草稿共用）
    const resetForm = useCallback(() => {
        setTitle('');
        setArtist('');
        setSuggestedBy('');
        setNotes('');
        setDraftRestored(false);
        clearDraft(DRAFT_KEY);
    }, []);

    // 檢測歌曲是否已存在（標準化相等或高度相似才算，避免「再見的時候」被「再見」誤判）
    const checkDuplicate = useCallback(
        (inputTitle: string, inputArtist: string): MatchedSong | null =>
            findDuplicateSong(inputTitle, inputArtist, songs),
        [songs],
    );

    // 即時重複偵測 — 打字時（debounce 400ms）就比對歌單，標題 ≥2 字才提示以免噪音
    const [liveMatch, setLiveMatch] = useState<MatchedSong | null>(null);
    useEffect(() => {
        if (title.trim().length < 2) {
            setLiveMatch(null);
            return;
        }
        const timer = setTimeout(() => {
            // 柔性提示：用較寬鬆門檻，抓到相似就提示（但不擋送出）
            const match = findDuplicateSong(title, artist, songs, LIVE_HINT_THRESHOLD);
            setLiveMatch(match);
            // 漏斗埋點：本次 session 第一次出現重複提示記一次
            if (match && !hintShownThisSessionRef.current) {
                hintShownThisSessionRef.current = true;
                trackEvent('duplicate_hint_shown');
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [title, artist, songs]);

    const addSuggestionMutation = useMutation({
        mutationFn: async () => {
            return submitSuggestion(title, artist, suggestedBy, notes);
        },
        onSuccess: ({ id: newId, queued }) => {
            submittedThisSessionRef.current = true;
            trackEvent('suggestion_submit_success');
            // 記住「你的稱呼」供下次自動帶回（空白則清除記憶）
            const nm = suggestedBy.trim();
            if (nm) saveDraft(NAME_KEY, nm);
            else clearDraft(NAME_KEY);
            // 「我的推薦」本機追蹤：記下這筆 doc id，之後可比對狀態（待審核/已採納…）
            if (newId) {
                addMySuggestion({
                    id: newId,
                    title: title.trim(),
                    artist: artist.trim(),
                    ts: Date.now(),
                    seenStatus: 'pending',
                });
            }
            // 離線送出：誠實告知已暫存，恢復連線會自動補送（仍照常播投遞儀式）
            if (queued) {
                toast({
                    title: '已暫存你的推薦',
                    description: '目前網路不穩，恢復連線後會自動補送，免重填。',
                    variant: 'default',
                });
            }
            queryClient.invalidateQueries({ queryKey: ['/api/suggestions'] });
            // 投遞成功儀式：顯示「已投遞」印章 + 小彩帶，短暫停留後自動關閉
            setSubmitted(true);
            void import('canvas-confetti').then(({ default: confetti }) => {
                confetti({
                    particleCount: 60,
                    spread: 70,
                    startVelocity: 38,
                    origin: { x: 0.5, y: 0.5 },
                    colors: ['#2b4dff', '#ffffff', '#0ea5e9', '#1d4ed8'],
                    ticks: 90,
                    zIndex: 10001,
                });
            }).catch(() => { /* 彩帶失敗不影響主流程 */ });
            setTimeout(() => {
                setSubmitted(false);
                resetForm();
                onOpenChange(false);
                // 關閉後引導去清單「+1 揪人」（展開 + 捲到該卡 + 高亮）
                if (newId) onSubmitted?.(newId);
            }, 1700);
        },
        onError: (error: Error) => {
            toast({
                title: '提交失敗',
                description: error.message || '請稍後再試',
                variant: 'destructive',
            });
        },
    });

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();

        // 只有「標準化後完全相同」才硬擋跳確認框；相似（partial）僅靠即時提示，不阻擋送出
        const duplicate = checkDuplicate(title, artist);
        if (duplicate && duplicate.matchType === 'exact') {
            setMatchedSong(duplicate);
            setShowDuplicateDialog(true);
            return;
        }

        // 沒有完全重複，直接提交
        addSuggestionMutation.mutate();
    }, [title, artist, checkDuplicate, addSuggestionMutation]);

    // IME 組字保護：注音／拼音／日文等「組字中」按 Enter 是選字，不該觸發表單送出
    const handleFormKeyDown = useCallback((e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === 'Enter' && (e.nativeEvent as KeyboardEvent).isComposing) {
            e.preventDefault();
        }
    }, []);

    // 跳轉到指定歌曲（重複對話框 / 即時提示共用）
    const navigateToSong = useCallback((song: Song) => {
        if (!onNavigateToSong) return;
        onOpenChange(false);
        setShowDuplicateDialog(false);
        onNavigateToSong(song.id);
        toast({
            title: '🎵 找到了！',
            description: `已跳轉至「${song.title}」，快來點播吧！`,
            variant: 'success',
        });
    }, [onNavigateToSong, onOpenChange, toast]);

    const handleNavigateToSong = useCallback(() => {
        if (matchedSong) navigateToSong(matchedSong.song);
    }, [matchedSong, navigateToSong]);

    const handleForceSubmit = useCallback(() => {
        setShowDuplicateDialog(false);
        addSuggestionMutation.mutate();
    }, [addSuggestionMutation]);

    const handleArtistSelect = useCallback((option: string) => {
        setArtist(option);
    }, []);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogTrigger asChild>
                    <Button
                        variant="default"
                        className="w-full text-base py-6 px-4 font-semibold rounded-xl
                           border-0
                           bg-[#2b4dff] hover:bg-[#1d3bd8]
                           text-white
                           shadow-md hover:shadow-lg
                           active:scale-[0.98] transition-all duration-150"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Plus className="w-5 h-5" />
                            <span>想點的歌還沒有？</span>
                            <span className="font-bold">建議新歌給我們！</span>
                        </div>
                    </Button>
                </DialogTrigger>

                <DialogPortal>
                    <DialogOverlay className="suggestion-dialog-overlay" />
                    <DialogPrimitive.Content className="suggestion-dialog-content ed-sheet ed-sheet--bottom relative w-[calc(100vw-2rem)] max-w-md gap-0 p-0 overflow-hidden bg-[#faf7f0] border-[rgba(17,17,17,0.18)]">
                    {/* 雜誌頂條 */}
                    <div className="editorial-modal-flag">
                        <span>Nº 12</span>
                        <span className="center">Reader’s Pick</span>
                        <span className="text-right">Side A</span>
                    </div>

                    {/* 手機端：鍵盤開著時，等到 click 才關會被 input 失焦/鍵盤收合吃掉第一次點擊
                        （感覺卡住或要點兩次）。改在 pointerdown 立即關閉；onClick 保留給鍵盤操作。 */}
                    <button
                        type="button"
                        className="suggestion-dialog-close"
                        aria-label="關閉推薦新歌表單"
                        onPointerDown={(e) => { e.preventDefault(); onOpenChange(false); }}
                        onClick={() => onOpenChange(false)}
                    >
                        <X className="h-4 w-4" />
                        <span>關閉</span>
                    </button>

                    <DialogHeader className="shrink-0 px-6 pt-5 pb-3 space-y-1">
                        <div
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 11,
                                letterSpacing: '0.24em',
                                textTransform: 'uppercase',
                                color: 'var(--ed-ink-3)',
                            }}
                        >
                            Chapter · 推薦新歌
                        </div>
                        <DialogTitle
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontStyle: 'italic',
                                fontWeight: 900,
                                fontSize: 28,
                                letterSpacing: '-0.02em',
                                color: 'var(--ed-ink-1)',
                                margin: 0,
                                lineHeight: 1.15,
                            }}
                            className="flex items-center gap-2"
                        >
                            <Sparkles className="w-5 h-5 text-[#2b4dff]" />
                            建議<span style={{ color: '#2b4dff' }}>新歌</span>
                        </DialogTitle>
                        <DialogDescription
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontStyle: 'italic',
                                fontSize: 14,
                                color: 'var(--ed-ink-2)',
                                lineHeight: 1.5,
                            }}
                        >
                            您的建議會交給主持人審核，通過後就會出現在可點播清單中。
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="suggestion-form-scroll ed-sheet-body space-y-4 px-6 pb-0">
                        {/* 草稿回填提示 — 上次未送出的內容已自動帶回，可一鍵清除重填 */}
                        {draftRestored && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#2b4dff]/[0.06] border border-[#2b4dff]/20 animate-in fade-in slide-in-from-top-1 duration-200">
                                <RotateCcw className="w-3.5 h-3.5 text-[#2b4dff] shrink-0" />
                                <span className="text-xs text-[#2b4dff] flex-1" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.02em' }}>
                                    已帶回上次未送出的草稿
                                </span>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-500 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                    清除重填
                                </button>
                            </div>
                        )}

                        {/* 歌曲名稱 */}
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="title"
                                className="flex items-center gap-1.5"
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 10,
                                    letterSpacing: '0.22em',
                                    textTransform: 'uppercase',
                                    color: 'var(--ed-ink-3)',
                                    fontWeight: 600,
                                }}
                            >
                                <Music2 className="w-3.5 h-3.5" />
                                Title · 歌曲名稱
                            </Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => { markTyping(); setTitle(e.target.value); }}
                                required
                                className="h-11 bg-white border-[rgba(17,17,17,0.18)] focus:border-[#2b4dff] focus-visible:ring-2 focus-visible:ring-[#2b4dff]/20 rounded-md px-4 text-slate-900"
                                placeholder="輸入歌曲名稱"
                            />
                            {/* 即時重複偵測 — 打字時就提示歌單裡可能已有，點一下直接前往點播 */}
                            {liveMatch && (
                                <button
                                    type="button"
                                    onClick={() => { trackEvent('duplicate_hint_click'); navigateToSong(liveMatch.song); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left
                                        bg-amber-50 border border-amber-200 hover:border-amber-300 hover:bg-amber-100/70
                                        transition-colors animate-in fade-in slide-in-from-top-1 duration-200 group"
                                >
                                    <CheckCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                    <span className="flex-1 min-w-0 text-xs text-amber-800">
                                        {liveMatch.matchType === 'exact' ? '這首好像已在歌單：' : '歌單裡有相似的歌：'}
                                        <span className="font-semibold truncate">「{liveMatch.song.title}」</span>
                                        <span className="text-amber-600/80">（{liveMatch.song.voteCount || 0} 票）</span>
                                    </span>
                                    <span className="shrink-0 inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-700 group-hover:text-amber-900">
                                        前往點播
                                        <ThumbsUp className="w-3 h-3" />
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* 歌手 */}
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="artist"
                                className="flex items-center gap-1.5"
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 10,
                                    letterSpacing: '0.22em',
                                    textTransform: 'uppercase',
                                    color: 'var(--ed-ink-3)',
                                    fontWeight: 600,
                                }}
                            >
                                <FileText className="w-3.5 h-3.5" />
                                Artist · 歌手 <span className="text-[10px] text-slate-400 normal-case tracking-normal">(選填)</span>
                            </Label>
                            <Input
                                id="artist"
                                value={artist}
                                onChange={(e) => { markTyping(); setArtist(e.target.value); }}
                                placeholder="如不確定可留空或選擇下方選項"
                                className="h-11 bg-white border-[rgba(17,17,17,0.18)] focus:border-[#2b4dff] focus-visible:ring-2 focus-visible:ring-[#2b4dff]/20 rounded-md px-4 text-slate-900"
                            />
                            <div className="flex flex-wrap gap-2 mt-2">
                                {['不確定', '多人翻唱', '經典老歌'].map((option) => (
                                    <ArtistOption
                                        key={option}
                                        option={option}
                                        isSelected={artist === option}
                                        onClick={() => handleArtistSelect(option)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* 您的稱呼 */}
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="suggestedBy"
                                className="flex items-center gap-1.5"
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 10,
                                    letterSpacing: '0.22em',
                                    textTransform: 'uppercase',
                                    color: 'var(--ed-ink-3)',
                                    fontWeight: 600,
                                }}
                            >
                                <PlusCircle className="w-3.5 h-3.5" />
                                Your Name · 您的稱呼 <span className="text-[10px] text-slate-400 normal-case tracking-normal">(選填)</span>
                            </Label>
                            <Input
                                id="suggestedBy"
                                value={suggestedBy}
                                onChange={(e) => { markTyping(); setSuggestedBy(e.target.value); }}
                                placeholder="讓大家知道是誰推薦的好歌！"
                                className="h-11 bg-white border-[rgba(17,17,17,0.18)] focus:border-[#2b4dff] focus-visible:ring-2 focus-visible:ring-[#2b4dff]/20 rounded-md px-4 text-slate-900"
                            />
                        </div>

                        {/* 推薦理由 */}
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="notes"
                                className="flex items-center gap-1.5"
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 10,
                                    letterSpacing: '0.22em',
                                    textTransform: 'uppercase',
                                    color: 'var(--ed-ink-3)',
                                    fontWeight: 600,
                                }}
                            >
                                <Lightbulb className="w-3.5 h-3.5" />
                                Why · 為什麼想推薦 <span className="text-[10px] text-slate-400 normal-case tracking-normal">(選填)</span>
                            </Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => { markTyping(); setNotes(e.target.value); }}
                                placeholder="分享一下您喜歡這首歌的原因..."
                                className="min-h-[80px] bg-white border-[rgba(17,17,17,0.18)] focus:border-[#2b4dff] focus-visible:ring-2 focus-visible:ring-[#2b4dff]/20 rounded-md px-4 py-3 text-slate-900 resize-none"
                            />
                        </div>

                        {/* 送出按鈕 — sticky 貼在對話框底部，長內容 / 手機鍵盤彈出時仍隨手可按 */}
                        <div className="sticky bottom-0 z-10 -mx-6 mt-2 px-6 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-[#faf7f0] border-t border-[rgba(17,17,17,0.08)]">
                            <Button
                                type="submit"
                                disabled={addSuggestionMutation.isPending}
                                className="w-full h-12 rounded-md font-semibold text-white tracking-wide
                                   bg-[#2b4dff] hover:bg-[#1d3bd8]
                                   shadow-md hover:shadow-lg
                                   active:scale-[0.98] transition-all duration-150
                                   disabled:opacity-70 disabled:cursor-not-allowed"
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 13,
                                    letterSpacing: '0.18em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {addSuggestionMutation.isPending ? '送出中…' : '送出建議 →'}
                            </Button>
                        </div>
                    </form>

                    {/* 送出成功儀式 — Editorial 投遞印章覆蓋層 */}
                    <AnimatePresence>
                        {submitted && (
                            <motion.div
                                className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-[#faf7f0] px-8 text-center"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <motion.div
                                    initial={{ scale: 0.4, rotate: -18, opacity: 0 }}
                                    animate={{ scale: 1, rotate: -6, opacity: 1 }}
                                    transition={{ type: 'spring', stiffness: 260, damping: 15 }}
                                    className="relative flex h-28 w-28 items-center justify-center rounded-full border-[3px] border-[#2b4dff]"
                                    style={{ boxShadow: '0 12px 36px -14px rgba(43,77,255,0.55)' }}
                                >
                                    <Check className="h-12 w-12 text-[#2b4dff]" strokeWidth={2.5} />
                                    <Sparkles className="absolute -right-1 -top-1 h-5 w-5 text-[#2b4dff] animate-pulse" />
                                </motion.div>
                                <div className="space-y-1">
                                    <div
                                        style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: 11,
                                            letterSpacing: '0.24em',
                                            textTransform: 'uppercase',
                                            color: 'var(--ed-ink-3)',
                                        }}
                                    >
                                        Delivered · 已投遞
                                    </div>
                                    <div
                                        style={{
                                            fontFamily: 'var(--font-display)',
                                            fontStyle: 'italic',
                                            fontWeight: 900,
                                            fontSize: 26,
                                            letterSpacing: '-0.02em',
                                            color: 'var(--ed-ink-1)',
                                            lineHeight: 1.15,
                                        }}
                                    >
                                        推薦已送達<span style={{ color: '#2b4dff' }}>主持人</span>
                                    </div>
                                </div>
                                <p
                                    style={{
                                        fontFamily: 'var(--font-display)',
                                        fontStyle: 'italic',
                                        fontSize: 14,
                                        color: 'var(--ed-ink-2)',
                                        lineHeight: 1.5,
                                    }}
                                >
                                    謝謝你的好品味，審核後就會出現在點播清單 ♪
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    </DialogPrimitive.Content>
                </DialogPortal>
            </Dialog>

            {/* 重複歌曲提示 — Editorial 米色卡 + 藍色 CTA */}
            <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
                <AlertDialogContent className="max-w-md bg-[#faf7f0] border-[rgba(17,17,17,0.18)]">
                    <AlertDialogHeader>
                        <AlertDialogTitle
                            className="flex items-center gap-2"
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontStyle: 'italic',
                                fontWeight: 800,
                                fontSize: 22,
                                color: 'var(--ed-ink-1)',
                            }}
                        >
                            <CheckCircle className="w-6 h-6 text-[#2b4dff]" />
                            這首歌<span style={{ color: '#2b4dff' }}>已在</span>歌單中
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p
                                    style={{
                                        fontFamily: 'var(--font-display)',
                                        fontStyle: 'italic',
                                        fontSize: 14,
                                        color: 'var(--ed-ink-2)',
                                    }}
                                >
                                    {matchedSong?.matchType === 'exact'
                                        ? '完全匹配的歌曲：'
                                        : '類似的歌曲：'}
                                </p>
                                {matchedSong && (
                                    <div className="p-4 bg-white rounded-md border border-[rgba(17,17,17,0.12)]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-md bg-slate-100 border border-[rgba(17,17,17,0.12)] flex items-center justify-center">
                                                <Music2 className="w-5 h-5 text-slate-500" />
                                            </div>
                                            <div>
                                                <p
                                                    style={{
                                                        fontFamily: 'var(--font-display)',
                                                        fontWeight: 700,
                                                        fontSize: 16,
                                                        color: 'var(--ed-ink-1)',
                                                    }}
                                                >
                                                    {matchedSong.song.title}
                                                </p>
                                                <p
                                                    className="text-sm text-slate-500"
                                                    style={{
                                                        fontFamily: 'var(--font-mono)',
                                                        fontSize: 10,
                                                        letterSpacing: '0.14em',
                                                        textTransform: 'uppercase',
                                                    }}
                                                >
                                                    {matchedSong.song.artist || '未知歌手'}
                                                </p>
                                            </div>
                                            <div className="ml-auto text-right">
                                                <span
                                                    style={{
                                                        fontFamily: 'var(--font-display)',
                                                        fontStyle: 'italic',
                                                        fontWeight: 900,
                                                        fontSize: 26,
                                                        color: '#2b4dff',
                                                    }}
                                                >
                                                    {matchedSong.song.voteCount || 0}
                                                </span>
                                                <span className="text-xs text-slate-500 block">票</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <p className="text-sm text-slate-500">
                                    您可以直接前往點播這首歌，或繼續送出建議讓主持人審核。
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel
                            onClick={handleForceSubmit}
                            className="text-slate-600 border-[rgba(17,17,17,0.18)]"
                        >
                            仍要送出建議
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleNavigateToSong}
                            className="bg-[#2b4dff] hover:bg-[#1d3bd8] text-white"
                        >
                            <ThumbsUp className="w-4 h-4 mr-2" />
                            前往點播
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
