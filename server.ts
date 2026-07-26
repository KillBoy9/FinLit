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
  const chatAttempts = new Map<string, { count: number; resetAt: number }>();
  const CHAT_WINDOW_MS = 10 * 60 * 1000;
  const CHAT_MAX_REQUESTS = 20;

  const canUseChat = (key: string) => {
    const now = Date.now();
    const attempt = chatAttempts.get(key);
    if (!attempt || attempt.resetAt <= now) {
      chatAttempts.set(key, { count: 1, resetAt: now + CHAT_WINDOW_MS });
      return true;
    }
    if (attempt.count >= CHAT_MAX_REQUESTS) return false;
    attempt.count += 1;
    return true;
  };

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
    const clientKey = req.ip || req.socket.remoteAddress || 'unknown';
    if (!canUseChat(clientKey)) {
      res.setHeader('Retry-After', String(CHAT_WINDOW_MS / 1000));
      return res.status(429).json({ error: 'Terlalu banyak permintaan AI. Coba lagi dalam beberapa menit.' });
    }

    const { prompt, context, history } = req.body ?? {};

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
      // Build context summary as part of the user prompt so Gemini reads it reliably
      const hasData = context && (context.totalTransaksi > 0 || context.totalPemasukan > 0);
      const contextBlock = hasData
        ? `\n\n[DATA KEUANGAN SAYA BULAN ${context.bulan ?? ''}]\n` +
          `• Total Pemasukan : Rp ${(context.totalPemasukan ?? 0).toLocaleString('id-ID')}\n` +
          `• Total Pengeluaran: Rp ${(context.totalPengeluaran ?? 0).toLocaleString('id-ID')}\n` +
          `• Saldo           : Rp ${(context.saldo ?? 0).toLocaleString('id-ID')}\n` +
          `• Total Transaksi : ${context.totalTransaksi ?? 0} transaksi\n` +
          (context.top5Pengeluaran?.length
            ? `• Top Pengeluaran :\n${context.top5Pengeluaran.map((e: any) => `  - ${e.kategori}: Rp ${e.jumlah.toLocaleString('id-ID')}`).join('\n')}\n`
            : '') +
          (context.riwayat3Bulan?.length
            ? `• Riwayat 3 Bulan:\n${context.riwayat3Bulan.map((r: any) => `  - ${r.bulan}: masuk Rp ${r.income?.toLocaleString('id-ID') ?? 0}, keluar Rp ${r.expense?.toLocaleString('id-ID') ?? 0}`).join('\n')}\n`
            : '')
        : '\n\n[DATA KEUANGAN: Belum ada transaksi bulan ini]\n';

      const enrichedPrompt = prompt.trim() + contextBlock;

      // Build conversation history for multi-turn chat
      const contents: { role: string; parts: { text: string }[] }[] = [];
      if (Array.isArray(history)) {
        for (const msg of history) {
          if (msg.role === 'user' || msg.role === 'model') {
            contents.push({ role: msg.role, parts: [{ text: msg.text }] });
          }
        }
      }
      // Add current user message with context
      contents.push({ role: 'user', parts: [{ text: enrichedPrompt }] });

      const systemInstruction = `Kamu adalah asisten literasi finansial bernama "FinLit AI" untuk anak muda Indonesia.

Panduan menjawab:
- Selalu gunakan data keuangan yang ada di pesan user (ditandai [DATA KEUANGAN...]).
- Sebut angka spesifik dari data — JANGAN beri saran generik tanpa angka.
- Jika data kosong, minta user tambah transaksi dulu.
- Gunakan Bahasa Indonesia santai tapi jelas.
- Boleh beri kritik konstruktif dan saran alokasi 50/30/20.
- Gunakan emoji secukupnya.
- Jawaban maksimal 400 kata, jangan dipotong di tengah.`;

      const response = await getAI().models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      });

      const text = response.text;
      if (!text) throw new Error('Empty response from Gemini');
      return res.json({ message: text });

    } catch (error: any) {
      const msg: string = error?.message ?? String(error);
      console.error('Gemini API Error:', msg);

      if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid') || msg.includes('UNAUTHENTICATED')) {
        return res.status(401).json({ error: 'Gemini API key tidak valid. Periksa file .env.' });
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
