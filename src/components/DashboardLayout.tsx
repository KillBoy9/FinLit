import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ReceiptText, PieChart, Bot, Settings, LogOut, Wallet, Bell, Search, ChevronRight } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { cn } from '../lib/utils';

// Page meta — judul & subtitle per route
const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/app':               { title: 'Dashboard Overview',    subtitle: 'Ringkasan keuangan bulan ini' },
  '/app/transactions':  { title: 'Transaksi Saya',        subtitle: 'Kelola semua pemasukan dan pengeluaranmu' },
  '/app/budgets':       { title: 'Manajemen Anggaran',    subtitle: 'Pantau pengeluaran agar tetap sehat finansial' },
  '/app/ai-assistant':  { title: 'AI Financial Assistant', subtitle: 'Powered by Gemini 2.5 Flash' },
  '/app/settings':      { title: 'Settings',              subtitle: 'Kelola preferensi dan informasi akunmu' },
};

export function DashboardLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Dashboard',    href: '/app',               icon: LayoutDashboard },
    { name: 'Transaksi',    href: '/app/transactions',  icon: ReceiptText },
    { name: 'Anggaran',     href: '/app/budgets',       icon: PieChart },
    { name: 'AI Assistant', href: '/app/ai-assistant',  icon: Bot },
  ];

  const isActive = (href: string) =>
    href === '/app' ? location.pathname === '/app' : location.pathname.startsWith(href);

  // Find current page meta
  const currentPath = Object.keys(PAGE_META)
    .sort((a, b) => b.length - a.length)
    .find(p => location.pathname === p || location.pathname.startsWith(p + '/'));
  const meta = PAGE_META[currentPath ?? '/app'];

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="h-screen w-full bg-[#f8f7f4] text-[#1d2421] flex font-sans overflow-hidden">

      {/* ═══ SIDEBAR ════════════════════════════════════════════ */}
      <aside className="flex flex-col w-16 sm:w-[200px] flex-shrink-0 bg-white border-r border-[#e4e1da] z-20">

        {/* Logo */}
        <div className="flex items-center gap-3 px-3 sm:px-5 h-16 border-b border-[#e4e1da] flex-shrink-0">
          <div className="w-9 h-9 bg-[#0f6e56] rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
            <Wallet className="h-4 w-4 text-white" />
          </div>
          <div className="hidden sm:block overflow-hidden">
            <p className="text-sm font-bold text-[#0f6e56] leading-tight">FinLit</p>
            <p className="text-[9px] font-bold tracking-[0.15em] text-[#8b8983] uppercase leading-tight">Finance App</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-2 sm:p-3 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                title={item.name}
                className={cn(
                  'flex items-center gap-3 px-2 sm:px-3 py-2.5 rounded-xl transition-all duration-150 group',
                  active
                    ? 'bg-[#dff3ed] text-[#0f6e56] font-semibold'
                    : 'text-[#5f5e5a] hover:bg-[#f2f0eb] hover:text-[#1d2421]'
                )}
              >
                <item.icon className={cn('h-5 w-5 flex-shrink-0', active ? 'text-[#0f6e56]' : 'text-[#96938c] group-hover:text-[#1d2421]')} />
                <span className="hidden sm:block text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-2 sm:p-3 border-t border-[#e4e1da] space-y-0.5 flex-shrink-0">
          <Link
            to="/app/settings"
            title="Settings"
            className={cn(
              'flex items-center gap-3 px-2 sm:px-3 py-2.5 rounded-xl transition-all duration-150 group',
              location.pathname.startsWith('/app/settings')
                ? 'bg-[#dff3ed] text-[#0f6e56] font-semibold'
                : 'text-[#5f5e5a] hover:bg-[#f2f0eb] hover:text-[#1d2421]'
            )}
          >
            <Settings className="h-5 w-5 flex-shrink-0 text-[#96938c] group-hover:text-[#1d2421]" />
            <span className="hidden sm:block text-sm">Settings</span>
          </Link>
          <button
            onClick={() => auth.signOut()}
            title="Sign Out"
            className="w-full flex items-center gap-3 px-2 sm:px-3 py-2.5 rounded-xl text-[#954c41] hover:bg-[#f5e6e2] transition-all duration-150 group"
          >
            <LogOut className="h-5 w-5 flex-shrink-0 text-[#954c41]" />
            <span className="hidden sm:block text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ═══ RIGHT SIDE (topbar + content) ══════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── TOPBAR ─────────────────────────────────────────── */}
        <header className="flex-shrink-0 h-16 bg-white border-b border-[#e4e1da] flex items-center px-4 sm:px-6 gap-4 z-10">

          {/* Page title (left) */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-[#1d2421] truncate">{meta.title}</h1>
          </div>

          {/* Search bar (center, hidden on small) */}
          <div className="hidden md:flex items-center gap-2 bg-[#f4f2ed] border border-[#e4e1da] rounded-xl px-3 py-2 w-56 lg:w-72 flex-shrink-0">
            <Search className="w-4 h-4 text-[#96938c] flex-shrink-0" />
            <input
              type="text"
              placeholder="Cari transaksi..."
              className="bg-transparent text-sm text-[#252b28] placeholder-[#96938c] outline-none w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate('/app/transactions');
              }}
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Notification bell */}
            <button className="relative w-9 h-9 rounded-xl border border-[#e4e1da] bg-white hover:bg-[#f4f2ed] flex items-center justify-center transition-colors">
              <Bell className="w-4 h-4 text-[#5f5e5a]" />
            </button>

            {/* User avatar + name */}
            <button
              onClick={() => navigate('/app/settings')}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl border border-[#e4e1da] bg-white hover:bg-[#f4f2ed] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[#0f6e56] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {initial}
              </div>
              <span className="hidden sm:block text-sm font-medium text-[#252b28] max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronRight className="hidden sm:block w-3.5 h-3.5 text-[#96938c]" />
            </button>
          </div>
        </header>

        {/* ── PAGE CONTENT ───────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8f7f4]">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
