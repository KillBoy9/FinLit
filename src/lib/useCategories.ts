import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { Category } from '../types';
import { useAuth } from './AuthContext';

// Static default categories — stable IDs used across transactions/budgets
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_food',          name: 'Makan & Minum',   type: 'expense', userId: null, isGlobal: true, icon: 'utensils' },
  { id: 'cat_transport',     name: 'Transportasi',    type: 'expense', userId: null, isGlobal: true, icon: 'car' },
  { id: 'cat_housing',       name: 'Tempat Tinggal',  type: 'expense', userId: null, isGlobal: true, icon: 'home' },
  { id: 'cat_entertainment', name: 'Hiburan',         type: 'expense', userId: null, isGlobal: true, icon: 'film' },
  { id: 'cat_shopping',      name: 'Belanja',         type: 'expense', userId: null, isGlobal: true, icon: 'shopping-bag' },
  { id: 'cat_health',        name: 'Kesehatan',       type: 'expense', userId: null, isGlobal: true, icon: 'heart' },
  { id: 'cat_education',     name: 'Pendidikan',      type: 'expense', userId: null, isGlobal: true, icon: 'book' },
  { id: 'cat_other_exp',     name: 'Lainnya',         type: 'expense', userId: null, isGlobal: true, icon: 'more-horizontal' },
  { id: 'cat_salary',        name: 'Gaji',            type: 'income',  userId: null, isGlobal: true, icon: 'wallet' },
  { id: 'cat_freelance',     name: 'Freelance',       type: 'income',  userId: null, isGlobal: true, icon: 'briefcase' },
  { id: 'cat_business',      name: 'Bisnis',          type: 'income',  userId: null, isGlobal: true, icon: 'trending-up' },
  { id: 'cat_other_inc',     name: 'Pemasukan Lain',  type: 'income',  userId: null, isGlobal: true, icon: 'plus-circle' },
];

export function useCategories() {
  const { user } = useAuth();
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const q = query(collection(db, 'categories'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, snap => {
      setCustomCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
      setLoading(false);
    }, err => {
      console.error('useCategories error:', err);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // Merge default + custom, stable reference via useMemo
  const categories = useMemo(
    () => [...DEFAULT_CATEGORIES, ...customCategories],
    [customCategories]
  );

  return { categories, loading };
}
