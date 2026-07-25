import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, context } = req.body;
      
      const systemInstruction = `Kamu adalah asisten literasi finansial untuk anak muda Indonesia. Berdasarkan data pengguna berikut: ${JSON.stringify(context)}, berikan analisis singkat dan actionable dalam Bahasa Indonesia yang santai tapi jelas. Rujuk selalu ke angka spesifik dari data pengguna, jangan berikan saran generik. Kamu boleh memberi kritik gaya hidup jika relevan, rekomendasi alokasi anggaran gaya 50/30/20, dan jawaban literasi finansial yang kontekstual untuk kondisi ekonomi anak muda Indonesia.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
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
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
