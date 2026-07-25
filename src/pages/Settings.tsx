import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { LogOut, CheckCircle, XCircle, Palette, ShieldCheck, Star, LockKeyhole, Camera, Zap } from 'lucide-react';

export function Settings() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
          // Fallback to Firebase Auth displayName
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
              <div className="space-y-3 animate-pulse"><div className="h-12 bg-[#f4f2ed] rounded-xl" /><div className="h-12 bg-[#f4f2ed] rounded-xl" /></div>
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
            <div className="rounded-xl bg-[#f4f2ed] px-4 py-4 flex items-center justify-between"><div className="flex items-center gap-3"><LockKeyhole className="w-5 h-5 text-[#777670]" /><span className="font-medium text-[#252b28]">Password</span></div><span className="text-sm font-semibold text-[#0f6e56]">Dikelola oleh Firebase</span></div>
            <p className="text-sm text-[#777670] mt-5">Akun Anda diamankan melalui autentikasi Firebase.</p>
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
    </div>
  );
}
