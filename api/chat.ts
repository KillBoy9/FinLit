import { GoogleGenAI } from "@google/genai";

// Vercel Serverless Function — dipakai saat deploy ke Vercel
// Environment variable GEMINI_API_KEY diset di Vercel Dashboard → Settings → Environment Variables

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, context } = req.body ?? {};

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt tidak boleh kosong.' });
  }
  if (prompt.length > 1000) {
    return res.status(400).json({ error: 'Prompt terlalu panjang.' });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'Gemini API key belum dikonfigurasi di Vercel Environment Variables.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const systemInstruction = `Kamu adalah asisten literasi finansial untuk anak muda Indonesia bernama "FinLit AI".

Data keuangan pengguna bulan ini:
${JSON.stringify(context ?? {}, null, 2)}

Instruksi:
- Berikan analisis singkat dan actionable dalam Bahasa Indonesia yang santai tapi jelas.
- Selalu rujuk ke angka spesifik dari data pengguna (jangan generik).
- Jika data kosong, minta pengguna menambahkan transaksi terlebih dahulu.
- Boleh memberi kritik konstruktif dan rekomendasi alokasi 50/30/20.
- Gunakan emoji secukupnya.
- Jawaban maksimal 300 kata.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt.trim(),
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 600,
      }
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
      return res.status(429).json({ error: 'Kuota Gemini API habis.' });
    }
    return res.status(500).json({ error: 'Gagal mendapatkan respons dari AI.' });
  }
}
