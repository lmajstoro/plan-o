import { deflateSync } from "node:zlib";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const BG = [0x1f, 0x2a, 0x37];
const MARK_W = 235;
const MARK_H = 272;
const MARK_SCALE = 24 / MARK_H;
const MARK_X = (32 - MARK_W * MARK_SCALE) / 2;
const MARK_Y = (32 - MARK_H * MARK_SCALE) / 2;
const BARS = [
  { x: 0, y: 0, w: 235, h: 80, rTL: 40, rBR: 44, fill: [0x39, 0xb5, 0x4a] },
  { x: 0, y: 96, w: 179, h: 80, rTL: 20, rBR: 44, fill: [0x21, 0x69, 0xae] },
  { x: 0, y: 192, w: 84, h: 80, rTL: 20, rBR: 44, fill: [0xe0, 0x1d, 0x44] },
].map((bar) => ({
  x: MARK_X + bar.x * MARK_SCALE,
  y: MARK_Y + bar.y * MARK_SCALE,
  w: bar.w * MARK_SCALE,
  h: bar.h * MARK_SCALE,
  rTL: bar.rTL * MARK_SCALE,
  rBR: bar.rBR * MARK_SCALE,
  fill: bar.fill,
}));

function inRoundRect(u, v, rect) {
  const { x, y, w, h, r } = rect;
  if (u < x || v < y || u > x + w || v > y + h) return false;
  const corners = [
    [x + r, y + r, u < x + r && v < y + r],
    [x + w - r, y + r, u > x + w - r && v < y + r],
    [x + r, y + h - r, u < x + r && v > y + h - r],
    [x + w - r, y + h - r, u > x + w - r && v > y + h - r],
  ];
  for (const [cx, cy, inside] of corners) {
    if (!inside) continue;
    const dx = u - cx;
    const dy = v - cy;
    return dx * dx + dy * dy <= r * r;
  }
  return true;
}

function inBar(u, v, bar) {
  const { x, y, w, h, rTL, rBR } = bar;
  if (u < x || v < y || u > x + w || v > y + h) return false;
  if (u < x + rTL && v < y + rTL) {
    const dx = u - (x + rTL);
    const dy = v - (y + rTL);
    return dx * dx + dy * dy <= rTL * rTL;
  }
  if (u > x + w - rBR && v > y + h - rBR) {
    const dx = u - (x + w - rBR);
    const dy = v - (y + h - rBR);
    return dx * dx + dy * dy <= rBR * rBR;
  }
  return true;
}

function sample(u, v, rounded) {
  const tile = { x: 0, y: 0, w: 32, h: 32, r: 8 };
  if (rounded && !inRoundRect(u, v, tile)) return [0, 0, 0, 0];
  for (const bar of BARS) {
    if (inBar(u, v, bar)) return [...bar.fill, 255];
  }
  return [...BG, 255];
}

function raster(size, scale, rounded) {
  const samples = size <= 48 ? 4 : 2;
  const step = 1 / samples;
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = x + (sx + 0.5) * step;
          const py = y + (sy + 0.5) * step;
          const u = ((px / size - 0.5) / scale) * 32 + 16;
          const v = ((py / size - 0.5) / scale) * 32 + 16;
          const color = sample(u, v, rounded);
          r += color[0];
          g += color[1];
          b += color[2];
          a += color[3];
          n += 1;
        }
      }
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(r / n);
      rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(b / n);
      rgba[i + 3] = Math.round(a / n);
    }
  }
  return rgba;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const name = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])) >>> 0);
  return Buffer.concat([length, name, data, crc]);
}

function png(size, scale, rounded = false) {
  const rgba = raster(size, scale, rounded);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map((image) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 0);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += image.png.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}

const iconsDir = join(root, "icons");
mkdirSync(iconsDir, { recursive: true });

const png32 = png(32, 1, true);
const png16 = png(16, 1, true);
writeFileSync(join(root, "favicon-32.png"), png32);
writeFileSync(join(root, "apple-touch-icon.png"), png(180, 1));
writeFileSync(join(iconsDir, "icon-192.png"), png(192, 1));
writeFileSync(join(iconsDir, "icon-512.png"), png(512, 1));
writeFileSync(join(iconsDir, "icon-maskable-512.png"), png(512, 0.66));
writeFileSync(
  join(root, "favicon.ico"),
  ico([
    { size: 16, png: png16 },
    { size: 32, png: png32 },
  ]),
);
