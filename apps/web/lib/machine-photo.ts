import type { Theme } from "@/lib/theme";

const TARGET: Record<Theme, { mean: number; spread: number; sat: number; lo: number; hi: number }> = {
  dark: { mean: 0.23, spread: 0.2, sat: 0.05, lo: 0, hi: 0.56 },
  light: { mean: 0.48, spread: 0.2, sat: 0.07, lo: 0.1, hi: 0.93 },
};

function deepenShadows(v: number): number {
  if (v >= 0.5 || v <= 0) return v;
  return 0.5 * Math.pow(v / 0.5, 1.35);
}

function toneCurve(v: number, lo: number, hi: number): number {
  const kh = hi - 0.14;
  if (v > kh) return kh + (hi - kh) * (1 - Math.exp(-(v - kh) / (hi - kh)));
  const kl = lo + 0.1;
  if (v < kl) return kl - (kl - lo) * (1 - Math.exp(-(kl - v) / (kl - lo)));
  return v;
}

const MAX_WIDTH = 800;

const cache = new Map<string, Promise<string>>();

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function processedMachinePhoto(src: string, theme: Theme): Promise<string> {
  const key = `${src}|${theme}|v5`;
  let job = cache.get(key);
  if (!job) {
    job = run(src, theme).catch(() => src);
    cache.set(key, job);
  }
  return job;
}

async function run(src: string, theme: Theme): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();

  const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  const px = image.data;
  const n = w * h;

  const isBackdrop = (i: number) => {
    const r = px[i * 4]!, g = px[i * 4 + 1]!, b = px[i * 4 + 2]!;
    const lo = Math.min(r, g, b);
    return lo >= 200 && Math.max(r, g, b) - lo <= 24;
  };
  const backdrop = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  const seed = (i: number) => {
    if (!backdrop[i] && isBackdrop(i)) {
      backdrop[i] = 1;
      queue[tail++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  while (head < tail) {
    const i = queue[head++]!;
    const x = i % w;
    if (x > 0) seed(i - 1);
    if (x < w - 1) seed(i + 1);
    if (i >= w) seed(i - w);
    if (i < n - w) seed(i + w);
  }
  for (let i = 0; i < n; i++) {
    if (!backdrop[i]) continue;
    const lo = Math.min(px[i * 4]!, px[i * 4 + 1]!, px[i * 4 + 2]!) / 255;
    px[i * 4 + 3] = Math.round(px[i * 4 + 3]! * clamp((0.96 - lo) / 0.3, 0, 1));
  }

  let count = 0;
  let sumL = 0;
  let sumL2 = 0;
  let sumS = 0;
  for (let i = 0; i < n; i++) {
    if (px[i * 4 + 3]! < 128) continue;
    const r = px[i * 4]! / 255, g = px[i * 4 + 1]! / 255, b = px[i * 4 + 2]! / 255;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sumL += l;
    sumL2 += l * l;
    sumS += Math.max(r, g, b) - Math.min(r, g, b);
    count++;
  }
  if (count > 0) {
    const mean = sumL / count;
    const spread = Math.sqrt(Math.max(0, sumL2 / count - mean * mean)) || TARGET[theme].spread;
    const sat = sumS / count;
    const t = TARGET[theme];

    const k = clamp(t.spread / spread, 0.8, 1.6);
    const shift = clamp(t.mean - mean, -0.4, 0.22);
    const f = clamp(t.sat / Math.max(sat, 0.01), 0.1, 1.2);
    for (let i = 0; i < n; i++) {
      if (px[i * 4 + 3] === 0) continue;
      let r = (px[i * 4]! / 255 - mean) * k + mean + shift;
      let g = (px[i * 4 + 1]! / 255 - mean) * k + mean + shift;
      let b = (px[i * 4 + 2]! / 255 - mean) * k + mean + shift;
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = l + (r - l) * f;
      g = l + (g - l) * f;
      b = l + (b - l) * f;
      const d = (v: number) => toneCurve(theme === "dark" ? deepenShadows(v) : v, t.lo, t.hi);
      px[i * 4] = Math.round(d(r) * 255);
      px[i * 4 + 1] = Math.round(d(g) * 255);
      px[i * 4 + 2] = Math.round(d(b) * 255);
    }
  }

  ctx.putImageData(image, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  return blob ? URL.createObjectURL(blob) : src;
}
