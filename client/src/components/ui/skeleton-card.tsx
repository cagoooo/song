// 通用骨架屏卡片元件
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonCardProps {
    variant?: 'song' | 'ranking' | 'suggestion';
    count?: number;
}

export function SkeletonCard({ variant = 'song', count = 3 }: SkeletonCardProps) {
    const items = Array.from({ length: count });

    if (variant === 'song') {
        return (
            <div className="space-y-3">
                {items.map((_, i) => (
                    <div
                        key={i}
                        className="p-4 rounded-xl border-2 border-gray-200/50 
                            bg-gradient-to-br from-white to-gray-50"
                    >
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-2 h-12 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="w-5 h-5 rounded-full" />
                                    <Skeleton className="h-5 w-3/5" />
                                </div>
                                <Skeleton className="h-4 w-2/5 ml-7" />
                            </div>
                            <Skeleton className="h-10 w-20 rounded-xl" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (variant === 'ranking') {
        return (
            <div className="space-y-4">
                {items.map((_, i) => (
                    <div
                        key={i}
                        className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 
                            p-3 sm:p-4 rounded-lg border border-gray-200/50
                            bg-gradient-to-r from-white to-gray-50"
                    >
                        <Skeleton className={`w-10 h-10 rounded-full ${i === 0 ? 'bg-amber-200' :
                                i === 1 ? 'bg-gray-200' :
                                    i === 2 ? 'bg-orange-200' : ''
                            }`} />
                        <div className="flex-1 min-w-0 space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                        <Skeleton className="w-12 h-6" />
                        <div className="flex gap-2">
                            <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg" />
                            <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (variant === 'suggestion') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((_, i) => (
                    <div
                        key={i}
                        className="p-4 rounded-xl border-2 border-gray-200/50
                            bg-gradient-to-br from-white to-gray-50"
                    >
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-5 w-2/3" />
                                <Skeleton className="h-6 w-16 rounded-full" />
                            </div>
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-3 w-1/3" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return null;
}

export default SkeletonCard;
