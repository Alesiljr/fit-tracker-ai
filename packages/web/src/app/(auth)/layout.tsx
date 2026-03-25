export const dynamic = 'force-dynamic';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-600/5 via-transparent to-accent-500/5" />
      <div className="w-full max-w-md px-4 relative z-10">{children}</div>
    </div>
  );
}
