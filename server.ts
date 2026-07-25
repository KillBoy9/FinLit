import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import helmet from 'helmet';

// Lazy-init Gemini — avoids startup warning when key not set
let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  return _ai;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const isDev = process.env.NODE_ENV !== 'production';

  // ── Security headers ────────────────────────────────────
  app.use(helmet({
    // Relax CSP in dev so Vite HMR works; tighten in production
    contentSecurityPolicy: isDev ? false : {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],   // React needs inline scripts
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: [
          "'self'",
          'https://*.googleapis.com',
          'https://*.firebaseio.com',
          'https://*.firebase.com',
          'https://generativelanguage.googleapis.com',
        ],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'data:'],
      },
    },
    crossOriginEmbedderPolicy: false, // Needed for Firebase
  }));

  // ── Body parsing (limit size to prevent abuse) ──────────
  app.use(express.json({ limit: '50kb' }));

  // ── Health check ────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      gemini: !!process.env.GEMINI_API_KEY,
      env: isDev ? 'development' : 'production',
    });
  });

  // ── AI Chat endpoint ────────────────────────────────────
  app.post('/api/chat', async (req, res) => {
    const { prompt, context } = req.body ?? {};

    // Input validation
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt tidak boleh kosong.' });
    }
    if (prompt.length > 1000) {
      return res.status(400).json({ error: 'Prompt terlalu panjang (maks 1000 karakter).' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'Gemini API key belum dikonfigurasi. Isi GEMINI_API_KEY di file .env lalu restart server.',
      });
    }

    try {
      const systemInstruction = `Kamu adalah asisten literasi finansial untuk anak muda Indonesia bernama "FinLit AI".

Data keuangan pengguna bulan ini:
${JSON.stringify(context ?? {}, null, 2)}

Instruksi:
- Berikan analisis singkat dan actionable dalam Bahasa Indonesia yang santai tapi jelas.
- Selalu rujuk ke angka spesifik dari data pengguna (jangan generik).
- Jika data kosong atau tidak ada transaksi, minta pengguna menambahkan transaksi terlebih dahulu.
- Boleh memberi kritik konstruktif dan rekomendasi alokasi anggaran gaya 50/30/20.
- Gunakan emoji secukupnya agar lebih ramah.
- Jawaban maksimal 300 kata.`;

      const response = await getAI().models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt.trim(),
        config: { systemInstruction, temperature: 0.7, maxOutputTokens: 600 },
      });

      const text = response.text;
      if (!text) throw new Error('Empty response from Gemini');
      return res.json({ message: text });

    } catch (error: any) {
      const msg: string = error?.message ?? String(error);
      console.error('Gemini API Error:', msg);

      if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
        return res.status(401).json({ error: 'Gemini API key tidak valid.' });
      }
      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
        return res.status(429).json({ error: 'Kuota Gemini API habis. Coba lagi nanti.' });
      }
      return res.status(500).json({ error: 'Gagal mendapatkan respons dari AI. Coba lagi.' });
    }
  });

  // ── Dev: Vite middleware │ Prod: static files ───────────
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // ── Listen ───────────────────────────────────────────────
  const server = app.listen(PORT, '0.0.0.0');

  server.on('listening', () => {
    console.log(`\n🚀 Server  : http://localhost:${PORT}`);
    console.log(`   Gemini  : ${process.env.GEMINI_API_KEY ? '✅ Configured' : '⚠️  Not configured (set GEMINI_API_KEY in .env)'}`);
    console.log(`   Mode    : ${isDev ? 'development' : 'production'}\n`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} sudah digunakan. Jalankan: fuser -k ${PORT}/tcp\n`);
    } else {
      console.error('\n❌ Server error:', err.message);
    }
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('❌ Failed to start:', err);
  process.exit(1);
});
