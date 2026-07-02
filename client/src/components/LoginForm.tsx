import { useState, memo } from 'react';
import {
    Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface LoginFormProps {
    onClose: () => void;
}

export default memo(function LoginForm({ onClose }: LoginFormProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const { toast } = useToast();
    const { login, loginWithGoogle } = useUser();

    // U1：Google 註冊 / 登入（同一顆按鈕）— 首次登入建立 pending 帳號等待審核
    const handleGoogle = async () => {
        setIsGoogleLoading(true);
        try {
            const result = await loginWithGoogle();
            if (!result.ok) {
                // message 為空 = 使用者自己關掉 popup，不吵他
                if ((result as { message?: string }).message) {
                    toast({
                        title: '錯誤',
                        description: (result as { message?: string }).message,
                        variant: 'destructive',
                    });
                }
                return;
            }
            toast({
                title: '登入成功',
                description: '若是首次註冊，需等待管理員審核後才能建立自己的歌單空間。',
                variant: 'success',
            });
            onClose();
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await login({ username, password });
            if (!result.ok) {
                toast({
                    title: '錯誤',
                    description: (result as { message?: string }).message || '登入失敗',
                    variant: 'destructive',
                });
                setIsLoading(false);
                return;
            }

            toast({
                title: '成功',
                description: '登入成功',
                variant: 'success',
            });
            onClose();
        } catch (error) {
            toast({
                title: '錯誤',
                description: '登入失敗',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden bg-transparent border-0 shadow-2xl">
                <DialogTitle className="sr-only">管理員登入 — BACKSTAGE</DialogTitle>
                <DialogDescription className="sr-only">
                    輸入管理員帳號和密碼進入後台，可重置投票、標記正在彈奏、查看統計。
                </DialogDescription>

                <div className="editorial-login">
                    {/* 左側深色雜誌封面 */}
                    <aside className="editorial-login-cover">
                        <div>
                            <div className="editorial-login-cover-eyebrow">
                                <span className="dot" aria-hidden="true" />
                                <span>BACKSTAGE</span>
                            </div>
                            <h2 className="editorial-login-cover-title">
                                老師<br />
                                <span style={{ color: 'var(--ed-accent)' }}>請進</span>
                            </h2>
                            <p className="editorial-login-cover-sub">
                                重置投票、標記彈奏、現場數據面板，<br />
                                通通在這扇門後面。
                            </p>
                        </div>
                        <div className="editorial-login-cover-bottom">
                            <span>Issue №12</span>
                            <span>Side A</span>
                        </div>
                    </aside>

                    {/* 右側表單 */}
                    <form onSubmit={handleSubmit} className="editorial-login-form" autoComplete="off">
                        <div>
                            <div className="editorial-login-form-eyebrow">Admin Sign In</div>
                            <h3 className="editorial-login-form-title">管理員登入</h3>
                        </div>

                        <div className="space-y-1.5">
                            <label
                                htmlFor="login-username"
                                className="block"
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 10,
                                    letterSpacing: '0.22em',
                                    textTransform: 'uppercase',
                                    color: 'var(--ed-ink-3)',
                                }}
                            >
                                Username
                            </label>
                            <input
                                id="login-username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="請輸入管理員帳號"
                                required
                                disabled={isLoading}
                                className="editorial-login-input"
                                aria-label="管理員帳號"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label
                                htmlFor="login-password"
                                className="block"
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 10,
                                    letterSpacing: '0.22em',
                                    textTransform: 'uppercase',
                                    color: 'var(--ed-ink-3)',
                                }}
                            >
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="請輸入密碼"
                                    required
                                    disabled={isLoading}
                                    className="editorial-login-input pr-12"
                                    aria-label="密碼"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded hover:bg-black/5 text-slate-500"
                                    aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !username.trim() || !password.trim()}
                            className="editorial-login-submit"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Signing in…
                                </span>
                            ) : (
                                '進入後台 →'
                            )}
                        </button>

                        {/* U1：一般使用者 Google 註冊 / 登入 */}
                        <div className="editorial-login-divider" aria-hidden="true">
                            <span>或</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleGoogle}
                            disabled={isGoogleLoading || isLoading}
                            className="editorial-login-google"
                            aria-label="使用 Google 帳號註冊或登入"
                        >
                            {isGoogleLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <svg viewBox="0 0 48 48" width="16" height="16" aria-hidden="true">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                                </svg>
                            )}
                            使用 Google 註冊 / 登入
                        </button>

                        <p
                            className="mt-1 text-center"
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontStyle: 'italic',
                                fontSize: 12,
                                color: 'var(--ed-ink-3)',
                            }}
                        >
                            管理員以帳密登入；一般使用者以 Google 註冊，
                            審核通過後即可擁有自己的獨立歌單空間。
                        </p>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
});
