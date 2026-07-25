import { Link } from 'react-router-dom';
import { Wallet, TrendingUp, Bot, Target, Shield, Zap } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export function Landing() {
  const { user } = useAuth();

  return (
    <div className="w-full min-h-screen bg-[#f8f7f4] text-[#1d2421] flex flex-col font-sans relative overflow-x-hidden scroll-page">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#dff3ed] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#fff0e9] blur-[150px] rounded-full pointer-events-none" />
      
      {/* Navbar */}
      <nav className="w-full px-6 py-5 flex justify-between items-center relative z-10 max-w-6xl mx-auto border-b border-[#e4e1da]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0f6e56] rounded-xl flex items-center justify-center shadow-sm">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div><span className="text-xl font-bold tracking-tight text-[#0f6e56]">FinGuide AI</span><p className="text-[9px] font-bold tracking-[0.16em] text-[#5f5e5a]">WEALTH MANAGEMENT</p></div>
        </div>
        <div>
          {user ? (
            <Link to="/app" className="px-5 py-2.5 bg-[#0f6e56] hover:bg-[#075b46] rounded-xl text-sm font-bold text-white transition-colors shadow-sm">
              Go to Dashboard
            </Link>
          ) : (
            <Link to="/login" className="px-5 py-2.5 bg-[#0f6e56] hover:bg-[#075b46] rounded-xl text-sm font-bold text-white shadow-sm transition-colors">
              Masuk / Daftar
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10 mt-16 mb-24 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e2f4ef] border border-[#acd3c7] text-[#0f6e56] text-xs font-semibold uppercase tracking-widest mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0f6e56] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0f6e56]" />
          </span>
          Powered by AI (Gemini)
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-[#1d2421] mb-6 leading-tight">
          Cerdas Kelola Uang, <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0f6e56] to-[#4c9300]">Tenang Masa Depan.</span>
        </h1>
        <p className="text-lg md:text-xl text-[#5f5e5a] mb-10 max-w-2xl leading-relaxed">
          FinLit bukan sekadar aplikasi pencatat keuangan. Ini adalah asisten finansial pribadimu yang memberikan insight cerdas berdasarkan pengeluaran aslimu.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link to={user ? "/app" : "/login"} className="px-8 py-4 bg-[#0f6e56] hover:bg-[#075b46] rounded-xl text-base font-bold text-white shadow-sm transition-colors flex items-center justify-center gap-2">
            Mulai Sekarang <Zap className="w-4 h-4" />
          </Link>
          <a href="#tentang" className="px-8 py-4 bg-white hover:bg-[#f0eee8] border border-[#d9d6cf] rounded-xl text-base font-bold text-[#0f6e56] transition-colors">
            Pelajari Lebih Lanjut
          </a>
        </div>
      </main>

      {/* Content Sections */}
      <div className="w-full bg-[#fbfaf7] border-t border-[#e4e1da] relative z-10" id="tentang">
        <div className="max-w-6xl mx-auto px-6 py-24 space-y-32">
          
          {/* Kenapa FinLit Ada */}
          <section className="flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl font-bold text-[#1d2421]">Kenapa FinGuide AI Hadir?</h2>
              <p className="text-[#5f5e5a] leading-relaxed text-lg">
                Banyak anak muda, mulai dari mahasiswa hingga <span className="text-[#252b28] font-medium">first-jobber</span>, sering merasa gaji numpang lewat. Sulit melacak kemana perginya uang, dan sering kehabisan dana sebelum akhir bulan karena pengeluaran impulsif.
                <br/><br/>
                FinLit hadir untuk memecahkan masalah ini. Kami ingin membantumu sadar akan kebiasaan finansialmu tanpa perlu ribet mengerti istilah ekonomi yang rumit.
              </p>
            </div>
            <div className="flex-1 relative">
              <div className="absolute inset-0 bg-[#dff3ed] blur-3xl rounded-full" />
              <div className="bg-white border border-[#e4e1da] p-8 rounded-3xl relative shadow-sm">
                <Target className="w-12 h-12 text-[#d85a30] mb-6" />
                <h3 className="text-xl font-bold text-[#1d2421] mb-2">Masalah Utama</h3>
                <ul className="space-y-4 text-[#5f5e5a]">
                  <li className="flex gap-3 items-start"><div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#d85a30]" /> Tidak tahu persis total pengeluaran bulanan.</li>
                  <li className="flex gap-3 items-start"><div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#d85a30]" /> Anggaran sering jebol karena ngopi & hiburan.</li>
                  <li className="flex gap-3 items-start"><div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#d85a30]" /> Bingung cara mulai menabung & alokasi gaji.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Fitur Utama */}
          <section>
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-[#1d2421] mb-4">Fitur Andalan Kami</h2>
              <p className="text-[#5f5e5a] max-w-2xl mx-auto">Alat yang kamu butuhkan untuk mengambil alih kendali atas uangmu.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-3xl border border-[#e4e1da] hover:border-[#acd3c7] transition-colors shadow-sm">
                <div className="w-12 h-12 bg-[#e2f4ef] text-[#0f6e56] rounded-2xl flex items-center justify-center mb-6">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#1d2421] mb-3">Catat & Pantau</h3>
                <p className="text-[#5f5e5a] text-sm leading-relaxed">Pencatatan transaksi yang super cepat. Ketahui persis berapa pemasukan dan pengeluaranmu bulan ini.</p>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-[#e4e1da] hover:border-[#f2cfad] transition-colors shadow-sm">
                <div className="w-12 h-12 bg-[#fff0e2] text-[#d85a30] rounded-2xl flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#1d2421] mb-3">Limit Anggaran</h3>
                <p className="text-[#5f5e5a] text-sm leading-relaxed">Set batas pengeluaran per kategori. Indikator warna akan memperingatkanmu jika pengeluaran sudah mendekati batas.</p>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-[#e4e1da] hover:border-[#acd3c7] transition-colors shadow-sm">
                <div className="w-12 h-12 bg-[#e2f4ef] text-[#0f6e56] rounded-2xl flex items-center justify-center mb-6">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#1d2421] mb-3">AI Advisor Personal</h3>
                <p className="text-[#5f5e5a] text-sm leading-relaxed">Ngobrol dengan AI yang menganalisis data transaksimu secara real-time. Dapatkan teguran dan saran yang 100% relevan dengan angkamu.</p>
              </div>
            </div>
          </section>

          {/* Keunggulan vs Aplikasi Lain */}
          <section className="bg-white border border-[#e4e1da] rounded-3xl p-8 md:p-12 shadow-sm">
            <h2 className="text-3xl font-bold text-[#1d2421] mb-8 text-center">Kenapa Memilih FinGuide AI?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-[#5f5e5a] leading-relaxed mb-6">
                  Aplikasi pencatat keuangan lain hanya memberikan grafik mati. Kamu harus menganalisis angkanya sendiri. 
                </p>
                <p className="text-[#3f4642] font-medium leading-relaxed">
                  FinGuide AI memiliki AI (Gemini) yang langsung membaca agregat data pengeluaranmu bulan ini. Ia tidak memberi nasihat generik "hematlah uangmu", melainkan saran konkret seperti <span className="text-[#0f6e56] font-bold">"Kamu sudah habis 400rb buat kopi, kurangi jajan di luar minggu ini."</span>
                </p>
              </div>
              <div className="bg-[#e2f4ef] border border-[#acd3c7] p-6 rounded-2xl">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-[#0f6e56] rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#3f4642] leading-relaxed">"Halo Rizky, dari data 3 hari ini pengeluaran <span className="text-[#954c41] font-bold">Hiburan & Kopi</span> kamu sudah mendekati batas 90%. Yuk ngerem sedikit weekend ini biar nggak overbudget!"</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Visi & Dampak */}
          <section className="bg-gradient-to-br from-[#0f6e56] to-[#075b46] border border-[#075b46] rounded-[3rem] p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-[#71a995]/30 blur-[100px] pointer-events-none" />
            <h2 className="text-3xl font-bold text-white mb-6 relative z-10">Visi Kami</h2>
            <p className="text-lg text-[#d7efe7] max-w-3xl mx-auto leading-relaxed relative z-10 mb-10">
              "Membangun generasi muda Indonesia yang melek finansial, bebas dari masalah keuangan impulsif, dan mampu merencanakan masa depan dengan tenang dan percaya diri."
            </p>
            <Link to={user ? "/app" : "/login"} className="inline-flex px-8 py-4 bg-white text-[#0f6e56] rounded-xl text-base font-bold shadow-xl hover:bg-[#f4f2ed] transition-colors relative z-10">
              Mulai Perjalanan Finansialmu
            </Link>
          </section>

        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-[#e4e1da] bg-[#f4f2ed] py-8 relative z-10 text-center">
        <p className="text-[#777670] text-sm">© {new Date().getFullYear()} FinGuide AI. Financial wellbeing made simple.</p>
      </footer>
    </div>
  );
}
