"use client";

import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative w-full">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        placeholder="Search agents..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-card px-4 py-3 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
        data-testid="input-search"
      />
    </div>
  );
}
