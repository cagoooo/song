// 重置投票確認對話框
import { AlertTriangle } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ResetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

export function ResetDialog({ open, onOpenChange, onConfirm }: ResetDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="sm:max-w-[425px] bg-white border-slate-200 shadow-2xl">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <AlertDialogTitle className="text-lg font-bold text-slate-900">
                            確認重置所有點播次數？
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-slate-600 mt-2 pl-[52px]">
                        此操作將會清除所有歌曲的點播次數。<br />
                        <span className="text-red-600 font-medium">此操作無法復原。</span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2 sm:gap-2">
                    <AlertDialogCancel className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300">
                        取消
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-red-600 hover:bg-red-700 text-white border-0"
                    >
                        確認重置
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
