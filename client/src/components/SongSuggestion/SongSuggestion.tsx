// 重構後的 SongSuggestion 主元件 - 含重複檢測功能
import { useState, useMemo, useCallback } from 'react';
import { Lightbulb, ChevronDown, Sparkles, Music } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ResponsiveScrollList } from '@/components/ui/ResponsiveScrollList';
import { useSuggestions } from '@/hooks/use-suggestions';
import type { Song } from '@/lib/firestore';

// 拆分的子元件
import { SuggestionForm } from './SuggestionForm';
import { SuggestionCard } from './SuggestionCard';

interface SongSuggestionProps {
    isAdmin?: boolean;
    songs?: Song[];
    onNavigateToSong?: (songId: string) => void;
}

export default function SongSuggestion({
    isAdmin = false,
    songs = [],
    onNavigateToSong
}: SongSuggestionProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isListExpanded, setIsListExpanded] = useState(false);
    const { suggestions } = useSuggestions();

    // 使用 useMemo 避免每次渲染都重新計算
    const counts = useMemo(() => ({
        pending: suggestions.filter(s => s.status === 'pending').length,
        approved: suggestions.filter(s => s.status === 'approved').length,
        added: suggestions.filter(s => s.status === 'added_to_playlist').length,
    }), [suggestions]);

    return (
        <div className="space-y-5">
            {/* 新歌建議 trigger — Editorial 藍色 CTA（在 SuggestionForm 內部處理樣式） */}
            <SuggestionForm
                isOpen={isOpen}
                onOpenChange={setIsOpen}
                songs={songs}
                onNavigateToSong={onNavigateToSong}
            />

            {/* 建議列表 — Editorial 雜誌風 collapse panel */}
            {suggestions.length > 0 && (
                <Collapsible open={isListExpanded} onOpenChange={setIsListExpanded}>
                    <CollapsibleTrigger
                        className="relative w-full text-left appearance-none border-0 bg-transparent p-0 cursor-pointer group animate-in fade-in slide-in-from-bottom-2 duration-300"
                        style={{ animationDelay: '50ms' }}
                    >
                            <div
                                className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-xl
                                    bg-[#faf7f0]
                                    border border-[rgba(17,17,17,0.14)]
                                    shadow-[0_1px_0_rgba(17,17,17,0.04),0_12px_30px_-16px_rgba(17,17,17,0.16)]
                                    group-hover:border-[rgba(17,17,17,0.28)]
                                    transition-all duration-200 overflow-hidden"
                            >
                                {/* 左側標題區 */}
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="relative">
                                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-md bg-white border border-[rgba(17,17,17,0.14)] flex items-center justify-center">
                                            <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-[#2b4dff]" />
                                        </div>
                                        <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-[#2b4dff] animate-pulse" />
                                    </div>

                                    <div className="flex flex-col gap-0.5">
                                        <span
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: 10,
                                                letterSpacing: '0.22em',
                                                textTransform: 'uppercase',
                                                color: 'var(--ed-ink-3)',
                                            }}
                                        >
                                            Reader’s Picks
                                        </span>
                                        <span
                                            style={{
                                                fontFamily: 'var(--font-display)',
                                                fontStyle: 'italic',
                                                fontWeight: 800,
                                                fontSize: 20,
                                                letterSpacing: '-0.015em',
                                                color: 'var(--ed-ink-1)',
                                                lineHeight: 1.1,
                                            }}
                                        >
                                            社群歌曲推薦
                                        </span>
                                    </div>

                                    <div
                                        className={`ml-1 transition-transform duration-200 ${isListExpanded ? 'rotate-180' : 'rotate-0'}`}
                                    >
                                        <ChevronDown className="w-5 h-5 text-slate-400" />
                                    </div>
                                </div>

                                {/* 右側統計標籤 — Editorial 系列 */}
                                <div className="flex flex-wrap items-center gap-2 relative z-10">
                                    {counts.pending > 0 && (
                                        <span
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#2b4dff]/30 bg-[#2b4dff]/10 text-[#2b4dff]"
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: 11,
                                                letterSpacing: '0.12em',
                                                textTransform: 'uppercase',
                                                fontWeight: 600,
                                            }}
                                        >
                                            <span className="w-1.5 h-1.5 bg-[#2b4dff] rounded-full animate-pulse" />
                                            {counts.pending} 待審核
                                        </span>
                                    )}
                                    {counts.approved > 0 && (
                                        <span
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-300 bg-white text-slate-600"
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: 11,
                                                letterSpacing: '0.12em',
                                                textTransform: 'uppercase',
                                                fontWeight: 600,
                                            }}
                                        >
                                            <span className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
                                            {counts.approved} 已採納
                                        </span>
                                    )}
                                    {counts.added > 0 && (
                                        <span
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2b4dff] text-white"
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: 11,
                                                letterSpacing: '0.12em',
                                                textTransform: 'uppercase',
                                                fontWeight: 600,
                                            }}
                                        >
                                            <Music className="w-3 h-3" />
                                            {counts.added} 已加入
                                        </span>
                                    )}
                                </div>
                            </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out
                        data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
                        data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2
                        duration-200 overflow-hidden">
                        {/* 響應式長清單：手機自然展開、桌機限高原生捲動（見 ResponsiveScrollList） */}
                        <ResponsiveScrollList className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                            {suggestions.map((suggestion, index) => (
                                <SuggestionCard
                                    key={suggestion.id}
                                    suggestion={suggestion}
                                    index={index}
                                    isAdmin={isAdmin}
                                />
                            ))}
                        </ResponsiveScrollList>
                    </CollapsibleContent>
                </Collapsible>
            )}
        </div>
    );
}
