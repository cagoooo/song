// 主題切換元件
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>('system');
    const [mounted, setMounted] = useState(false);

    // 初始化主題
    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem('theme') as Theme | null;
        if (saved && ['light', 'dark', 'system'].includes(saved)) {
            setTheme(saved);
        }
    }, []);

    // 應用主題
    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;

        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.toggle('dark', prefersDark);
        } else {
            root.classList.toggle('dark', theme === 'dark');
        }

        localStorage.setItem('theme', theme);
    }, [theme, mounted]);

    // 監聽系統主題變化
    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            document.documentElement.classList.toggle('dark', e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="w-10 h-10">
                <Sun className="w-5 h-5" />
            </Button>
        );
    }

    const icons = {
        light: <Sun className="w-5 h-5" />,
        dark: <Moon className="w-5 h-5" />,
        system: <Monitor className="w-5 h-5" />,
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 hover:bg-amber-100/50 dark:hover:bg-gray-800"
                    aria-label="切換主題"
                >
                    {icons[theme]}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[120px]">
                <DropdownMenuItem
                    onClick={() => setTheme('light')}
                    className="gap-2 cursor-pointer"
                >
                    <Sun className="w-4 h-4" />
                    淺色
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme('dark')}
                    className="gap-2 cursor-pointer"
                >
                    <Moon className="w-4 h-4" />
                    深色
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme('system')}
                    className="gap-2 cursor-pointer"
                >
                    <Monitor className="w-4 h-4" />
                    跟隨系統
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default ThemeToggle;
