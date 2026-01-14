import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Sparkles, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated glow effect when not focused */}
      {!isFocused && !value && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-400/20 via-fuchsia-400/20 to-pink-400/20"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ filter: "blur(8px)" }}
        />
      )}

      {/* Search icon */}
      <motion.div
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10"
        animate={!isFocused && !value ? {
          scale: [1, 1.2, 1],
          rotate: [0, 10, -10, 0],
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Search className="h-5 w-5 text-primary/70" />
      </motion.div>

      {/* Animated guitar emoji */}
      <motion.div
        className="absolute left-10 top-1/2 -translate-y-1/2 text-lg z-10"
        animate={!isFocused && !value ? {
          rotate: [-5, 5, -5],
          y: [0, -2, 0],
        } : {}}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        🎸
      </motion.div>

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

        {/* Animated music note emoji (only when no value) */}
        {!value && (
          <motion.div
            className="text-lg ml-1"
            animate={!isFocused ? {
              y: [0, -3, 0],
              rotate: [0, 15, 0],
            } : {}}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3
            }}
          >
            🎵
          </motion.div>
        )}
      </div>

      {/* Hint text */}
      {!isFocused && !value && (
        <motion.div
          className="absolute -bottom-5 left-0 right-0 text-center text-xs text-primary/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          點擊上方開始搜尋 ✨
        </motion.div>
      )}
    </motion.div>
  );
}