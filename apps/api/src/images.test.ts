import { describe, it, expect } from "vitest";
import { readImageHeader } from "./images";

function jpeg(w: number, h: number, opts: { sofMarker?: number; appSegment?: boolean } = {}): Buffer {
  const parts: number[] = [0xff, 0xd8];
  if (opts.appSegment !== false) {
    parts.push(0xff, 0xe0, 0x00, 0x10);
    parts.push(...Array.from({ length: 14 }, () => 0x00));
  }
  parts.push(0xff, opts.sofMarker ?? 0xc0);
  parts.push(0x00, 0x11, 0x08);
  parts.push((h >> 8) & 0xff, h & 0xff, (w >> 8) & 0xff, w & 0xff);
  parts.push(...Array.from({ length: 10 }, () => 0x00));
  return Buffer.from(parts);
}

describe("readImageHeader — JPEG", () => {
  it("reads a baseline SOF0 frame past the APP0 segment", () => {
    expect(readImageHeader(jpeg(512, 512))).toEqual({ format: "jpeg", width: 512, height: 512 });
  });

  it("reads a progressive SOF2 frame", () => {
    expect(readImageHeader(jpeg(800, 600, { sofMarker: 0xc2 }))).toEqual({
      format: "jpeg",
      width: 800,
      height: 600,
    });
  });

  it("reads a frame that is the very first segment", () => {
    expect(readImageHeader(jpeg(128, 128, { appSegment: false }))).toEqual({
      format: "jpeg",
      width: 128,
      height: 128,
    });
  });

  it("does not mistake a DHT (0xC4) table for a frame", () => {
    const dht = Buffer.from([0xff, 0xd8, 0xff, 0xc4, 0x00, 0x08, 1, 2, 3, 4, 5, 6]);
    expect(readImageHeader(dht)).toBeNull();
  });

  it("returns null for a JPEG that ends before its frame", () => {
    expect(readImageHeader(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]))).toBeNull();
  });

  it("returns null when a segment claims a length below its own two bytes", () => {
    expect(readImageHeader(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01, 0x00]))).toBeNull();
  });
});
