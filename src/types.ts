export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId: string;
  date: string;
  note: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  userId: string | null;
  isGlobal: boolean;
  icon: string;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  month: string; // YYYY-MM
  createdAt: string;
}

export interface Profile {
  fullName: string;
  createdAt: string;
}
