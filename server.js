const express = require("express");
const path = require("path");

const app = express();
app.set("trust proxy", true);

const WIX_ENDPOINT =
  process.env.WIX_ENDPOINT || "https://www.ukrba.org/_functions/exhibitLead";
const EXHIBITS_API_KEY = process.env.EXHIBITS_API_KEY || "";
const VIDEO_URL = process.env.VIDEO_URL || "/video.mp4";

const INACTIVITY_SECONDS = Number(process.env.INACTIVITY_SECONDS) || 60;

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

app.get("/config", (req, res) =>
  res.json({
    videoUrl: VIDEO_URL,
    inactivitySeconds: INACTIVITY_SECONDS,
    videoFit: process.env.VIDEO_FIT === "contain" ? "contain" : "cover",
    videoBackground: process.env.VIDEO_BACKGROUND || "",
    showHint: process.env.SHOW_HINT !== "false",
  })
);

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

  const clean = (v, max) => String(v || "").trim().slice(0, max);
  const firstName = clean(body.firstName, 100);
  const surname = clean(body.surname, 100);
  const businessName = clean(body.businessName, 200);
  const postcode = clean(body.postcode, 20).toUpperCase();
  const email = clean(body.email, 254);
  const phone = clean(body.phone, 50);
  const pledge = body.pledge === true;
  const consent = body.consent === true;

  if (!firstName) {
    return res.status(400).json({ ok: false, error: "Please enter your first name." });
  }
  if (!surname) {
    return res.status(400).json({ ok: false, error: "Please enter your surname." });
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
      body: JSON.stringify({
        firstName,
        surname,
        businessName,
        postcode,
        email,
        phone,
        pledge,
        consent,
      }),
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

// Let the browser keep the video cached so the loop keeps playing if the stand wifi drops.
app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders: (res, filePath) => {
      if (/\.(mp4|webm)$/i.test(filePath)) res.setHeader("Cache-Control", "public, max-age=86400");
    },
  })
);

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(400).json({ ok: false, error: "Invalid request." });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`ukrba-exhibits listening on ${port}`));
