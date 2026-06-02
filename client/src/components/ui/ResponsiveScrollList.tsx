// 響應式長清單捲動容器
//
// 沉澱自 v4.6.2 社群推薦清單的 RWD 修法，避免每處長清單重踩 Radix ScrollArea
// 「只有 max-height + 內部 h-full 導致內容被裁切卻無法捲動」的陷阱。
//
// 行為：
//   - 手機（預設）：不限高、自然展開 → 交給整頁捲動，保證看得到全部內容。
//   - 桌機（sm+）：限高 + 原生 overflow-y-auto + overscroll-contain + 自訂細捲軸
//     （原生捲動跨裝置／觸控都可靠）。
//
// 用法（容器本身即內容版面，例如 grid）：
//   <ResponsiveScrollList className="grid grid-cols-1 md:grid-cols-2 gap-4">
//     {items.map(...)}
//   </ResponsiveScrollList>
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

// 細捲軸樣式（Firefox scrollbar-width + WebKit pseudo-elements）
const THIN_SCROLLBAR =
    '[scrollbar-width:thin] [scrollbar-color:rgba(17,17,17,0.22)_transparent] ' +
    '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent ' +
    '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(17,17,17,0.2)]';

interface ResponsiveScrollListProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * 限高的 Tailwind class。
     * - cap='desktop'（預設）：請帶 sm: 前綴，例如 `sm:max-h-[520px]`（手機不限高）。
     * - cap='always'：不帶前綴，例如 `max-h-[420px]`（全斷點限高）。
     */
    maxHeightClass?: string;
    /**
     * 何時啟用限高 + 捲動：
     * - 'desktop'（預設）：手機自然展開交給整頁捲動、桌機才限高捲動。適合頁面內長清單。
     * - 'always'：全斷點都限高捲動。適合 modal 內清單（避免撐破對話框）。
     */
    cap?: 'desktop' | 'always';
}

export const ResponsiveScrollList = forwardRef<HTMLDivElement, ResponsiveScrollListProps>(
    function ResponsiveScrollList(
        { maxHeightClass, cap = 'desktop', className, children, ...props },
        ref,
    ) {
        const resolvedMaxH = maxHeightClass ?? (cap === 'always' ? 'max-h-[420px]' : 'sm:max-h-[520px]');
        const overflow =
            cap === 'always'
                ? 'overflow-y-auto overscroll-contain pr-2'
                : 'sm:overflow-y-auto sm:overscroll-contain sm:pr-2';
        return (
            <div
                ref={ref}
                className={cn(resolvedMaxH, overflow, THIN_SCROLLBAR, className)}
                {...props}
            >
                {children}
            </div>
        );
    },
);
