import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Sparkles, Target } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  isFuzzyMode?: boolean;
  onToggleFuzzyMode?: () => void;
  showFuzzyToggle?: boolean;
}

export default function SearchBar({
  value,
  onChange,
  isFuzzyMode = true,
  onToggleFuzzyMode,
  showFuzzyToggle = true,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="relative">
      {/* Search icon */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
        <Search className={`h-5 w-5 transition-colors duration-200 ${isFocused ? 'text-amber-500' : 'text-slate-400'
          }`} />
      </div>

      <Input
        type="search"
        placeholder="搜尋歌曲或歌手..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        aria-label="搜尋歌曲或歌手"
        className={`pl-11 pr-28 h-12 text-base relative z-10 rounded-xl
                 bg-white
                 border-2 
                 ${isFocused
            ? 'border-amber-400 shadow-lg shadow-amber-100/50'
            : 'border-slate-200 hover:border-slate-300'}
                 placeholder:text-slate-400
                 transition-all duration-200`}
      />

      {/* Right side buttons */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1">
        {/* Clear button */}
        <AnimatePresence>
          {value && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="h-8 w-8 rounded-full hover:bg-slate-100"
                aria-label="清除搜尋"
              >
                <X className="h-4 w-4 text-slate-500" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fuzzy mode toggle */}
        {showFuzzyToggle && onToggleFuzzyMode && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleFuzzyMode}
                  className={`h-8 px-2.5 rounded-lg text-xs font-medium transition-all
                    ${isFuzzyMode
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {isFuzzyMode ? (
                    <>
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      模糊
                    </>
                  ) : (
                    <>
                      <Target className="h-3.5 w-3.5 mr-1" />
                      精確
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-slate-800 text-white border-0">
                <p>{isFuzzyMode ? '模糊搜尋：容錯匹配相似歌曲' : '精確搜尋：完全匹配關鍵字'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}