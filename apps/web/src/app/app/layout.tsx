'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Users, Bot, LogOut } from 'lucide-react';
import { getMe, logout } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import type { UserResponse } from '@marketlum/shared';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserResponse | null>(null);

  useEffect(() => {
    getMe().then((u) => {
      if (!u) {
        router.push('/login');
      } else {
        setUser(u);
      }
    });
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const navItems = [
    { href: '/app/users', label: 'Users', icon: Users },
    { href: '/app/agents', label: 'Agents', icon: Bot },
  ];

  if (!user) return null;

  return (
    <div className="flex h-screen">
      <aside className="flex w-64 flex-col border-r bg-card">
        <div className="flex h-14 items-center gap-2.5 border-b px-4">
          <Image src="/logo.png" alt="Marketlum" width={28} height={28} className="rounded" />
          <Link href="/app" className="bg-gradient-to-r from-green-400 via-teal-400 to-purple-500 bg-clip-text text-lg font-bold text-transparent">
            Marketlum
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4">
          <div className="mb-2 truncate text-sm text-muted-foreground">{user.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
