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

// 齒輪 SVG 元素定義（中心點在 0,0）
function SpoolGearGroup() {
  return (
    <g>
      {/* 齒輪底盤 */}
      <circle cx="0" cy="0" r="16" fill="#f5f5f5" stroke="#d4d4d8" strokeWidth="1" />
      <circle cx="0" cy="0" r="11" fill="none" stroke="#e4e4e7" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
      {/* 6 個齒突 */}
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <path
          key={deg}
          d="M -1.8 -16 L 1.8 -16 L 1.5 -11 L -1.5 -11 Z"
          transform={`rotate(${deg})`}
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth="0.4"
        />
      ))}
      {/* 內部圓孔 */}
      <circle cx="0" cy="0" r="6.5" fill="#171717" stroke="#3f3f46" strokeWidth="0.8" />
    </g>
  );
}

export function AppLoading({ kind = 'app', compact = false }: AppLoadingProps) {
  const { progress, label } = useLoadingProgress(kind);

  // 齒輪半徑 16。磁帶最大半徑設為 35，最小半徑設為 19。
  // 左磁帶隨 progress 減少：35 - (progress / 100) * 16
  // 右磁帶隨 progress 增加：19 + (progress / 100) * 16
  const leftTapeRadius = 35 - (progress / 100) * 16;
  const rightTapeRadius = 19 + (progress / 100) * 16;

  // 3 位數的計數器字串，如 "061"
  const counterStr = String(progress).padStart(3, '0');

  const svgWindow = (
    <svg viewBox="0 0 300 120" className="w-full h-full select-none">
      {/* 視窗背景 */}
      <rect x="0" y="0" width="300" height="120" rx="8" fill="#0d0d0d" stroke="#374151" strokeWidth="1.5" />
      
      {/* 反光裝飾線 */}
      <line x1="8" y1="4" x2="292" y2="4" stroke="#1f2937" strokeWidth="1" />
      <line x1="8" y1="116" x2="292" y2="116" stroke="#1f2937" strokeWidth="1" />
      
      {/* 刻度與數字 */}
      <g opacity="0.4">
        <line x1="150" y1="15" x2="150" y2="105" stroke="#4b5563" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="120" y1="60" x2="180" y2="60" stroke="#4b5563" strokeWidth="1" strokeDasharray="3 3" />
        {[80, 100, 120, 135, 150, 165, 180, 200, 220].map((x) => (
          <line key={x} x1={x} y1="56" x2={x} y2="64" stroke="#4b5563" strokeWidth="0.8" />
        ))}
        <text x="90" y="25" textAnchor="middle" fill="#9ca3af" className="text-[9px] font-mono font-bold">0</text>
        <text x="150" y="25" textAnchor="middle" fill="#9ca3af" className="text-[9px] font-mono font-bold">50</text>
        <text x="210" y="25" textAnchor="middle" fill="#9ca3af" className="text-[9px] font-mono font-bold">100</text>
      </g>

      {/* 傳動磁帶 */}
      <line x1="35" y1="106" x2="265" y2="106" stroke="#4a3728" strokeWidth="2.2" />
      <line x1="35" y1="100" x2={`${90 - leftTapeRadius * 0.7}`} y2={`${60 + leftTapeRadius * 0.7}`} stroke="#4a3728" strokeWidth="2.2" />
      <line x1="265" y1="100" x2={`${210 + rightTapeRadius * 0.7}`} y2={`${60 + rightTapeRadius * 0.7}`} stroke="#4a3728" strokeWidth="2.2" />

      {/* 導向輪 */}
      <g>
        <circle cx="35" cy="100" r="8" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.8" />
        <circle cx="35" cy="100" r="3.5" fill="#374151" />
        <circle cx="265" cy="100" r="8" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.8" />
        <circle cx="265" cy="100" r="3.5" fill="#374151" />
      </g>

      {/* 磁帶卷 */}
      <circle cx="90" cy="60" r={leftTapeRadius} fill="#4a3728" opacity="0.9" className="transition-all duration-300" />
      <circle cx="210" cy="60" r={rightTapeRadius} fill="#4a3728" opacity="0.9" className="transition-all duration-300" />

      {/* 齒輪 (順時針旋轉) */}
      <g transform="translate(90, 60)" className="app-loading-spool-left">
        <SpoolGearGroup />
      </g>
      <g transform="translate(210, 60)" className="app-loading-spool-right">
        <SpoolGearGroup />
      </g>
    </svg>
  );

  if (compact) {
    return (
      <div className="rounded-xl border border-blue-100 bg-white/90 p-4 shadow-md flex items-center gap-4">
        {/* 迷你卡帶 */}
        <div className="relative w-16 h-10 flex-shrink-0 select-none">
          <div className="absolute inset-0 bg-neutral-900 rounded border border-neutral-700 flex items-center justify-center p-0.5">
            <div className="w-full h-full bg-[#fcf8f2] rounded-sm p-0.5 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-blue-500" />
              <div className="w-11/12 mx-auto h-4 rounded-sm bg-neutral-950 overflow-hidden flex items-center justify-between px-1">
                <div className="w-2.5 h-2.5 rounded-full border border-neutral-400 bg-white animate-[editorial-spin_4s_linear_infinite] flex items-center justify-center">
                  <div className="w-0.5 h-0.5 rounded-full bg-neutral-900" />
                </div>
                <div className="w-2.5 h-2.5 rounded-full border border-neutral-400 bg-white animate-[editorial-spin_4s_linear_infinite] flex items-center justify-center">
                  <div className="w-0.5 h-0.5 rounded-full bg-neutral-900" />
                </div>
              </div>
              <div className="h-1" />
            </div>
          </div>
        </div>

        {/* 迷你載入說明與進度 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 gap-2">
            <span className="truncate">{label}</span>
            <span className="font-mono text-blue-600 flex-shrink-0">{progress}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-white to-primary/5 px-4 py-8 flex flex-col justify-center items-center">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        
        {/* 卡帶外框與載入資訊 */}
        <section className="rounded-2xl border border-blue-100 bg-white/92 p-6 shadow-xl shadow-blue-100/40 sm:p-8">
          <div className="w-full flex flex-col lg:flex-row items-center gap-8 justify-between">
            
            {/* 左側：擬物化卡帶 */}
            <div className="relative w-full max-w-[350px] sm:max-w-[380px] aspect-[1.58/1] flex-shrink-0 select-none mx-auto lg:mx-0">
              
              {/* 卡帶深殼身 */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#2a2a2e] to-[#121214] rounded-2xl border-4 border-neutral-700/80 shadow-[inset_0_2px_4px_rgba(255,255,255,0.15),_0_15px_30px_-5px_rgba(0,0,0,0.5)] flex flex-col justify-between p-3.5 pb-2">
                
                {/* 螺絲釘 */}
                <div className="absolute top-2.5 left-2.5 w-3 h-3 rounded-full bg-neutral-900 border border-neutral-600 flex items-center justify-center text-[7px] text-neutral-500 font-sans font-bold select-none">+</div>
                <div className="absolute top-2.5 right-2.5 w-3 h-3 rounded-full bg-neutral-900 border border-neutral-600 flex items-center justify-center text-[7px] text-neutral-500 font-sans font-bold select-none">+</div>
                <div className="absolute bottom-2.5 left-2.5 w-3 h-3 rounded-full bg-neutral-900 border border-neutral-600 flex items-center justify-center text-[7px] text-neutral-500 font-sans font-bold select-none">+</div>
                <div className="absolute bottom-2.5 right-2.5 w-3 h-3 rounded-full bg-neutral-900 border border-neutral-600 flex items-center justify-center text-[7px] text-neutral-500 font-sans font-bold select-none">+</div>
                
                {/* 貼紙標籤 */}
                <div className="w-full h-full bg-[#fcf8f2] rounded-lg border border-neutral-950 p-2.5 flex flex-col justify-between relative overflow-hidden shadow-inner">
                  {/* 復古裝飾線條 */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-blue-500 opacity-85" />
                  
                  {/* 貼紙頂部 */}
                  <div className="flex justify-between items-end border-b border-neutral-300 pb-1 mt-1 font-mono text-[9px] font-bold text-neutral-600">
                    <div className="flex gap-2">
                      <span>SIDE A</span>
                      <span className="text-red-500">NR [•]</span>
                    </div>
                    <span>C-60</span>
                  </div>

                  {/* 卡帶手寫主標題 */}
                  <div className="text-center my-0.5">
                    <h3 className="font-serif font-black italic text-neutral-800 text-lg sm:text-xl tracking-wide select-none leading-none drop-shadow-sm">
                      GUITAR SONG LIVE
                    </h3>
                  </div>

                  {/* 磁帶內嵌視窗 */}
                  <div className="w-11/12 mx-auto aspect-[2.7/1] rounded-md border border-neutral-400 bg-neutral-950 overflow-hidden shadow-[inset_0_2px_5px_rgba(0,0,0,0.9)] flex items-center justify-center relative">
                    {svgWindow}
                  </div>

                  {/* 貼紙底部 */}
                  <div className="flex justify-between items-center text-[8px] font-mono font-bold text-neutral-500 pt-1">
                    <span>NORMAL POSITION</span>
                    <span className="text-neutral-400">120µs EQ</span>
                  </div>
                </div>

                {/* 梯形磁頭外盒底座 */}
                <div className="w-[62%] mx-auto h-3 bg-neutral-900/90 border-t border-neutral-800 rounded-b-md shadow-inner flex justify-between px-6 items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-black" />
                  <div className="w-2 h-1 bg-black rounded-sm" />
                  <div className="w-2 h-1 bg-black rounded-sm" />
                  <div className="w-1.5 h-1.5 rounded-full bg-black" />
                </div>

              </div>
            </div>

            {/* 右側：狀態控制板與文字 */}
            <div className="flex-1 w-full flex flex-col justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-blue-500 font-bold">
                  Guitar Song Live
                </p>
                <h1 className="mt-2 font-serif text-3xl font-black italic text-slate-950 sm:text-4xl">
                  吉他點歌系統載入中
                </h1>
                <p className="mt-2 text-sm text-slate-500 sm:text-base">
                  第一次開啟會整理歌單與即時排行，請稍等一下。
                </p>
              </div>

              {/* 資訊看板 */}
              <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-4 flex items-center justify-between gap-4 shadow-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Current State</span>
                  <span className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    {label}
                  </span>
                </div>

                {/* LED 計數器 */}
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Tape Counter</span>
                  <div className="bg-neutral-950 rounded-lg border-2 border-neutral-800 px-3 py-1 flex items-center shadow-inner">
                    <span className="app-loading-led-counter font-bold text-2xl tracking-widest text-amber-500 select-none">
                      {counterStr}
                    </span>
                  </div>
                </div>
              </div>

              {/* 下方條狀進度條 */}
              <div className="w-full" role="progressbar" aria-label="載入進度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                <div className="flex justify-between items-center text-xs text-slate-400 font-bold mb-1.5">
                  <span>SYSTEM PROGRESS</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 border border-slate-200/50 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 下方的 Skeleton */}
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

