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
    const { toast } = useToast();
    const { login } = useUser();

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

                        <p
                            className="mt-1 text-center"
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontStyle: 'italic',
                                fontSize: 12,
                                color: 'var(--ed-ink-3)',
                            }}
                        >
                            僅供主持人與授權管理員使用。
                        </p>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
});
