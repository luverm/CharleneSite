// Generates branded placeholder portfolio images (pure Node, no deps).
// Run: node scripts/gen-demo-portfolio.mjs
// Output: public/images/portfolio/*.png  +  public/images/portfolio/over-charlene.png
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "images", "portfolio");
mkdirSync(OUT, { recursive: true });

const W = 1080;
const H = 1350;

// --- CRC32 (PNG chunk checksums) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const mix = (a, b, t) => Math.round(a + (b - a) * t);

// Diagonal gradient PNG with a soft vignette for a photographic feel.
function gradientPng(from, to) {
  const c0 = hex(from);
  const c1 = hex(to);
  const raw = Buffer.alloc(H * (1 + W * 3)); // filter byte + RGB per row
  let p = 0;
  for (let y = 0; y < H; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < W; x++) {
      const t = (x / W + y / H) / 2;
      // vignette: darken toward edges/corners
      const dx = (x / W - 0.5) * 2;
      const dy = (y / H - 0.5) * 2;
      const v = 1 - Math.min(1, (dx * dx + dy * dy) * 0.35);
      raw[p++] = Math.round(mix(c0[0], c1[0], t) * v);
      raw[p++] = Math.round(mix(c0[1], c1[1], t) * v);
      raw[p++] = Math.round(mix(c0[2], c1[2], t) * v);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Filenames double as alt text (dashes -> spaces in the app).
const IMAGES = [
  ["balayage-warm-blond", "#3a5a40", "#a3b18a"],
  ["dames-coupe-laagjes", "#bc6c4c", "#e9d8c4"],
  ["natuurlijke-krullen", "#344e41", "#dad7cd"],
  ["heren-fade", "#4a4e69", "#c9ada7"],
  ["koperkleuring", "#9e4a2f", "#e8c9a0"],
  ["opsteekkapsel-bruid", "#52796f", "#e9edc9"],
];

for (const [name, from, to] of IMAGES) {
  writeFileSync(path.join(OUT, `${name}.png`), gradientPng(from, to));
  console.log("wrote", `${name}.png`);
}
// Homepage "Over" portrait — written as placeholder.jpg because that's the
// hard-coded ABOUT_IMAGE_FALLBACK path the homepage uses for fs-based portfolios.
// (Bytes are PNG; next/image sniffs format from content, not extension.)
writeFileSync(path.join(OUT, "placeholder.jpg"), gradientPng("#3a5a40", "#bc6c4c"));
console.log("wrote placeholder.jpg");
