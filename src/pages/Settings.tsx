import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, addDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { updateProfile, GoogleAuthProvider, linkWithPopup, unlink } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { LogOut, CheckCircle, XCircle, Palette, ShieldCheck, Star, LockKeyhole, Camera, Zap, Tag, Plus, Trash2, Link2, Link2Off, AlertCircle } from 'lucide-react';
import { useCategories } from '../lib/useCategories';
import { Category } from '../types';
import { cn } from '../lib/utils';

const GOOGLE_CLIENT_ID = '206410490366-4n8iov2av33v4uuj7a9dbm3d79ccs99m.apps.googleusercontent.com';

export function Settings() {
  const { user } = useAuth();
  const { categories: allCategories } = useCategories();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Custom categories state
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');
  const [addingCat, setAddingCat] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  // Google linking state
  const isGoogleLinked = user?.providerData?.some(p => p.providerId === 'google.com') ?? false;
  const hasPasswordProvider = user?.providerData?.some(p => p.providerId === 'password') ?? false;
  const [linkingGoogle, setLinkingGoogle] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'profiles', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFullName(docSnap.data().fullName || '');
          setPhone(docSnap.data().phone || '');
        } else {
          setFullName(user.displayName || '');
        }
      } catch (err) {
        console.error('Error fetching profile', err);
        setFullName(user.displayName || '');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  // Fetch user's custom categories from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'categories'), where('userId', '==', user.uid));
    return onSnapshot(q, snap => {
      setCustomCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    }, err => console.error('Categories error:', err));
  }, [user]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCatName.trim()) return;
    // Check for duplicates
    const exists = allCategories.some(c => c.name.toLowerCase() === newCatName.trim().toLowerCase() && c.type === newCatType);
    if (exists) {
      setMessage({ text: 'Kategori dengan nama ini sudah ada.', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setAddingCat(true);
    try {
      await addDoc(collection(db, 'categories'), {
        name: newCatName.trim(),
        type: newCatType,
        userId: user.uid,
        isGlobal: false,
        icon: 'tag',
      });
      setNewCatName('');
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Gagal menambah kategori.', type: 'error' });
    } finally {
      setAddingCat(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
      setDeletingCatId(null);
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Gagal menghapus kategori.', type: 'error' });
    }
  };

  const handleLinkGoogle = async () => {
    if (!user) return;
    setLinkingGoogle(true);
    setMessage(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account', client_id: GOOGLE_CLIENT_ID });
      await linkWithPopup(user, provider);
      setMessage({ text: 'Akun Google berhasil dihubungkan! Kamu sekarang bisa login dengan Google atau password.', type: 'success' });
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setLinkingGoogle(false);
        return;
      }
      const msgs: Record<string, string> = {
        'auth/provider-already-linked': 'Akun Google sudah terhubung.',
        'auth/credential-already-in-use': 'Akun Google ini sudah dipakai oleh user lain.',
        'auth/popup-blocked': 'Popup diblokir browser. Izinkan popup untuk situs ini.',
        'auth/unauthorized-domain': 'Domain belum diizinkan di Firebase Console.',
      };
      setMessage({ type: 'error', text: msgs[err.code] || `Gagal menghubungkan Google. (${err.code})` });
    } finally {
      setLinkingGoogle(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!user || !hasPasswordProvider) return; // jangan unlink kalau tidak ada provider lain
    setLinkingGoogle(true);
    try {
      await unlink(user, 'google.com');
      setMessage({ text: 'Akun Google berhasil diputus. Kamu masih bisa login dengan password.', type: 'success' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Gagal memutus akun Google.' });
    } finally {
      setLinkingGoogle(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !fullName.trim()) return;
    setSaving(true);
    setMessage(null);

    try {
      // Save to Firestore
      await setDoc(doc(db, 'profiles', user.uid), {
        fullName: fullName.trim(),
        phone: phone.trim(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Also update Firebase Auth displayName
      await updateProfile(user, { displayName: fullName.trim() });

      setMessage({ text: 'Profil berhasil diperbarui!', type: 'success' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Gagal memperbarui profil. Coba lagi.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 w-full pb-6">
      {/* Profile */}
      <div className="bg-white p-7 rounded-2xl border border-[#e4e1da] shadow-sm">
        <div className="flex flex-col md:flex-row gap-7">
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="relative w-28 h-28 rounded-full bg-[#e2f4ef] border-4 border-white ring-2 ring-[#d6eee6] flex items-center justify-center text-[#0f6e56] font-bold text-4xl shadow-sm">
              {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
              <span className="absolute right-0 bottom-0 w-10 h-10 rounded-full bg-[#0f6e56] text-white flex items-center justify-center border-2 border-white"><Camera className="w-4 h-4" /></span>
            </div>
            <p className="mt-4 text-sm font-medium text-[#0f6e56]">Avatar akun</p>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-bold text-[#1d2421]">Profile Details</h3>
            <p className="text-[#777670] text-sm mt-1 mb-5">Kelola informasi publik dan detail kontak Anda.</p>
            {loading ? (
              <div className="space-y-3 animate-pulse"><div className="h-12 bg-[#eaf4f0] rounded-xl" /><div className="h-12 bg-[#f4f2ed] rounded-xl" /></div>
            ) : (
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div><label className="block text-xs font-medium text-[#5f5e5a] mb-1.5">Full Name</label><input type="text" required minLength={2} maxLength={60} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Masukkan nama lengkapmu" className="w-full rounded-xl border border-[#dedbd4] bg-white text-[#252b28] focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20 text-sm p-3" /></div>
                <div><label className="block text-xs font-medium text-[#5f5e5a] mb-1.5">Email Address</label><input type="email" disabled value={user?.email || ''} className="w-full rounded-xl border border-[#e4e1da] bg-[#f7f6f2] text-[#777670] text-sm p-3 cursor-not-allowed" /></div>
                <div><label className="block text-xs font-medium text-[#5f5e5a] mb-1.5">Phone Number</label><input type="tel" maxLength={25} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Contoh: +62 812 3456 7890" className="w-full rounded-xl border border-[#dedbd4] bg-white text-[#252b28] focus:outline-none focus:border-[#0f6e56] focus:ring-1 focus:ring-[#0f6e56]/20 text-sm p-3" /></div>
                <button type="submit" disabled={saving || !fullName.trim()} className="h-[46px] flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white bg-[#0f6e56] hover:bg-[#075b46] transition-colors disabled:opacity-50">{saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Menyimpan...</> : 'Save Changes'}</button>
              </form>
            )}
          </div>
        </div>
        {message && <div className={`mt-5 px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-[#e2f4ef] border border-[#acd3c7] text-[#0f6e56]' : 'bg-[#f5e6e2] border border-[#d9aaa2] text-[#954c41]'}`}>{message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}{message.text}</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          <section className="bg-white rounded-2xl border border-[#e4e1da] p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-7"><div className="w-12 h-12 rounded-xl bg-[#e2f4ef] text-[#0f6e56] flex items-center justify-center"><Palette className="w-6 h-6" /></div><h3 className="text-xl font-bold text-[#1d2421]">Appearance</h3></div>
            <div className="flex items-center justify-between"><div><p className="font-medium text-[#252b28]">Tema tampilan</p><p className="text-sm text-[#777670] mt-1">FinGuide memakai tampilan terang.</p></div><span className="rounded-full bg-[#e2f4ef] px-3 py-1.5 text-xs font-bold text-[#0f6e56]">Light Mode</span></div>
            <div className="mt-6"><label className="block text-sm font-medium text-[#252b28] mb-2">App Language</label><select defaultValue="id" className="w-full rounded-xl border border-[#dedbd4] bg-white text-[#252b28] text-sm p-3 focus:outline-none focus:border-[#0f6e56]"><option value="id">Bahasa Indonesia</option><option value="en">English (US)</option></select></div>
          </section>
          <section className="bg-white rounded-2xl border border-[#e4e1da] p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6"><div className="w-12 h-12 rounded-xl bg-[#e2f4ef] text-[#0f6e56] flex items-center justify-center"><ShieldCheck className="w-6 h-6" /></div><h3 className="text-xl font-bold text-[#1d2421]">Security</h3></div>
            <div className="space-y-3">
              <div className="rounded-xl bg-[#f4f2ed] px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3"><LockKeyhole className="w-5 h-5 text-[#777670]" /><span className="font-medium text-[#252b28]">Password</span></div>
                <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', hasPasswordProvider ? 'bg-[#e2f4ef] text-[#0f6e56]' : 'bg-[#f4f2ed] text-[#777670]')}>
                  {hasPasswordProvider ? '✓ Aktif' : 'Tidak ada'}
                </span>
              </div>
              <div className="rounded-xl bg-[#f4f2ed] px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
                    <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.51h3.14c1.84-1.7 2.91-4.2 2.91-7.28Z" />
                    <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.35L15.3 16.9c-.87.58-1.98.92-3.3.92-2.54 0-4.7-1.72-5.48-4.03H3.27v2.59A9.75 9.75 0 0 0 12 21.75Z" />
                    <path fill="#FBBC05" d="M6.52 13.79A5.85 5.85 0 0 1 6.21 12c0-.62.11-1.21.31-1.79V7.62H3.27A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.02 4.38l3.25-2.59Z" />
                    <path fill="#EA4335" d="M12 6.18c1.43 0 2.7.49 3.71 1.45l2.78-2.78C16.84 3.3 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.73 5.37l3.25 2.59C7.3 7.9 9.46 6.18 12 6.18Z" />
                  </svg>
                  <span className="font-medium text-[#252b28]">Google</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', isGoogleLinked ? 'bg-[#e2f4ef] text-[#0f6e56]' : 'bg-[#f4f2ed] text-[#777670]')}>
                    {isGoogleLinked ? '✓ Terhubung' : 'Belum terhubung'}
                  </span>
                  {isGoogleLinked ? (
                    hasPasswordProvider && (
                      <button onClick={handleUnlinkGoogle} disabled={linkingGoogle}
                        className="flex items-center gap-1 text-xs text-[#954c41] hover:text-[#7c3e35] transition-colors disabled:opacity-50">
                        <Link2Off className="w-3.5 h-3.5" /> Putus
                      </button>
                    )
                  ) : (
                    <button onClick={handleLinkGoogle} disabled={linkingGoogle}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#0f6e56] hover:text-[#075b46] transition-colors disabled:opacity-50 bg-[#dff3ed] px-2.5 py-1.5 rounded-lg">
                      {linkingGoogle ? <div className="w-3 h-3 border-2 border-[#0f6e56]/30 border-t-[#0f6e56] rounded-full animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                      Hubungkan
                    </button>
                  )}
                </div>
              </div>
              {/* Email verification status */}
              {hasPasswordProvider && (
                <div className={cn('rounded-xl px-4 py-3 flex items-center gap-3 text-sm',
                  user?.emailVerified ? 'bg-[#e2f4ef] text-[#0f6e56]' : 'bg-[#fff8e6] text-[#7a5800]')}>
                  {user?.emailVerified
                    ? <><CheckCircle className="w-4 h-4 flex-shrink-0" /> Email sudah diverifikasi</>
                    : <><AlertCircle className="w-4 h-4 flex-shrink-0" /> Email belum diverifikasi — cek inbox kamu</>}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="bg-white rounded-2xl border border-[#e4e1da] p-6 shadow-sm min-h-80">
            <div className="flex items-center gap-4 mb-6"><div className="w-12 h-12 rounded-xl bg-[#e2f4ef] text-[#0f6e56] flex items-center justify-center"><Star className="w-6 h-6" /></div><h3 className="text-xl font-bold text-[#1d2421]">Subscription</h3></div>
            <div className="rounded-2xl bg-gradient-to-br from-[#0f6e56] to-[#075b46] p-6 text-white"><div className="flex justify-between items-start"><div><p className="text-sm text-[#bde4d7]">Current Plan</p><p className="text-3xl font-bold mt-1">Free Basic</p></div><span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">ACTIVE</span></div><p className="mt-5 text-sm leading-relaxed text-[#d7efe7]">Akses pencatatan transaksi, anggaran, dan analisis keuangan dasar.</p><button className="mt-6 w-full rounded-xl bg-white py-3 text-sm font-bold text-[#0f6e56] hover:bg-[#f4f2ed] transition-colors"><Zap className="inline w-4 h-4 mr-1.5" />Upgrade to Pro</button></div>
            <ul className="mt-6 space-y-3 text-sm text-[#3f4642]"><li className="flex gap-2"><CheckCircle className="w-4 h-4 text-[#0f6e56]" />Pencatatan transaksi tanpa batas</li><li className="flex gap-2"><CheckCircle className="w-4 h-4 text-[#0f6e56]" />Saran finansial dasar dari AI</li><li className="flex gap-2 text-[#92908a]"><XCircle className="w-4 h-4" />Proyeksi kekayaan lanjutan</li></ul>
          </section>
          <section className="bg-[#fffaf8] rounded-2xl border border-[#ebc8c0] p-6"><h3 className="text-lg font-bold text-[#b11818] mb-2">Danger Zone</h3><p className="text-sm text-[#777670] mb-4">Keluar dari akun di perangkat ini.</p><button onClick={handleSignOut} className="flex items-center gap-2 py-2.5 px-4 border border-[#d9aaa2] rounded-xl text-sm font-bold text-[#954c41] bg-white hover:bg-[#f5e6e2] transition-colors"><LogOut className="w-4 h-4" />Sign Out</button></section>
        </div>
      </div>

      {/* Custom Categories */}
      <section className="bg-white rounded-2xl border border-[#e4e1da] p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#e2f4ef] text-[#0f6e56] flex items-center justify-center">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#1d2421]">Kategori Kustom</h3>
            <p className="text-sm text-[#777670] mt-0.5">Tambahkan kategori sendiri untuk transaksi dan anggaran</p>
          </div>
        </div>

        {/* Add category form */}
        <form onSubmit={handleAddCategory} className="flex flex-wrap gap-3 items-end mb-6">
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-[#5f5e5a] mb-1.5">Nama Kategori</label>
            <input
              type="text" required maxLength={40}
              value={newCatName} onChange={e => setNewCatName(e.target.value)}
              placeholder="Contoh: BPJS, Investasi..."
              className="w-full rounded-xl border border-[#dedbd4] bg-[#f7f6f2] text-[#252b28] text-sm p-2.5 placeholder-[#aaa8a2] focus:outline-none focus:border-[#0f6e56]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#5f5e5a] mb-1.5">Tipe</label>
            <select value={newCatType} onChange={e => setNewCatType(e.target.value as 'income' | 'expense')}
              className="rounded-xl border border-[#dedbd4] bg-[#f7f6f2] text-[#252b28] text-sm p-2.5 focus:outline-none focus:border-[#0f6e56]">
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
            </select>
          </div>
          <button type="submit" disabled={addingCat || !newCatName.trim()}
            className="flex items-center gap-2 rounded-xl bg-[#0f6e56] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#075b46] disabled:opacity-50 transition-colors">
            {addingCat ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
            Tambah
          </button>
        </form>

        {/* List custom categories */}
        {customCategories.length === 0 ? (
          <p className="text-sm text-[#92908a] text-center py-4">Belum ada kategori kustom. Tambahkan di atas.</p>
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
                      className="text-xs bg-[#954c41] text-white px-2 py-1 rounded-lg hover:bg-[#7c3e35] transition-colors">
                      Hapus
                    </button>
                    <button onClick={() => setDeletingCatId(null)}
                      className="text-xs bg-white text-[#5f5e5a] px-2 py-1 rounded-lg border border-[#e4e1da] hover:bg-[#f4f2ed] transition-colors">
                      Batal
                    </button>
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
    </div>
  );
}
