// 編輯歌曲對話框
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Music, ThumbsUp } from 'lucide-react';
import type { Song } from '@/lib/firestore';

interface EditDialogProps {
    song: Song;
    isOpen: boolean;
    onClose: () => void;
    onSave: (title: string, artist: string) => Promise<void>;
}

// 顏色方案
const colorSchemes = [
    {
        bg: 'from-purple-50 via-fuchsia-50 to-pink-50',
        border: 'border-purple-300',
        input1: 'from-fuchsia-50/70 to-purple-50/70 border-purple-200/50 focus:border-purple-300/60',
        input2: 'from-pink-50/70 to-fuchsia-50/70 border-pink-200/50 focus:border-pink-300/60',
        btnCancel: 'bg-white hover:bg-purple-50 border-purple-200 hover:border-purple-300 text-purple-700',
        btnSave: 'bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600'
    },
    {
        bg: 'from-blue-50 via-cyan-50 to-teal-50',
        border: 'border-blue-300',
        input1: 'from-cyan-50/70 to-blue-50/70 border-blue-200/50 focus:border-blue-300/60',
        input2: 'from-teal-50/70 to-cyan-50/70 border-teal-200/50 focus:border-teal-300/60',
        btnCancel: 'bg-white hover:bg-blue-50 border-blue-200 hover:border-blue-300 text-blue-700',
        btnSave: 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
    },
    {
        bg: 'from-amber-50 via-orange-50 to-rose-50',
        border: 'border-amber-300',
        input1: 'from-orange-50/70 to-amber-50/70 border-amber-200/50 focus:border-amber-300/60',
        input2: 'from-rose-50/70 to-orange-50/70 border-rose-200/50 focus:border-rose-300/60',
        btnCancel: 'bg-white hover:bg-amber-50 border-amber-200 hover:border-amber-300 text-amber-700',
        btnSave: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
    },
    {
        bg: 'from-emerald-50 via-green-50 to-lime-50',
        border: 'border-emerald-300',
        input1: 'from-green-50/70 to-emerald-50/70 border-green-200/50 focus:border-green-300/60',
        input2: 'from-lime-50/70 to-green-50/70 border-lime-200/50 focus:border-lime-300/60',
        btnCancel: 'bg-white hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300 text-emerald-700',
        btnSave: 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600'
    }
];

function getColorIndex(id: string | number): number {
    if (typeof id === 'number') return id % colorSchemes.length;
    let hash = 0;
    for (let i = 0; i < String(id).length; i++) {
        hash = String(id).charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % colorSchemes.length;
}

export function EditDialog({ song, isOpen, onClose, onSave }: EditDialogProps) {
    const [title, setTitle] = useState(song.title);
    const [artist, setArtist] = useState(song.artist);
    const [animateForm, setAnimateForm] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setAnimateForm(true);
            const timer = setTimeout(() => setAnimateForm(false), 1500);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(title, artist);
    };

    const colorIndex = getColorIndex(song.id);
    const colorScheme = colorSchemes[colorIndex];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className={`
        bg-gradient-to-r ${colorScheme.bg}
        border-2 ${colorScheme.border}
        shadow-xl overflow-hidden
      `}>
                {/* 背景裝飾 */}
                <div className="absolute -z-10 inset-0 bg-white/50"></div>
                <motion.div
                    className="absolute -z-5 inset-0 opacity-20 pointer-events-none"
                    initial={{ backgroundPosition: '0% 0%' }}
                    animate={{
                        backgroundPosition: ['0% 0%', '100% 100%'],
                    }}
                    transition={{ duration: 15, repeat: Infinity, repeatType: 'reverse' }}
                    style={{
                        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 25%)',
                        backgroundSize: '120% 120%'
                    }}
                />

                {/* 頂部裝飾 */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

                <DialogHeader>
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.4, type: 'spring' }}
                    >
                        <DialogTitle className={`
              text-center font-bold text-lg bg-clip-text text-transparent
              bg-gradient-to-r from-primary to-primary/70
            `}>
                            ✨ 編輯歌曲 ✨
                        </DialogTitle>
                        <DialogDescription className="text-center text-sm text-muted-foreground mt-1">
                            修改歌曲名稱或歌手資訊
                        </DialogDescription>
                    </motion.div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-2">
                    <motion.div
                        className="space-y-4"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                    >
                        <div className="space-y-2">
                            <Label
                                htmlFor="title"
                                className="font-medium text-gray-700 flex items-center gap-1.5"
                            >
                                <Music className="w-4 h-4 text-primary" />
                                歌曲名稱
                            </Label>
                            <motion.div
                                animate={animateForm ? {
                                    y: [0, -2, 0, -2, 0],
                                    x: [0, 1, -1, 1, 0]
                                } : {}}
                                transition={{ duration: 0.4 }}
                            >
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    className={`
                    bg-gradient-to-r ${colorScheme.input1}
                    font-medium rounded-lg transition-all duration-300
                    shadow-inner shadow-white/50
                    focus:shadow-md focus:ring-1 focus:ring-primary/30
                  `}
                                />
                            </motion.div>
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="artist"
                                className="font-medium text-gray-700 flex items-center gap-1.5"
                            >
                                <ThumbsUp className="w-4 h-4 text-primary" />
                                歌手
                            </Label>
                            <motion.div
                                animate={animateForm ? {
                                    y: [0, -2, 0, -2, 0],
                                    x: [0, 1, -1, 1, 0]
                                } : {}}
                                transition={{ duration: 0.4, delay: 0.1 }}
                            >
                                <Input
                                    id="artist"
                                    value={artist}
                                    onChange={(e) => setArtist(e.target.value)}
                                    required
                                    className={`
                    bg-gradient-to-r ${colorScheme.input2}
                    font-medium rounded-lg transition-all duration-300
                    shadow-inner shadow-white/50
                    focus:shadow-md focus:ring-1 focus:ring-primary/30
                  `}
                                />
                            </motion.div>
                        </div>
                    </motion.div>

                    <motion.div
                        className="flex justify-end gap-3 pt-2"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                    >
                        <Button
                            variant="outline"
                            type="button"
                            onClick={onClose}
                            className={`
                ${colorScheme.btnCancel}
                rounded-lg border px-4 py-2 font-medium shadow-sm
                transition-all duration-300
                hover:shadow-md
              `}
                        >
                            取消
                        </Button>
                        <Button
                            type="submit"
                            className={`
                ${colorScheme.btnSave}
                rounded-lg border-none px-4 py-2 font-medium shadow-sm text-white
                transition-all duration-300
                hover:shadow-md hover:scale-105
              `}
                        >
                            儲存變更
                        </Button>
                    </motion.div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
