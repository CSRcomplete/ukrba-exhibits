const express = require("express");
const path = require("path");

const app = express();
app.set("trust proxy", true);

const WIX_ENDPOINT =
  process.env.WIX_ENDPOINT || "https://www.ukrba.org/_functions/exhibitLead";
const EXHIBITS_API_KEY = process.env.EXHIBITS_API_KEY || "";
const VIDEO_URL = process.env.VIDEO_URL || "/video.mp4";

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of hits) {
    const recent = times.filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length) hits.set(ip, recent);
    else hits.delete(ip);
  }
}, RATE_WINDOW_MS).unref();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.use(express.json({ limit: "10kb" }));

app.get("/health", (req, res) => res.type("text").send("ok"));

app.get("/config", (req, res) => res.json({ videoUrl: VIDEO_URL }));

app.post("/api/submit", async (req, res) => {
  const body = req.body || {};

  // Honeypot: pretend success so bots learn nothing.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return res.json({ ok: true });
  }

  if (rateLimited(req.ip)) {
    return res
      .status(429)
      .json({ ok: false, error: "Too many submissions. Please try again later." });
  }

  const name = String(body.name || "").trim().slice(0, 200);
  const email = String(body.email || "").trim().slice(0, 254);
  const phone = String(body.phone || "").trim().slice(0, 50);

  if (!name) {
    return res.status(400).json({ ok: false, error: "Please enter your full name." });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: "Please enter a valid email address." });
  }

  try {
    const upstream = await fetch(WIX_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": EXHIBITS_API_KEY,
      },
      body: JSON.stringify({ name, email, phone }),
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) {
      console.error(`Wix upstream responded ${upstream.status}`);
      return res.status(502).json({
        ok: false,
        error: "We couldn't save your details right now. Please try again in a moment.",
      });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("Wix upstream request failed:", err.message);
    return res.status(502).json({
      ok: false,
      error: "We couldn't save your details right now. Please try again in a moment.",
    });
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(400).json({ ok: false, error: "Invalid request." });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`ukrba-exhibits listening on ${port}`));
