import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Bot, User as UserIcon, Trash2, Lightbulb, RefreshCw } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useCategories } from '../lib/useCategories';
import { cn } from '../lib/utils';
import { Transaction } from '../types';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  'Analisis pengeluaran bulan ini',
  'Berikan saran 50/30/20 berdasarkan dataku',
  'Kategori mana yang paling boros?',
  'Apakah pengeluaranku sehat bulan ini?',
];

const CHART_COLORS = ['#0F6E56', '#D85A30', '#954C41', '#5F5E5A', '#71A995', '#E69173'];

export function AIAssistant() {
  const { user } = useAuth();
  const { categories } = useCategories();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Halo! Aku asisten finansial pribadimu 👋\n\nAku bisa menganalisis data transaksimu dan memberikan insight keuangan yang personal. Coba tanya sesuatu, atau pilih pertanyaan cepat di bawah!',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [analysisTransactions, setAnalysisTransactions] = useState<Transaction[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, 'transactions'), where('userId', '==', user.uid)))
      .then(snapshot => setAnalysisTransactions(snapshot.docs.map(d => d.data() as Transaction)))
      .catch(err => console.error('Analytics data error:', err));
  }, [user]);

  const overview = useMemo(() => {
    const month = format(new Date(), 'yyyy-MM');
    let income = 0;
    let expense = 0;
    const byCategory: Record<string, number> = {};
    analysisTransactions.filter(t => t.date.startsWith(month)).forEach(t => {
      if (t.type === 'income') income += t.amount;
      else { expense += t.amount; byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + t.amount; }
    });
    const distribution = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([categoryId, value]) => ({ name: categories.find(c => c.id === categoryId)?.name || 'Lainnya', value }));
    const score = income === 0 ? 0 : Math.min(100, Math.max(0, Math.round(70 + ((income - expense) / income) * 30)));
    const savings = Math.max(income - expense, 0);
    return { income, expense, distribution, score, savings };
  }, [analysisTransactions, categories]);

  const formatRp = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

  const buildContext = async () => {
    if (!user) return {};
    const currentMonth = format(new Date(), 'yyyy-MM');

    const snapshot = await getDocs(query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid)
    ));

    const txs = snapshot.docs.map(d => d.data() as Transaction);
    const thisMonth = txs.filter(t => t.date.startsWith(currentMonth));

    let totalIncome = 0;
    let totalExpense = 0;
    const expenseByCategory: Record<string, number> = {};

    thisMonth.forEach(t => {
      if (t.type === 'income') totalIncome += t.amount;
      else {
        totalExpense += t.amount;
        expenseByCategory[t.categoryId] = (expenseByCategory[t.categoryId] || 0) + t.amount;
      }
    });

    const topExpenses = Object.entries(expenseByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([catId, amount]) => ({
        kategori: categories.find(c => c.id === catId)?.name ?? 'Lainnya',
        jumlah: amount,
      }));

    // Last 3 months history
    const history: Record<string, { income: number; expense: number }> = {};
    txs.forEach(t => {
      const m = t.date.slice(0, 7);
      if (!history[m]) history[m] = { income: 0, expense: 0 };
      if (t.type === 'income') history[m].income += t.amount;
      else history[m].expense += t.amount;
    });

    return {
      bulan: currentMonth,
      totalPemasukan: totalIncome,
      totalPengeluaran: totalExpense,
      saldo: totalIncome - totalExpense,
      top5Pengeluaran: topExpenses,
      totalTransaksi: thisMonth.length,
      riwayat3Bulan: Object.entries(history)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 3)
        .map(([bulan, data]) => ({ bulan, ...data })),
    };
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setApiError(null);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const context = await buildContext();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text.trim(),
          context,
          // Keep recent turns so follow-up questions stay connected to the
          // previous financial discussion without sending an oversized prompt.
          history: messages.slice(-6).map(message => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            text: message.content,
          })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Permintaan gagal (${res.status}).`);

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      }]);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Gagal terhubung ke AI. Coba lagi.';
      setApiError(message);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Maaf, aku belum bisa memproses permintaanmu. ${message}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Chat dibersihkan. Ada yang ingin kamu tanyakan?',
      timestamp: new Date(),
    }]);
    setApiError(null);
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col w-full space-y-5" style={{ minHeight: 'calc(100vh - 6rem)' }}>
      {/* Header */}
      <div className="flex justify-between items-start flex-shrink-0">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-[#0f6e56] uppercase mb-1">AI powered insight</p>
          <h2 className="text-2xl font-bold tracking-tight text-[#1d2421]">Analisis Pengeluaran</h2>
          <p className="text-[#777670] text-sm mt-1">Laporan keuangan bulan {format(new Date(), 'MMMM yyyy', { locale: idLocale })}</p>
          <p className="text-[#92908a] text-xs mt-1">Insight AI bersifat edukatif, bukan nasihat keuangan profesional.</p>
        </div>
        {messages.length > 1 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 text-xs text-[#777670] hover:text-[#954c41] transition-colors px-3 py-2 rounded-lg hover:bg-[#f5e6e2] border border-[#e4e1da]"
          >
            <Trash2 className="w-3.5 h-3.5" /> Hapus chat
          </button>
        )}
      </div>

      {/* Financial overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-shrink-0">
        <section className="lg:col-span-2 bg-white rounded-2xl border border-[#e4e1da] p-6 shadow-sm min-h-72">
          <h3 className="text-lg font-bold text-[#1d2421]">Distribusi Kategori</h3>
          {overview.distribution.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-sm text-[#92908a]">Belum ada pengeluaran bulan ini.</div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4 h-60">
              <div className="h-56 w-full sm:w-1/2 relative">
                <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={overview.distribution} dataKey="value" cx="50%" cy="50%" innerRadius={64} outerRadius={92} paddingAngle={1} strokeWidth={0}>{overview.distribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie></PieChart></ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><span className="text-xs text-[#777670]">Total</span><span className="text-xl font-bold text-[#0f6e56]">{formatRp(overview.expense)}</span></div>
              </div>
              <div className="w-full sm:w-1/2 space-y-3">
                {overview.distribution.map((entry, i) => <div key={entry.name} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-[#3f4642]"><i className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />{entry.name}</span><span className="font-bold text-[#1d2421]">{overview.expense ? Math.round((entry.value / overview.expense) * 100) : 0}%</span></div>)}
              </div>
            </div>
          )}
        </section>
        <div className="space-y-4">
          <section className="rounded-2xl bg-[#075b46] p-5 text-white shadow-sm min-h-38"><p className="text-sm text-[#a9d9c9]">Skor Kesehatan Finansial</p><p className="text-5xl font-bold mt-3">{overview.score}/100</p><span className="inline-flex mt-5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{overview.score >= 75 ? 'Sangat Sehat' : overview.score >= 50 ? 'Cukup Sehat' : 'Perlu Perhatian'}</span></section>
          <section className="rounded-2xl border border-[#e4e1da] bg-white p-5 shadow-sm"><div className="flex justify-between gap-3"><div><h3 className="font-bold text-[#1d2421]">Dana yang tersisa</h3><p className="text-sm text-[#777670] mt-1">Dari pemasukan bulan ini</p></div><span className="font-bold text-[#0f6e56]">{formatRp(overview.savings)}</span></div><div className="h-2 w-full bg-[#e5e3dd] rounded-full mt-4 overflow-hidden"><div className="h-full bg-[#d85a30] rounded-full" style={{ width: `${overview.income ? Math.min((overview.savings / overview.income) * 100, 100) : 0}%` }} /></div></section>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 bg-white rounded-2xl border border-[#e4e1da] flex flex-col overflow-hidden min-h-[36rem] shadow-sm">
        <div className="px-5 py-4 bg-[#f4f2ed] border-b border-[#e4e1da] flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#e2f4ef] text-[#0f6e56] flex items-center justify-center"><Bot className="w-5 h-5" /></div><div><h3 className="font-bold text-[#1d2421]">AI Financial Assistant</h3><p className="text-xs text-[#4c9300]">● Online & siap membantu</p></div></div><RefreshCw className="w-5 h-5 text-[#5f5e5a]" /></div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-white">
          {messages.map((m) => (
            <div key={m.id} className={cn('flex gap-3', m.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
              {/* Avatar */}
              <div className={cn(
                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border',
                m.role === 'user'
                  ? 'bg-[#0f6e56] border-[#0f6e56] text-white'
                  : 'bg-[#e2f4ef] border-[#acd3c7] text-[#0f6e56]'
              )}>
                {m.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              {/* Bubble */}
              <div className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed border',
                m.role === 'user'
                  ? 'bg-[#dff3ed] text-[#075b46] border-[#b8d8cd] rounded-tr-sm'
                  : 'bg-[#f4f2ed] text-[#252b28] border-[#e4e1da] rounded-tl-sm'
              )}>
                {m.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <div className="
                    [&>p]:mb-2 [&>p:last-child]:mb-0
                    [&>ul]:mb-2 [&>ul]:pl-4 [&>ul]:list-disc
                    [&>ol]:mb-2 [&>ol]:pl-4 [&>ol]:list-decimal
                    [&>li]:mb-0.5
                    [&>p>strong]:text-[#0f6e56] [&>li>strong]:text-[#0f6e56]
                    [&>strong]:text-[#0f6e56]
                    [&>h1]:text-[#1d2421] [&>h1]:text-base [&>h1]:font-bold [&>h1]:mb-2
                    [&>h2]:text-[#1d2421] [&>h2]:text-sm [&>h2]:font-bold [&>h2]:mb-1.5
                    [&>h3]:text-[#252b28] [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mb-1
                    [&>blockquote]:border-l-2 [&>blockquote]:border-[#0f6e56] [&>blockquote]:pl-3 [&>blockquote]:italic [&>blockquote]:text-[#777670]
                    [&>hr]:border-[#e4e1da] [&>hr]:my-2
                  ">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                )}
                <p className={cn('text-[10px] mt-1.5', m.role === 'user' ? 'text-[#4c8875]' : 'text-[#92908a]')}>
                  {format(m.timestamp, 'HH:mm')}
                </p>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#e2f4ef] border border-[#acd3c7] text-[#0f6e56] flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-[#f4f2ed] border border-[#e4e1da] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-[#0f6e56] rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quick prompts — only show at start */}
          {messages.length === 1 && !loading && (
            <div className="space-y-2 mt-2">
              <p className="text-xs text-[#777670] flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" /> Pertanyaan cepat:
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    className="text-xs px-3 py-2 rounded-xl border border-[#e4e1da] bg-[#f4f2ed] text-[#3f4642] hover:bg-[#e2f4ef] hover:border-[#acd3c7] hover:text-[#0f6e56] transition-all"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* API Error banner */}
        {apiError && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-[#f5e6e2] border border-[#d9aaa2] text-[#954c41] text-xs">
            ⚠️ {apiError}
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-[#e4e1da] flex-shrink-0 bg-white">
          {messages.length > 1 && <div className="flex flex-wrap gap-2 mb-3">{QUICK_PROMPTS.slice(0, 3).map(p => <button key={p} onClick={() => sendMessage(p)} className="text-xs px-3 py-1.5 rounded-full bg-[#f4f2ed] text-[#5f5e5a] hover:text-[#0f6e56]">{p}</button>)}</div>}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanyakan sesuatu pada AI..."
              disabled={loading}
              maxLength={500}
              className="flex-1 bg-white border border-[#dedbd4] rounded-xl px-4 py-3 text-sm text-[#252b28] placeholder-[#92908a] focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-3 rounded-xl bg-[#0f6e56] hover:bg-[#075b46] text-white disabled:opacity-40 transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
