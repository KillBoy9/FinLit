# Product Requirements Document (PRD): FinLit

## 1. Product Overview
FinLit adalah aplikasi pencatatan dan asisten keuangan cerdas yang ditargetkan untuk anak muda (mahasiswa dan first-jobbers) di Indonesia. Aplikasi ini tidak hanya mencatat uang masuk dan keluar, tetapi juga menyediakan analisis dan saran keuangan yang disesuaikan secara personal melalui integrasi dengan AI (Gemini).

**Value Proposition:**
"Lebih dari sekadar mencatat pengeluaran. Dapatkan saran finansial personal dari AI berdasarkan data transaksi nyatamu."

## 2. User Persona
**Target Audience:** Mahasiswa tingkat akhir dan pekerja muda (18-25 tahun).

**Karakteristik Persona (Contoh: "Budi, First-jobber"):**
- Pendapatan: UMP / Entry-level (Rp 5.000.000).
- Kendala Utama: Sulit melacak kemana perginya gaji, sering kehabisan uang sebelum akhir bulan karena pengeluaran impulsif (makanan, kopi, hiburan).
- Kebutuhan: Alat pencatatan yang sangat mudah digunakan, serta "penasihat" yang bisa menegur atau memberi saran dengan bahasa yang santai dan relevan.

## 3. Architecture Rationale
Untuk membangun MVP yang siap deploy dalam 24 jam dengan tingkat keamanan tinggi:

- **Frontend & Backend (Vite React + Express):**
  Menggunakan Vite React untuk Single Page Application yang cepat dengan styling Tailwind CSS. Karena kebutuhan memanggil Gemini API secara aman, kita menggunakan custom Express server (`server.ts`) yang berjalan dalam environment yang sama.
- **Database & Auth (Firebase Firestore & Auth):**
  Menggunakan Firebase Firestore dan Firebase Auth sebagai alternatif dari Supabase untuk menyesuaikan dengan ketersediaan integrasi di environment AI Studio ini. RLS (Security Rules) Firestore digunakan secara ketat (`request.auth.uid == resource.data.userId`) untuk menjamin kerahasiaan data pengguna.
  *Trade-off Categories:* Kategori dibuat global di awal dengan field `isGlobal: true` untuk mempermudah onboarding pengguna baru. Pengguna dapat menambahkan kategorinya sendiri nantinya tanpa mengganggu data pengguna lain.
- **AI Integration (Gemini 2.5 Flash):**
  Gemini dipanggil HANYA dari server-side API route (`/api/chat`). Kunci API tidak pernah diekspos ke client. Context data pengguna diagregasi di backend sebelum dikirimkan ke model AI untuk menjaga token context tetap kecil dan efisien.

## 4. System Flow
1. **Onboarding & Auth:** Pengguna melakukan registrasi melalui email. Data Profile dibuat pada Firestore.
2. **Transaction Management:** Pengguna memasukkan transaksi baru. Data langsung masuk ke Firestore dan UI diperbarui secara real-time.
3. **Budget Monitoring:** Pengguna mengatur limit bulanan untuk suatu kategori. Transaksi dalam kategori tersebut dijumlahkan secara lokal untuk memunculkan status anggaran (Aman, Waspada, Berbahaya).
4. **AI Assistant:** Saat pengguna berinteraksi di chat, frontend akan menghitung total pengeluaran per kategori bulan ini, kemudian mengirimkannya ke `/api/chat`. Express server mengirim payload ke Gemini untuk mendapatkan insight finansial, yang kemudian di-render di UI.
