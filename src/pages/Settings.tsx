import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { UserCircle, LogOut } from 'lucide-react';

export function Settings() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'profiles', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFullName(docSnap.data().fullName || '');
        }
      } catch (error) {
        console.error("Error fetching profile", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage('');
    
    try {
      await updateDoc(doc(db, 'profiles', user.uid), {
        fullName
      });
      setMessage('Profile updated successfully');
    } catch (error) {
      console.error(error);
      setMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 w-full">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Settings</h2>
        <p className="text-slate-400 text-sm">Manage your account preferences</p>
      </div>

      <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300 flex items-center mb-6">
          <UserCircle className="w-5 h-5 mr-2 text-indigo-400" /> Profile Information
        </h3>
        
        {loading ? (
          <p className="text-slate-400 text-sm">Loading...</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full rounded-xl border border-white/5 bg-black/20 text-slate-400 sm:text-sm p-2.5 cursor-not-allowed"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 sm:text-sm p-2.5"
              />
            </div>

            {message && (
              <p className={`text-sm ${message.includes('success') ? 'text-emerald-400' : 'text-rose-400'}`}>
                {message}
              </p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="py-2.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-500/20 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="bg-rose-500/10 backdrop-blur-md p-6 rounded-2xl border border-rose-500/20">
        <h3 className="text-sm font-bold uppercase tracking-widest text-rose-400 mb-2">Danger Zone</h3>
        <p className="text-sm text-slate-400 mb-4">Sign out of your account on this device.</p>
        <button
          onClick={() => auth.signOut()}
          className="flex items-center py-2.5 px-4 border border-rose-500/30 rounded-xl shadow-sm text-sm font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </button>
      </div>
    </div>
  );
}
