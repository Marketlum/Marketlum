'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { setLocale } from '@/i18n/actions';
import { locales, type Locale } from '@/i18n/config';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const flags: Record<Locale, string> = {
  en: '🇬🇧',
  pl: '🇵🇱',
};

interface LocaleSwitcherProps {
  collapsed?: boolean;
}

export function LocaleSwitcher({ collapsed }: LocaleSwitcherProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations('locale');
  const router = useRouter();

  const handleChange = async (newLocale: Locale) => {
    await setLocale(newLocale);
    router.refresh();
  };

  const trigger = (
    <DropdownMenuTrigger asChild>
      {collapsed ? (
        <Button variant="ghost" size="icon" className="w-full text-muted-foreground hover:text-foreground">
          <Globe className="h-4 w-4" />
        </Button>
      ) : (
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
          <Globe className="mr-2 h-4 w-4" />
          {t(locale)}
        </Button>
      )}
    </DropdownMenuTrigger>
  );

  return (
    <DropdownMenu>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="right">{t('switchLanguage')}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <DropdownMenuContent align={collapsed ? 'center' : 'start'}>
        {locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => handleChange(l)}
            className={l === locale ? 'font-medium' : ''}
          >
            <span className="mr-2">{flags[l]}</span>
            {t(l)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
