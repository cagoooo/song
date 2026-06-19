import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SongSuggestion from './SongSuggestion';

const suggestionApi = vi.hoisted(() => ({
    useSuggestions: vi.fn(),
    approveSuggestion: vi.fn(),
    rejectSuggestion: vi.fn(),
    removeSuggestion: vi.fn(),
}));

const toastMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/use-suggestions', () => suggestionApi);
vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: toastMock }),
}));
vi.mock('./SuggestionForm', () => ({
    SuggestionForm: () => <div data-testid="suggestion-form" />,
}));
vi.mock('./MySuggestions', () => ({
    MySuggestions: () => <div data-testid="my-suggestions" />,
}));
vi.mock('./SuggestionCard', () => ({
    SuggestionCard: ({ suggestion, batchMode, selected, onToggleSelect }: any) => (
        <button
            type="button"
            data-testid={`suggestion-${suggestion.id}`}
            aria-pressed={selected}
            onClick={() => batchMode && onToggleSelect?.(suggestion.id)}
        >
            {suggestion.title}
        </button>
    ),
}));

const suggestions = [
    { id: 'a', title: '爆了', artist: '不知道', status: 'pending', createdAt: new Date(), upvotes: 0 },
    { id: 'b', title: '歲盃三百天禮物', artist: '歲歲孟孟', status: 'pending', createdAt: new Date(), upvotes: 0 },
    { id: 'c', title: '已採納歌', artist: '某人', status: 'approved', createdAt: new Date(), upvotes: 0 },
];

function renderSubject() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <SongSuggestion isAdmin />
        </QueryClientProvider>,
    );
}

async function openBatchMode() {
    fireEvent.click(screen.getByText('社群歌曲推薦'));
    fireEvent.click(await screen.findByText('批次審核'));
}

beforeEach(() => {
    vi.clearAllMocks();
    suggestionApi.useSuggestions.mockReturnValue({ suggestions, isLoading: false });
    suggestionApi.approveSuggestion.mockResolvedValue(undefined);
    suggestionApi.rejectSuggestion.mockResolvedValue(undefined);
    suggestionApi.removeSuggestion.mockResolvedValue(undefined);
});

describe('SongSuggestion batch delete', () => {
    it('點批次刪除會先出現站內確認對話框', async () => {
        renderSubject();
        await openBatchMode();

        fireEvent.click(screen.getByTestId('suggestion-a'));
        fireEvent.click(screen.getByText('刪除 1'));

        expect(await screen.findByText('確定刪除選取的推薦？')).toBeInTheDocument();
        expect(screen.getByText(/將刪除目前選取的 1 首社群歌曲推薦/)).toBeInTheDocument();
        expect(suggestionApi.removeSuggestion).not.toHaveBeenCalled();
    });

    it('取消確認不會刪除推薦', async () => {
        renderSubject();
        await openBatchMode();

        fireEvent.click(screen.getByTestId('suggestion-a'));
        fireEvent.click(screen.getByText('刪除 1'));
        fireEvent.click(await screen.findByText('取消'));

        await waitFor(() => {
            expect(screen.queryByText('確定刪除選取的推薦？')).not.toBeInTheDocument();
        });
        expect(suggestionApi.removeSuggestion).not.toHaveBeenCalled();
    });

    it('確認刪除會刪除所有選取推薦並清空選取', async () => {
        renderSubject();
        await openBatchMode();

        fireEvent.click(screen.getByTestId('suggestion-a'));
        fireEvent.click(screen.getByTestId('suggestion-b'));
        fireEvent.click(screen.getByText('刪除 2'));
        fireEvent.click(await screen.findByText('確認刪除 2 首'));

        await waitFor(() => {
            expect(suggestionApi.removeSuggestion).toHaveBeenCalledWith('a');
            expect(suggestionApi.removeSuggestion).toHaveBeenCalledWith('b');
        });
        await waitFor(() => {
            expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '已刪除 2 首推薦' }));
        });
        expect(screen.getByTestId('suggestion-a')).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByTestId('suggestion-b')).toHaveAttribute('aria-pressed', 'false');
    });

    it('部分刪除失敗時顯示失敗數並保留失敗項目', async () => {
        suggestionApi.removeSuggestion.mockImplementation((id: string) => (
            id === 'b' ? Promise.reject(new Error('permission denied')) : Promise.resolve()
        ));
        renderSubject();
        await openBatchMode();

        fireEvent.click(screen.getByTestId('suggestion-a'));
        fireEvent.click(screen.getByTestId('suggestion-b'));
        fireEvent.click(screen.getByText('刪除 2'));
        fireEvent.click(await screen.findByText('確認刪除 2 首'));

        await waitFor(() => {
            expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
                title: '已刪除 1 首推薦',
                description: '另有 1 首處理失敗，已保留選取方便重試。',
                variant: 'destructive',
            }));
        });
        expect(screen.getByTestId('suggestion-a')).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByTestId('suggestion-b')).toHaveAttribute('aria-pressed', 'true');
    });
});
