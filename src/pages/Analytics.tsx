import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useCategories } from '../lib/useCategories';
import { Transaction } from '../types';
import { format, subMonths, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { cn } from '../lib/utils';
import { TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';

const COLORS = ['#0f6e56', '#d85a30', '#c47205', '#4c9300', '#954c41', '#5f5e5a', '#71a995', '#e69173'];

const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
const formatRpShort = (n: number) => {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n}`;
};

function SkeletonBlock({ h = 'h-48', className = '' }: { h?: string; className?: string; [key: string]: unknown }) {
  return <div className={`${h} ${className} bg-[#f0eee8] rounded-2xl animate-pulse`} />;
}

export function Analytics() {
  const { user } = useAuth();
  const { categories } = useCategories();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Transaction))
        .sort((a, b) => b.date.localeCompare(a.date));
      setTransactions(data);
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return unsub;
  }, [user]);

  // Month options: last 12 months
  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(new Date(), i);
      return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: idLocale }) };
    });
  }, []);

  // 6-month trend data for bar/line chart
  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      const m = format(d, 'yyyy-MM');
      const monthTxs = transactions.filter(t => t.date.startsWith(m));
      const income = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return {
        bulan: format(d, 'MMM', { locale: idLocale }),
        Pemasukan: income,
        Pengeluaran: expense,
        Saldo: income - expense,
      };
    });
  }, [transactions]);

  // Selected month stats
  const monthStats = useMemo(() => {
    const txs = transactions.filter(t => t.date.startsWith(selectedMonth));
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // Expense by category
    const expByCat: Record<string, number> = {};
    txs.filter(t => t.type === 'expense').forEach(t => {
      expByCat[t.categoryId] = (expByCat[t.categoryId] || 0) + t.amount;
    });

    const pieData = Object.entries(expByCat)
      .sort((a, b) => b[1] - a[1])
      .map(([catId, value]) => ({
        name: categories.find(c => c.id === catId)?.name ?? 'Lainnya',
        value,
      }));

    // Daily spending in selected month
    const dailyMap: Record<string, number> = {};
    txs.filter(t => t.type === 'expense').forEach(t => {
      const day = t.date.slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + t.amount;
    });
    const dailyData = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        tanggal: format(parseISO(date), 'd MMM'),
        Pengeluaran: amount,
      }));

    // Category breakdown table
    const catBreakdown = Object.entries(expByCat)
      .sort((a, b) => b[1] - a[1])
      .map(([catId, amount]) => ({
        name: categories.find(c => c.id === catId)?.name ?? 'Lainnya',
        amount,
        pct: expense > 0 ? (amount / expense) * 100 : 0,
      }));

    return { income, expense, balance: income - expense, pieData, dailyData, catBreakdown, txCount: txs.length };
  }, [transactions, selectedMonth, categories]);

  const tooltipStyle = {
    backgroundColor: '#fff',
    border: '1px solid #e4e1da',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#1d2421',
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 w-full pb-6">
      {/* Month selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#0f6e56] uppercase mb-0.5">Laporan Keuangan</p>
          <p className="text-[#777670] text-sm">Analisis tren dan distribusi pengeluaranmu</p>
        </div>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="rounded-xl border border-[#dedbd4] bg-white text-[#252b28] text-sm font-semibold px-4 py-2.5 focus:outline-none focus:border-[#0f6e56] shadow-sm"
        >
          {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonBlock key={i} h="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-[#e4e1da] p-5 shadow-sm">
            <p className="text-xs font-semibold text-[#777670] uppercase tracking-wider">Pemasukan</p>
            <p className="text-xl font-bold text-[#0f6e56] mt-2">{formatRp(monthStats.income)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#e4e1da] p-5 shadow-sm">
            <p className="text-xs font-semibold text-[#777670] uppercase tracking-wider">Pengeluaran</p>
            <p className="text-xl font-bold text-[#954c41] mt-2">{formatRp(monthStats.expense)}</p>
          </div>
          <div className={cn("rounded-2xl border p-5 shadow-sm", monthStats.balance >= 0 ? "bg-[#e2f4ef] border-[#acd3c7]" : "bg-[#f5e6e2] border-[#d9aaa2]")}>
            <p className="text-xs font-semibold text-[#777670] uppercase tracking-wider">Saldo</p>
            <p className={cn("text-xl font-bold mt-2", monthStats.balance >= 0 ? "text-[#075b46]" : "text-[#954c41]")}>
              {formatRp(monthStats.balance)}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-[#e4e1da] p-5 shadow-sm">
            <p className="text-xs font-semibold text-[#777670] uppercase tracking-wider">Transaksi</p>
            <p className="text-xl font-bold text-[#1d2421] mt-2">{monthStats.txCount} transaksi</p>
          </div>
        </div>
      )}

      {/* 6-month trend */}
      <div className="bg-white rounded-2xl border border-[#e4e1da] p-6 shadow-sm">
        <h3 className="text-sm font-bold text-[#1d2421] mb-1">Tren 6 Bulan Terakhir</h3>
        <p className="text-xs text-[#777670] mb-5">Perbandingan pemasukan dan pengeluaran</p>
        {loading ? <SkeletonBlock h="h-56" /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trendData} barCategoryGap="30%" barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0eee8" vertical={false} />
              <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#777670' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatRpShort} tick={{ fontSize: 10, fill: '#777670' }} axisLine={false} tickLine={false} width={72} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatRp(v)} />
              <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: '#5f5e5a' }}>{v}</span>} />
              <Bar dataKey="Pemasukan" fill="#0f6e56" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Pengeluaran" fill="#d85a30" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart — expense distribution */}
        <div className="bg-white rounded-2xl border border-[#e4e1da] p-6 shadow-sm">
          <h3 className="text-sm font-bold text-[#1d2421] mb-1">Distribusi Pengeluaran</h3>
          <p className="text-xs text-[#777670] mb-4">Per kategori bulan {monthOptions.find(o => o.value === selectedMonth)?.label}</p>
          {loading ? <SkeletonBlock h="h-52" /> : monthStats.pieData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-[#92908a]">
              <BarChart2 className="w-10 h-10 mb-2 text-[#d9d6cf]" />
              <p className="text-sm">Belum ada data pengeluaran</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={monthStats.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {monthStats.pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatRp(v), 'Pengeluaran']} />
                <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: '#5f5e5a' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category breakdown table */}
        <div className="bg-white rounded-2xl border border-[#e4e1da] p-6 shadow-sm">
          <h3 className="text-sm font-bold text-[#1d2421] mb-1">Rincian per Kategori</h3>
          <p className="text-xs text-[#777670] mb-4">Pengeluaran terbesar bulan ini</p>
          {loading ? <SkeletonBlock h="h-52" /> : monthStats.catBreakdown.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-[#92908a]">
              <TrendingDown className="w-10 h-10 mb-2 text-[#d9d6cf]" />
              <p className="text-sm">Belum ada pengeluaran</p>
            </div>
          ) : (
            <div className="space-y-3">
              {monthStats.catBreakdown.slice(0, 6).map((cat, i) => (
                <div key={cat.name}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm font-medium text-[#252b28]">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#777670]">{cat.pct.toFixed(1)}%</span>
                      <span className="text-sm font-bold text-[#1d2421]">{formatRp(cat.amount)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-[#f0eee8] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily spending line chart */}
      {monthStats.dailyData.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e4e1da] p-6 shadow-sm">
          <h3 className="text-sm font-bold text-[#1d2421] mb-1">Pengeluaran Harian</h3>
          <p className="text-xs text-[#777670] mb-5">Distribusi pengeluaran per hari dalam bulan ini</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthStats.dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0eee8" vertical={false} />
              <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: '#777670' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tickFormatter={formatRpShort} tick={{ fontSize: 10, fill: '#777670' }} axisLine={false} tickLine={false} width={72} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatRp(v), 'Pengeluaran']} />
              <Line type="monotone" dataKey="Pengeluaran" stroke="#d85a30" strokeWidth={2} dot={{ r: 3, fill: '#d85a30' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Saldo trend */}
      <div className="bg-white rounded-2xl border border-[#e4e1da] p-6 shadow-sm">
        <h3 className="text-sm font-bold text-[#1d2421] mb-1">Tren Saldo Netto</h3>
        <p className="text-xs text-[#777670] mb-5">Surplus/defisit per bulan (6 bulan terakhir)</p>
        {loading ? <SkeletonBlock h="h-44" /> : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0eee8" vertical={false} />
              <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#777670' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatRpShort} tick={{ fontSize: 10, fill: '#777670' }} axisLine={false} tickLine={false} width={72} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatRp(v), 'Saldo']} />
              <Line
                type="monotone"
                dataKey="Saldo"
                stroke="#0f6e56"
                strokeWidth={2.5}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const color = payload.Saldo >= 0 ? '#0f6e56' : '#b11818';
                  return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={2} />;
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
