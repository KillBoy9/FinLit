import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, or } from 'firebase/firestore';
import { db } from './firebase';
import { Category } from '../types';
import { useAuth } from './AuthContext';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    // Default categories if DB is empty to simplify hackathon MVP
    const defaultCategories: Category[] = [
      { id: 'cat_food', name: 'Food & Dining', type: 'expense', userId: null, isGlobal: true, icon: 'utensils' },
      { id: 'cat_transport', name: 'Transportation', type: 'expense', userId: null, isGlobal: true, icon: 'car' },
      { id: 'cat_housing', name: 'Housing', type: 'expense', userId: null, isGlobal: true, icon: 'home' },
      { id: 'cat_entertainment', name: 'Entertainment', type: 'expense', userId: null, isGlobal: true, icon: 'film' },
      { id: 'cat_salary', name: 'Salary', type: 'income', userId: null, isGlobal: true, icon: 'wallet' },
      { id: 'cat_freelance', name: 'Freelance', type: 'income', userId: null, isGlobal: true, icon: 'briefcase' },
    ];

    const q = query(
      collection(db, 'categories'),
      or(
        where('isGlobal', '==', true),
        where('userId', '==', user.uid)
      )
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setCategories(defaultCategories);
      } else {
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        // Merge with defaults if global ones aren't in DB yet to ensure UI works immediately
        const combined = [...defaultCategories, ...fetched.filter(f => f.userId === user.uid)];
        setCategories(combined);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { categories, loading };
}
