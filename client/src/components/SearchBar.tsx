import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-3.5 h-5 w-5 text-primary/70" />
      <div className="absolute left-[3.2rem] top-3.5 text-lg">🎸</div>
      <Input
        type="search"
        placeholder="搜尋歌曲或歌手..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-[4.8rem] h-[3.25rem] text-lg
                 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-pink-50
                 border-2 border-primary/20 
                 shadow-[0_2px_10px_rgba(var(--primary),0.1)]
                 focus:border-primary/40 
                 focus:shadow-[0_4px_20px_rgba(var(--primary),0.2)]
                 hover:shadow-[0_4px_15px_rgba(var(--primary),0.15)]
                 placeholder:text-primary/70
                 placeholder:font-medium
                 transition-all duration-300"
      />
      <div className="absolute right-3 top-3.5 text-lg">🎵</div>
    </div>
  );
}