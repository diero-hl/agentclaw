"use client";

import { CATEGORIES, type Category } from "@/shared/schema";
import { Button } from "@/components/ui/button";

interface CategoryFilterProps {
  selected: Category;
  onSelect: (cat: Category) => void;
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-1.5" data-testid="filter-categories">
      {CATEGORIES.map((cat) => (
        <Button
          key={cat}
          size="sm"
          variant={selected === cat ? "default" : "outline"}
          onClick={() => onSelect(cat)}
          className="text-xs"
          data-testid={`button-category-${cat.toLowerCase().replace(/\s/g, "-")}`}
        >
          {cat}
        </Button>
      ))}
    </div>
  );
}
