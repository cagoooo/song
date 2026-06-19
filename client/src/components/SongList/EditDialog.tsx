// 編輯歌曲對話框
import { useEffect, useState } from 'react';
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
import { Music, Mic2, Save, X } from 'lucide-react';
import type { Song } from '@/lib/firestore';

interface EditDialogProps {
    song: Song;
    isOpen: boolean;
    onClose: () => void;
    onSave: (title: string, artist: string) => Promise<void>;
}

export function EditDialog({ song, isOpen, onClose, onSave }: EditDialogProps) {
    const [title, setTitle] = useState(song.title);
    const [artist, setArtist] = useState(song.artist);
    const [animateForm, setAnimateForm] = useState(false);

    useEffect(() => {
        if (!isOpen) return undefined;
        setTitle(song.title);
        setArtist(song.artist);
        setAnimateForm(true);
        const timer = setTimeout(() => setAnimateForm(false), 900);
        return () => clearTimeout(timer);
    }, [isOpen, song.artist, song.title]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(title.trim(), artist.trim());
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="song-edit-cassette-dialog">
                <div className="song-edit-cassette-top" aria-hidden="true">
                    <span>SIDE A</span>
                    <span>EDIT MODE</span>
                    <span>90 MIN</span>
                </div>

                <DialogHeader className="song-edit-cassette-header">
                    <motion.div
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.25 }}
                    >
                        <DialogTitle className="song-edit-cassette-title">
                            編輯歌曲
                        </DialogTitle>
                        <DialogDescription className="song-edit-cassette-desc">
                            只保留現場會用到的核心資訊：歌曲名稱與歌手。
                        </DialogDescription>
                    </motion.div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="song-edit-cassette-form">
                    <motion.div
                        className="song-edit-cassette-fields"
                        initial={{ y: 14, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.25, delay: 0.05 }}
                    >
                        <div className="song-edit-field">
                            <Label htmlFor="title" className="song-edit-label">
                                <Music className="h-4 w-4" />
                                歌曲名稱
                            </Label>
                            <motion.div
                                animate={animateForm ? { x: [0, 1, -1, 0] } : {}}
                                transition={{ duration: 0.25 }}
                            >
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    className="song-edit-input"
                                />
                            </motion.div>
                        </div>

                        <div className="song-edit-field">
                            <Label htmlFor="artist" className="song-edit-label">
                                <Mic2 className="h-4 w-4" />
                                歌手
                            </Label>
                            <motion.div
                                animate={animateForm ? { x: [0, -1, 1, 0] } : {}}
                                transition={{ duration: 0.25, delay: 0.05 }}
                            >
                                <Input
                                    id="artist"
                                    value={artist}
                                    onChange={(e) => setArtist(e.target.value)}
                                    required
                                    className="song-edit-input"
                                />
                            </motion.div>
                        </div>
                    </motion.div>

                    <div className="song-edit-cassette-reels" aria-hidden="true">
                        <span />
                        <div />
                        <span />
                    </div>

                    <motion.div
                        className="song-edit-actions"
                        initial={{ y: 12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.25, delay: 0.12 }}
                    >
                        <Button
                            variant="outline"
                            type="button"
                            onClick={onClose}
                            className="song-edit-cancel"
                        >
                            <X className="h-4 w-4" />
                            取消
                        </Button>
                        <Button type="submit" className="song-edit-save">
                            <Save className="h-4 w-4" />
                            儲存變更
                        </Button>
                    </motion.div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
