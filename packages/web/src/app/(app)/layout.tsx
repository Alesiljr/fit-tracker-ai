import Link from 'next/link';
import { LogoutButton } from '@/components/auth/logout-button';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-neutral-200 px-4 py-3 flex justify-between items-center">
        <Link href="/dashboard">
          <h1 className="text-lg font-semibold text-primary-600">FitTracker AI</h1>
        </Link>
        <LogoutButton />
      </header>
      <main className="pb-20">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-4 py-2 z-50">
        <div className="flex justify-around max-w-md mx-auto">
          <Link href="/dashboard" className="flex flex-col items-center text-neutral-500 hover:text-primary-500">
            <span className="text-lg">🏠</span>
            <span className="text-xs">Home</span>
          </Link>
          <Link href="/log" className="flex flex-col items-center text-neutral-500 hover:text-primary-500">
            <span className="text-lg">📝</span>
            <span className="text-xs">Log</span>
          </Link>
          <Link href="/chat" className="flex flex-col items-center text-neutral-500 hover:text-primary-500">
            <span className="text-lg">💬</span>
            <span className="text-xs">Chat</span>
          </Link>
          <Link href="/progress" className="flex flex-col items-center text-neutral-500 hover:text-primary-500">
            <span className="text-lg">📊</span>
            <span className="text-xs">Progresso</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center text-neutral-500 hover:text-primary-500">
            <span className="text-lg">👤</span>
            <span className="text-xs">Perfil</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
