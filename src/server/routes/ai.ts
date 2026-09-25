import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const router = Router();

// Initialize GoogleGenAI SDK with environment key
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// Check Gemini AI Configuration Status
router.get('/status', (req: Request, res: Response) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const isConfigured = Boolean(apiKey && apiKey.length > 5);
  res.json({
    configured: isConfigured,
    model: 'gemini-3.8-flash',
    provider: 'Google Gemini AI',
    features: ['Synopsis Generation', 'Logline Writer', 'Content Advisory Tags', 'SEO Metadata'],
  });
});

// Generate OTT Metadata (Synopsis, Tagline, Advisory, SEO)
router.post('/generate-metadata', async (req: Request, res: Response) => {
  try {
    const ai = getAiClient();
    if (!ai) {
      return res.status(400).json({
        error: 'GEMINI_API_KEY is not configured in environment variables. Please set GEMINI_API_KEY in your .env file.',
      });
    }

    const { title, genre, language, type = 'movie', mood } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required for metadata generation' });
    }

    const prompt = `You are an expert streaming platform / OTT content curator for JANALA OTT.
Generate professional, compelling metadata for the following ${type}:
- Title: ${title}
- Primary Genre: ${genre || 'Drama'}
- Language: ${language || 'Bengali / Hindi / English'}
${mood ? `- Mood/Tone: ${mood}` : ''}

Respond with a JSON object containing:
1. "shortSynopsis": A gripping 1-2 sentence hook (under 160 characters).
2. "fullSynopsis": A rich, engaging 3-paragraph story overview without spoilers.
3. "logline": A sharp one-sentence pitch.
4. "suggestedTags": Array of 5-8 relevant searchable tags (strings).
5. "contentAdvisory": Array of applicable content maturity warnings (e.g., "Mild Violence", "Language").
6. "suggestedMaturityRating": One of "U", "U/A 7+", "U/A 13+", "U/A 16+", "A".

Return pure valid JSON only, without markdown fences.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { rawText: text };
    }

    res.json({ success: true, metadata: data });
  } catch (error: any) {
    console.error('Gemini AI generation failed:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate metadata using Gemini AI',
    });
  }
});

export default router;
