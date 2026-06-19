import { useEffect, useMemo, useState } from 'react';

type LoadingKind = 'app' | 'data' | 'section';

interface AppLoadingProps {
  kind?: LoadingKind;
  compact?: boolean;
}

const PHASES: Record<LoadingKind, string[]> = {
  app: ['載入介面', '準備互動元件', '連線資料庫', '整理歌單'],
  data: ['連線資料庫', '讀取歌單', '整理排行', '準備點歌介面'],
  section: ['載入區塊', '整理資料', '準備畫面'],
};

function useLoadingProgress(kind: LoadingKind): { progress: number; label: string } {
  const phases = PHASES[kind];
  const [progress, setProgress] = useState(kind === 'app' ? 18 : 28);

  useEffect(() => {
    setProgress(kind === 'app' ? 18 : 28);
    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 94) return current;
        const next = current + Math.max(1, Math.round((96 - current) * 0.08));
        return Math.min(next, 94);
      });
    }, 360);
    return () => window.clearInterval(timer);
  }, [kind]);

  const label = useMemo(() => {
    const index = Math.min(phases.length - 1, Math.floor((progress / 100) * phases.length));
    return phases[index];
  }, [phases, progress]);

  return { progress, label };
}

export function AppLoading({ kind = 'app', compact = false }: AppLoadingProps) {
  const { progress, label } = useLoadingProgress(kind);

  if (compact) {
    return (
      <div className="rounded-xl border border-blue-100 bg-white/90 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
          <span>{label}</span>
          <span className="font-mono text-blue-600">{progress}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-white to-primary/5 px-4 py-8">
      <div className="mx-auto flex min-h-[82vh] w-full max-w-5xl flex-col justify-center gap-6">
        <section className="rounded-2xl border border-blue-100 bg-white/92 p-5 shadow-xl shadow-blue-100/40 sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-blue-500">
                Guitar Song Live
              </p>
              <h1 className="mt-2 font-serif text-3xl font-black italic text-slate-950 sm:text-4xl">
                吉他點歌系統載入中
              </h1>
              <p className="mt-2 text-sm text-slate-500 sm:text-base">
                第一次開啟會整理歌單與即時排行，請稍等一下。
              </p>
            </div>
            <div className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 font-mono text-2xl font-black text-blue-600">
              {progress}%
            </div>
          </div>

          <div className="mt-6" role="progressbar" aria-label="載入進度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
              <span>{label}</span>
              <span>快好了</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-[1fr_1.15fr]">
          <div className="rounded-2xl border border-slate-100 bg-white/80 p-5 shadow-lg">
            <div className="h-5 w-36 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-5 h-12 w-full animate-pulse rounded-xl bg-slate-100" />
            <div className="mt-3 h-10 w-2/3 animate-pulse rounded-xl bg-slate-100" />
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white/80 p-5 shadow-lg">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
                <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
                <div className="flex-1">
                  <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-100" />
                  <div className="mt-2 h-3 w-1/2 animate-pulse rounded-full bg-slate-100" />
                </div>
                <div className="h-8 w-16 animate-pulse rounded-lg bg-slate-100" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default AppLoading;
