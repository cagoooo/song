import { memo } from 'react';
import { ArrowUpDown } from 'lucide-react';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SORT_OPTIONS, type SortMode } from '@/hooks/useSortMode';

interface SortSelectorProps {
    value: SortMode;
    onChange: (mode: SortMode) => void;
}

export const SortSelector = memo(function SortSelector({ value, onChange }: SortSelectorProps) {
    const current = SORT_OPTIONS.find((o) => o.value === value);
    return (
        <Select value={value} onValueChange={(v) => onChange(v as SortMode)}>
            <SelectTrigger
                className="h-8 w-auto min-w-[110px] gap-1.5 text-xs px-2.5"
                aria-label="排序方式"
            >
                <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
                <SelectValue>
                    <span className="hidden sm:inline">{current?.icon} </span>
                    <span>{current?.label ?? '排序'}</span>
                </SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
                {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-sm">
                        <span className="mr-2">{opt.icon}</span>
                        {opt.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
});
