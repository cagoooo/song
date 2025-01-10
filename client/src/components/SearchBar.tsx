import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-3 h-4 w-4 text-primary" />
      <Input
        type="search"
        placeholder="搜尋歌曲或歌手..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 h-12 text-lg border-2 border-primary/20 bg-white/50 backdrop-blur-sm
                 shadow-[0_2px_10px_rgba(var(--primary),0.1)]
                 focus:border-primary/50 focus:shadow-[0_2px_20px_rgba(var(--primary),0.2)]
                 transition-all duration-300"
      />
    </div>
  );
}