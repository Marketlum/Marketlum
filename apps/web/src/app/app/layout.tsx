'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Users, Bot, Gem, FolderTree, FileIcon, FileText, Layers, Workflow, Wallet, ArrowLeftRight, ArrowRightLeft, Handshake, Hash, Package, LogOut, PanelLeftClose, PanelLeftOpen, Menu, User, Search, LayoutDashboard, Globe, Shapes, Languages } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getMe, logout } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import { ThemeSwitcher } from '@/components/shared/theme-switcher';
import { FileImagePreview } from '@/components/shared/file-image-preview';
import { GlobalSearchInput } from '@/components/search/global-search-input';
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
  const [menuFilter, setMenuFilter] = useState('');

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

  const navGroups = [
    { label: '', items: [
      { href: '/app/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    ]},
    { label: t('groupCreate'), items: [
      { href: '/app/values', label: t('values'), icon: Gem },
      { href: '/app/value-instances', label: t('valueInstances'), icon: Layers },
    ]},
    { label: t('groupLedger'), items: [
      { href: '/app/accounts', label: t('accounts'), icon: Wallet },
      { href: '/app/transactions', label: t('transactions'), icon: ArrowLeftRight },
    ]},
    { label: t('groupExchange'), items: [
      { href: '/app/agents', label: t('agents'), icon: Bot },
      { href: '/app/agreements', label: t('agreements'), icon: Handshake },
      { href: '/app/offerings', label: t('offerings'), icon: Package },
      { href: '/app/exchanges', label: t('exchanges'), icon: ArrowRightLeft },
      { href: '/app/invoices', label: t('invoices'), icon: FileText },
    ]},
    { label: t('groupSystem'), items: [
      { href: '/app/users', label: t('users'), icon: Users },
      { href: '/app/taxonomies', label: t('taxonomies'), icon: FolderTree },
      { href: '/app/archetypes', label: t('archetypes'), icon: Shapes },
      { href: '/app/channels', label: t('channels'), icon: Hash },
      { href: '/app/geographies', label: t('geographies'), icon: Globe },
      { href: '/app/value-streams', label: t('valueStreams'), icon: Workflow },
      { href: '/app/locales', label: t('locales'), icon: Languages },
      { href: '/app/files', label: t('files'), icon: FileIcon },
    ]},
  ];

  const filteredGroups = menuFilter
    ? navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            item.label.toLowerCase().includes(menuFilter.toLowerCase()),
          ),
        }))
        .filter((group) => group.items.length > 0)
    : navGroups;

  if (!user) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen flex-col md:flex-row">
        {/* Mobile header */}
        <header className="flex md:hidden h-14 items-center border-b border-sidebar-border px-4 gap-3 bg-sidebar text-sidebar-foreground">
          <Button variant="ghost" size="icon" className="text-sidebar-foreground" onClick={() => setSheetOpen(true)}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">{t('menu')}</span>
          </Button>
          <Link href="/app" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Marketlum" width={28} height={28} className="rounded" />
            <span className="bg-gradient-to-r from-green-400 via-teal-400 to-purple-500 bg-clip-text text-lg font-bold text-transparent">
              Marketlum
            </span>
          </Link>
          <div className="flex-1 px-2">
            <GlobalSearchInput />
          </div>
        </header>

        {/* Mobile sheet drawer */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="left" className="flex flex-col p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-14 items-center border-b border-sidebar-border px-4">
              <div className="flex items-center gap-2.5">
                <Image src="/logo.png" alt="Marketlum" width={28} height={28} className="rounded" />
                <span className="bg-gradient-to-r from-green-400 via-teal-400 to-purple-500 bg-clip-text text-lg font-bold text-transparent">
                  Marketlum
                </span>
              </div>
            </div>

            <div className="px-3 pt-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sidebar-muted-foreground" />
                <input
                  type="text"
                  value={menuFilter}
                  onChange={(e) => setMenuFilter(e.target.value)}
                  placeholder={t('searchMenu')}
                  className="h-8 w-full rounded-md border-0 bg-sidebar-secondary pl-8 pr-3 text-xs text-sidebar-foreground placeholder:text-sidebar-muted-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-primary"
                />
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-2">
              {filteredGroups.map((group) => (
                <div key={group.label || '_top'}>
                  {group.label && (
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-sidebar-muted-foreground px-3 pt-3 pb-1">
                      {group.label}
                    </div>
                  )}
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => { setSheetOpen(false); setMenuFilter(''); }}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? 'bg-sidebar-primary/15 text-sidebar-primary font-medium'
                            : 'text-sidebar-muted-foreground hover:bg-sidebar-secondary hover:text-sidebar-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="border-t border-sidebar-border p-2">
              <div className="mb-2 flex items-center gap-2.5 px-3">
                <div className="h-8 w-8 shrink-0 rounded-full overflow-hidden bg-sidebar-secondary flex items-center justify-center">
                  {user.avatar ? (
                    <FileImagePreview
                      fileId={user.avatar.id}
                      mimeType={user.avatar.mimeType}
                      alt={user.name}
                      iconClassName="h-4 w-4 text-sidebar-muted-foreground"
                      imgClassName="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-sidebar-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</div>
                  <div className="truncate text-xs text-sidebar-muted-foreground">{user.email}</div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-muted-foreground hover:text-sidebar-foreground" onClick={() => { setSheetOpen(false); handleLogout(); }}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('logout')}
              </Button>
              <div className="mt-1">
                <LocaleSwitcher collapsed={false} />
              </div>
              <div className="mt-1">
                <ThemeSwitcher collapsed={false} />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop sidebar */}
        <aside
          className={`hidden md:flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ${
            collapsed ? 'w-16' : 'w-64'
          }`}
          style={{ visibility: mounted ? 'visible' : 'hidden' }}
        >
          <div className="flex h-14 items-center border-b border-sidebar-border px-4">
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

          {!collapsed && (
            <div className="px-3 pt-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sidebar-muted-foreground" />
                <input
                  type="text"
                  value={menuFilter}
                  onChange={(e) => setMenuFilter(e.target.value)}
                  placeholder={t('searchMenu')}
                  className="h-8 w-full rounded-md border-0 bg-sidebar-secondary pl-8 pr-3 text-xs text-sidebar-foreground placeholder:text-sidebar-muted-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-primary"
                />
              </div>
            </div>
          )}

          <nav className="flex-1 overflow-y-auto p-2">
            {collapsed
              ? navGroups.map((group, gi) => (
                  <div key={group.label || '_top'}>
                    {gi > 0 && <div className="my-1 border-b border-sidebar-border" />}
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname.startsWith(item.href);
                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger asChild>
                            <Link
                              href={item.href}
                              className={`flex items-center justify-center rounded-lg px-3 py-2 text-sm transition-colors ${
                                isActive
                                  ? 'bg-sidebar-primary/15 text-sidebar-primary font-medium'
                                  : 'text-sidebar-muted-foreground hover:bg-sidebar-secondary hover:text-sidebar-foreground'
                              }`}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))
              : filteredGroups.map((group) => (
                  <div key={group.label || '_top'}>
                    {group.label && (
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-sidebar-muted-foreground px-3 pt-3 pb-1">
                        {group.label}
                      </div>
                    )}
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuFilter('')}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                            isActive
                              ? 'bg-sidebar-primary/15 text-sidebar-primary font-medium'
                              : 'text-sidebar-muted-foreground hover:bg-sidebar-secondary hover:text-sidebar-foreground'
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                ))}
          </nav>

          <div className="border-t border-sidebar-border p-2">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mb-1 flex justify-center">
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-sidebar-secondary flex items-center justify-center">
                      {user.avatar ? (
                        <FileImagePreview
                          fileId={user.avatar.id}
                          mimeType={user.avatar.mimeType}
                          alt={user.name}
                          iconClassName="h-4 w-4 text-sidebar-muted-foreground"
                          imgClassName="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-sidebar-muted-foreground" />
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">{user.name}</TooltipContent>
              </Tooltip>
            ) : (
              <div className="mb-2 flex items-center gap-2.5 px-3">
                <div className="h-8 w-8 shrink-0 rounded-full overflow-hidden bg-sidebar-secondary flex items-center justify-center">
                  {user.avatar ? (
                    <FileImagePreview
                      fileId={user.avatar.id}
                      mimeType={user.avatar.mimeType}
                      alt={user.name}
                      iconClassName="h-4 w-4 text-sidebar-muted-foreground"
                      imgClassName="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-sidebar-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</div>
                  <div className="truncate text-xs text-sidebar-muted-foreground">{user.email}</div>
                </div>
              </div>
            )}
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-full text-sidebar-muted-foreground hover:text-sidebar-foreground" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{t('logout')}</TooltipContent>
              </Tooltip>
            ) : (
              <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-muted-foreground hover:text-sidebar-foreground" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('logout')}
              </Button>
            )}

            <div className="mt-1">
              <LocaleSwitcher collapsed={collapsed} />
            </div>

            <div className="mt-1">
              <ThemeSwitcher collapsed={collapsed} />
            </div>

            <div className="mt-1">
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-full text-sidebar-muted-foreground hover:text-sidebar-foreground" onClick={toggleCollapsed}>
                      <PanelLeftOpen className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{t('expandSidebar')}</TooltipContent>
                </Tooltip>
              ) : (
                <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-muted-foreground hover:text-sidebar-foreground" onClick={toggleCollapsed}>
                  <PanelLeftClose className="mr-2 h-4 w-4" />
                  {t('collapse')}
                </Button>
              )}
            </div>
          </div>
        </aside>
        <div className="flex flex-1 flex-col">
          <header className="hidden md:flex h-14 items-center border-b px-6">
            <div className="w-full max-w-md">
              <GlobalSearchInput />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
