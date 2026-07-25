import React, { useState, useEffect, useMemo } from 'react';
import {
  collection, addDoc, deleteDoc, doc,
  query, where, onSnapshot
} from 'firebase/firestore';
import { Plus, Trash2, TrendingUp, TrendingDown, X } from 'lucide-react';
import { format, parseISO, subMonths } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
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
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Filter state
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Sort client-side — no composite index needed
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Transaction))
        .sort((a, b) => b.date.localeCompare(a.date));
      setTransactions(data);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Gagal memuat transaksi. Coba refresh halaman.');
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !categoryId || !date) return;
    if (parseFloat(amount) <= 0) {
      setError('Jumlah harus lebih dari 0');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: parseFloat(amount),
        type,
        categoryId,
        date,
        note: note.trim(),
        createdAt: new Date().toISOString(),
      });
      setAmount('');
      setNote('');
      setCategoryId('');
      setSuccessMsg('Transaksi berhasil ditambahkan!');
      setShowForm(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Gagal menyimpan transaksi. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
      setError('Gagal menghapus transaksi.');
    }
  };

  // Month options: current + last 5 months
  const monthOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, i);
      return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: idLocale }) };
    });
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const monthMatch = t.date.startsWith(filterMonth);
      const typeMatch = filterType === 'all' || t.type === filterType;
      return monthMatch && typeMatch;
    });
  }, [transactions, filterMonth, filterType]);

  const summary = useMemo(() => {
    let income = 0, expense = 0;
    filtered.forEach(t => t.type === 'income' ? (income += t.amount) : (expense += t.amount));
    return { income, expense, balance: income - expense };
  }, [filtered]);

  const filteredCategories = categories.filter(c => c.type === type);
  const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 w-full pb-6">
      {/* Add Transaction button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0f6e56] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#075b46] transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Tutup Form' : 'Tambah Transaksi'}
        </button>
      </div>

      {/* Add Transaction Form */}
      {showForm && <div className="bg-white p-5 rounded-2xl border border-[#e4e1da] shadow-sm">
        <h3 className="text-sm font-bold text-[#1d2421] mb-4">Tambah Transaksi Baru</h3>

        {(error || successMsg) && (
          <div className={cn(
            "mb-4 px-4 py-2.5 rounded-xl text-sm flex items-center justify-between",
            error ? "bg-[#f5e6e2] border border-[#d9aaa2] text-[#954c41]"
                  : "bg-[#e2f4ef] border border-[#acd3c7] text-[#0f6e56]"
          )}>
            <span>{error || successMsg}</span>
            <button onClick={() => { setError(''); setSuccessMsg(''); }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          {/* Type */}
          <div className="col-span-1">
            <label className="block text-xs font-medium text-[#5f5e5a] mb-1.5">Tipe</label>
            <select
              value={type}
              onChange={(e) => { setType(e.target.value as 'income' | 'expense'); setCategoryId(''); }}
              className="w-full rounded-xl border border-[#dedbd4] bg-[#f7f6f2] text-[#252b28] focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20 text-sm p-2.5"
            >
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
            </select>
          </div>

          {/* Amount */}
          <div className="col-span-1">
            <label className="block text-xs font-medium text-[#5f5e5a] mb-1.5">Jumlah (Rp)</label>
            <input
              type="number"
              required
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-[#dedbd4] bg-[#f7f6f2] text-[#252b28] focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20 text-sm p-2.5 placeholder-[#aaa8a2]"
              placeholder="50000"
            />
          </div>

          {/* Category */}
          <div className="col-span-1">
            <label className="block text-xs font-medium text-[#5f5e5a] mb-1.5">Kategori</label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-[#dedbd4] bg-[#f7f6f2] text-[#252b28] focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20 text-sm p-2.5"
            >
              <option value="">Pilih...</option>
              {filteredCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="col-span-1">
            <label className="block text-xs font-medium text-[#5f5e5a] mb-1.5">Tanggal</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-[#dedbd4] bg-[#f7f6f2] text-[#252b28] focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20 text-sm p-2.5"
            />
          </div>

          {/* Note */}
          <div className="col-span-1">
            <label className="block text-xs font-medium text-[#5f5e5a] mb-1.5">Catatan</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={100}
              className="w-full rounded-xl border border-[#dedbd4] bg-[#f7f6f2] text-[#252b28] focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20 text-sm p-2.5 placeholder-[#aaa8a2]"
              placeholder="Opsional"
            />
          </div>

          {/* Submit */}
          <div className="col-span-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-[#0f6e56] hover:bg-[#075b46] disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Plus className="w-4 h-4 mr-1.5" />Tambah</>
              )}
            </button>
          </div>
        </form>
      </div>}

      {/* Filters + monthly summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#e4e1da] p-5 shadow-sm">
          <label className="block text-sm font-medium text-[#777670] mb-3">Pilih Bulan</label>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-full rounded-xl border-0 bg-[#f3f1ec] text-[#252b28] text-sm font-semibold p-3 focus:outline-none focus:ring-1 focus:ring-[#0f6e56]/30"
          >
            {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div className="bg-white rounded-2xl border border-[#e4e1da] p-5 shadow-sm">
          <label className="block text-sm font-medium text-[#777670] mb-3">Kategori</label>
          <div className="flex rounded-xl overflow-hidden bg-[#f3f1ec] p-1">
            {(['all', 'income', 'expense'] as const).map((t) => (
              <button key={t} onClick={() => setFilterType(t)} className={cn(
                'flex-1 px-2 py-2 text-xs font-semibold rounded-lg transition-colors',
                filterType === t ? 'bg-white text-[#0f6e56] shadow-sm' : 'text-[#777670] hover:text-[#0f6e56]'
              )}>
                {t === 'all' ? 'Semua' : t === 'income' ? 'Masuk' : 'Keluar'}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#e4e1da] p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#e2f4ef] text-[#0f6e56] flex items-center justify-center"><TrendingUp className="w-6 h-6" /></div>
          <div><p className="text-xs font-bold text-[#777670] uppercase">Pemasukan</p><p className="text-xl font-bold text-[#4c9300] mt-1">{formatRp(summary.income)}</p></div>
        </div>
        <div className="bg-white rounded-2xl border border-[#e4e1da] p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#fbe3df] text-[#b11818] flex items-center justify-center"><TrendingDown className="w-6 h-6" /></div>
          <div><p className="text-xs font-bold text-[#777670] uppercase">Pengeluaran</p><p className="text-xl font-bold text-[#b11818] mt-1">{formatRp(summary.expense)}</p></div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-2xl border border-[#e4e1da] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-[#f4f2ed] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <TrendingUp className="w-10 h-10 text-[#b2b0a9] mb-3" />
            <p className="text-[#5f5e5a] text-sm font-medium">Tidak ada transaksi</p>
            <p className="text-[#92908a] text-xs mt-1">
              {filterType !== 'all' || filterMonth !== format(new Date(), 'yyyy-MM')
                ? 'Coba ubah filter bulan atau tipe'
                : 'Tambahkan transaksi pertamamu di atas'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[#e4e1da] bg-[#f4f2ed]">
                  <th className="px-5 py-4 text-left text-xs font-bold text-[#807e78] uppercase tracking-wider">Tanggal</th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-[#807e78] uppercase tracking-wider">Kategori</th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-[#807e78] uppercase tracking-wider hidden md:table-cell">Catatan</th>
                  <th className="px-5 py-4 text-right text-xs font-bold text-[#807e78] uppercase tracking-wider">Nominal</th>
                  <th className="px-4 py-4 w-16 text-center text-xs font-bold text-[#807e78] uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e5df]">
                {filtered.map((tx) => {
                  const cat = categories.find(c => c.id === tx.categoryId);
                  return (
                    <tr key={tx.id} className="hover:bg-[#faf9f6] transition-colors group">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-[#252b28]">{format(parseISO(tx.date.slice(0, 10)), 'd MMM yyyy')}</p>
                        <p className="text-xs text-[#92908a] mt-0.5">{tx.date.includes('T') ? `${format(parseISO(tx.date), 'HH:mm')} WIB` : 'Tercatat'}</p>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0",
                            tx.type === 'income' ? "bg-[#e2f4ef]" : "bg-[#f5e6e2]"
                          )}>
                            {tx.type === 'income'
                              ? <TrendingUp className="w-3.5 h-3.5 text-[#0f6e56]" />
                              : <TrendingDown className="w-3.5 h-3.5 text-[#954c41]" />}
                          </div>
                          <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold', tx.type === 'income' ? 'bg-[#e2f4ef] text-[#0f6e56]' : 'bg-[#f5e6e2] text-[#954c41]')}>{cat?.name || 'Lainnya'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#3f4642] hidden md:table-cell max-w-[180px] truncate">
                        {tx.note || '—'}
                      </td>
                      <td className={cn(
                        "px-5 py-4 whitespace-nowrap text-sm font-bold text-right",
                        tx.type === 'income' ? 'text-[#4c9300]' : 'text-[#b11818]'
                      )}>
                        {tx.type === 'income' ? '+' : '-'}{formatRp(tx.amount)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {deleteConfirmId === tx.id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => handleDelete(tx.id)}
                              className="text-xs bg-[#954c41] text-white px-2 py-1 rounded-lg hover:bg-[#7c3e35] transition-colors"
                            >
                              Hapus
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-xs bg-[#f3f1ec] text-[#5f5e5a] px-2 py-1 rounded-lg hover:bg-[#e8e5df] transition-colors"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(tx.id)}
                            className="text-[#96938c] hover:text-[#954c41] transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row count */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-[#777670] text-right">Menampilkan {filtered.length} transaksi</p>
      )}
    </div>
  );
}
