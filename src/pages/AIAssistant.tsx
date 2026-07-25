import React from "react";
import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User as UserIcon } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useCategories } from '../lib/useCategories';
import { cn } from '../lib/utils';
import { Transaction } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function AIAssistant() {
  const { user } = useAuth();
  const { categories } = useCategories();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Halo! Aku asisten finansial pribadimu. Ada yang bisa kubantu soal pengelolaan keuanganmu?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchContext = async () => {
    if (!user) return {};
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid)
    );
    const snapshot = await getDocs(q);
    const txs = snapshot.docs.map(doc => doc.data() as Transaction);
    const thisMonthTxs = txs.filter(t => t.date.startsWith(currentMonth));
    
    let totalIncome = 0;
    const expenseByCategory: Record<string, number> = {};

    thisMonthTxs.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        expenseByCategory[t.categoryId] = (expenseByCategory[t.categoryId] || 0) + t.amount;
      }
    });

    const categoryEntries = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
    const top3Expenses = categoryEntries.slice(0, 3).map(([catId, amount]) => {
      const cat = categories.find(c => c.id === catId);
      return { category: cat?.name || 'Lainnya', amount };
    });

    return {
      bulan: currentMonth,
      totalIncome,
      top3Expenses
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const context = await fetchContext();
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userMessage,
          context
        })
      });

      if (!response.ok) throw new Error('API error');
      
      const data = await response.json();
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'assistant', 
        content: 'Maaf, sepertinya aku sedang kesulitan memproses data. Coba lagi nanti ya!' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col w-full space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">AI Financial Assistant</h2>
        <p className="text-slate-400 text-sm">Powered by Gemini 2.5 Flash</p>
      </div>

      <div className="flex-1 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar z-10">
          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
              <div className={cn("flex max-w-[85%]", m.role === 'user' ? "flex-row-reverse" : "flex-row gap-4")}>
                <div className={cn(
                  "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center shadow-lg border",
                  m.role === 'user' 
                    ? "bg-indigo-500 border-indigo-400 text-white shadow-indigo-500/20 ml-4" 
                    : "bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20"
                )}>
                  {m.role === 'user' ? <UserIcon className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </div>
                <div className={cn(
                  "px-5 py-4 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed shadow-sm border",
                  m.role === 'user' 
                    ? "bg-indigo-600 text-white border-indigo-500 rounded-tr-sm" 
                    : "bg-white/10 text-slate-200 border-white/10 rounded-tl-sm"
                )}>
                  {m.content}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex max-w-[85%] flex-row gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-emerald-500 border border-emerald-400 text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="px-5 py-4 rounded-2xl text-sm bg-white/10 border border-white/10 text-slate-200 rounded-tl-sm flex space-x-2 items-center">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-black/20 border-t border-white/10 z-10">
          <form onSubmit={handleSubmit} className="flex gap-3 items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya soal pengeluaran bulan ini..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-3 border border-indigo-500 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-lg shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
