'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ThemeSwitcherProps {
  collapsed?: boolean;
}

export function ThemeSwitcher({ collapsed }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations('nav');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = theme === 'dark';
  const Icon = isDark ? Moon : Sun;
  const label = isDark ? t('darkMode') : t('lightMode');

  const toggle = () => setTheme(isDark ? 'light' : 'dark');

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="w-full text-sidebar-muted-foreground hover:text-sidebar-foreground" onClick={toggle}>
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-muted-foreground hover:text-sidebar-foreground" onClick={toggle}>
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
