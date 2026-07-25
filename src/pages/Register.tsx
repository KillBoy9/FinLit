import React from "react";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { ArrowLeft, Wallet } from 'lucide-react';

export function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',
        client_id: '206410490366-4n8iov2av33v4uuj7a9dbm3d79ccs99m.apps.googleusercontent.com',
      });
      const result = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, 'profiles', result.user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          fullName: result.user.displayName || 'User',
          createdAt: new Date().toISOString()
        });
      }
      navigate('/app');
    } catch (err: any) {
      // User closed the popup — bukan error, abaikan saja
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setLoading(false);
        return;
      }
      const errorMessages: Record<string, string> = {
        'auth/popup-blocked': 'Popup diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.',
        'auth/unauthorized-domain': 'Domain tidak diizinkan. Tambahkan localhost di Firebase Console → Authentication → Authorized domains.',
        'auth/network-request-failed': 'Koneksi gagal. Periksa koneksi internetmu.',
        'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa saat.',
      };
      setError(errorMessages[err.code] || 'Gagal daftar dengan Google. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await setDoc(doc(db, 'profiles', user.uid), {
        fullName,
        createdAt: new Date().toISOString()
      });

      navigate('/app');
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f8f7f4] text-[#1d2421] flex items-center justify-center overflow-y-auto font-sans relative py-8">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#dff3ed] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#fff0e9] blur-[150px] rounded-full pointer-events-none" />

      <button onClick={handleBack} className="absolute top-6 left-6 z-10 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#0f6e56] hover:bg-[#e2f4ef] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      <div className="w-full max-w-md p-8 bg-white border border-[#e4e1da] rounded-3xl shadow-xl shadow-[#0f6e56]/5 relative z-10 m-4">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#0f6e56] rounded-2xl flex items-center justify-center shadow-sm mx-auto mb-5">
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-[#0f6e56] tracking-tight">FinGuide AI</h2>
          <p className="text-[10px] font-bold tracking-[0.16em] text-[#5f5e5a] mt-1">WEALTH MANAGEMENT</p>
          <p className="text-[#777670] mt-4">Buat akun untuk mulai mengatur finansialmu.</p>
        </div>
        
        <div className="space-y-6">
          {error && <div className="text-sm text-[#954c41] bg-[#f5e6e2] border border-[#d9aaa2] p-4 rounded-xl text-center">{error}</div>}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#5f5e5a] uppercase tracking-wider mb-2">Nama lengkap</label>
              <input 
                name="fullName" 
                type="text" 
                required 
                className="w-full bg-white border border-[#dedbd4] rounded-xl px-4 py-3 text-[#252b28] placeholder-[#aaa8a2] focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20 transition-colors"
                placeholder="Nama kamu"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5f5e5a] uppercase tracking-wider mb-2">Email address</label>
              <input 
                name="email" 
                type="email" 
                required 
                className="w-full bg-white border border-[#dedbd4] rounded-xl px-4 py-3 text-[#252b28] placeholder-[#aaa8a2] focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20 transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5f5e5a] uppercase tracking-wider mb-2">Password</label>
              <input 
                name="password" 
                type="password" 
                required 
                className="w-full bg-white border border-[#dedbd4] rounded-xl px-4 py-3 text-[#252b28] placeholder-[#aaa8a2] focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full flex justify-center py-3 px-4 rounded-xl shadow-sm text-sm font-bold text-white bg-[#0f6e56] hover:bg-[#075b46] focus:outline-none focus:ring-2 focus:ring-[#0f6e56]/20 disabled:opacity-50 transition-all"
            >
              {loading ? 'Membuat akun...' : 'Daftar'}
            </button>
          </div>
        </form>
        <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#e4e1da]" /></div><div className="relative flex justify-center text-sm"><span className="px-3 bg-white text-[#777670]">atau daftar dengan</span></div></div>
        <button type="button" onClick={handleGoogleSignIn} disabled={loading} aria-label="Daftar dengan Google" title="Daftar dengan Google" className="w-12 h-12 mx-auto flex items-center justify-center border border-[#dedbd4] rounded-xl bg-white hover:bg-[#f7f6f2] hover:border-[#acd3c7] focus:outline-none focus:ring-2 focus:ring-[#0f6e56]/20 disabled:opacity-50 transition-all shadow-sm">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5"><path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.51h3.14c1.84-1.7 2.91-4.2 2.91-7.28Z" /><path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.35L15.3 16.9c-.87.58-1.98.92-3.3.92-2.54 0-4.7-1.72-5.48-4.03H3.27v2.59A9.75 9.75 0 0 0 12 21.75Z" /><path fill="#FBBC05" d="M6.52 13.79A5.85 5.85 0 0 1 6.21 12c0-.62.11-1.21.31-1.79V7.62H3.27A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.02 4.38l3.25-2.59Z" /><path fill="#EA4335" d="M12 6.18c1.43 0 2.7.49 3.71 1.45l2.78-2.78C16.84 3.3 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.73 5.37l3.25 2.59C7.3 7.9 9.46 6.18 12 6.18Z" /></svg>
        </button>
        </div>
        <div className="text-center mt-6">
          <Link to="/login" className="text-sm text-[#777670] hover:text-[#0f6e56] transition-colors">Sudah punya akun? <span className="text-[#0f6e56] font-bold">Masuk</span></Link>
        </div>
      </div>
    </div>
  );
}
