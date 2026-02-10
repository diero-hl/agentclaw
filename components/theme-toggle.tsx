import { Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  return (
    <Button
      size="icon"
      variant="ghost"
      data-testid="button-theme-toggle"
    >
      <Moon className="w-4 h-4" />
    </Button>
  );
}
