// Vercel serverless function — proxies AI photo analysis to Anthropic
// The ANTHROPIC_API_KEY env var is set in Vercel dashboard (never exposed to browser)
// Security: validates request schema, enforces size limits, verifies Firebase auth token

const ALLOWED_MODELS = [
  "claude-sonnet-4-20250514",
  "claude-haiku-4-20250514",
];
const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_TOKENS_LIMIT = 4000;

export default async function handler(req, res) {
  // ── Method check ────────────────────────────────────────
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── API key check ───────────────────────────────────────
  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  // ── Firebase auth token verification ────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  try {
    // Dynamically import firebase-admin (installed as dependency)
    const admin = await import("firebase-admin");
    if (!admin.default.apps.length) {
      admin.default.initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || "pantripal-app",
      });
    }
    const token = authHeader.split("Bearer ")[1];
    await admin.default.auth().verifyIdToken(token);
  } catch (authErr) {
    console.error("Auth verification failed:", authErr.message);
    return res.status(401).json({ error: "Invalid or expired auth token" });
  }

  // ── Request body validation ─────────────────────────────
  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be a JSON object" });
  }

  // Validate payload size (rough check on serialized body)
  const bodySize = JSON.stringify(body).length;
  if (bodySize > MAX_BODY_SIZE) {
    return res.status(413).json({ error: `Payload too large (${Math.round(bodySize / 1024)}KB). Max ${MAX_BODY_SIZE / 1024 / 1024}MB.` });
  }

  // Validate model
  if (!body.model || !ALLOWED_MODELS.includes(body.model)) {
    return res.status(400).json({ error: `Invalid model. Allowed: ${ALLOWED_MODELS.join(", ")}` });
  }

  // Validate max_tokens
  if (!body.max_tokens || body.max_tokens > MAX_TOKENS_LIMIT) {
    return res.status(400).json({ error: `max_tokens must be <= ${MAX_TOKENS_LIMIT}` });
  }

  // Validate messages array
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: "messages must be a non-empty array" });
  }

  // ── Proxy to Anthropic (only forward validated fields) ──
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: body.model,
        max_tokens: body.max_tokens,
        messages: body.messages,
      }),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).json({ error: "Proxy request failed" });
  }
}
