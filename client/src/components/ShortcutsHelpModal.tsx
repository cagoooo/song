import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface ShortcutsHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SHORTCUTS = [
    { keys: ['⌘ / Ctrl', 'K'], desc: '開啟命令面板（搜尋歌曲、跳功能）' },
    { keys: ['/'], desc: '聚焦搜尋框（直接輸入歌曲名）' },
    { keys: ['?'], desc: '顯示這個快捷鍵說明' },
    { keys: ['Esc'], desc: '關閉對話框 / 退出搜尋' },
    { keys: ['↑', '↓'], desc: '在命令面板中移動' },
    { keys: ['Enter'], desc: '選擇命令面板中的項目' },
];

export function ShortcutsHelpModal({ isOpen, onClose }: ShortcutsHelpModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Keyboard className="w-5 h-5 text-primary" />
                        鍵盤快捷鍵
                    </DialogTitle>
                    <DialogDescription>
                        用快捷鍵更快操作（在輸入框中時除 Esc 外不觸發）
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 mt-2">
                    {SHORTCUTS.map((s) => (
                        <div
                            key={s.desc}
                            className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/40"
                        >
                            <span className="text-sm">{s.desc}</span>
                            <span className="flex items-center gap-1 shrink-0">
                                {s.keys.map((k, i) => (
                                    <kbd
                                        key={i}
                                        className="text-xs font-mono border rounded px-2 py-1 bg-background shadow-sm"
                                    >
                                        {k}
                                    </kbd>
                                ))}
                            </span>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
