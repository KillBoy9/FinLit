import { GoogleGenAI } from "@google/genai";

// Vercel Serverless Function — dipakai saat deploy ke Vercel
// Set GEMINI_API_KEY di Vercel Dashboard → Settings → Environment Variables

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, context, history } = req.body ?? {};

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt tidak boleh kosong.' });
  }
  if (prompt.length > 1000) {
    return res.status(400).json({ error: 'Prompt terlalu panjang (maks 1000 karakter).' });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'Gemini API key belum dikonfigurasi di Vercel Environment Variables.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Format context as readable text inside the prompt (not system instruction)
    // so Gemini reliably reads the financial data
    const hasData = context && (context.totalTransaksi > 0 || context.totalPemasukan > 0);
    const contextBlock = hasData
      ? `\n\n[DATA KEUANGAN SAYA BULAN ${context.bulan ?? ''}]\n` +
        `• Total Pemasukan : Rp ${(context.totalPemasukan ?? 0).toLocaleString('id-ID')}\n` +
        `• Total Pengeluaran: Rp ${(context.totalPengeluaran ?? 0).toLocaleString('id-ID')}\n` +
        `• Saldo           : Rp ${(context.saldo ?? 0).toLocaleString('id-ID')}\n` +
        `• Total Transaksi : ${context.totalTransaksi ?? 0} transaksi\n` +
        (context.top5Pengeluaran?.length
          ? `• Top Pengeluaran :\n${context.top5Pengeluaran.map((e: any) =>
              `  - ${e.kategori}: Rp ${e.jumlah.toLocaleString('id-ID')}`).join('\n')}\n`
          : '') +
        (context.riwayat3Bulan?.length
          ? `• Riwayat 3 Bulan:\n${context.riwayat3Bulan.map((r: any) =>
              `  - ${r.bulan}: masuk Rp ${(r.income ?? 0).toLocaleString('id-ID')}, keluar Rp ${(r.expense ?? 0).toLocaleString('id-ID')}`).join('\n')}\n`
          : '')
      : '\n\n[DATA KEUANGAN: Belum ada transaksi bulan ini]\n';

    const enrichedPrompt = prompt.trim() + contextBlock;

    // Build multi-turn conversation history
    const contents: { role: string; parts: { text: string }[] }[] = [];
    if (Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'model') {
          contents.push({ role: msg.role, parts: [{ text: msg.text }] });
        }
      }
    }
    contents.push({ role: 'user', parts: [{ text: enrichedPrompt }] });

    const systemInstruction = `Kamu adalah asisten literasi finansial bernama "FinLit AI" untuk anak muda Indonesia.

Panduan menjawab:
- Selalu gunakan data keuangan yang ada di pesan user (ditandai [DATA KEUANGAN...]).
- Sebut angka spesifik dari data — JANGAN beri saran generik tanpa angka.
- Jika data kosong, minta user tambah transaksi dulu.
- Gunakan Bahasa Indonesia santai tapi jelas.
- Boleh beri kritik konstruktif dan saran alokasi 50/30/20.
- Gunakan emoji secukupnya.
- Jawaban harus LENGKAP, jangan dipotong di tengah kalimat. Maksimal 400 kata.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 1024,  // dinaikkan agar jawaban tidak terpotong
      },
    });

    const text = response.text;
    if (!text) throw new Error('Empty response from Gemini');

    return res.json({ message: text });
  } catch (error: any) {
    const msg: string = error?.message ?? String(error);
    console.error("Gemini API Error:", msg);

    if (msg.includes('API_KEY_INVALID') || msg.includes('UNAUTHENTICATED') || msg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED')) {
      return res.status(401).json({ error: 'API key tidak valid. Pastikan GEMINI_API_KEY di Vercel sudah benar (format: AIzaSy...).' });
    }
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
      return res.status(429).json({ error: 'Kuota Gemini API habis. Coba lagi nanti.' });
    }
    return res.status(500).json({ error: 'Gagal mendapatkan respons dari AI. Coba lagi.' });
  }
}
