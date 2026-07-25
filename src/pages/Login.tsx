import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ArrowLeft, Wallet, Mail, AlertCircle } from 'lucide-react';

const GOOGLE_CLIENT_ID = '206410490366-4n8iov2av33v4uuj7a9dbm3d79ccs99m.apps.googleusercontent.com';

// Banner types
type BannerType = 'error' | 'warning' | 'info' | 'success';
interface Banner { text: string; type: BannerType }

function AlertBanner({ banner, onClose }: { banner: Banner; onClose: () => void }) {
  const styles: Record<BannerType, string> = {
    error:   'bg-[#f5e6e2] border-[#d9aaa2] text-[#954c41]',
    warning: 'bg-[#fff8e6] border-[#f0d080] text-[#7a5800]',
    info:    'bg-[#e8f0fe] border-[#aac4f7] text-[#1a3a8f]',
    success: 'bg-[#e2f4ef] border-[#acd3c7] text-[#0f6e56]',
  };
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${styles[banner.type]}`}>
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span className="flex-1">{banner.text}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 text-xs font-bold">✕</button>
    </div>
  );
}

export function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  // State untuk flow "login dulu baru linking"
  const [needsPasswordForLinking, setNeedsPasswordForLinking] = useState(false);
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<any>(null);
  const [linkingEmail, setLinkingEmail] = useState('');
  const [linkingPassword, setLinkingPassword] = useState('');
  const [linkingLoading, setLinkingLoading] = useState(false);

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  // Ensure profile exists in Firestore
  const ensureProfile = async (uid: string, displayName: string | null) => {
    const ref = doc(db, 'profiles', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { fullName: displayName || 'User', createdAt: new Date().toISOString() });
    }
  };

  // ── Google Sign-In with account linking logic ───────────────
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setBanner(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account', client_id: GOOGLE_CLIENT_ID });

    try {
      const result = await signInWithPopup(auth, provider);
      await ensureProfile(result.user.uid, result.user.displayName);
      navigate('/app');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setLoading(false);
        return;
      }

      // Email already exists with password provider → prompt to link
      if (err.code === 'auth/account-exists-with-different-credential') {
        const email = err.customData?.email ?? '';
        const methods = email ? await fetchSignInMethodsForEmail(auth, email).catch(() => []) : [];
        const credential = GoogleAuthProvider.credentialFromError(err);

        if (methods.includes('password')) {
          // Save pending Google credential, ask user to login with password first
          setPendingGoogleCredential(credential);
          setLinkingEmail(email);
          setNeedsPasswordForLinking(true);
          setBanner({
            type: 'warning',
            text: `Email "${email}" sudah terdaftar dengan password. Masukkan passwordmu di bawah untuk menghubungkan akun Google.`,
          });
        } else {
          setBanner({ type: 'error', text: 'Akun dengan email ini sudah terdaftar dengan metode login lain.' });
        }
        setLoading(false);
        return;
      }

      const errorMessages: Record<string, string> = {
        'auth/popup-blocked': 'Popup diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.',
        'auth/unauthorized-domain': 'Domain ini belum diizinkan. Tambahkan di Firebase Console → Authentication → Authorized domains.',
        'auth/network-request-failed': 'Koneksi gagal. Periksa koneksi internetmu.',
        'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa saat.',
      };
      setBanner({ type: 'error', text: errorMessages[err.code] || `Gagal masuk dengan Google. (${err.code})` });
    } finally {
      setLoading(false);
    }
  };

  // ── Link Google after password login ───────────────────────
  const handleLinkAfterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingGoogleCredential || !linkingEmail || !linkingPassword) return;
    setLinkingLoading(true);
    setBanner(null);
    try {
      // Step 1: login with password
      const result = await signInWithEmailAndPassword(auth, linkingEmail, linkingPassword);
      // Step 2: link Google credential to existing account
      const { linkWithCredential } = await import('firebase/auth');
      await linkWithCredential(result.user, pendingGoogleCredential);
      await ensureProfile(result.user.uid, result.user.displayName);
      setBanner({ type: 'success', text: 'Akun Google berhasil dihubungkan! Sekarang kamu bisa masuk dengan keduanya.' });
      setTimeout(() => navigate('/app'), 1500);
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/wrong-password': 'Password salah. Coba lagi.',
        'auth/invalid-credential': 'Password salah. Coba lagi.',
        'auth/too-many-requests': 'Terlalu banyak percobaan. Tunggu beberapa saat.',
        'auth/provider-already-linked': 'Google sudah terhubung ke akun ini.',
      };
      setBanner({ type: 'error', text: msg[err.code] || `Gagal menghubungkan akun. (${err.code})` });
    } finally {
      setLinkingLoading(false);
    }
  };

  // ── Normal email/password login ─────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setBanner(null);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);

      // Warn if email not verified
      if (!result.user.emailVerified) {
        setBanner({
          type: 'warning',
          text: 'Email belum diverifikasi. Cek inbox-mu untuk link verifikasi. Kamu tetap bisa masuk, tapi beberapa fitur mungkin terbatas.',
        });
        await new Promise(r => setTimeout(r, 2000));
      }

      navigate('/app');
    } catch (err: any) {
      const errorMessages: Record<string, string> = {
        'auth/invalid-credential': 'Email atau password salah.',
        'auth/user-not-found': 'Email atau password salah.',
        'auth/wrong-password': 'Email atau password salah.',
        'auth/invalid-email': 'Format email tidak valid.',
        'auth/user-disabled': 'Akun ini telah dinonaktifkan.',
        'auth/too-many-requests': 'Terlalu banyak percobaan. Tunggu beberapa saat.',
        'auth/network-request-failed': 'Koneksi gagal. Periksa koneksi internetmu.',
        'auth/operation-not-allowed': 'Login email/password belum diaktifkan di Firebase Console.',
      };
      setBanner({ type: 'error', text: errorMessages[err.code] || 'Gagal masuk. Coba lagi.' });
    } finally {
      setLoading(false);
    }
  };

  const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5">
      <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.51h3.14c1.84-1.7 2.91-4.2 2.91-7.28Z" />
      <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.35L15.3 16.9c-.87.58-1.98.92-3.3.92-2.54 0-4.7-1.72-5.48-4.03H3.27v2.59A9.75 9.75 0 0 0 12 21.75Z" />
      <path fill="#FBBC05" d="M6.52 13.79A5.85 5.85 0 0 1 6.21 12c0-.62.11-1.21.31-1.79V7.62H3.27A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.02 4.38l3.25-2.59Z" />
      <path fill="#EA4335" d="M12 6.18c1.43 0 2.7.49 3.71 1.45l2.78-2.78C16.84 3.3 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.73 5.37l3.25 2.59C7.3 7.9 9.46 6.18 12 6.18Z" />
    </svg>
  );

  return (
    <div className="w-full min-h-screen bg-[#f8f7f4] text-[#1d2421] flex items-center justify-center overflow-y-auto font-sans relative py-8">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#dff3ed] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#fff0e9] blur-[150px] rounded-full pointer-events-none" />

      <button onClick={handleBack} className="absolute top-6 left-6 z-10 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#0f6e56] hover:bg-[#e2f4ef] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      <div className="w-full max-w-md p-8 bg-white border border-[#e4e1da] rounded-3xl shadow-xl shadow-[#0f6e56]/5 relative z-10 m-4 space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="w-16 h-16 bg-[#0f6e56] rounded-2xl flex items-center justify-center shadow-sm mx-auto mb-5">
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-[#0f6e56] tracking-tight">FinLit</h2>
          <p className="text-[10px] font-bold tracking-[0.16em] text-[#5f5e5a] mt-1">FINANCE APP</p>
          <p className="text-[#777670] mt-3 text-sm">Masuk untuk mengelola finansialmu.</p>
        </div>

        {/* Banner */}
        {banner && <AlertBanner banner={banner} onClose={() => setBanner(null)} />}

        {/* ── LINKING FLOW: ask for password to link ── */}
        {needsPasswordForLinking ? (
          <form onSubmit={handleLinkAfterPassword} className="space-y-4">
            <p className="text-sm font-semibold text-[#252b28]">Masukkan password untuk email <span className="text-[#0f6e56]">{linkingEmail}</span></p>
            <div>
              <label className="block text-xs font-semibold text-[#5f5e5a] uppercase tracking-wider mb-2">Password</label>
              <input
                type="password" required
                value={linkingPassword} onChange={e => setLinkingPassword(e.target.value)}
                className="w-full bg-white border border-[#dedbd4] rounded-xl px-4 py-3 text-[#252b28] placeholder-[#aaa8a2] focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={linkingLoading || !linkingPassword}
              className="w-full flex justify-center py-3 rounded-xl text-sm font-bold text-white bg-[#0f6e56] hover:bg-[#075b46] disabled:opacity-50 transition-all">
              {linkingLoading ? 'Menghubungkan...' : '🔗 Hubungkan Google ke Akun Ini'}
            </button>
            <button type="button" onClick={() => { setNeedsPasswordForLinking(false); setPendingGoogleCredential(null); setBanner(null); }}
              className="w-full py-2 text-sm text-[#777670] hover:text-[#1d2421] transition-colors">
              Batal
            </button>
          </form>
        ) : (
          <>
            {/* Normal login form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5f5e5a] uppercase tracking-wider mb-2">Email</label>
                <input name="email" type="email" required placeholder="you@example.com"
                  className="w-full bg-white border border-[#dedbd4] rounded-xl px-4 py-3 text-[#252b28] placeholder-[#aaa8a2] focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5f5e5a] uppercase tracking-wider mb-2">Password</label>
                <input name="password" type="password" required placeholder="••••••••"
                  className="w-full bg-white border border-[#dedbd4] rounded-xl px-4 py-3 text-[#252b28] placeholder-[#aaa8a2] focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20 transition-colors" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex justify-center py-3 rounded-xl text-sm font-bold text-white bg-[#0f6e56] hover:bg-[#075b46] disabled:opacity-50 transition-all">
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#e4e1da]" /></div>
              <div className="relative flex justify-center text-sm"><span className="px-3 bg-white text-[#777670]">atau masuk dengan</span></div>
            </div>

            {/* Google button */}
            <button type="button" onClick={handleGoogleSignIn} disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 border border-[#dedbd4] rounded-xl bg-white hover:bg-[#f7f6f2] hover:border-[#acd3c7] focus:outline-none disabled:opacity-50 transition-all shadow-sm text-sm font-semibold text-[#252b28]">
              <GoogleIcon /> Masuk dengan Google
            </button>
          </>
        )}

        <div className="text-center">
          <Link to="/register" className="text-sm text-[#777670] hover:text-[#0f6e56] transition-colors">
            Belum punya akun? <span className="text-[#0f6e56] font-bold">Daftar sekarang</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
