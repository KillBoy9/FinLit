import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useCategories } from '../lib/useCategories';
import { Transaction } from '../types';
import { TrendingUp, TrendingDown, AlertCircle, ArrowRight, WalletCards, CircleDollarSign, ReceiptText } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

const CHART_COLORS = ['#0F6E56', '#D85A30', '#954C41', '#5F5E5A', '#71A995', '#E69173', '#C4857D'];

function SkeletonCard() {
  return (
    <div className="bg-white p-5 rounded-2xl border border-[#e4e1da] animate-pulse shadow-sm">
      <div className="h-3 w-24 bg-[#dff0ea] rounded mb-3" />
      <div className="h-7 w-36 bg-[#eceae4] rounded mb-3" />
      <div className="h-2 w-full bg-[#e7f1ed] rounded-full" />
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const { categories } = useCategories();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Sort client-side — no composite index needed
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Transaction))
        .sort((a, b) => b.date.localeCompare(a.date));
      setTransactions(data);
      setLoading(false);
    }, (err) => {
      console.error('Transactions error:', err);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');
    const prevMonth = format(subMonths(now, 1), 'yyyy-MM');

    const thisMonthTxs = transactions.filter(t => t.date.startsWith(currentMonth));
    const prevMonthTxs = transactions.filter(t => t.date.startsWith(prevMonth));

    let income = 0, expense = 0, prevIncome = 0, prevExpense = 0;
    const expenseByCategory: Record<string, number> = {};

    thisMonthTxs.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else {
        expense += t.amount;
        expenseByCategory[t.categoryId] = (expenseByCategory[t.categoryId] || 0) + t.amount;
      }
    });
    prevMonthTxs.forEach(t => {
      if (t.type === 'income') prevIncome += t.amount;
      else prevExpense += t.amount;
    });

    // Top expense category
    let topCatId = '';
    let maxExp = 0;
    Object.entries(expenseByCategory).forEach(([id, amt]) => {
      if (amt > maxExp) { maxExp = amt; topCatId = id; }
    });
    const topCat = categories.find(c => c.id === topCatId);

    // Pie chart data
    const chartData = Object.entries(expenseByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([catId, amount]) => ({
        name: categories.find(c => c.id === catId)?.name || 'Lainnya',
        value: amount,
      }));

    // Month-over-month delta
    const expenseDelta = prevExpense > 0 ? ((expense - prevExpense) / prevExpense) * 100 : 0;

    return {
      income,
      expense,
      balance: income - expense,
      expenseByCategory,
      topExpenseCategory: topCat?.name ?? 'N/A',
      topExpenseAmount: maxExp,
      chartData,
      expenseDelta,
      recent: transactions.slice(0, 6),
    };
  }, [transactions, categories]);

  const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 w-full pb-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1d2421]">
            Halo, {user?.displayName?.split(' ')[0] || 'Sobat'} 👋
          </h2>
          <p className="text-[#777670] text-sm mt-0.5">
            {format(new Date(), 'EEEE, d MMMM yyyy', { locale: idLocale })}
          </p>
        </div>
        <div className="bg-[#e7f4ef] px-3 py-1.5 rounded-full border border-[#b8d8cd] flex items-center gap-2">
          <div className="w-2 h-2 bg-[#0f6e56] rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-[#0f6e56]">AI aktif</span>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Balance */}
          <div className={cn(
            "p-5 rounded-2xl border flex flex-col justify-between shadow-sm min-h-40",
            stats.balance >= 0
              ? "bg-[#e2f4ef] border-[#acd3c7]"
              : "bg-[#f5e6e2] border-[#d9aaa2]"
          )}>
            <div className="flex items-start justify-between"><p className="text-xs font-semibold text-[#5f5e5a] uppercase tracking-wider">Saldo Bulan Ini</p><WalletCards className={cn('w-5 h-5', stats.balance >= 0 ? 'text-[#0f6e56]' : 'text-[#954c41]')} /></div>
            <h2 className={cn("text-2xl font-bold mt-2 mb-3", stats.balance >= 0 ? "text-[#075b46]" : "text-[#954c41]")}>
              {formatRp(stats.balance)}
            </h2>
            <div className={cn("text-[11px] font-semibold flex items-center gap-1", stats.balance >= 0 ? "text-[#0f6e56]" : "text-[#954c41]")}>
              {stats.balance >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {stats.balance >= 0 ? 'Surplus bulan ini' : 'Defisit bulan ini'}
            </div>
          </div>

          {/* Income */}
          <div className="bg-white p-5 rounded-2xl border border-[#e4e1da] flex flex-col justify-between shadow-sm min-h-40">
            <div className="flex items-start justify-between"><p className="text-xs font-semibold text-[#5f5e5a] uppercase tracking-wider">Pemasukan</p><CircleDollarSign className="w-5 h-5 text-[#0f6e56]" /></div>
            <h2 className="text-2xl font-bold text-[#0f6e56] mt-2 mb-3">{formatRp(stats.income)}</h2>
            <div className="h-1.5 w-full bg-[#e8e7e1] rounded-full overflow-hidden">
              <div className="h-full bg-[#0f6e56] rounded-full" style={{ width: '100%' }} />
            </div>
          </div>

          {/* Expense */}
          <div className="bg-white p-5 rounded-2xl border border-[#e4e1da] flex flex-col justify-between shadow-sm min-h-40">
            <div className="flex items-start justify-between"><p className="text-xs font-semibold text-[#5f5e5a] uppercase tracking-wider">Pengeluaran</p><ReceiptText className="w-5 h-5 text-[#d85a30]" /></div>
            <h2 className="text-2xl font-bold text-[#954c41] mt-2 mb-1">{formatRp(stats.expense)}</h2>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[#777670]">
                {stats.income > 0 ? `${Math.round((stats.expense / stats.income) * 100)}% dari pemasukan` : '—'}
              </span>
              {stats.expenseDelta !== 0 && (
                <span className={cn("text-[11px] font-semibold", stats.expenseDelta > 0 ? "text-[#d85a30]" : "text-[#0f6e56]")}>
                  {stats.expenseDelta > 0 ? '+' : ''}{stats.expenseDelta.toFixed(0)}% vs bln lalu
                </span>
              )}
            </div>
            <div className="h-1.5 w-full bg-[#e8e7e1] rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", stats.income > 0 && stats.expense > stats.income ? "bg-[#954c41]" : "bg-[#d85a30]")}
                style={{ width: `${stats.income > 0 ? Math.min((stats.expense / stats.income) * 100, 100) : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e4e1da] flex flex-col overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#eceae4] flex justify-between items-center">
            <div><h3 className="text-base font-bold text-[#1d2421]">Transaksi Terakhir</h3><p className="text-xs text-[#777670] mt-0.5">Aktivitas keuangan terbaru kamu</p></div>
            <Link to="/app/transactions" className="text-xs font-semibold text-[#0f6e56] hover:text-[#075b46] flex items-center gap-1 transition-colors">
              Lihat semua <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-5 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 bg-[#f4f2ed] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : stats.recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <TrendingUp className="w-10 h-10 text-[#b2b0a9] mb-3" />
                <p className="text-[#5f5e5a] text-sm font-medium">Belum ada transaksi</p>
                <p className="text-[#92908a] text-xs mt-1">Tambahkan transaksi pertamamu</p>
                <Link to="/app/transactions" className="mt-4 text-xs text-[#0f6e56] hover:text-[#075b46] underline">
                  Tambah sekarang
                </Link>
              </div>
            ) : (
              <div className="p-3 space-y-1.5">
                {stats.recent.map((tx) => {
                  const cat = categories.find(c => c.id === tx.categoryId);
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#f7f6f2] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                          tx.type === 'income' ? "bg-[#e2f4ef] text-[#0f6e56]" : "bg-[#f5e6e2] text-[#954c41]"
                        )}>
                          {tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#252b28] truncate">
                            {cat?.name || 'Lainnya'}{tx.note ? ` · ${tx.note}` : ''}
                          </p>
                          <p className="text-[11px] text-[#8b8983]">
                            {format(parseISO(tx.date.slice(0, 10)), 'd MMM yyyy')}
                          </p>
                        </div>
                      </div>
                      <p className={cn("text-sm font-bold flex-shrink-0 ml-4", tx.type === 'income' ? "text-[#0f6e56]" : "text-[#954c41]")}>
                        {tx.type === 'income' ? '+' : '-'}{formatRp(tx.amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4">
          {/* Top Expense */}
          <div className="bg-white rounded-2xl border border-[#e4e1da] p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5f5e5a] mb-4">Pengeluaran Terbesar</h3>
            {loading ? (
              <div className="h-16 bg-[#f4f2ed] rounded-xl animate-pulse" />
            ) : stats.topExpenseCategory === 'N/A' ? (
              <p className="text-[#777670] text-sm">Belum ada data pengeluaran</p>
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#fff0e9] rounded-xl border border-[#f2c0ac]">
                  <AlertCircle className="w-6 h-6 text-[#d85a30]" />
                </div>
                <div>
                  <p className="text-base font-bold text-[#252b28]">{stats.topExpenseCategory}</p>
                  <p className="text-xs text-[#777670] mt-0.5">{formatRp(stats.topExpenseAmount)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Expense Pie Chart */}
          <div className="bg-white rounded-2xl border border-[#e4e1da] p-5 flex-1 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5f5e5a] mb-4">Komposisi Pengeluaran</h3>
            {loading ? (
              <div className="h-40 bg-[#f4f2ed] rounded-xl animate-pulse" />
            ) : stats.chartData.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-[#92908a] text-sm text-center">Belum ada data<br />pengeluaran bulan ini</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={stats.chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.chartData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatRp(value), 'Pengeluaran']}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e4e1da',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#1d2421',
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ color: '#5f5e5a', fontSize: '11px' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
