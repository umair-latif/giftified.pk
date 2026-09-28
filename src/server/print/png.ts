/**
 * Minimal PNG chunk helpers: read chunks (tests, verification) and insert
 * ancillary chunks such as `sRGB` right after IHDR. Pure, no dependencies.
 */
const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export interface PngChunk {
  type: string;
  data: Uint8Array;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = (CRC_TABLE[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function assertPng(png: Uint8Array): void {
  if (png.length < 8 || SIGNATURE.some((b, i) => png[i] !== b)) {
    throw new Error("Not a PNG file");
  }
}

export function readPngChunks(png: Uint8Array): PngChunk[] {
  assertPng(png);
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const chunks: PngChunk[] = [];
  let pos = 8;
  while (pos + 12 <= png.length) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(...png.subarray(pos + 4, pos + 8));
    chunks.push({ type, data: png.subarray(pos + 8, pos + 8 + len) });
    pos += 12 + len;
    if (type === "IEND") break;
  }
  return chunks;
}

function encodeChunk({ type, data }: PngChunk): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** Inserts a chunk directly after IHDR (where colour-space chunks belong). */
export function insertChunkAfterIhdr(
  png: Uint8Array,
  chunk: PngChunk,
): Uint8Array {
  assertPng(png);
  const ihdrLen = new DataView(png.buffer, png.byteOffset).getUint32(8);
  const at = 8 + 12 + ihdrLen;
  const encoded = encodeChunk(chunk);
  const out = new Uint8Array(png.length + encoded.length);
  out.set(png.subarray(0, at), 0);
  out.set(encoded, at);
  out.set(png.subarray(at), at + encoded.length);
  return out;
}

/** Drops every chunk of the given type (e.g. node-canvas's `bKGD` background hint). */
export function removeChunks(png: Uint8Array, type: string): Uint8Array {
  const kept = readPngChunks(png).filter((c) => c.type !== type);
  const parts = [Uint8Array.from(SIGNATURE), ...kept.map(encodeChunk)];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** Marks the PNG as sRGB (perceptual intent) unless it already has colour info. */
export function withSrgbChunk(png: Uint8Array): Uint8Array {
  const types = new Set(readPngChunks(png).map((c) => c.type));
  if (types.has("sRGB") || types.has("iCCP")) return png;
  return insertChunkAfterIhdr(png, { type: "sRGB", data: Uint8Array.of(0) });
}

/** Physical resolution from `pHYs`, in DPI (null when absent or not in metres). */
export function readPngDpi(png: Uint8Array): { x: number; y: number } | null {
  const phys = readPngChunks(png).find((c) => c.type === "pHYs");
  if (!phys || phys.data.length < 9 || phys.data[8] !== 1) return null;
  const view = new DataView(phys.data.buffer, phys.data.byteOffset, 9);
  const toDpi = (ppm: number) => Math.round(ppm * 0.254) / 10; // 0.1 DPI precision
  return { x: toDpi(view.getUint32(0)), y: toDpi(view.getUint32(4)) };
}
