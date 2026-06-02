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
     * 桌機限高的 Tailwind class（含 sm: 斷點前綴），預設 `sm:max-h-[520px]`。
     * 手機一律不限高、自然展開。
     */
    maxHeightClass?: string;
}

export const ResponsiveScrollList = forwardRef<HTMLDivElement, ResponsiveScrollListProps>(
    function ResponsiveScrollList(
        { maxHeightClass = 'sm:max-h-[520px]', className, children, ...props },
        ref,
    ) {
        return (
            <div
                ref={ref}
                className={cn(
                    maxHeightClass,
                    'sm:overflow-y-auto sm:overscroll-contain sm:pr-2',
                    THIN_SCROLLBAR,
                    className,
                )}
                {...props}
            >
                {children}
            </div>
        );
    },
);
