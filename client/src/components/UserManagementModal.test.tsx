// UserManagementModal 元件測試 — 驗證 Google 帳號細節顯示與舊資料分類
// 背景：2026-07-02 使用者反饋審核卡片只顯示「（未提供名稱）」看不到 Google
// email，追查發現 Cb8cqWfMw7JXEjiq7AnV 是 2025 年 Express 時代殘留文件
// （username + password hash，非真實 Firebase Auth 帳號）— 需分開呈現。
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserManagementModal } from './UserManagementModal';

type Listener = (snap: unknown) => void;
const firestoreMock = vi.hoisted(() => ({
    listener: null as Listener | null,
    docs: [] as Array<{ id: string; data: Record<string, unknown> }>,
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(() => ({})),
    doc: vi.fn((_db, _col, id) => ({ id })),
    query: vi.fn((ref) => ref),
    orderBy: vi.fn(),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    onSnapshot: vi.fn((_query, onNext: Listener) => {
        firestoreMock.listener = onNext;
        onNext({
            forEach: (cb: (doc: { id: string; data: () => Record<string, unknown> }) => void) => {
                firestoreMock.docs.forEach((d) => cb({ id: d.id, data: () => d.data }));
            },
        });
        return vi.fn();
    }),
}));

vi.mock('@/lib/firebase', () => ({
    db: {},
    COLLECTIONS: { users: 'users' },
}));

vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() }),
}));

describe('UserManagementModal', () => {
    beforeEach(() => {
        firestoreMock.docs = [];
    });

    it('顯示 Google 註冊使用者的 email 與名稱', () => {
        firestoreMock.docs = [{
            id: 'g1x9WWMhrRVrKAi6ldJR9X9Tuxr1',
            data: {
                email: 'student@gmail.com',
                displayName: '小明',
                status: 'pending',
                isAdmin: false,
                createdAt: { toDate: () => new Date('2026-07-01') },
            },
        }];
        render(<UserManagementModal isOpen onClose={vi.fn()} />);

        expect(screen.getByText('小明')).toBeInTheDocument();
        expect(screen.getByText('student@gmail.com')).toBeInTheDocument();
        expect(screen.getByText('待審核')).toBeInTheDocument();
    });

    it('舊系統殘留資料（username + password hash）標記為「舊系統資料」，不給核准鈕', () => {
        firestoreMock.docs = [{
            id: 'Cb8cqWfMw7JXEjiq7AnV',
            data: {
                username: 'user',
                password: '$2b$10$fakehash',
                isAdmin: false,
            },
        }];
        render(<UserManagementModal isOpen onClose={vi.fn()} />);

        expect(screen.getByText('舊系統資料')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /核准/ })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /刪除舊資料/ })).toBeInTheDocument();
    });

    it('email 前後的 tab / 空白字元會被清除（歷史髒資料）', () => {
        firestoreMock.docs = [{
            id: 'wnozzUrl2CaM9Lw2x5PziQraQXs2',
            data: {
                email: '\tcagooo@gmail.com',
                status: 'approved',
                isAdmin: false,
            },
        }];
        render(<UserManagementModal isOpen onClose={vi.fn()} />);

        expect(screen.getByText('cagooo@gmail.com')).toBeInTheDocument();
    });

    it('管理員帳號顯示管理員標籤，不出現核准/停權操作', () => {
        firestoreMock.docs = [{
            id: 'admin-uid',
            data: { email: 'ipad@mail2.smes.tyc.edu.tw', isAdmin: true },
        }];
        render(<UserManagementModal isOpen onClose={vi.fn()} />);

        expect(screen.getByText('管理員')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /核准|停權/ })).not.toBeInTheDocument();
    });
});
