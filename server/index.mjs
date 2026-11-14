import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
const port = Number(process.env.PORT ?? 8787);
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'tauri://localhost',
  'https://tauri.localhost'
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by Jarvis API CORS policy.'));
  }
}));
app.use(express.json({ limit: '64kb' }));

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, provider: 'Google Gemini' });
});

app.post('/api/chat', async (request, response) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    response.status(503).json({ error: 'Gemini is not configured. Set GEMINI_API_KEY in the server environment.' });
    return;
  }

  const messages = request.body?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
    response.status(400).json({ error: 'Provide between 1 and 20 chat messages.' });
    return;
  }

  const contents = [];
  for (const message of messages) {
    if (!message || !['user', 'assistant'].includes(message.role) || typeof message.text !== 'string' || message.text.length === 0 || message.text.length > 12000) {
      response.status(400).json({ error: 'Each message must contain a valid role and text (up to 12,000 characters).' });
      return;
    }
    contents.push({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.text }] });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction: 'You are Jarvis, a helpful, thoughtful desktop AI assistant. Be clear, practical, and honest about uncertainty. Do not claim to have performed actions or accessed data unless a connected tool actually did so.',
        temperature: 0.7
      }
    });
    const text = result.text?.trim();
    if (!text) {
      response.status(502).json({ error: 'Gemini returned no text for this request.' });
      return;
    }
    response.json({ text });
  } catch (error) {
    console.error('Gemini request failed:', error instanceof Error ? error.message : 'Unknown error');
    response.status(502).json({ error: 'The Gemini request failed. Check the API key, model availability, and server logs.' });
  }
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Jarvis Gemini API listening at http://127.0.0.1:${port}`);
});
