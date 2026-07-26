import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, collection, addDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import {
  updateProfile, GoogleAuthProvider, linkWithPopup, unlink,
  sendEmailVerification, updatePassword, reauthenticateWithCredential,
  EmailAuthProvider, sendPasswordResetEmail,
} from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import {
  LogOut, CheckCircle, XCircle, Palette, ShieldCheck, Star,
  LockKeyhole, Camera, Zap, Tag, Plus, Trash2, Link2, Link2Off,
  AlertCircle, Mail, Eye, EyeOff, RefreshCw,
} from 'lucide-react';
import { useCategories } from '../lib/useCategories';
import { Category } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const GOOGLE_CLIENT_ID = '206410490366-4n8iov2av33v4uuj7a9dbm3d79ccs99m.apps.googleusercontent.com';

type MsgType = 'success' | 'error' | 'info';
interface Msg { text: string; type: MsgType }

function StatusMsg({ msg, onClose }: { msg: Msg; onClose: () => void }) {
  const s = {
    success: 'bg-[#e2f4ef] border-[#acd3c7] text-[#0f6e56]',
    error:   'bg-[#f5e6e2] border-[#d9aaa2] text-[#954c41]',
    info:    'bg-[#e8f0fe] border-[#aac4f7] text-[#1a3a8f]',
  };
  const Icon = msg.type === 'success' ? CheckCircle : msg.type === 'error' ? XCircle : AlertCircle;
  return (
    <div className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 border ${s[msg.type]}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{msg.text}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

export function Settings() {
  const { user } = useAuth();
  const { categories: allCategories } = useCategories();

  // Profile state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [sendingVerif, setSendingVerif] = useState(false);

  // Custom categories
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');
  const [addingCat, setAddingCat] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  // Google linking
  const isGoogleLinked = user?.providerData?.some(p => p.providerId === 'google.com') ?? false;
  const hasPasswordProvider = user?.providerData?.some(p => p.providerId === 'password') ?? false;
  const [linkingGoogle, setLinkingGoogle] = useState(false);

  // Photo upload state
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');

  const showMsg = (text: string, type: MsgType = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
  };

  // ── Load profile ─────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, 'profiles', user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setFullName(d.fullName || user.displayName || '');
          setPhone(d.phone || '');
          setBio(d.bio || '');
          setPhotoURL(d.photoURL || user.photoURL || null);
        } else {
          setFullName(user.displayName || '');
          setPhotoURL(user.photoURL || null);
        }
      } catch { setFullName(user.displayName || ''); }
      finally { setLoading(false); }
    };
    fetch();
  }, [user]);

  // ── Custom categories listener ───────────────────────────
  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      query(collection(db, 'categories'), where('userId', '==', user.uid)),
      snap => setCustomCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category))),
      err => console.error('Categories error:', err)
    );
  }, [user]);

  // ── Photo upload via Cloudinary ──────────────────────────
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedImageTypes.includes(file.type)) {
      showMsg('File harus berupa gambar (JPG, PNG, WebP).', 'error');
      return;
    }
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset ||
        cloudName === 'your_cloud_name_here' ||
        uploadPreset === 'your_upload_preset_here') {
      showMsg('Cloudinary belum dikonfigurasi. Isi VITE_CLOUDINARY_CLOUD_NAME dan VITE_CLOUDINARY_UPLOAD_PRESET di file .env', 'error');
      return;
    }

    setUploadError('');
    setUploadProgress(0);

    // Compress client-side first (max 400×400, JPEG 85%)
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = async () => {
        const MAX = 400;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round((h * MAX) / w); w = MAX; }
          else { w = Math.round((w * MAX) / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);

        canvas.toBlob(async (blob) => {
          if (!blob) { showMsg('Gagal memproses gambar.', 'error'); return; }

          // Upload to Cloudinary via unsigned upload
          const formData = new FormData();
          formData.append('file', blob, 'avatar.jpg');
          formData.append('upload_preset', uploadPreset);
          // Folder and public ID are managed by the unsigned Cloudinary preset.
          // Letting Cloudinary generate a new ID prevents a second profile-photo
          // upload from being rejected when overwrite is disabled in the preset.

          try {
            setUploadProgress(30);
            const res = await fetch(
              `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
              { method: 'POST', body: formData }
            );

            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error?.message || `Upload failed (${res.status})`);
            }

            setUploadProgress(80);
            const data = await res.json();
            // Add timestamp to bust cache
            const url: string = data.secure_url + '?v=' + Date.now();

            // Save to Firebase Auth & Firestore
            await updateProfile(user, { photoURL: url });
            await setDoc(doc(db, 'profiles', user.uid), { photoURL: url }, { merge: true });
            await user.reload();

            setPhotoURL(url);
            setUploadProgress(null);
            showMsg('Foto profil berhasil diperbarui! ✓');
          } catch (err: any) {
            console.error('Cloudinary upload error:', err);
            setUploadProgress(null);
            showMsg(`Gagal upload foto: ${err.message}`, 'error');
          }
        }, 'image/jpeg', 0.85);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── Save profile ─────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !fullName.trim()) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'profiles', user.uid), {
        fullName: fullName.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      await updateProfile(user, { displayName: fullName.trim() });
      // Force AuthContext to pick up new displayName
      await user.reload();
      showMsg('Profil berhasil diperbarui! ✓');
    } catch {
      showMsg('Gagal memperbarui profil. Coba lagi.', 'error');
    } finally { setSaving(false); }
  };

  // ── Change password ──────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentPw || !newPw) return;
    if (newPw !== confirmPw) { showMsg('Password baru tidak cocok.', 'error'); return; }
    if (newPw.length < 8) { showMsg('Password baru minimal 8 karakter.', 'error'); return; }
    setSavingPw(true);
    try {
      const cred = EmailAuthProvider.credential(user.email!, currentPw);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPw);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setShowPwForm(false);
      showMsg('Password berhasil diubah! ✓');
    } catch (err: any) {
      const msgs: Record<string, string> = {
        'auth/wrong-password': 'Password lama salah.',
        'auth/invalid-credential': 'Password lama salah.',
        'auth/weak-password': 'Password baru terlalu lemah.',
        'auth/too-many-requests': 'Terlalu banyak percobaan. Tunggu sebentar.',
      };
      showMsg(msgs[err.code] || `Gagal ganti password. (${err.code})`, 'error');
    } finally { setSavingPw(false); }
  };

  // ── Send password reset email ────────────────────────────
  const handleSendReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      showMsg(`Link reset password dikirim ke ${user.email}`, 'info');
    } catch { showMsg('Gagal kirim email reset. Coba lagi.', 'error'); }
    finally { setSendingReset(false); }
  };

  // ── Resend email verification ────────────────────────────
  const handleResendVerification = async () => {
    if (!user) return;
    setSendingVerif(true);
    try {
      await sendEmailVerification(user);
      showMsg('Email verifikasi terkirim! Cek inbox kamu.', 'info');
    } catch (err: any) {
      const msgs: Record<string, string> = { 'auth/too-many-requests': 'Terlalu sering. Tunggu beberapa menit.' };
      showMsg(msgs[err.code] || 'Gagal kirim email verifikasi.', 'error');
    } finally { setSendingVerif(false); }
  };

  // ── Google linking ───────────────────────────────────────
  const handleLinkGoogle = async () => {
    if (!user) return;
    setLinkingGoogle(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account', client_id: GOOGLE_CLIENT_ID });
      await linkWithPopup(user, provider);
      showMsg('Akun Google berhasil dihubungkan! ✓');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') { setLinkingGoogle(false); return; }
      const msgs: Record<string, string> = {
        'auth/provider-already-linked': 'Google sudah terhubung.',
        'auth/credential-already-in-use': 'Akun Google ini sudah dipakai user lain.',
        'auth/popup-blocked': 'Popup diblokir browser.',
        'auth/unauthorized-domain': 'Domain belum diizinkan di Firebase Console.',
      };
      showMsg(msgs[err.code] || `Gagal hubungkan Google. (${err.code})`, 'error');
    } finally { setLinkingGoogle(false); }
  };

  const handleUnlinkGoogle = async () => {
    if (!user || !hasPasswordProvider) return;
    setLinkingGoogle(true);
    try {
      await unlink(user, 'google.com');
      showMsg('Akun Google berhasil diputus.');
    } catch { showMsg('Gagal memutus akun Google.', 'error'); }
    finally { setLinkingGoogle(false); }
  };

  // ── Custom categories ────────────────────────────────────
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCatName.trim()) return;
    const exists = allCategories.some(c =>
      c.name.toLowerCase() === newCatName.trim().toLowerCase() && c.type === newCatType);
    if (exists) { showMsg('Kategori dengan nama ini sudah ada.', 'error'); return; }
    setAddingCat(true);
    try {
      await addDoc(collection(db, 'categories'), {
        name: newCatName.trim(), type: newCatType,
        userId: user.uid, isGlobal: false, icon: 'tag',
      });
      setNewCatName('');
    } catch { showMsg('Gagal menambah kategori.', 'error'); }
    finally { setAddingCat(false); }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
      setDeletingCatId(null);
    } catch { showMsg('Gagal menghapus kategori.', 'error'); }
  };

  const handleSignOut = async () => { try { await auth.signOut(); } catch { /* ignore */ } };

  const initial = (user?.displayName || user?.email || 'U').charAt(0).toUpperCase();
  const joinDate = user?.metadata?.creationTime
    ? format(new Date(user.metadata.creationTime), 'MMMM yyyy', { locale: idLocale })
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-5 w-full pb-6">

      {/* Global message */}
      {msg && <StatusMsg msg={msg} onClose={() => setMsg(null)} />}

      {/* ── PROFILE CARD ──────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-[#e4e1da] shadow-sm overflow-hidden">
        {/* Header strip */}
        <div className="h-20 bg-gradient-to-r from-[#0f6e56] to-[#1a9472]" />
        <div className="px-7 pb-7">
          {/* Avatar */}
          <div className="flex items-end gap-5 -mt-10 mb-6">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-[#e2f4ef] border-4 border-white ring-2 ring-[#d6eee6]
                              flex items-center justify-center text-[#0f6e56] font-bold text-3xl shadow-sm overflow-hidden">
                {photoURL
                  ? <img src={photoURL} alt="Foto profil" className="w-full h-full object-cover" />
                  : initial}
              </div>
              {/* Upload progress overlay */}
              {uploadProgress !== null && (
                <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50">
                  <span className="text-white text-xs font-bold">{uploadProgress}%</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadProgress !== null}
                title="Ganti foto profil"
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#0f6e56] text-white
                           flex items-center justify-center border-2 border-white hover:bg-[#075b46]
                           transition-colors disabled:opacity-50">
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden" onChange={handlePhotoChange} />
            </div>
            <div className="mb-2">
              <p className="text-lg font-bold text-[#1d2421]">{user?.displayName || 'Pengguna'}</p>
              <p className="text-sm text-[#777670]">{user?.email}</p>
              {joinDate && <p className="text-xs text-[#92908a] mt-0.5">Bergabung sejak {joinDate}</p>}
            </div>
          </div>

          {/* Form */}
          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-11 bg-[#f4f2ed] rounded-xl" />
              <div className="h-11 bg-[#f4f2ed] rounded-xl" />
              <div className="h-20 bg-[#f4f2ed] rounded-xl" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5f5e5a] uppercase tracking-wider mb-1.5">
                    Nama Lengkap <span className="text-[#b11818]">*</span>
                  </label>
                  <input type="text" required minLength={2} maxLength={60}
                    value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Nama lengkapmu"
                    className="w-full rounded-xl border border-[#dedbd4] bg-white text-[#252b28] text-sm p-3
                               focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5f5e5a] uppercase tracking-wider mb-1.5">Email</label>
                  <input type="email" disabled value={user?.email || ''}
                    className="w-full rounded-xl border border-[#e4e1da] bg-[#f7f6f2] text-[#777670] text-sm p-3 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5f5e5a] uppercase tracking-wider mb-1.5">Nomor HP</label>
                  <input type="tel" maxLength={25}
                    value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+62 812 3456 7890"
                    className="w-full rounded-xl border border-[#dedbd4] bg-white text-[#252b28] text-sm p-3
                               focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5f5e5a] uppercase tracking-wider mb-1.5">Bio</label>
                <textarea rows={3} maxLength={200}
                  value={bio} onChange={e => setBio(e.target.value)}
                  placeholder="Ceritakan sedikit tentang dirimu... (opsional)"
                  className="w-full rounded-xl border border-[#dedbd4] bg-white text-[#252b28] text-sm p-3 resize-none
                             focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20" />
                <p className="text-right text-xs text-[#92908a] mt-1">{bio.length}/200</p>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={saving || !fullName.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white
                             bg-[#0f6e56] hover:bg-[#075b46] disabled:opacity-50 transition-colors shadow-sm">
                  {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Menyimpan...</>
                           : <><CheckCircle className="w-4 h-4" />Simpan Perubahan</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ── SECURITY ─────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-[#e4e1da] p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#e2f4ef] text-[#0f6e56] flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-[#1d2421]">Keamanan Akun</h3>
        </div>

        <div className="space-y-3">
          {/* Email verification */}
          {hasPasswordProvider && (
            <div className={cn('rounded-xl px-4 py-3 flex items-center justify-between gap-3',
              user?.emailVerified ? 'bg-[#e2f4ef]' : 'bg-[#fff8e6]')}>
              <div className="flex items-center gap-3">
                <Mail className={cn('w-4 h-4 flex-shrink-0', user?.emailVerified ? 'text-[#0f6e56]' : 'text-[#c47205]')} />
                <div>
                  <p className={cn('text-sm font-semibold', user?.emailVerified ? 'text-[#0f6e56]' : 'text-[#7a5800]')}>
                    {user?.emailVerified ? 'Email sudah diverifikasi ✓' : 'Email belum diverifikasi'}
                  </p>
                  {!user?.emailVerified && <p className="text-xs text-[#7a5800] mt-0.5">Cek inbox untuk link verifikasi</p>}
                </div>
              </div>
              {!user?.emailVerified && (
                <button onClick={handleResendVerification} disabled={sendingVerif}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#c47205] hover:text-[#7a5800] disabled:opacity-50 transition-colors bg-white px-3 py-1.5 rounded-lg border border-[#f0d080]">
                  {sendingVerif ? <div className="w-3 h-3 border-2 border-[#c47205]/30 border-t-[#c47205] rounded-full animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Kirim ulang
                </button>
              )}
            </div>
          )}

          {/* Password provider */}
          <div className="rounded-xl bg-[#f4f2ed] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LockKeyhole className="w-4 h-4 text-[#777670]" />
              <div>
                <p className="text-sm font-medium text-[#252b28]">Password</p>
                <p className="text-xs text-[#777670]">{hasPasswordProvider ? 'Login dengan email & password aktif' : 'Tidak digunakan'}</p>
              </div>
            </div>
            {hasPasswordProvider && (
              <button onClick={() => setShowPwForm(!showPwForm)}
                className={cn('text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors',
                  showPwForm ? 'bg-[#f5e6e2] text-[#954c41]' : 'bg-[#dff3ed] text-[#0f6e56] hover:bg-[#c8eddf]')}>
                {showPwForm ? 'Batal' : 'Ganti Password'}
              </button>
            )}
          </div>

          {/* Change password form */}
          {showPwForm && hasPasswordProvider && (
            <form onSubmit={handleChangePassword}
              className="bg-[#f7f6f2] rounded-xl p-4 space-y-3 border border-[#e4e1da]">
              <p className="text-xs font-bold text-[#5f5e5a] uppercase tracking-wider">Ganti Password</p>
              {[
                { label: 'Password Lama', val: currentPw, set: setCurrentPw, show: showCurrentPw, toggle: () => setShowCurrentPw(p => !p) },
                { label: 'Password Baru (min. 8 karakter)', val: newPw, set: setNewPw, show: showNewPw, toggle: () => setShowNewPw(p => !p) },
                { label: 'Konfirmasi Password Baru', val: confirmPw, set: setConfirmPw, show: showNewPw, toggle: () => setShowNewPw(p => !p) },
              ].map(({ label, val, set, show, toggle }) => (
                <div key={label} className="relative">
                  <label className="block text-xs font-medium text-[#5f5e5a] mb-1">{label}</label>
                  <input type={show ? 'text' : 'password'} required minLength={label.includes('Baru') ? 8 : 1}
                    value={val} onChange={e => set(e.target.value)}
                    className="w-full rounded-xl border border-[#dedbd4] bg-white text-[#252b28] text-sm p-2.5 pr-10
                               focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20" />
                  <button type="button" onClick={toggle}
                    className="absolute right-3 top-[calc(50%+6px)] -translate-y-1/2 text-[#96938c] hover:text-[#1d2421]">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={savingPw}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#0f6e56] hover:bg-[#075b46] disabled:opacity-50 transition-colors">
                  {savingPw ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  Simpan Password
                </button>
                <button type="button" onClick={handleSendReset} disabled={sendingReset}
                  className="text-xs text-[#777670] hover:text-[#0f6e56] transition-colors disabled:opacity-50">
                  {sendingReset ? 'Mengirim...' : 'Lupa password lama? Reset via email'}
                </button>
              </div>
            </form>
          )}

          {/* Google provider */}
          <div className="rounded-xl bg-[#f4f2ed] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0">
                <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.51h3.14c1.84-1.7 2.91-4.2 2.91-7.28Z" />
                <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.35L15.3 16.9c-.87.58-1.98.92-3.3.92-2.54 0-4.7-1.72-5.48-4.03H3.27v2.59A9.75 9.75 0 0 0 12 21.75Z" />
                <path fill="#FBBC05" d="M6.52 13.79A5.85 5.85 0 0 1 6.21 12c0-.62.11-1.21.31-1.79V7.62H3.27A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.02 4.38l3.25-2.59Z" />
                <path fill="#EA4335" d="M12 6.18c1.43 0 2.7.49 3.71 1.45l2.78-2.78C16.84 3.3 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.73 5.37l3.25 2.59C7.3 7.9 9.46 6.18 12 6.18Z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-[#252b28]">Google</p>
                <p className="text-xs text-[#777670]">{isGoogleLinked ? 'Terhubung — bisa login via Google' : 'Belum terhubung'}</p>
              </div>
            </div>
            {isGoogleLinked ? (
              hasPasswordProvider && (
                <button onClick={handleUnlinkGoogle} disabled={linkingGoogle}
                  className="flex items-center gap-1 text-xs text-[#954c41] hover:text-[#7c3e35] transition-colors disabled:opacity-50 bg-[#f5e6e2] px-3 py-1.5 rounded-lg">
                  {linkingGoogle ? <div className="w-3 h-3 border-2 border-[#954c41]/30 border-t-[#954c41] rounded-full animate-spin" /> : <Link2Off className="w-3.5 h-3.5" />}
                  Putuskan
                </button>
              )
            ) : (
              <button onClick={handleLinkGoogle} disabled={linkingGoogle}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#0f6e56] disabled:opacity-50 bg-[#dff3ed] px-3 py-1.5 rounded-lg hover:bg-[#c8eddf] transition-colors">
                {linkingGoogle ? <div className="w-3 h-3 border-2 border-[#0f6e56]/30 border-t-[#0f6e56] rounded-full animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                Hubungkan
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── CUSTOM CATEGORIES ────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-[#e4e1da] p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#e2f4ef] text-[#0f6e56] flex items-center justify-center flex-shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1d2421]">Kategori Kustom</h3>
            <p className="text-sm text-[#777670]">Tambah kategori sendiri untuk transaksi dan anggaran</p>
          </div>
        </div>

        <form onSubmit={handleAddCategory} className="flex flex-wrap gap-3 items-end mb-5">
          <div className="flex-1 min-w-44">
            <label className="block text-xs font-medium text-[#5f5e5a] mb-1.5">Nama Kategori</label>
            <input type="text" required maxLength={40}
              value={newCatName} onChange={e => setNewCatName(e.target.value)}
              placeholder="Contoh: BPJS, Investasi, Tabungan..."
              className="w-full rounded-xl border border-[#dedbd4] bg-[#f7f6f2] text-[#252b28] text-sm p-2.5
                         placeholder-[#aaa8a2] focus:outline-none focus:border-[#0f6e56]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#5f5e5a] mb-1.5">Tipe</label>
            <select value={newCatType} onChange={e => setNewCatType(e.target.value as 'income' | 'expense')}
              className="rounded-xl border border-[#dedbd4] bg-[#f7f6f2] text-[#252b28] text-sm p-2.5
                         focus:outline-none focus:border-[#0f6e56]">
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
            </select>
          </div>
          <button type="submit" disabled={addingCat || !newCatName.trim()}
            className="flex items-center gap-2 rounded-xl bg-[#0f6e56] px-4 py-2.5 text-sm font-bold text-white
                       hover:bg-[#075b46] disabled:opacity-50 transition-colors">
            {addingCat ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
            Tambah
          </button>
        </form>

        {customCategories.length === 0 ? (
          <p className="text-sm text-[#92908a] text-center py-6 bg-[#f7f6f2] rounded-xl">
            Belum ada kategori kustom. Tambahkan di atas.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {customCategories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#f7f6f2] border border-[#e4e1da]">
                <div className="flex items-center gap-3">
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-bold',
                    cat.type === 'income' ? 'bg-[#e2f4ef] text-[#0f6e56]' : 'bg-[#f5e6e2] text-[#954c41]')}>
                    {cat.type === 'income' ? 'Masuk' : 'Keluar'}
                  </span>
                  <span className="text-sm font-medium text-[#252b28]">{cat.name}</span>
                </div>
                {deletingCatId === cat.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleDeleteCategory(cat.id)}
                      className="text-xs bg-[#954c41] text-white px-2 py-1 rounded-lg hover:bg-[#7c3e35] transition-colors">Hapus</button>
                    <button onClick={() => setDeletingCatId(null)}
                      className="text-xs bg-white text-[#5f5e5a] px-2 py-1 rounded-lg border border-[#e4e1da] hover:bg-[#f4f2ed] transition-colors">Batal</button>
                  </div>
                ) : (
                  <button onClick={() => setDeletingCatId(cat.id)}
                    className="text-[#96938c] hover:text-[#954c41] transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── DANGER ZONE ───────────────────────────────────── */}
      <section className="bg-[#fffaf8] rounded-2xl border border-[#ebc8c0] p-6">
        <h3 className="text-base font-bold text-[#b11818] mb-1">Danger Zone</h3>
        <p className="text-sm text-[#777670] mb-4">Keluar dari akun di perangkat ini.</p>
        <button onClick={handleSignOut}
          className="flex items-center gap-2 py-2.5 px-4 border border-[#d9aaa2] rounded-xl
                     text-sm font-bold text-[#954c41] bg-white hover:bg-[#f5e6e2] transition-colors">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </section>
    </div>
  );
}
