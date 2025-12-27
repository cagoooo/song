import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

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
          className="absolute inset-0 rounded-md bg-gradient-to-r from-violet-400/20 via-fuchsia-400/20 to-pink-400/20"
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

      {/* Animated search icon */}
      <motion.div
        className="absolute left-3 top-3.5 z-10"
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
        className="absolute left-[3.2rem] top-3.5 text-lg z-10"
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
        className="pl-[4.8rem] h-[3.25rem] text-lg relative z-10
                 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-pink-50
                 border-2 border-primary/20 
                 shadow-[0_2px_10px_rgba(var(--primary),0.1)]
                 focus:border-primary/40 
                 focus:shadow-[0_4px_20px_rgba(var(--primary),0.2)]
                 hover:shadow-[0_4px_15px_rgba(var(--primary),0.15)]
                 placeholder:text-gray-700
                 placeholder:font-semibold
                 transition-all duration-300"
      />

      {/* Animated music note emoji */}
      <motion.div 
        className="absolute right-3 top-3.5 text-lg z-10"
        animate={!isFocused && !value ? {
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