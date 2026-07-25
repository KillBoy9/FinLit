import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useCategories } from '../lib/useCategories';
import { Transaction } from '../types';
import { Wallet, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export function Dashboard() {
  const { user } = useAuth();
  const { categories } = useCategories();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // For MVP, we'll fetch all transactions and filter client side if we don't have composite indexes yet
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const { income, expense, recent, topExpenseCategory } = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const thisMonthTxs = transactions.filter(t => t.date.startsWith(currentMonth));
    
    let inc = 0;
    let exp = 0;
    const expenseByCategory: Record<string, number> = {};

    thisMonthTxs.forEach(t => {
      if (t.type === 'income') {
        inc += t.amount;
      } else {
        exp += t.amount;
        expenseByCategory[t.categoryId] = (expenseByCategory[t.categoryId] || 0) + t.amount;
      }
    });

    let topCatId = '';
    let maxExp = 0;
    Object.entries(expenseByCategory).forEach(([id, amt]) => {
      if (amt > maxExp) {
        maxExp = amt;
        topCatId = id;
      }
    });

    const cat = categories.find(c => c.id === topCatId);

    return {
      income: inc,
      expense: exp,
      recent: transactions.slice(0, 5),
      topExpenseCategory: cat ? cat.name : 'N/A'
    };
  }, [transactions, categories]);

  const balance = income - expense;

  return (
    <div className="max-w-5xl mx-auto space-y-6 w-full">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Halo, {user?.displayName || 'User'}</h1>
          <p className="text-slate-400 text-sm">{format(new Date(), 'EEEE, d MMMM yyyy')} • Ringkasan Keuangan Kamu</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-emerald-400">Gemini AI Active</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border border-white/20 flex items-center justify-center text-white font-bold">
            {(user?.displayName || 'U').charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Saldo Netto</p>
          <h2 className="text-2xl font-bold text-white">Rp {balance.toLocaleString('id-ID')}</h2>
          <div className={cn("mt-3 text-[10px] font-medium flex items-center gap-1", balance >= 0 ? "text-emerald-400" : "text-rose-400")}>
            <TrendingUp className="w-3 h-3" />
            Bulan ini
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pemasukan {format(new Date(), 'MMM')}</p>
          <h2 className="text-2xl font-bold text-white">Rp {income.toLocaleString('id-ID')}</h2>
          <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 w-[100%]"></div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pengeluaran {format(new Date(), 'MMM')}</p>
          <h2 className="text-2xl font-bold text-white">Rp {expense.toLocaleString('id-ID')}</h2>
          <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 w-[100%]"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-white/10">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300">Transaksi Terakhir</h3>
          </div>
          <div className="p-5 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
            {loading ? (
              <div className="text-center text-slate-400 text-sm py-4">Loading...</div>
            ) : recent.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-4">Belum ada transaksi.</div>
            ) : (
              recent.map((tx) => {
                const cat = categories.find(c => c.id === tx.categoryId);
                return (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", tx.type === 'income' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                        {tx.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200">{cat?.name || 'Lainnya'} {tx.note && `- ${tx.note}`}</p>
                        <p className="text-[10px] text-slate-500">{format(new Date(tx.date), 'dd MMM yyyy')} • {tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</p>
                      </div>
                    </div>
                    <p className={cn("text-sm font-bold", tx.type === 'income' ? "text-emerald-400" : "text-rose-400")}>
                      {tx.type === 'income' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-white/10">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300">Quick Insights</h3>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center items-center text-center space-y-4">
            <div className="p-4 bg-amber-500/20 rounded-full border border-amber-500/30">
              <AlertCircle className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Top Expense Category</p>
              <p className="text-xl font-bold text-white mt-1">{topExpenseCategory}</p>
            </div>
            <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">Keep an eye on this category to maintain healthy finances.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
