import { SORT_OPTIONS, type SortOption } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SortSelectProps {
  value: SortOption;
  onChange: (val: SortOption) => void;
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortOption)}>
      <SelectTrigger className="w-[180px]" data-testid="select-sort">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} data-testid={`option-sort-${opt.value}`}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
