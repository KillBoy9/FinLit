import { useMemo } from 'react';
import { Category } from '../types';

// Static default categories — no Firestore query needed.
// These IDs are stable and used as categoryId in transactions/budgets.
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
  // Return stable reference — no re-renders from network calls
  const categories = useMemo(() => DEFAULT_CATEGORIES, []);
  return { categories, loading: false };
}
