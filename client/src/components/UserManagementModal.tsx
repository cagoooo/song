// U1 使用者審核後台 — root admin 專用
// 設計文件：docs/design/U1-multi-tenant.md
// Google 註冊的使用者落在 users/{uid}（status: pending），
// 這裡核准（approved → 開通獨立歌單空間）或停權（rejected）。
//
// 資料分類（2026-07-02 依真實資料修正）：
//   - Google 註冊：有 email / displayName / photoURL / status → 完整顯示可審核
//   - 舊系統殘留：2025 年 Express 時代的 username + password hash 文件
//     （20 字亂數 id，非真實 Firebase Auth 帳號）→ 標記「舊系統資料」，
//     不給核准鈕（核准了也沒人能登入），非管理員的可刪除清理
import { useEffect, useMemo, useState } from 'react';
import {
    collection, onSnapshot, doc, updateDoc, deleteDoc,
} from 'firebase/firestore';
import {
    Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { UserStatus } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCheck, UserX, ShieldCheck, Trash2, Archive } from 'lucide-react';

interface ManagedUser {
    id: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    isAdmin: boolean;
    status: UserStatus;
    createdAt: Date | null;
    /** 舊系統（Express 時代）殘留文件 — 非真實 Firebase Auth 帳號 */
    isLegacy: boolean;
}

interface UserManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const STATUS_LABEL: Record<UserStatus, string> = {
    pending: '待審核',
    approved: '已開通',
    rejected: '已停權',
};

function formatDate(d: Date | null): string {
    if (!d) return '';
    return d.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function UserManagementModal({ isOpen, onClose }: UserManagementModalProps) {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    /** 刪除舊資料的兩段式確認（第一下變「確認刪除」，再點才真刪） */
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        // users 是全域集合（不走租戶空間）；rules 限 root admin 可列讀。
        // ⚠️ 不能用 orderBy('createdAt')：Firestore 會把「缺排序欄位的文件」
        // 整個排除 — 歷史資料有缺 createdAt 的帳號會從審核清單消失
        // （2026-07-03 實戰：黃凱揚註冊成功卻不在清單上）。改抓全集合前端排序。
        const unsub = onSnapshot(collection(db, COLLECTIONS.users), (snap) => {
            const list: ManagedUser[] = [];
            snap.forEach((d) => {
                const data = d.data();
                // 舊系統文件特徵：有 password/username、沒有 email 也沒有 status
                const isLegacy = ('password' in data || 'username' in data)
                    && !data.email && !data.status;
                list.push({
                    id: d.id,
                    // 歷史資料曾出現帶 tab 的 email，一律 trim
                    email: (data.email ?? '').trim() || null,
                    displayName: (data.displayName ?? '').trim() || (data.username ?? '').trim() || null,
                    photoURL: data.photoURL ?? null,
                    isAdmin: data.isAdmin === true,
                    status: data.isAdmin === true
                        ? 'approved'
                        : (data.status === 'approved' || data.status === 'rejected' ? data.status : 'pending'),
                    createdAt: data.createdAt?.toDate?.() ?? null,
                    isLegacy,
                });
            });
            setUsers(list);
            setLoading(false);
        }, () => setLoading(false));
        return () => unsub();
    }, [isOpen]);

    const setStatus = async (userId: string, status: Exclude<UserStatus, 'pending'>) => {
        setBusyId(userId);
        try {
            await updateDoc(doc(db, COLLECTIONS.users, userId), { status });
            toast({
                title: status === 'approved' ? '已開通' : '已停權',
                description: status === 'approved'
                    ? '該使用者現在擁有自己的獨立歌單空間。'
                    : '該使用者已無法使用系統（可隨時重新開通）。',
                variant: 'success',
            });
        } catch (e) {
            toast({
                title: '操作失敗',
                description: e instanceof Error ? e.message : '請重試',
                variant: 'destructive',
            });
        } finally {
            setBusyId(null);
        }
    };

    /** 清掉舊系統殘留文件（僅限非管理員的 legacy doc） */
    const removeLegacy = async (userId: string) => {
        if (confirmDeleteId !== userId) {
            setConfirmDeleteId(userId);
            return;
        }
        setBusyId(userId);
        try {
            await deleteDoc(doc(db, COLLECTIONS.users, userId));
            toast({ title: '已刪除', description: '舊系統殘留資料已清除。', variant: 'success' });
        } catch (e) {
            toast({
                title: '刪除失敗',
                description: e instanceof Error ? e.message : '請重試',
                variant: 'destructive',
            });
        } finally {
            setBusyId(null);
            setConfirmDeleteId(null);
        }
    };

    // 待審核排最前，其次開通、停權、舊資料；管理員固定最後（不可操作）；
    // 同組內新註冊的排前面（缺 createdAt 的墊底）
    const sorted = useMemo(() => {
        const rank: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };
        return [...users].sort((a, b) => {
            if (a.isAdmin !== b.isAdmin) return a.isAdmin ? 1 : -1;
            if (a.isLegacy !== b.isLegacy) return a.isLegacy ? 1 : -1;
            const byStatus = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
            if (byStatus !== 0) return byStatus;
            return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
        });
    }, [users]);

    const pendingCount = users.filter((u) => !u.isAdmin && !u.isLegacy && u.status === 'pending').length;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            {/* RWD：手機幾乎滿寬、內距縮小；桌面維持 max-w-xl */}
            <DialogContent className="w-[calc(100vw-1.5rem)] max-w-xl p-4 sm:p-6 rounded-lg">
                <DialogTitle>使用者審核</DialogTitle>
                <DialogDescription>
                    Google 註冊的使用者需審核通過，才能擁有自己的獨立歌單空間。
                    {pendingCount > 0 && `（${pendingCount} 位待審核）`}
                </DialogDescription>

                {loading ? (
                    <div className="flex items-center justify-center py-10 text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> 載入中…
                    </div>
                ) : sorted.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">還沒有任何註冊使用者。</p>
                ) : (
                    <ul className="divide-y divide-slate-200 max-h-[60vh] overflow-y-auto -mx-1 px-1" aria-label="註冊使用者清單">
                        {sorted.map((u) => (
                            <li key={u.id} className="py-3">
                                {/* RWD：手機上「資訊列 + 操作列」上下堆疊；桌面同列 */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {u.photoURL ? (
                                            <img
                                                src={u.photoURL}
                                                alt=""
                                                referrerPolicy="no-referrer"
                                                className="w-10 h-10 rounded-full border border-slate-200 shrink-0"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">
                                                {(u.displayName || u.email || '?').slice(0, 1).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate flex items-center gap-1.5 flex-wrap">
                                                {u.displayName || '（未提供名稱）'}
                                                {u.isAdmin && (
                                                    <span className="inline-flex items-center gap-1 text-xs text-blue-700">
                                                        <ShieldCheck className="w-3.5 h-3.5" /> 管理員
                                                    </span>
                                                )}
                                                {u.isLegacy && (
                                                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                                        <Archive className="w-3.5 h-3.5" /> 舊系統資料
                                                    </span>
                                                )}
                                            </div>
                                            {/* Google 帳號（email）為主要識別，粗一點好認 */}
                                            <div className="text-xs text-slate-600 font-medium truncate">
                                                {u.email || (u.isLegacy ? '無 Google 帳號（Express 時代殘留）' : u.id)}
                                            </div>
                                            {u.createdAt && (
                                                <div className="text-[11px] text-slate-400">
                                                    註冊於 {formatDate(u.createdAt)}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {!u.isAdmin && (
                                        <div className="flex items-center gap-2 pl-[52px] sm:pl-0 shrink-0 flex-wrap">
                                            {!u.isLegacy && (
                                                <span className={`text-xs px-2 py-1 rounded-full ${
                                                    u.status === 'pending' ? 'bg-amber-100 text-amber-800'
                                                    : u.status === 'approved' ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-rose-100 text-rose-800'
                                                }`}>
                                                    {STATUS_LABEL[u.status]}
                                                </span>
                                            )}
                                            {!u.isLegacy && u.status !== 'approved' && (
                                                <button
                                                    onClick={() => setStatus(u.id, 'approved')}
                                                    disabled={busyId === u.id}
                                                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 min-h-[38px] rounded border border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white disabled:opacity-50"
                                                    aria-label={`核准 ${u.email || u.id}`}
                                                >
                                                    {busyId === u.id
                                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        : <UserCheck className="w-3.5 h-3.5" />}
                                                    核准
                                                </button>
                                            )}
                                            {!u.isLegacy && u.status === 'approved' && (
                                                <button
                                                    onClick={() => setStatus(u.id, 'rejected')}
                                                    disabled={busyId === u.id}
                                                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 min-h-[38px] rounded border border-rose-500 text-rose-600 hover:bg-rose-500 hover:text-white disabled:opacity-50"
                                                    aria-label={`停權 ${u.email || u.id}`}
                                                >
                                                    {busyId === u.id
                                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        : <UserX className="w-3.5 h-3.5" />}
                                                    停權
                                                </button>
                                            )}
                                            {u.isLegacy && (
                                                <button
                                                    onClick={() => removeLegacy(u.id)}
                                                    disabled={busyId === u.id}
                                                    className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 min-h-[38px] rounded border disabled:opacity-50 ${
                                                        confirmDeleteId === u.id
                                                            ? 'border-rose-600 bg-rose-600 text-white'
                                                            : 'border-slate-400 text-slate-500 hover:border-rose-500 hover:text-rose-600'
                                                    }`}
                                                    aria-label={`刪除舊資料 ${u.id}`}
                                                >
                                                    {busyId === u.id
                                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        : <Trash2 className="w-3.5 h-3.5" />}
                                                    {confirmDeleteId === u.id ? '確認刪除？' : '刪除舊資料'}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </DialogContent>
        </Dialog>
    );
}
