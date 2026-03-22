/**
 * @fileoverview Canvas-based service thumbnail generator.
 *
 * Produces a deterministic, visually-rich image from a service's title,
 * description, category and tags.  Every service gets a unique pattern
 * seeded from its content so the thumbnail is always relevant and stable
 * across page loads (same inputs = same image).
 *
 * Runs entirely client-side using the Canvas API -- no external service or
 * API key required.
 */

// ---------------------------------------------------------------------------
// Category colour palettes
// ---------------------------------------------------------------------------

const CATEGORY_PALETTES: Record<
  string,
  { bg: [string, string]; accent: string; emoji: string }
> = {
  "Art & Design": {
    bg: ["#BE185D", "#7C3AED"],
    accent: "#F9A8D4",
    emoji: "\uD83C\uDFA8",
  },
  Business: {
    bg: ["#0E7490", "#1D4ED8"],
    accent: "#67E8F9",
    emoji: "\uD83D\uDCBC",
  },
  "Programming & Tech": {
    bg: ["#1E40AF", "#6D28D9"],
    accent: "#93C5FD",
    emoji: "\uD83D\uDCBB",
  },
  Marketing: {
    bg: ["#B45309", "#DC2626"],
    accent: "#FCD34D",
    emoji: "\uD83D\uDCE2",
  },
  "Writing & Translation": {
    bg: ["#065F46", "#0F766E"],
    accent: "#6EE7B7",
    emoji: "\u270D\uFE0F",
  },
  "Video & Animation": {
    bg: ["#7C2D12", "#9F1239"],
    accent: "#FCA5A5",
    emoji: "\uD83C\uDFAC",
  },
  Photography: {
    bg: ["#374151", "#1F2937"],
    accent: "#D1D5DB",
    emoji: "\uD83D\uDCF7",
  },
  "Music & Audio": {
    bg: ["#5B21B6", "#4C1D95"],
    accent: "#C4B5FD",
    emoji: "\uD83C\uDFB5",
  },
  "Data Science & AI": {
    bg: ["#0369A1", "#4338CA"],
    accent: "#7DD3FC",
    emoji: "\uD83E\uDD16",
  },
  "Education & Tutoring": {
    bg: ["#15803D", "#047857"],
    accent: "#86EFAC",
    emoji: "\uD83D\uDCDA",
  },
  "Lifestyle & Hobbies": {
    bg: ["#A16207", "#B91C1C"],
    accent: "#FDE68A",
    emoji: "\u2B50",
  },
};

const DEFAULT_PALETTE: { bg: [string, string]; accent: string; emoji: string } =
  { bg: ["#374151", "#111827"], accent: "#9CA3AF", emoji: "\u26A1" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Simple seeded PRNG (Lehmer / Park-Miller). */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---------------------------------------------------------------------------
// Pattern drawers -- each creates a unique visual texture
// ---------------------------------------------------------------------------

type PatternFn = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rand: () => number,
  accent: string,
) => void;

const drawCircles: PatternFn = (ctx, w, h, rand, accent) => {
  for (let i = 0; i < 18; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 20 + rand() * 100;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(accent, 0.04 + rand() * 0.08);
    ctx.fill();
  }
};

const drawLines: PatternFn = (ctx, w, h, rand, accent) => {
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    ctx.moveTo(rand() * w, rand() * h);
    ctx.lineTo(rand() * w, rand() * h);
    ctx.strokeStyle = hexToRgba(accent, 0.08 + rand() * 0.1);
    ctx.stroke();
  }
};

const drawDots: PatternFn = (ctx, w, h, rand, accent) => {
  const spacing = 36;
  for (let x = 0; x < w; x += spacing) {
    for (let y = 0; y < h; y += spacing) {
      const ox = (rand() - 0.5) * 10;
      const oy = (rand() - 0.5) * 10;
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, 2 + rand() * 3, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(accent, 0.06 + rand() * 0.1);
      ctx.fill();
    }
  }
};

const drawWaves: PatternFn = (ctx, w, h, rand, accent) => {
  for (let wave = 0; wave < 6; wave++) {
    const yBase = rand() * h;
    const amplitude = 20 + rand() * 40;
    const frequency = 0.005 + rand() * 0.015;
    const phase = rand() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, yBase + Math.sin(phase) * amplitude);
    for (let x = 0; x <= w; x += 4) {
      ctx.lineTo(x, yBase + Math.sin(x * frequency + phase) * amplitude);
    }
    ctx.strokeStyle = hexToRgba(accent, 0.06 + rand() * 0.08);
    ctx.lineWidth = 1.5 + rand() * 2;
    ctx.stroke();
  }
};

const drawHexagons: PatternFn = (ctx, w, h, rand, accent) => {
  const size = 30 + rand() * 20;
  const cols = Math.ceil(w / (size * 1.5)) + 1;
  const rows = Math.ceil(h / (size * Math.sqrt(3))) + 1;

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      if (rand() > 0.35) continue;
      const x = col * size * 1.5;
      const y =
        row * size * Math.sqrt(3) +
        (col % 2 ? (size * Math.sqrt(3)) / 2 : 0);

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = x + size * Math.cos(angle);
        const py = y + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = hexToRgba(accent, 0.06 + rand() * 0.1);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
};

const PATTERN_DRAWERS: PatternFn[] = [
  drawCircles,
  drawLines,
  drawDots,
  drawWaves,
  drawHexagons,
];

// ---------------------------------------------------------------------------
// In-memory cache -- same title+category always returns the cached data-URL
// ---------------------------------------------------------------------------

const imageCache = new Map<string, string>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const EMOJI_FONT = "120px sans-serif";

/**
 * Generate a deterministic gradient + pattern overlay as a PNG data-URL.
 *
 * The overlay contains only the category-coloured gradient, a unique
 * geometric pattern seeded from the title, a vignette, and a faded
 * category emoji watermark.  No text is rendered — this is meant to be
 * composited on top of an Unsplash photograph via CSS opacity/blend-mode.
 */
export function generateServiceOverlay(
  title: string,
  category: string,
): string {
  if (typeof window === "undefined") return "";

  const cacheKey = `${title}::${category}`;
  const cached = imageCache.get(cacheKey);
  if (cached) return cached;

  const W = 600;
  const H = 340;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const palette = CATEGORY_PALETTES[category] || DEFAULT_PALETTE;
  const seed = hashString(title + category);
  const rand = seededRandom(seed);

  // 1. Gradient background ------------------------------------------------
  const angle = rand() * Math.PI * 2;
  const grad = ctx.createLinearGradient(
    W / 2 - Math.cos(angle) * (W / 2),
    H / 2 - Math.sin(angle) * (H / 2),
    W / 2 + Math.cos(angle) * (W / 2),
    H / 2 + Math.sin(angle) * (H / 2),
  );
  grad.addColorStop(0, palette.bg[0]);
  grad.addColorStop(1, palette.bg[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 2. Geometric pattern ---------------------------------------------------
  PATTERN_DRAWERS[seed % PATTERN_DRAWERS.length](ctx, W, H, rand, palette.accent);

  // 3. Vignette ------------------------------------------------------------
  const vig = ctx.createRadialGradient(
    W / 2,
    H / 2,
    W * 0.15,
    W / 2,
    H / 2,
    W * 0.75,
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // 4. Large faded emoji watermark -----------------------------------------
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.font = EMOJI_FONT;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(palette.emoji, W - 24, H - 16);
  ctx.restore();

  // 5. Cache & return -------------------------------------------------------
  const dataUrl = canvas.toDataURL("image/png");
  imageCache.set(cacheKey, dataUrl);
  return dataUrl;
}
