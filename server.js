// Production proxy server for Anthropic API (avoids CORS)
// Usage: ANTHROPIC_API_KEY=sk-... node server.js
// In dev, use `vite dev` instead — vite.config.js has a built-in proxy.

import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error('ERROR: Set ANTHROPIC_API_KEY environment variable');
  process.exit(1);
}

app.use(express.json({ limit: '10mb' }));

// Serve Vite build output
app.use(express.static('dist'));

app.post('/api/analyze', async (req, res) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy request failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Pantri API proxy running on http://localhost:${PORT}`);
});
