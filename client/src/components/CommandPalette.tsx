import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Dialog, DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Music, Trophy, History, Tv, Lightbulb, Keyboard } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Song } from '@/lib/firestore';

export interface CommandAction {
    id: string;
    label: string;
    icon?: React.ReactNode;
    /** Optional secondary text (歌手等) */
    sub?: string;
    /** 鍵盤輸入時要 match 的字串（label + sub + 自訂 alias） */
    searchText: string;
    onSelect: () => void;
    /** 分組標籤 */
    group?: string;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    songs: Song[];
    onSearchSong: (query: string) => void;
    onOpenHistory: () => void;
    onOpenLeaderboard: () => void;
    onOpenStage: () => void;
    onShowShortcutsHelp: () => void;
    isAdmin: boolean;
}

export function CommandPalette({
    isOpen, onClose, songs,
    onSearchSong, onOpenHistory, onOpenLeaderboard, onOpenStage, onShowShortcutsHelp,
    isAdmin,
}: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // 開啟時清空 query + focus
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setActiveIndex(0);
            // 等 dialog 渲染完
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const actions = useMemo<CommandAction[]>(() => {
        const close = () => onClose();
        const base: CommandAction[] = [
            {
                id: 'history',
                label: '我的點播歷史',
                icon: <History className="w-4 h-4" />,
                searchText: '我的點播歷史 history vote',
                onSelect: () => { close(); onOpenHistory(); },
                group: '導航',
            },
            {
                id: 'leaderboard',
                label: '投票領袖板',
                icon: <Trophy className="w-4 h-4" />,
                searchText: '投票領袖板 leaderboard 排行 灌票',
                onSelect: () => { close(); onOpenLeaderboard(); },
                group: '導航',
            },
            {
                id: 'stage',
                label: '演出模式（投影）',
                icon: <Tv className="w-4 h-4" />,
                searchText: '演出模式 stage 投影',
                onSelect: () => { close(); onOpenStage(); },
                group: '導航',
            },
            {
                id: 'help',
                label: '鍵盤快捷鍵說明',
                icon: <Keyboard className="w-4 h-4" />,
                searchText: '鍵盤快捷鍵 help shortcuts ?',
                onSelect: () => { close(); onShowShortcutsHelp(); },
                group: '說明',
            },
        ];
        const songActions: CommandAction[] = songs.slice(0, 50).map((s) => ({
            id: `song_${s.id}`,
            label: s.title,
            sub: s.artist,
            icon: <Music className="w-4 h-4" />,
            searchText: `${s.title} ${s.artist}`,
            onSelect: () => { close(); onSearchSong(s.title); },
            group: '歌曲',
        }));
        return [...base, ...songActions];
    }, [songs, onClose, onOpenHistory, onOpenLeaderboard, onOpenStage, onShowShortcutsHelp, onSearchSong, isAdmin]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return actions;
        return actions.filter((a) => a.searchText.toLowerCase().includes(q));
    }, [actions, query]);

    // 重置 activeIndex 當結果變動
    useEffect(() => { setActiveIndex(0); }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            filtered[activeIndex]?.onSelect();
        }
    };

    // 分組顯示
    const grouped = useMemo(() => {
        const map = new Map<string, CommandAction[]>();
        filtered.forEach((a) => {
            const g = a.group ?? '其他';
            const arr = map.get(g) ?? [];
            arr.push(a);
            map.set(g, arr);
        });
        return Array.from(map.entries());
    }, [filtered]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b">
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="搜尋歌曲、功能、捷徑..."
                        className="border-0 shadow-none focus-visible:ring-0 px-0 text-base"
                        aria-label="命令搜尋"
                    />
                    <kbd className="text-xs text-muted-foreground border rounded px-1.5 py-0.5 bg-muted">Esc</kbd>
                </div>
                <div className="max-h-[400px] overflow-y-auto p-2">
                    {filtered.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            找不到匹配項目
                        </div>
                    ) : (
                        grouped.map(([group, items]) => (
                            <div key={group} className="mb-3">
                                <div className="text-[10px] font-bold uppercase text-muted-foreground px-2 mb-1 tracking-wider">
                                    {group}
                                </div>
                                {items.map((a) => {
                                    const idx = filtered.indexOf(a);
                                    const isActive = idx === activeIndex;
                                    return (
                                        <motion.button
                                            key={a.id}
                                            type="button"
                                            onClick={() => a.onSelect()}
                                            onMouseEnter={() => setActiveIndex(idx)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                                                isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50'
                                            }`}
                                        >
                                            <span className="shrink-0 text-muted-foreground">{a.icon}</span>
                                            <span className="flex-1 min-w-0">
                                                <span className="block truncate text-sm font-medium">{a.label}</span>
                                                {a.sub && (
                                                    <span className="block truncate text-xs text-muted-foreground">{a.sub}</span>
                                                )}
                                            </span>
                                            {isActive && (
                                                <kbd className="text-xs border rounded px-1.5 py-0.5 bg-background">↵</kbd>
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
                <div className="px-4 py-2 border-t bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                        <span><kbd className="border rounded px-1 bg-background">↑↓</kbd> 移動</span>
                        <span><kbd className="border rounded px-1 bg-background">↵</kbd> 選擇</span>
                    </div>
                    <span>{filtered.length} 項</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
