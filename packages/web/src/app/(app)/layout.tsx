'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '@/components/auth/logout-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Home, ClipboardPen, MessageCircle, BarChart3, User } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/log', label: 'Log', icon: ClipboardPen },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/progress', label: 'Progresso', icon: BarChart3 },
  { href: '/profile', label: 'Perfil', icon: User },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50 px-4 py-3 flex justify-between items-center">
        <Link href="/dashboard">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-gradient">FitTracker</span>
            <span className="ml-1.5 text-xs font-semibold bg-primary-600 text-white px-1.5 py-0.5 rounded-md align-middle">AI</span>
          </h1>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <main className="pb-20 animate-fade-in">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border/50 px-4 py-2 z-50">
        <div className="flex justify-around max-w-md mx-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname?.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-primary-600 dark:bg-primary-400" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
