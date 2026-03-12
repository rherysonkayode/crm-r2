// src/components/ThemeToggle.tsx
import { useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Sun className={cn(
            "h-4 w-4 transition-all",
            theme === 'dark' ? 'rotate-90 scale-0' : 'rotate-0 scale-100'
          )} />
          <Moon className={cn(
            "absolute h-4 w-4 transition-all",
            theme === 'dark' ? 'rotate-0 scale-100' : 'rotate-90 scale-0'
          )} />
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')} className="gap-2">
          <Sun className="h-4 w-4" />
          <span>Claro</span>
          {theme === 'light' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} className="gap-2">
          <Moon className="h-4 w-4" />
          <span>Escuro</span>
          {theme === 'dark' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setTheme(systemPrefersDark ? 'dark' : 'light');
        }} className="gap-2">
          <Monitor className="h-4 w-4" />
          <span>Sistema</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}