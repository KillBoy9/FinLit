import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, context } = req.body;
    
    const systemInstruction = `Kamu adalah asisten literasi finansial untuk anak muda Indonesia. Berdasarkan data pengguna berikut: ${JSON.stringify(context)}, berikan analisis singkat dan actionable dalam Bahasa Indonesia yang santai tapi jelas. Rujuk selalu ke angka spesifik dari data pengguna, jangan berikan saran generik. Kamu boleh memberi kritik gaya hidup jika relevan, rekomendasi alokasi anggaran gaya 50/30/20, dan jawaban literasi finansial yang kontekstual untuk kondisi ekonomi anak muda Indonesia.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ message: response.text });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Failed to fetch response from AI Assistant." });
  }
}
