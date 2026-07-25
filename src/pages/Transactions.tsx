import { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useCategories } from '../lib/useCategories';
import { Transaction } from '../types';
import { cn } from '../lib/utils';

export function Transactions() {
  const { user } = useAuth();
  const { categories } = useCategories();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !categoryId || !date) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: parseFloat(amount),
        type,
        categoryId,
        date: new Date(date).toISOString(),
        note,
        createdAt: new Date().toISOString()
      });
      setAmount('');
      setNote('');
    } catch (error) {
      console.error("Error adding document: ", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  };

  const filteredCategories = categories.filter(c => c.type === type);

  return (
    <div className="max-w-4xl mx-auto space-y-6 w-full">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Transactions</h2>
          <p className="text-slate-400 text-sm">Manage your income and expenses</p>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-4">Add Transaction</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          <div className="lg:col-span-1">
            <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as 'income' | 'expense');
                setCategoryId('');
              }}
              className="w-full rounded-xl border border-white/10 bg-white/5 text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 sm:text-sm p-2.5"
            >
              <option value="expense" className="bg-slate-800 text-slate-200">Expense</option>
              <option value="income" className="bg-slate-800 text-slate-200">Income</option>
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-medium text-slate-400 mb-1">Amount</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 sm:text-sm p-2.5 placeholder-slate-500"
              placeholder="0.00"
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 sm:text-sm p-2.5"
            >
              <option value="" className="bg-slate-800 text-slate-200">Select...</option>
              {filteredCategories.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-800 text-slate-200">{c.name}</option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 sm:text-sm p-2.5"
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-medium text-slate-400 mb-1">Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 sm:text-sm p-2.5 placeholder-slate-500"
              placeholder="Optional"
            />
          </div>
          <div className="lg:col-span-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-white/5">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-widest">Date</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-widest">Category</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-widest">Note</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-widest">Amount</th>
                <th scope="col" className="relative px-6 py-4"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-slate-400">Loading...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-slate-400">No transactions found.</td></tr>
              ) : (
                transactions.map((tx) => {
                  const cat = categories.find(c => c.id === tx.categoryId);
                  return (
                    <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">
                        {format(new Date(tx.date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {cat?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {tx.note || '-'}
                      </td>
                      <td className={cn(
                        "px-6 py-4 whitespace-nowrap text-sm font-bold",
                        tx.type === 'income' ? 'text-emerald-400' : 'text-slate-200'
                      )}>
                        {tx.type === 'income' ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
