// Generates the add-in icons as PNG files without any image tooling.
// The icon is a rounded square with three text lines of falling length,
// the last one ending in a check mark shape: "plain text".
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const SIZES = [16, 32, 64, 80, 128];
const BRAND = [0x7f, 0x56, 0xd9];
const WHITE = [0xff, 0xff, 0xff];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = pixel(x + 0.5, y + 0.5);
      const offset = y * (size * 4 + 1) + 1 + x * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function insideRoundedRect(x, y, x0, y0, x1, y1, radius) {
  const cx = Math.min(Math.max(x, x0 + radius), x1 - radius);
  const cy = Math.min(Math.max(y, y0 + radius), y1 - radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function iconPixel(size) {
  const s = (v) => v * size;
  const lines = [
    [0.22, 0.28, 0.78],
    [0.22, 0.46, 0.66],
    [0.22, 0.64, 0.46],
  ];
  const thickness = Math.max(1.5, s(0.09));
  return (x, y) => {
    if (!insideRoundedRect(x, y, 0, 0, size, size, s(0.22))) return [0, 0, 0, 0];
    for (const [from, top, to] of lines) {
      if (insideRoundedRect(x, y, s(from), s(top), s(to), s(top) + thickness, thickness / 2))
        return [...WHITE, 255];
    }
    // Check mark after the last line.
    const onStroke = (ax, ay, bx, by) => {
      const [px, py, qx, qy] = [s(ax), s(ay), s(bx), s(by)];
      const t = Math.max(
        0,
        Math.min(1, ((x - px) * (qx - px) + (y - py) * (qy - py)) / ((qx - px) ** 2 + (qy - py) ** 2)),
      );
      return Math.hypot(x - (px + t * (qx - px)), y - (py + t * (qy - py))) <= thickness / 2;
    };
    if (onStroke(0.56, 0.68, 0.64, 0.76) || onStroke(0.64, 0.76, 0.8, 0.56)) return [...WHITE, 255];
    return [...BRAND, 255];
  };
}

for (const size of SIZES) {
  const file = new URL(`../public/assets/icon-${size}.png`, import.meta.url);
  writeFileSync(file, png(size, iconPixel(size)));
  process.stdout.write(`wrote ${file.pathname}\n`);
}
