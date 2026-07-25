import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useCategories } from '../lib/useCategories';
import { Budget, Transaction } from '../types';
import { Plus, Trash2, Target, CheckCircle, AlertTriangle, XCircle, Bot } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { cn } from '../lib/utils';

export function Budgets() {
  const { user } = useAuth();
  const { categories } = useCategories();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetsLoaded, setBudgetsLoaded] = useState(false);
  const [txsLoaded, setTxsLoaded] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentMonthLabel = format(new Date(), 'MMMM yyyy', { locale: idLocale });

  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');

  const loading = !budgetsLoaded || !txsLoaded;

  useEffect(() => {
    if (!user) return;

    const bq = query(collection(db, 'budgets'), where('userId', '==', user.uid), where('month', '==', currentMonth));
    const unsubBudgets = onSnapshot(bq, (snapshot) => {
      setBudgets(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Budget)));
      setBudgetsLoaded(true);
    }, (err) => { console.error(err); setBudgetsLoaded(true); });

    const tq = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    const unsubTxs = onSnapshot(tq, (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
      setTxsLoaded(true);
    }, (err) => { console.error(err); setTxsLoaded(true); });

    return () => { unsubBudgets(); unsubTxs(); };
  }, [user, currentMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !categoryId) return;

    if (budgets.some(b => b.categoryId === categoryId)) {
      setError('Anggaran untuk kategori ini sudah ada bulan ini.');
      return;
    }
    if (parseFloat(amount) <= 0) {
      setError('Jumlah limit harus lebih dari 0.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await addDoc(collection(db, 'budgets'), {
        userId: user.uid,
        categoryId,
        amount: parseFloat(amount),
        month: currentMonth,
        createdAt: new Date().toISOString(),
      });
      setAmount('');
      setCategoryId('');
      setShowForm(false);
    } catch (err) {
      console.error(err);
      setError('Gagal menyimpan anggaran. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'budgets', id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      setError('Gagal menghapus anggaran.');
    }
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const availableCategories = expenseCategories.filter(c => !budgets.some(b => b.categoryId === c.id));

  const budgetProgress = useMemo(() => {
    const thisMonthTxs = transactions.filter(t => t.date.startsWith(currentMonth) && t.type === 'expense');
    return budgets.map(budget => {
      const spent = thisMonthTxs
        .filter(t => t.categoryId === budget.categoryId)
        .reduce((sum, t) => sum + t.amount, 0);
      const percent = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0;
      const remaining = Math.max(budget.amount - spent, 0);
      const cat = categories.find(c => c.id === budget.categoryId);
      return { ...budget, spent, percent, remaining, categoryName: cat?.name || 'Lainnya' };
    }).sort((a, b) => b.percent - a.percent);
  }, [budgets, transactions, currentMonth, categories]);

  const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgetProgress.reduce((s, b) => s + b.spent, 0);
  const totalPercent = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 w-full pb-6">
      {/* Action button */}
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 rounded-xl bg-[#0f6e56] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#075b46] transition-colors">
          {showForm ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Tutup Form' : 'Tambah Anggaran'}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#e4e1da] bg-[#fbfaf7] p-6 shadow-sm"><p className="text-sm font-medium uppercase tracking-wide text-[#807e78]">Total Anggaran</p><p className="mt-4 text-3xl font-bold text-[#1d2421]">{formatRp(totalBudget)}</p></div>
        <div className="rounded-2xl border border-[#e4e1da] bg-[#fbfaf7] p-6 shadow-sm"><p className="text-sm font-medium uppercase tracking-wide text-[#807e78]">Terpakai</p><p className="mt-4 text-3xl font-bold text-[#0f6e56]">{formatRp(totalSpent)}</p></div>
        <div className="rounded-2xl border border-[#e4e1da] bg-[#fbfaf7] p-6 shadow-sm"><p className="text-sm font-medium uppercase tracking-wide text-[#807e78]">Sisa Dana</p><p className="mt-4 text-3xl font-bold text-[#4c9300]">{formatRp(Math.max(totalBudget - totalSpent, 0))}</p></div>
      </div>

      {/* Add Budget Form */}
      {showForm && <div className="bg-white p-5 rounded-2xl border border-[#e4e1da] shadow-sm">
        <h3 className="text-sm font-bold text-[#1d2421] mb-4">Tambah Limit Anggaran · {currentMonthLabel}</h3>

        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-xl text-sm bg-[#f5e6e2] border border-[#d9aaa2] text-[#954c41] flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')}><XCircle className="w-4 h-4" /></button>
          </div>
        )}

        {availableCategories.length === 0 && !loading ? (
          <p className="text-[#777670] text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#0f6e56]" />
            Semua kategori pengeluaran sudah memiliki anggaran bulan ini.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-[#5f5e5a] mb-1.5">Kategori</label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-[#dedbd4] bg-[#f7f6f2] text-[#252b28] focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20 text-sm p-2.5"
              >
                <option value="">Pilih kategori...</option>
                {availableCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5f5e5a] mb-1.5">Limit Bulanan (Rp)</label>
              <input
                type="number"
                required
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500000"
                className="w-full rounded-xl border border-[#dedbd4] bg-[#f7f6f2] text-[#252b28] focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20 text-sm p-2.5 placeholder-[#aaa8a2]"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-[#0f6e56] hover:bg-[#075b46] disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Plus className="w-4 h-4 mr-1.5" />Set Limit</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>}

      {/* Budget Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#fbfdfc] rounded-2xl border border-[#d8e9e2] p-5 animate-pulse h-64" />
          ))}
        </div>
      ) : budgetProgress.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-dashed border-[#d9d6cf]">
          <Target className="w-10 h-10 text-[#b2b0a9] mb-3" />
          <p className="text-[#5f5e5a] text-sm font-medium">Belum ada anggaran bulan ini</p>
          <p className="text-[#92908a] text-xs mt-1">Tambahkan limit pengeluaran per kategori</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {budgetProgress.map(bp => {
            const statusIcon = bp.percent >= 100
              ? <XCircle className="w-4 h-4 text-[#b11818]" />
              : bp.percent >= 70
                ? <AlertTriangle className="w-4 h-4 text-[#c47205]" />
                : <CheckCircle className="w-4 h-4 text-[#4c9300]" />;

            const barColor = bp.percent >= 100
              ? "bg-[#b11818]"
              : bp.percent >= 90
                ? "bg-[#b11818]"
                : bp.percent >= 70
                  ? "bg-[#c47205]"
                  : "bg-[#4c9300]";

            return (
              <div key={bp.id} className="bg-[#fbfaf7] p-6 rounded-2xl border border-[#e4e1da] flex flex-col gap-5 shadow-sm min-h-64">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    {statusIcon}
                    <div>
                      <h4 className="text-xl font-bold text-[#1d2421]">{bp.categoryName}</h4>
                      <span className={cn('inline-flex mt-1 rounded-md px-2 py-0.5 text-xs font-semibold border', bp.percent >= 90 ? 'text-[#b11818] bg-[#fbe3df] border-[#efc2bb]' : bp.percent >= 70 ? 'text-[#b86b00] bg-[#fff0e2] border-[#f2cfad]' : 'text-[#4c9300] bg-[#edf4e1] border-[#cfe2b9]')}>
                        {bp.percent >= 90 ? 'Kritis' : bp.percent >= 70 ? 'Mendekati Batas' : 'Aman'}
                      </span>
                    </div>
                  </div>
                  {deleteConfirmId === bp.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(bp.id)}
                        className="text-xs bg-[#954c41] text-white px-2 py-1 rounded-lg hover:bg-[#7c3e35] transition-colors"
                      >
                        Hapus
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-xs bg-[#f0eee8] text-[#5f5e5a] px-2 py-1 rounded-lg hover:bg-[#e4e1da] transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirmId(bp.id)} aria-label={`Hapus anggaran ${bp.categoryName}`} className="text-[#96938c] hover:text-[#954c41] transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[#3f4642]">Terpakai ({Math.round(bp.percent)}%)</span>
                    <span className={cn(
                      "font-semibold",
                      bp.percent >= 90 ? "text-[#b11818]" : bp.percent >= 70 ? "text-[#c47205]" : "text-[#0f6e56]"
                    )}>
                      {formatRp(bp.spent)} / {formatRp(bp.amount)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-[#e5e3dd] rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", barColor)}
                      style={{ width: `${bp.percent}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-[#e4e1da] flex justify-between text-sm text-[#777670]">
                  <span>Sisa: <span className={cn("font-bold", bp.remaining === 0 ? "text-[#b11818]" : "text-[#1d2421]")}>
                      {formatRp(bp.remaining)}
                    </span>
                  </span>
                  <span className="text-xs italic text-[#96938c]">{currentMonthLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && budgetProgress.length > 0 && (
        <section className="rounded-2xl border border-[#d8d5ce] bg-[#f4f2ed] p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#0f6e56] text-white flex items-center justify-center"><Bot className="w-5 h-5" /></div>
                <div><h3 className="text-lg font-bold text-[#1d2421]">Analisis FinGuide AI</h3><p className="text-xs font-bold tracking-[0.12em] text-[#0f6e56] uppercase">Insight anggaran bulan ini</p></div>
              </div>
              <p className="text-[#3f4642] leading-relaxed">
                {totalPercent >= 90
                  ? <>Pengeluaran Anda sudah mencapai <strong>{Math.round(totalPercent)}%</strong> dari anggaran. Prioritaskan kategori <strong>{budgetProgress[0]?.categoryName}</strong> agar pengeluaran tidak melampaui limit.</>
                  : <>Anda telah menggunakan <strong>{Math.round(totalPercent)}%</strong> dari total anggaran. Pertahankan pola ini agar sisa dana <strong>{formatRp(Math.max(totalBudget - totalSpent, 0))}</strong> tetap aman hingga akhir bulan.</>}
              </p>
            </div>
            <div className="rounded-2xl border border-[#e1ded7] bg-white px-6 py-5 min-w-64">
              <p className="text-xs font-bold uppercase tracking-wider text-[#807e78]">Skor kesehatan finansial</p>
              <div className="flex items-end gap-2 mt-2"><span className="text-3xl font-bold text-[#4c9300]">{Math.min(100, Math.max(0, 100 - Math.round(totalPercent) + 20))}%</span><span className="text-sm text-[#777670] mb-1">bulan ini</span></div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
