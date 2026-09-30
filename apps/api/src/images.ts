export type ImageFormat = "png" | "webp" | "jpeg";
export type ImageHeader = { format: ImageFormat; width: number; height: number };

export function readImageHeader(buf: Buffer): ImageHeader | null {
  if (
    buf.length >= 24 &&
    buf.readUInt32BE(0) === 0x89504e47 &&
    buf.readUInt32BE(4) === 0x0d0a1a0a &&
    buf.toString("latin1", 12, 16) === "IHDR"
  ) {
    return { format: "png", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  if (
    buf.length >= 30 &&
    buf.toString("latin1", 0, 4) === "RIFF" &&
    buf.toString("latin1", 8, 12) === "WEBP"
  ) {
    switch (buf.toString("latin1", 12, 16)) {
      case "VP8X":
        return {
          format: "webp",
          width: buf.readUIntLE(24, 3) + 1,
          height: buf.readUIntLE(27, 3) + 1,
        };
      case "VP8 ":
        return {
          format: "webp",
          width: buf.readUInt16LE(26) & 0x3fff,
          height: buf.readUInt16LE(28) & 0x3fff,
        };
      case "VP8L": {
        const bits = buf.readUInt32LE(21);
        return {
          format: "webp",
          width: (bits & 0x3fff) + 1,
          height: ((bits >> 14) & 0x3fff) + 1,
        };
      }
    }
  }

  return readJpegHeader(buf);
}

function isStandaloneMarker(marker: number): boolean {
  return marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7);
}

function isFrameMarker(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

function readJpegHeader(buf: Buffer): ImageHeader | null {
  if (buf.length < 4 || buf.readUInt16BE(0) !== 0xffd8) return null;

  let off = 2;
  while (off + 1 < buf.length) {
    if (buf.readUInt8(off) !== 0xff) return null;
    let marker = buf.readUInt8(off + 1);
    off += 2;
    while (marker === 0xff && off < buf.length) marker = buf.readUInt8(off++);

    if (isStandaloneMarker(marker)) continue;

    if (off + 1 >= buf.length) return null;
    const length = buf.readUInt16BE(off);
    if (length < 2) return null;

    if (isFrameMarker(marker)) {
      if (off + 6 >= buf.length) return null;
      return { format: "jpeg", width: buf.readUInt16BE(off + 5), height: buf.readUInt16BE(off + 3) };
    }

    off += length;
  }

  return null;
}
