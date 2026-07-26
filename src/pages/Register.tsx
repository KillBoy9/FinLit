import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { ArrowLeft, Wallet, AlertCircle, Mail } from 'lucide-react';

const GOOGLE_CLIENT_ID = '206410490366-4n8iov2av33v4uuj7a9dbm3d79ccs99m.apps.googleusercontent.com';

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

// Verifikasi email terkirim — tampilkan halaman konfirmasi
function EmailVerificationSent({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 bg-[#e2f4ef] rounded-full flex items-center justify-center mx-auto">
        <Mail className="w-8 h-8 text-[#0f6e56]" />
      </div>
      <h3 className="text-xl font-bold text-[#1d2421]">Cek email kamu!</h3>
      <p className="text-sm text-[#777670]">
        Link verifikasi sudah dikirim ke <strong className="text-[#0f6e56]">{email}</strong>.
        Klik link di email tersebut untuk mengaktifkan akun, lalu masuk.
      </p>
      <p className="text-xs text-[#92908a]">Tidak ada email? Cek folder spam atau coba daftar ulang.</p>
      <Link to="/login" state={{ from: '/register' }} replace
        className="block w-full py-3 rounded-xl text-sm font-bold text-white bg-[#0f6e56] hover:bg-[#075b46] transition-all text-center">
        Pergi ke halaman Login
      </Link>
      <button onClick={onBack} className="text-sm text-[#777670] hover:text-[#0f6e56] transition-colors">
        Kembali ke form
      </button>
    </div>
  );
}

export function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  const ensureProfile = async (uid: string, displayName: string | null) => {
    const ref = doc(db, 'profiles', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { fullName: displayName || 'User', createdAt: new Date().toISOString() });
    }
  };

  // ── Google Sign-Up/In ─────────────────────────────────────
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
      if (err.code === 'auth/account-exists-with-different-credential') {
        setBanner({
          type: 'warning',
          text: 'Email ini sudah terdaftar dengan metode lain. Pergi ke halaman Login untuk masuk dan menghubungkan akunmu.',
        });
        setLoading(false);
        return;
      }
      const msgs: Record<string, string> = {
        'auth/popup-blocked': 'Popup diblokir browser. Izinkan popup untuk situs ini.',
        'auth/unauthorized-domain': 'Domain belum diizinkan di Firebase Console.',
        'auth/network-request-failed': 'Koneksi gagal.',
        'auth/too-many-requests': 'Terlalu banyak percobaan. Tunggu beberapa saat.',
      };
      setBanner({ type: 'error', text: msgs[err.code] || `Gagal daftar dengan Google. (${err.code})` });
    } finally {
      setLoading(false);
    }
  };

  // ── Email/Password Registration ───────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setBanner(null);

    const formData = new FormData(e.currentTarget);
    const email    = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const confirm  = formData.get('confirmPassword') as string;

    if (password !== confirm) {
      setBanner({ type: 'error', text: 'Password dan konfirmasi password tidak sama.' });
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setBanner({ type: 'error', text: 'Password minimal 8 karakter.' });
      setLoading(false);
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Update display name
      await updateProfile(cred.user, { displayName: fullName.trim() });
      // Save profile to Firestore
      await setDoc(doc(db, 'profiles', cred.user.uid), {
        fullName: fullName.trim(),
        createdAt: new Date().toISOString(),
      });
      // Send email verification
      await sendEmailVerification(cred.user);
      setRegisteredEmail(email);
      setVerificationSent(true);
    } catch (err: any) {
      const msgs: Record<string, string> = {
        'auth/email-already-in-use': 'Email sudah digunakan. Coba masuk atau gunakan email lain.',
        'auth/invalid-email': 'Format email tidak valid.',
        'auth/weak-password': 'Password terlalu lemah. Gunakan minimal 8 karakter.',
        'auth/operation-not-allowed': 'Pendaftaran email/password belum diaktifkan di Firebase Console.',
        'auth/network-request-failed': 'Koneksi gagal. Periksa koneksi internetmu.',
      };
      setBanner({ type: 'error', text: msgs[err.code] || `Gagal mendaftar. (${err.code})` });
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
          <p className="text-[#777670] mt-3 text-sm">Buat akun untuk mulai mengatur finansialmu.</p>
        </div>

        {/* Email verification sent screen */}
        {verificationSent ? (
          <EmailVerificationSent email={registeredEmail} onBack={() => setVerificationSent(false)} />
        ) : (
          <>
            {banner && <AlertBanner banner={banner} onClose={() => setBanner(null)} />}

            {/* Google button */}
            <button type="button" onClick={handleGoogleSignIn} disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 border border-[#dedbd4] rounded-xl bg-white hover:bg-[#f7f6f2] hover:border-[#acd3c7] disabled:opacity-50 transition-all shadow-sm text-sm font-semibold text-[#252b28]">
              <GoogleIcon /> Daftar dengan Google
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#e4e1da]" /></div>
              <div className="relative flex justify-center text-sm"><span className="px-3 bg-white text-[#777670]">atau daftar dengan email</span></div>
            </div>

            {/* Registration form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5f5e5a] uppercase tracking-wider mb-2">Nama Lengkap</label>
                <input name="fullName" type="text" required minLength={2} maxLength={60} placeholder="Nama kamu"
                  className="w-full bg-white border border-[#dedbd4] rounded-xl px-4 py-3 text-[#252b28] placeholder-[#aaa8a2] focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5f5e5a] uppercase tracking-wider mb-2">Email</label>
                <input name="email" type="email" required placeholder="you@example.com"
                  className="w-full bg-white border border-[#dedbd4] rounded-xl px-4 py-3 text-[#252b28] placeholder-[#aaa8a2] focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5f5e5a] uppercase tracking-wider mb-2">Password</label>
                <input name="password" type="password" required minLength={8} placeholder="Min. 8 karakter"
                  className="w-full bg-white border border-[#dedbd4] rounded-xl px-4 py-3 text-[#252b28] placeholder-[#aaa8a2] focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5f5e5a] uppercase tracking-wider mb-2">Konfirmasi Password</label>
                <input name="confirmPassword" type="password" required placeholder="Ulangi password"
                  className="w-full bg-white border border-[#dedbd4] rounded-xl px-4 py-3 text-[#252b28] placeholder-[#aaa8a2] focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20 transition-colors" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex justify-center py-3 rounded-xl text-sm font-bold text-white bg-[#0f6e56] hover:bg-[#075b46] disabled:opacity-50 transition-all">
                {loading ? 'Membuat akun...' : 'Daftar'}
              </button>
            </form>
          </>
        )}

        {!verificationSent && (
          <div className="text-center">
            <Link to="/login" state={{ from: '/register' }} replace className="text-sm text-[#777670] hover:text-[#0f6e56] transition-colors">
              Sudah punya akun? <span className="text-[#0f6e56] font-bold">Masuk</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
