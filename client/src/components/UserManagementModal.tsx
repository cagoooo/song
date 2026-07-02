// U1 使用者審核後台 — root admin 專用
// 設計文件：docs/design/U1-multi-tenant.md
// Google 註冊的使用者落在 users/{uid}（status: pending），
// 這裡核准（approved → 開通獨立歌單空間）或停權（rejected）。
import { useEffect, useMemo, useState } from 'react';
import {
    collection, onSnapshot, doc, updateDoc, query, orderBy,
} from 'firebase/firestore';
import {
    Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { UserStatus } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCheck, UserX, ShieldCheck } from 'lucide-react';

interface ManagedUser {
    id: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    isAdmin: boolean;
    status: UserStatus;
    createdAt: Date | null;
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

export function UserManagementModal({ isOpen, onClose }: UserManagementModalProps) {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        // users 是全域集合（不走租戶空間）；rules 限 root admin 可列讀
        const usersQuery = query(collection(db, COLLECTIONS.users), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(usersQuery, (snap) => {
            const list: ManagedUser[] = [];
            snap.forEach((d) => {
                const data = d.data();
                list.push({
                    id: d.id,
                    email: data.email ?? null,
                    displayName: data.displayName ?? null,
                    photoURL: data.photoURL ?? null,
                    isAdmin: data.isAdmin === true,
                    status: data.isAdmin === true
                        ? 'approved'
                        : (data.status === 'approved' || data.status === 'rejected' ? data.status : 'pending'),
                    createdAt: data.createdAt?.toDate?.() ?? null,
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

    // 待審核排最前，其次開通、停權；管理員固定最後（不可操作）
    const sorted = useMemo(() => {
        const rank: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };
        return [...users].sort((a, b) => {
            if (a.isAdmin !== b.isAdmin) return a.isAdmin ? 1 : -1;
            return (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
        });
    }, [users]);

    const pendingCount = users.filter((u) => !u.isAdmin && u.status === 'pending').length;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-xl">
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
                    <ul className="divide-y divide-slate-200 max-h-[55vh] overflow-y-auto" aria-label="註冊使用者清單">
                        {sorted.map((u) => (
                            <li key={u.id} className="flex items-center gap-3 py-3">
                                {u.photoURL ? (
                                    <img
                                        src={u.photoURL}
                                        alt=""
                                        referrerPolicy="no-referrer"
                                        className="w-9 h-9 rounded-full border border-slate-200"
                                    />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-500">
                                        {(u.displayName || u.email || '?').slice(0, 1).toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">
                                        {u.displayName || '（未提供名稱）'}
                                        {u.isAdmin && (
                                            <span className="ml-2 inline-flex items-center gap-1 text-xs text-blue-700">
                                                <ShieldCheck className="w-3.5 h-3.5" /> 管理員
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500 truncate">{u.email || u.id}</div>
                                </div>
                                {!u.isAdmin && (
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            u.status === 'pending' ? 'bg-amber-100 text-amber-800'
                                            : u.status === 'approved' ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-rose-100 text-rose-800'
                                        }`}>
                                            {STATUS_LABEL[u.status]}
                                        </span>
                                        {u.status !== 'approved' && (
                                            <button
                                                onClick={() => setStatus(u.id, 'approved')}
                                                disabled={busyId === u.id}
                                                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded border border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white disabled:opacity-50"
                                                aria-label={`核准 ${u.email || u.id}`}
                                            >
                                                {busyId === u.id
                                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    : <UserCheck className="w-3.5 h-3.5" />}
                                                核准
                                            </button>
                                        )}
                                        {u.status === 'approved' && (
                                            <button
                                                onClick={() => setStatus(u.id, 'rejected')}
                                                disabled={busyId === u.id}
                                                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded border border-rose-500 text-rose-600 hover:bg-rose-500 hover:text-white disabled:opacity-50"
                                                aria-label={`停權 ${u.email || u.id}`}
                                            >
                                                {busyId === u.id
                                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    : <UserX className="w-3.5 h-3.5" />}
                                                停權
                                            </button>
                                        )}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </DialogContent>
        </Dialog>
    );
}
