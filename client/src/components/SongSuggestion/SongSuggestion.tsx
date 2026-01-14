// 重構後的 SongSuggestion 主元件
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
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

    return (
        <div className="space-y-4">
            {/* 新歌建議按鈕與表單 */}
            {/* 靜態漸層外框（移除無限循環動畫） */}
            <div className="relative p-1 rounded-xl bg-gradient-to-r from-yellow-300 via-amber-500 to-orange-400 shadow-lg shadow-amber-300/30">
                <div className="rounded-lg overflow-hidden">
                    <SuggestionForm isOpen={isOpen} onOpenChange={setIsOpen} />
                </div>
            </div>

            {/* 建議列表 */}
            {suggestions.length > 0 && (
                <Collapsible open={isListExpanded} onOpenChange={setIsListExpanded} className="mt-4">
                    <CollapsibleTrigger asChild>
                        <div className="relative cursor-pointer">
                            <motion.div
                                className="relative flex flex-wrap justify-between items-center gap-y-2 p-3 sm:p-4 rounded-xl 
                         bg-gradient-to-r from-amber-100/70 via-orange-50/70 to-amber-100/70 
                         border-2 border-amber-200/30 shadow-md overflow-hidden
                         hover:shadow-lg hover:border-amber-300/50 transition-all duration-300"
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                            >
                                <div className="flex items-center gap-2">
                                    <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                                    <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-amber-700 via-orange-600 to-amber-700 bg-clip-text text-transparent">
                                        社群歌曲推薦
                                    </h3>
                                    {isListExpanded ? (
                                        <ChevronUp className="w-4 h-4 text-amber-600" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-amber-600" />
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                    <span className="bg-yellow-100 px-2 py-1 rounded-full border border-yellow-200/70 text-xs text-yellow-700 font-medium">
                                        {suggestions.filter(s => s.status === 'pending').length} 待審核
                                    </span>
                                    <span className="bg-green-100 px-2 py-1 rounded-full border border-green-200/70 text-xs text-green-700 font-medium">
                                        {suggestions.filter(s => s.status === 'approved').length} 已採納
                                    </span>
                                    <span className="bg-blue-100 px-2 py-1 rounded-full border border-blue-200/70 text-xs text-blue-700 font-medium">
                                        {suggestions.filter(s => s.status === 'added_to_playlist').length} 已加入
                                    </span>
                                </div>
                            </motion.div>
                        </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                        <ScrollArea className="mt-3 max-h-[400px] sm:max-h-[500px] pr-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
