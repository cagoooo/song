// 重構後的 SongSuggestion 主元件 - 效能優化版
import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb, ChevronDown, Sparkles, Music } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSuggestions } from '@/hooks/use-suggestions';

// 拆分的子元件
import { SuggestionForm } from './SuggestionForm';
import { SuggestionCard } from './SuggestionCard';

interface SongSuggestionProps {
    isAdmin?: boolean;
}

export default function SongSuggestion({ isAdmin = false }: SongSuggestionProps) {
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
            {/* 新歌建議按鈕與表單 - 簡化動畫 */}
            <div className="relative group animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* 簡化的外層發光效果 */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-400 
                    rounded-2xl opacity-70 blur-sm 
                    group-hover:opacity-90 transition-opacity duration-200" />

                {/* 主要容器 */}
                <div className="relative p-1 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 
                    shadow-xl shadow-amber-400/25">
                    <div className="rounded-xl overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50">
                        <SuggestionForm isOpen={isOpen} onOpenChange={setIsOpen} />
                    </div>
                </div>
            </div>

            {/* 建議列表 - 簡化版設計 */}
            {suggestions.length > 0 && (
                <Collapsible open={isListExpanded} onOpenChange={setIsListExpanded}>
                    <CollapsibleTrigger asChild>
                        <div
                            className="relative cursor-pointer group animate-in fade-in slide-in-from-bottom-2 duration-300"
                            style={{ animationDelay: '50ms' }}
                        >
                            {/* 懸停發光效果 - 簡化 */}
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300 
                                rounded-2xl opacity-0 blur-sm 
                                group-hover:opacity-50 transition-opacity duration-200" />

                            <div
                                className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl 
                                    bg-gradient-to-br from-white via-amber-50/80 to-orange-50/80
                                    border border-amber-200/60 shadow-lg shadow-amber-100/50
                                    group-hover:shadow-xl group-hover:border-amber-300/80
                                    transition-all duration-200 backdrop-blur-sm overflow-hidden"
                            >
                                {/* 背景裝飾 - 靜態 */}
                                <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-amber-200/25 to-transparent rounded-bl-full pointer-events-none" />

                                {/* 左側標題區 */}
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="relative">
                                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 
                                            flex items-center justify-center shadow-lg shadow-amber-400/30">
                                            <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                        </div>
                                        <Sparkles className="absolute -top-1 -right-1 w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                    </div>

                                    <div className="flex flex-col">
                                        <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 bg-clip-text text-transparent">
                                            社群歌曲推薦
                                        </h3>
                                        <p className="text-xs sm:text-sm text-amber-600/70 font-medium">
                                            點擊展開查看所有推薦
                                        </p>
                                    </div>

                                    <div
                                        className={`ml-1 transition-transform duration-200 ${isListExpanded ? 'rotate-180' : 'rotate-0'}`}
                                    >
                                        <ChevronDown className="w-5 h-5 text-amber-500" />
                                    </div>
                                </div>

                                {/* 右側統計標籤 */}
                                <div className="flex flex-wrap items-center gap-2 relative z-10">
                                    {counts.pending > 0 && (
                                        <span
                                            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-100 to-yellow-100 
                                                px-3 py-1.5 rounded-full border border-amber-300/50 
                                                text-xs sm:text-sm text-amber-700 font-semibold shadow-sm
                                                hover:scale-105 transition-transform duration-150"
                                        >
                                            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                            {counts.pending} 待審核
                                        </span>
                                    )}
                                    {counts.approved > 0 && (
                                        <span
                                            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-100 to-green-100 
                                                px-3 py-1.5 rounded-full border border-emerald-300/50 
                                                text-xs sm:text-sm text-emerald-700 font-semibold shadow-sm
                                                hover:scale-105 transition-transform duration-150"
                                        >
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                                            {counts.approved} 已採納
                                        </span>
                                    )}
                                    {counts.added > 0 && (
                                        <span
                                            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-100 to-sky-100 
                                                px-3 py-1.5 rounded-full border border-blue-300/50 
                                                text-xs sm:text-sm text-blue-700 font-semibold shadow-sm
                                                hover:scale-105 transition-transform duration-150"
                                        >
                                            <Music className="w-3 h-3" />
                                            {counts.added} 已加入
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out 
                        data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 
                        data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2
                        duration-200">
                        <ScrollArea className="mt-4 max-h-[60vh] sm:max-h-[500px] pr-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                                {suggestions.map((suggestion, index) => (
                                    <SuggestionCard
                                        key={suggestion.id}
                                        suggestion={suggestion}
                                        index={index}
                                        isAdmin={isAdmin}
                                    />
                                ))}
                            </div>
                        </ScrollArea>
                    </CollapsibleContent>
                </Collapsible>
            )}
        </div>
    );
}

