import { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useCategories } from '../lib/useCategories';
import { Budget, Transaction } from '../types';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

export function Budgets() {
  const { user } = useAuth();
  const { categories } = useCategories();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!user) return;
    
    // Fetch budgets
    const bq = query(collection(db, 'budgets'), where('userId', '==', user.uid), where('month', '==', currentMonth));
    const unsubBudgets = onSnapshot(bq, (snapshot) => {
      setBudgets(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Budget)));
    });

    // Fetch transactions
    const tq = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    const unsubTxs = onSnapshot(tq, (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
      setLoading(false);
    });

    return () => { unsubBudgets(); unsubTxs(); };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !categoryId) return;
    
    // Check if budget exists for this category and month
    if (budgets.some(b => b.categoryId === categoryId)) {
      alert("Budget for this category already exists this month.");
      return;
    }

    try {
      await addDoc(collection(db, 'budgets'), {
        userId: user.uid,
        categoryId,
        amount: parseFloat(amount),
        month: currentMonth,
        createdAt: new Date().toISOString()
      });
      setAmount('');
      setCategoryId('');
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this budget?')) return;
    await deleteDoc(doc(db, 'budgets', id));
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');

  const budgetProgress = useMemo(() => {
    const thisMonthTxs = transactions.filter(t => t.date.startsWith(currentMonth));
    return budgets.map(budget => {
      const spent = thisMonthTxs
        .filter(t => t.categoryId === budget.categoryId)
        .reduce((sum, t) => sum + t.amount, 0);
      const percent = Math.min((spent / budget.amount) * 100, 100);
      
      const cat = categories.find(c => c.id === budget.categoryId);
      
      return { ...budget, spent, percent, categoryName: cat?.name || 'Unknown' };
    });
  }, [budgets, transactions, currentMonth, categories]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 w-full">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Monthly Budgets</h2>
        <p className="text-slate-400 text-sm">Target {currentMonth}</p>
      </div>

      <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-4">Set Budget Limit</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 sm:text-sm p-2.5"
            >
              <option value="" className="bg-slate-800 text-slate-200">Select...</option>
              {expenseCategories.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-800 text-slate-200">{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Monthly Limit (Rp)</label>
            <input
              type="number"
              required
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 sm:text-sm p-2.5 placeholder-slate-500"
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" /> Set Limit
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <p className="text-slate-400 text-sm">Loading...</p>
        ) : budgetProgress.length === 0 ? (
          <p className="text-slate-400 text-sm">No budgets set for this month.</p>
        ) : (
          budgetProgress.map(bp => (
            <div key={bp.id} className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">{bp.categoryName}</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Rp {bp.spent.toLocaleString('id-ID')} / Rp {bp.amount.toLocaleString('id-ID')}
                  </p>
                </div>
                <button onClick={() => handleDelete(bp.id)} className="text-slate-500 hover:text-rose-400 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-end text-[10px] font-medium text-slate-400">
                  {Math.round(bp.percent)}%
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className={cn(
                    "h-full rounded-full transition-all",
                    bp.percent >= 90 ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" :
                    bp.percent >= 70 ? "bg-amber-500" : "bg-emerald-500"
                  )} style={{ width: `${bp.percent}%` }}></div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
