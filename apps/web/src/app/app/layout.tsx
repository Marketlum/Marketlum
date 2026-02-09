'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Users, Bot, FolderTree, LogOut, PanelLeftClose, PanelLeftOpen, Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getMe, logout } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import type { UserResponse } from '@marketlum/shared';

const SIDEBAR_KEY = 'marketlum-sidebar-collapsed';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('nav');
  const [user, setUser] = useState<UserResponse | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(SIDEBAR_KEY) === 'true');
    setMounted(true);
  }, []);

  useEffect(() => {
    getMe().then((u) => {
      if (!u) {
        router.push('/login');
      } else {
        setUser(u);
      }
    });
  }, [router]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const navItems = [
    { href: '/app/users', label: t('users'), icon: Users },
    { href: '/app/agents', label: t('agents'), icon: Bot },
    { href: '/app/taxonomies', label: t('taxonomies'), icon: FolderTree },
  ];

  if (!user) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen flex-col md:flex-row">
        {/* Mobile header */}
        <header className="flex md:hidden h-14 items-center border-b px-4 gap-3 bg-card">
          <Button variant="ghost" size="icon" onClick={() => setSheetOpen(true)}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">{t('menu')}</span>
          </Button>
          <Link href="/app" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Marketlum" width={28} height={28} className="rounded" />
            <span className="bg-gradient-to-r from-green-400 via-teal-400 to-purple-500 bg-clip-text text-lg font-bold text-transparent">
              Marketlum
            </span>
          </Link>
        </header>

        {/* Mobile sheet drawer */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="left" className="flex flex-col p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-14 items-center border-b px-4">
              <div className="flex items-center gap-2.5">
                <Image src="/logo.png" alt="Marketlum" width={28} height={28} className="rounded" />
                <span className="bg-gradient-to-r from-green-400 via-teal-400 to-purple-500 bg-clip-text text-lg font-bold text-transparent">
                  Marketlum
                </span>
              </div>
            </div>

            <nav className="flex-1 space-y-1 p-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSheetOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-primary/15 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t p-2">
              <div className="mb-2 truncate px-3 text-sm text-muted-foreground">{user.email}</div>
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={() => { setSheetOpen(false); handleLogout(); }}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('logout')}
              </Button>
              <div className="mt-1">
                <LocaleSwitcher collapsed={false} />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop sidebar */}
        <aside
          className={`hidden md:flex flex-col border-r bg-card transition-[width] duration-200 ${
            collapsed ? 'w-16' : 'w-64'
          }`}
          style={{ visibility: mounted ? 'visible' : 'hidden' }}
        >
          <div className="flex h-14 items-center border-b px-4">
            {collapsed ? (
              <Link href="/app" className="mx-auto">
                <Image src="/logo.png" alt="Marketlum" width={28} height={28} className="rounded" />
              </Link>
            ) : (
              <div className="flex items-center gap-2.5">
                <Image src="/logo.png" alt="Marketlum" width={28} height={28} className="rounded" />
                <Link href="/app" className="bg-gradient-to-r from-green-400 via-teal-400 to-purple-500 bg-clip-text text-lg font-bold text-transparent">
                  Marketlum
                </Link>
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-1 p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              const link = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    collapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'bg-primary/15 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && item.label}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              return link;
            })}
          </nav>

          <div className="border-t p-2">
            {!collapsed && (
              <div className="mb-2 truncate px-3 text-sm text-muted-foreground">{user.email}</div>
            )}
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-full text-muted-foreground hover:text-foreground" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{t('logout')}</TooltipContent>
              </Tooltip>
            ) : (
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('logout')}
              </Button>
            )}

            <div className="mt-1">
              <LocaleSwitcher collapsed={collapsed} />
            </div>

            <div className="mt-1">
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-full text-muted-foreground hover:text-foreground" onClick={toggleCollapsed}>
                      <PanelLeftOpen className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{t('expandSidebar')}</TooltipContent>
                </Tooltip>
              ) : (
                <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={toggleCollapsed}>
                  <PanelLeftClose className="mr-2 h-4 w-4" />
                  {t('collapse')}
                </Button>
              )}
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </TooltipProvider>
  );
}
