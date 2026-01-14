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
      {/* 靜態光暈效果（取代無限循環動畫） */}
      {!isFocused && !value && (
        <div
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-400/15 via-fuchsia-400/15 to-pink-400/15 opacity-50"
          style={{ filter: "blur(6px)" }}
        />
      )}

      {/* Search icon - 靜態版本 */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
        <Search className="h-5 w-5 text-primary/70" />
      </div>

      {/* 吉他 emoji - 靜態版本 */}
      <div className="absolute left-10 top-1/2 -translate-y-1/2 text-lg z-10">
        🎸
      </div>

      <Input
        type="search"
        placeholder="搜尋歌曲或歌手..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        aria-label="搜尋歌曲或歌手"
        className={`pl-16 pr-24 h-12 sm:h-11 text-base relative z-10 rounded-xl
                 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-pink-50
                 border-2 border-primary/20 
                 shadow-[0_2px_10px_rgba(var(--primary),0.1)]
                 focus:border-primary/40 
                 focus:shadow-[0_4px_20px_rgba(var(--primary),0.2)]
                 hover:shadow-[0_4px_15px_rgba(var(--primary),0.15)]
                 placeholder:text-gray-600
                 placeholder:font-medium
                 transition-all duration-300`}
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
                className="h-8 w-8 rounded-full hover:bg-gray-200"
                aria-label="清除搜尋"
              >
                <X className="h-4 w-4 text-gray-500" />
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
                  className={`h-8 px-2 rounded-lg text-xs font-medium transition-all
                    ${isFuzzyMode
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
              <TooltipContent side="bottom">
                <p>{isFuzzyMode ? '模糊搜尋：容錯匹配相似歌曲' : '精確搜尋：完全匹配關鍵字'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* 音符 emoji - 靜態版本 */}
        {!value && (
          <span className="text-lg ml-1">🎵</span>
        )}
      </div>

      {/* Hint text - 靜態版本 */}
      {!isFocused && !value && (
        <div className="absolute -bottom-5 left-0 right-0 text-center text-xs text-primary/60">
          點擊上方開始搜尋 ✨
        </div>
      )}
    </div>
  );
}