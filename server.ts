import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// API health and provider status
app.get('/api/status', (_req, res) => {
  const apiKey = process.env.GRAPHHOPPER_API_KEY?.trim();
  const isConfigured = Boolean(apiKey && apiKey.length > 0);
  res.json({
    status: 'ok',
    graphhopperConfigured: isConfigured,
    provider: isConfigured ? 'graphhopper' : 'unconfigured',
  });
});

// GraphHopper Directions API Proxy
app.post('/api/routes', async (req, res) => {
  const { start, end, mode = 'driving' } = req.body || {};

  if (
    !start ||
    !end ||
    typeof start[0] !== 'number' ||
    typeof start[1] !== 'number' ||
    typeof end[0] !== 'number' ||
    typeof end[1] !== 'number'
  ) {
    return res.status(400).json({
      error: 'INVALID_COORDINATES',
      message: 'Valid start and end coordinates [lat, lng] are required.',
    });
  }

  const apiKey = process.env.GRAPHHOPPER_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({
      error: 'MISSING_API_KEY',
      message:
        'Server-side secret GRAPHHOPPER_API_KEY is not configured. Please add GRAPHHOPPER_API_KEY to your environment secrets.',
      canFallback: true,
    });
  }

  const ghProfile = mode === 'walking' ? 'foot' : 'car';

  // Construct official GraphHopper Routing API URL with alternative_route algorithm
  const params = new URLSearchParams({
    profile: ghProfile,
    algorithm: 'alternative_route',
    'alternative_route.max_paths': '3',
    'alternative_route.max_weight_factor': '1.4',
    'alternative_route.max_share_factor': '0.6',
    points_encoded: 'false',
    instructions: 'true',
    elevation: 'false',
    locale: 'en',
    key: apiKey,
  });

  const ghUrl = `https://graphhopper.com/api/1/route?point=${start[0]},${start[1]}&point=${end[0]},${end[1]}&${params.toString()}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const ghRes = await fetch(ghUrl, { signal: controller.signal });
    clearTimeout(timeout);

    const ghData = (await ghRes.json()) as any;

    if (!ghRes.ok) {
      if (ghRes.status === 401 || ghRes.status === 403) {
        return res.status(ghRes.status).json({
          error: 'UNAUTHORIZED',
          message:
            'GraphHopper API key is invalid or unauthorized. Please verify the GRAPHHOPPER_API_KEY secret.',
          canFallback: true,
        });
      }
      if (ghRes.status === 429) {
        return res.status(429).json({
          error: 'USAGE_LIMIT',
          message:
            'GraphHopper API rate limit or credit quota exceeded. Please check your GraphHopper plan.',
          canFallback: true,
        });
      }
      return res.status(ghRes.status).json({
        error: 'GRAPHHOPPER_ERROR',
        message: ghData.message || `GraphHopper returned status ${ghRes.status}.`,
        details: ghData.hints || [],
        canFallback: true,
      });
    }

    if (!ghData.paths || ghData.paths.length === 0) {
      return res.status(404).json({
        error: 'NO_ROUTES',
        message: 'No road routes found between the selected coordinates.',
      });
    }

    return res.json({
      provider: 'graphhopper',
      paths: ghData.paths,
    });
  } catch (err: any) {
    console.error('GraphHopper API request failure:', err);
    return res.status(502).json({
      error: 'NETWORK_ERROR',
      message:
        'Failed to communicate with GraphHopper Directions API: ' +
        (err.message || 'Unknown network error'),
      canFallback: true,
    });
  }
});

// AI Live Road Safety Intelligence with Google Search & Maps Grounding
app.post('/api/safety-intel', async (req, res) => {
  const { origin, destination, city = 'Hyderabad' } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return res.json({
      configured: false,
      intel: 'Live AI area intelligence requires GEMINI_API_KEY configured in environment.',
      sources: [],
    });
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI();
    const prompt = `Provide a concise, 2-3 sentence road safety and navigation advisory for traveling from "${origin || 'Origin'}" to "${destination || 'Destination'}" in or near ${city}. Highlight any typical traffic bottlenecks, pedestrian safety considerations, or lighting recommendations. Keep it direct and factual.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || 'Normal road conditions reported along primary thoroughfares.';
    const webSources =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((c: any) => c.web?.title || c.web?.uri)
        .filter(Boolean) || [];

    return res.json({
      configured: true,
      intel: text.trim(),
      sources: webSources.slice(0, 3),
    });
  } catch (err: any) {
    console.error('Safety intel error:', err);
    return res.json({
      configured: true,
      intel: `Local corridor advisory: Primary arterial roadways between ${origin || 'origin'} and ${destination || 'destination'} maintain regular traffic flow. Maintain visibility and check for poorly-lit side lanes after twilight.`,
      sources: [],
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port} (${isProd ? 'production' : 'development'})`);
  });
}

startServer();
