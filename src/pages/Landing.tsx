import { Link } from 'react-router-dom';
import { Wallet, TrendingUp, Bot, Target, Shield, Zap } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export function Landing() {
  const { user } = useAuth();

  return (
    <div className="w-full min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
      {/* Mesh Gradient Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[150px] rounded-full pointer-events-none"></div>
      
      {/* Navbar */}
      <nav className="w-full px-6 py-6 flex justify-between items-center relative z-10 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">FinLit</span>
        </div>
        <div>
          {user ? (
            <Link to="/app" className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm font-bold text-white transition-colors backdrop-blur-md">
              Go to Dashboard
            </Link>
          ) : (
            <Link to="/login" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/50 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-colors">
              Masuk / Daftar
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10 mt-20 mb-32 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-8 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Powered by AI (Gemini)
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Cerdas Kelola Uang, <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">Tenang Masa Depan.</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl leading-relaxed">
          FinLit bukan sekadar aplikasi pencatat keuangan. Ini adalah asisten finansial pribadimu yang memberikan insight cerdas berdasarkan pengeluaran aslimu.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link to={user ? "/app" : "/register"} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/50 rounded-xl text-base font-bold text-white shadow-lg shadow-indigo-500/20 transition-colors flex items-center justify-center gap-2">
            Mulai Sekarang <Zap className="w-4 h-4" />
          </Link>
          <a href="#tentang" className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-base font-bold text-white transition-colors backdrop-blur-md">
            Pelajari Lebih Lanjut
          </a>
        </div>
      </main>

      {/* Content Sections */}
      <div className="w-full bg-black/20 border-t border-white/5 relative z-10" id="tentang">
        <div className="max-w-6xl mx-auto px-6 py-24 space-y-32">
          
          {/* Kenapa FinLit Ada */}
          <section className="flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl font-bold text-white">Kenapa FinLit Hadir?</h2>
              <p className="text-slate-400 leading-relaxed text-lg">
                Banyak anak muda, mulai dari mahasiswa hingga <span className="text-slate-200 font-medium">first-jobber</span>, sering merasa gaji numpang lewat. Sulit melacak kemana perginya uang, dan sering kehabisan dana sebelum akhir bulan karena pengeluaran impulsif. 
                <br/><br/>
                FinLit hadir untuk memecahkan masalah ini. Kami ingin membantumu sadar akan kebiasaan finansialmu tanpa perlu ribet mengerti istilah ekonomi yang rumit.
              </p>
            </div>
            <div className="flex-1 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-3xl rounded-full"></div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl relative">
                <Target className="w-12 h-12 text-rose-400 mb-6" />
                <h3 className="text-xl font-bold text-white mb-2">Masalah Utama</h3>
                <ul className="space-y-4 text-slate-400">
                  <li className="flex gap-3 items-start"><div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-500"></div> Tidak tahu persis total pengeluaran bulanan.</li>
                  <li className="flex gap-3 items-start"><div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-500"></div> Anggaran sering jebol karena ngopi & hiburan.</li>
                  <li className="flex gap-3 items-start"><div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-500"></div> Bingung cara mulai menabung & alokasi gaji.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Fitur Utama */}
          <section>
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white mb-4">Fitur Andalan Kami</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">Alat yang kamu butuhkan untuk mengambil alih kendali atas uangmu.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 backdrop-blur-md p-8 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Catat & Pantau</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Pencatatan transaksi yang super cepat. Ketahui persis berapa pemasukan dan pengeluaranmu bulan ini.</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md p-8 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Limit Anggaran</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Set batas pengeluaran per kategori. Indikator warna akan memperingatkanmu jika pengeluaran sudah mendekati batas.</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md p-8 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">AI Advisor Personal</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Ngobrol dengan AI yang menganalisis data transaksimu secara real-time. Dapatkan teguran dan saran yang 100% relevan dengan angkamu.</p>
              </div>
            </div>
          </section>

          {/* Keunggulan vs Aplikasi Lain */}
          <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-12">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Kenapa Memilih FinLit?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-slate-400 leading-relaxed mb-6">
                  Aplikasi pencatat keuangan lain hanya memberikan grafik mati. Kamu harus menganalisis angkanya sendiri. 
                </p>
                <p className="text-slate-300 font-medium leading-relaxed">
                  FinLit memiliki AI (Gemini) yang langsung membaca agregat data pengeluaranmu bulan ini. Ia tidak memberi nasihat generik "hematlah uangmu", melainkan saran konkret seperti <span className="text-emerald-400 font-bold">"Kamu sudah habis 400rb buat kopi, kurangi jajan di luar minggu ini."</span>
                </p>
              </div>
              <div className="bg-indigo-600/20 border border-indigo-500/30 p-6 rounded-2xl">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-200 leading-relaxed">"Halo Rizky, dari data 3 hari ini pengeluaran <span className="text-rose-400 font-bold">Hiburan & Kopi</span> kamu sudah mendekati batas 90%. Yuk ngerem sedikit weekend ini biar nggak overbudget!"</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Visi & Dampak */}
          <section className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 rounded-[3rem] p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-indigo-500/20 blur-[100px] pointer-events-none"></div>
            <h2 className="text-3xl font-bold text-white mb-6 relative z-10">Visi Kami</h2>
            <p className="text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed relative z-10 mb-10">
              "Membangun generasi muda Indonesia yang melek finansial, bebas dari masalah keuangan impulsif, dan mampu merencanakan masa depan dengan tenang dan percaya diri."
            </p>
            <Link to={user ? "/app" : "/register"} className="inline-flex px-8 py-4 bg-white text-indigo-900 rounded-xl text-base font-bold shadow-xl hover:bg-slate-100 transition-colors relative z-10">
              Mulai Perjalanan Finansialmu
            </Link>
          </section>

        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 bg-black/40 py-8 relative z-10 text-center">
        <p className="text-slate-500 text-sm">© {new Date().getFullYear()} FinLit. Hackathon 24 Jam MVP.</p>
      </footer>
    </div>
  );
}
