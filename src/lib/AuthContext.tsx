import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged fires quickly from local cache on subsequent visits
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Show a minimal full-screen spinner while Firebase resolves auth state
  // This prevents flash of unauthenticated content AND the infinite skeleton loop
  if (loading) {
    return (
      <div className="h-screen w-full bg-[#f8f7f4] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0f6e56] flex items-center justify-center shadow-sm">
            <div className="w-6 h-6 border-2 border-white/35 border-t-white rounded-full animate-spin" />
          </div>
          <div className="text-center"><p className="text-[#0f6e56] text-sm font-semibold">Menyiapkan FinGuide AI</p><p className="text-[#777670] text-xs mt-1">Memuat akun dan data keuanganmu...</p></div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
