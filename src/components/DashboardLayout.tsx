import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ReceiptText, PieChart, Bot, Settings,
  LogOut, Wallet, Bell, Search, ChevronRight, BarChart2, X, AlertTriangle,
  Bookmark, Trash2
} from 'lucide-react';
import { collection, doc, query, setDoc, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useCategories } from '../lib/useCategories';
import { Budget, Transaction } from '../types';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

const PAGE_META: Record<string, string> = {
  '/app':               'Dashboard Overview',
  '/app/transactions':  'Transaksi Saya',
  '/app/budgets':       'Manajemen Anggaran',
  '/app/analytics':     'Analytics & Laporan',
  '/app/ai-assistant':  'AI Financial Assistant',
  '/app/settings':      'Settings',
};

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'danger';
}

interface NotificationState extends Notification {
  userId: string;
  status: 'saved' | 'dismissed';
}

export function DashboardLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const { categories } = useCategories();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [generatedNotifications, setGeneratedNotifications] = useState<Notification[]>([]);
  const [notificationStates, setNotificationStates] = useState<Record<string, NotificationState>>({});
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'active' | 'saved'>('active');
  const [notificationFeedback, setNotificationFeedback] = useState('');
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const navigation = [
    { name: 'Dashboard',    href: '/app',               icon: LayoutDashboard },
    { name: 'Transaksi',    href: '/app/transactions',  icon: ReceiptText },
    { name: 'Anggaran',     href: '/app/budgets',       icon: PieChart },
    { name: 'Analytics',    href: '/app/analytics',     icon: BarChart2 },
    { name: 'AI Assistant', href: '/app/ai-assistant',  icon: Bot },
  ];

  const isActive = (href: string) =>
    href === '/app' ? location.pathname === '/app' : location.pathname.startsWith(href);

  const currentPath = Object.keys(PAGE_META)
    .sort((a, b) => b.length - a.length)
    .find(p => location.pathname === p || location.pathname.startsWith(p + '/'));
  const pageTitle = PAGE_META[currentPath ?? '/app'];

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();
  const notifications = generatedNotifications.filter(notification => !notificationStates[notification.id]);
  const savedNotifications = Object.keys(notificationStates)
    .map(id => notificationStates[id])
    .filter(notification => notification.status === 'saved');
  const visibleNotifications = notificationTab === 'active' ? notifications : savedNotifications;

  // ── Saved/dismissed notification state ───────────────────────
  useEffect(() => {
    if (!user) {
      setNotificationStates({});
      return;
    }

    return onSnapshot(
      doc(db, 'profiles', user.uid),
      snapshot => {
        const states = snapshot.data()?.notificationStates;
        setNotificationStates(states && typeof states === 'object' ? states as Record<string, NotificationState> : {});
      },
      error => {
        console.error('Notification states error:', error);
        setNotificationFeedback('Status notifikasi gagal dimuat. Coba refresh halaman.');
      }
    );
  }, [user]);

  // ── Budget notifications ────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const currentMonth = format(new Date(), 'yyyy-MM');

    const bq = query(collection(db, 'budgets'), where('userId', '==', user.uid), where('month', '==', currentMonth));
    const tq = query(collection(db, 'transactions'), where('userId', '==', user.uid));

    let budgets: Budget[] = [];
    let transactions: Transaction[] = [];

    const compute = () => {
      const thisMonthExp = transactions.filter(t => t.date.startsWith(currentMonth) && t.type === 'expense');
      const notifs: Notification[] = [];
      budgets.forEach(b => {
        const spent = thisMonthExp.filter(t => t.categoryId === b.categoryId).reduce((s, t) => s + t.amount, 0);
        const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
        const catName = categories.find(c => c.id === b.categoryId)?.name ?? 'Kategori';
        if (pct >= 100) {
          notifs.push({ id: b.id + '_over', title: `Budget ${catName} Terlampaui!`, message: `Pengeluaran sudah melebihi limit Rp ${b.amount.toLocaleString('id-ID')}`, type: 'danger' });
        } else if (pct >= 80) {
          notifs.push({ id: b.id + '_warn', title: `Budget ${catName} Hampir Habis`, message: `Sudah terpakai ${Math.round(pct)}% dari Rp ${b.amount.toLocaleString('id-ID')}`, type: 'warning' });
        }
      });
      setGeneratedNotifications(notifs);
    };

    const unsubB = onSnapshot(bq, snap => { budgets = snap.docs.map(d => ({ id: d.id, ...d.data() } as Budget)); compute(); });
    const unsubT = onSnapshot(tq, snap => { transactions = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)); compute(); });
    return () => { unsubB(); unsubT(); };
  }, [user, categories]);

  const updateNotificationStatus = async (notification: Notification, status: NotificationState['status']) => {
    if (!user) return;
    const nextStates = {
      ...notificationStates,
      [notification.id]: {
        ...notification,
        userId: user.uid,
        status,
      },
    };
    setNotificationStates(nextStates);
    setNotificationFeedback(status === 'saved' ? 'Notifikasi disimpan.' : 'Notifikasi dihapus.');
    try {
      await setDoc(doc(db, 'profiles', user.uid), {
        notificationStates: nextStates,
      }, { merge: true });
    } catch (error) {
      console.error('Unable to update notification:', error);
      setNotificationStates(notificationStates);
      setNotificationFeedback('Gagal menyimpan perubahan. Coba lagi.');
    }
  };

  // Close notification panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Search: navigate to transactions with query
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/app/transactions?q=${encodeURIComponent(searchQuery.trim())}`);
      searchRef.current?.blur();
    }
    if (e.key === 'Escape') { setSearchQuery(''); searchRef.current?.blur(); }
  };

  // Pass search query to Transactions page via URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    if (location.pathname === '/app/transactions' && q !== searchQuery) {
      // sync only on initial load
    }
  }, [location]);

  const handleSignOut = async () => {
    setShowSignOutConfirm(false);
    await auth.signOut();
  };

  return (
    <div className="h-screen w-full bg-[#f8f7f4] text-[#1d2421] flex font-sans overflow-hidden">

      {/* ═══ SIDEBAR ════════════════════════════════════════════ */}
      <aside className="flex flex-col w-16 sm:w-[200px] flex-shrink-0 bg-white border-r border-[#e4e1da] z-20">
        <div className="flex items-center gap-3 px-3 sm:px-5 h-16 border-b border-[#e4e1da] flex-shrink-0">
          <div className="w-9 h-9 bg-[#0f6e56] rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
            <Wallet className="h-4 w-4 text-white" />
          </div>
          <div className="hidden sm:block overflow-hidden">
            <p className="text-sm font-bold text-[#0f6e56] leading-tight">FinLit</p>
            <p className="text-[9px] font-bold tracking-[0.15em] text-[#8b8983] uppercase leading-tight">Finance App</p>
          </div>
        </div>

        <nav className="flex-1 p-2 sm:p-3 space-y-0.5 overflow-y-auto">
          {navigation.map(item => {
            const active = isActive(item.href);
            return (
              <Link key={item.name} to={item.href} title={item.name}
                className={cn('flex items-center gap-3 px-2 sm:px-3 py-2.5 rounded-xl transition-all duration-150 group',
                  active ? 'bg-[#dff3ed] text-[#0f6e56] font-semibold' : 'text-[#5f5e5a] hover:bg-[#f2f0eb] hover:text-[#1d2421]')}>
                <item.icon className={cn('h-5 w-5 flex-shrink-0', active ? 'text-[#0f6e56]' : 'text-[#96938c] group-hover:text-[#1d2421]')} />
                <span className="hidden sm:block text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-2 sm:p-3 border-t border-[#e4e1da] space-y-0.5 flex-shrink-0">
          <Link to="/app/settings" title="Settings"
            className={cn('flex items-center gap-3 px-2 sm:px-3 py-2.5 rounded-xl transition-all duration-150 group',
              location.pathname.startsWith('/app/settings') ? 'bg-[#dff3ed] text-[#0f6e56] font-semibold' : 'text-[#5f5e5a] hover:bg-[#f2f0eb] hover:text-[#1d2421]')}>
            <Settings className="h-5 w-5 flex-shrink-0 text-[#96938c] group-hover:text-[#1d2421]" />
            <span className="hidden sm:block text-sm">Settings</span>
          </Link>
          <button onClick={() => setShowSignOutConfirm(true)} title="Sign Out"
            className="w-full flex items-center gap-3 px-2 sm:px-3 py-2.5 rounded-xl text-[#954c41] hover:bg-[#f5e6e2] transition-all duration-150">
            <LogOut className="h-5 w-5 flex-shrink-0 text-[#954c41]" />
            <span className="hidden sm:block text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ═══ RIGHT SIDE ══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── TOPBAR ──────────────────────────────────────────── */}
        <header className="flex-shrink-0 h-16 bg-white border-b border-[#e4e1da] flex items-center px-4 sm:px-6 gap-4 z-10">
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-[#1d2421] truncate">{pageTitle}</h1>
          </div>

          {/* Search */}
          <div className={cn('hidden md:flex items-center gap-2 bg-[#f4f2ed] border rounded-xl px-3 py-2 w-56 lg:w-72 flex-shrink-0 transition-colors',
            searchFocused ? 'border-[#0f6e56] bg-white' : 'border-[#e4e1da]')}>
            <Search className="w-4 h-4 text-[#96938c] flex-shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={handleSearch}
              placeholder="Cari transaksi... (Enter)"
              className="bg-transparent text-sm text-[#252b28] placeholder-[#96938c] outline-none w-full"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[#96938c] hover:text-[#1d2421]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setNotificationTab('active');
                }}
                className="relative w-9 h-9 rounded-xl border border-[#e4e1da] bg-white hover:bg-[#f4f2ed] flex items-center justify-center transition-colors">
                <Bell className="w-4 h-4 text-[#5f5e5a]" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#b11818] text-white text-[9px] font-bold flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-11 w-80 bg-white border border-[#e4e1da] rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#e4e1da] flex items-center justify-between">
                    <span className="text-sm font-bold text-[#1d2421]">Notifikasi</span>
                    <button onClick={() => setShowNotifications(false)} className="text-[#96938c] hover:text-[#1d2421]" aria-label="Tutup notifikasi">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-1 px-3 pt-3">
                    <button onClick={() => setNotificationTab('active')}
                      className={cn('flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors', notificationTab === 'active' ? 'bg-[#dff3ed] text-[#0f6e56]' : 'text-[#777670] hover:bg-[#f4f2ed]')}>
                      Aktif ({notifications.length})
                    </button>
                    <button onClick={() => setNotificationTab('saved')}
                      className={cn('flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors', notificationTab === 'saved' ? 'bg-[#dff3ed] text-[#0f6e56]' : 'text-[#777670] hover:bg-[#f4f2ed]')}>
                      Tersimpan ({savedNotifications.length})
                    </button>
                  </div>
                  {notificationFeedback && (
                    <p className="mx-3 mt-2 rounded-lg bg-[#e2f4ef] px-2.5 py-2 text-[11px] font-medium text-[#0f6e56]">
                      {notificationFeedback}
                    </p>
                  )}
                  {visibleNotifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-[#777670]">
                      {notificationTab === 'active' ? 'Tidak ada notifikasi aktif' : 'Belum ada notifikasi tersimpan'}
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto custom-scrollbar">
                      {visibleNotifications.map(n => (
                        <div key={n.id} className={cn('px-4 py-3 border-b border-[#f0eee8] last:border-0 flex gap-3',
                          n.type === 'danger' ? 'bg-[#fff8f7]' : 'bg-[#fffdf5]')}>
                          <AlertTriangle className={cn('w-4 h-4 mt-0.5 flex-shrink-0', n.type === 'danger' ? 'text-[#b11818]' : 'text-[#c47205]')} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[#1d2421]">{n.title}</p>
                            <p className="text-xs text-[#777670] mt-0.5">{n.message}</p>
                            <div className="flex gap-2 mt-2">
                              {notificationTab === 'active' && (
                                <button onClick={() => updateNotificationStatus(n, 'saved')}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0f6e56] hover:text-[#075b46]">
                                  <Bookmark className="w-3 h-3" /> Simpan
                                </button>
                              )}
                              <button onClick={() => updateNotificationStatus(n, 'dismissed')}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#954c41] hover:text-[#7c3e35]">
                                <Trash2 className="w-3 h-3" /> Hapus
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Avatar */}
            <button onClick={() => navigate('/app/settings')}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl border border-[#e4e1da] bg-white hover:bg-[#f4f2ed] transition-colors">
              <div className="w-7 h-7 rounded-full bg-[#0f6e56] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                {user?.photoURL
                  ? <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" />
                  : initial}
              </div>
              <span className="hidden sm:block text-sm font-medium text-[#252b28] max-w-[120px] truncate">{displayName}</span>
              <ChevronRight className="hidden sm:block w-3.5 h-3.5 text-[#96938c]" />
            </button>
          </div>
        </header>

        {/* ── CONTENT ─────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8f7f4]">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet context={{ searchQuery }} />
          </div>
        </main>
      </div>

      {/* ── SIGN OUT CONFIRM MODAL ───────────────────────────── */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#e4e1da] shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#f5e6e2] flex items-center justify-center">
                <LogOut className="w-5 h-5 text-[#954c41]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1d2421]">Keluar dari akun?</h3>
                <p className="text-sm text-[#777670]">Kamu perlu login ulang setelahnya.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#e4e1da] text-sm font-semibold text-[#5f5e5a] hover:bg-[#f4f2ed] transition-colors">
                Batal
              </button>
              <button onClick={handleSignOut}
                className="flex-1 py-2.5 rounded-xl bg-[#954c41] text-sm font-bold text-white hover:bg-[#7c3e35] transition-colors">
                Ya, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
