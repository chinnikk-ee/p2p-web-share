/**
 * Streaming SHA-256 (FIPS 180-4) in pure TypeScript.
 *
 * Web Crypto's `subtle.digest` is one-shot only — it cannot hash a file larger
 * than memory. This incremental implementation lets us fold each plaintext
 * chunk into the running digest as it is read/received, so we can verify the
 * whole-file hash of arbitrarily large files (>500 MB) without ever holding
 * the file in RAM. Per-chunk hashes still use the faster native digest.
 *
 * Correctness is asserted in sha256.test.ts against `crypto.subtle.digest`.
 */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export class Sha256Stream {
  private readonly h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  private readonly block = new Uint8Array(64);
  private readonly w = new Uint32Array(64);
  private blockLength = 0;
  private totalBytes = 0;
  private finalized = false;

  update(data: Uint8Array): this {
    if (this.finalized) throw new Error('Sha256Stream: cannot update after digest()');
    this.totalBytes += data.length;
    let offset = 0;

    // Top up a partially filled block first.
    if (this.blockLength > 0) {
      while (offset < data.length && this.blockLength < 64) {
        this.block[this.blockLength++] = data[offset++] as number;
      }
      if (this.blockLength === 64) {
        this.processBlock(this.block, 0);
        this.blockLength = 0;
      }
    }

    // Process whole 64-byte blocks straight from the input.
    while (data.length - offset >= 64) {
      this.processBlock(data, offset);
      offset += 64;
    }

    // Stash the remainder.
    while (offset < data.length) {
      this.block[this.blockLength++] = data[offset++] as number;
    }
    return this;
  }

  digest(): Uint8Array {
    if (this.finalized) throw new Error('Sha256Stream: already finalized');
    const totalBits = this.totalBytes * 8;

    this.block[this.blockLength++] = 0x80;
    if (this.blockLength > 56) {
      while (this.blockLength < 64) this.block[this.blockLength++] = 0;
      this.processBlock(this.block, 0);
      this.blockLength = 0;
    }
    while (this.blockLength < 56) this.block[this.blockLength++] = 0;

    const view = new DataView(this.block.buffer, this.block.byteOffset, 64);
    view.setUint32(56, Math.floor(totalBits / 0x100000000), false);
    view.setUint32(60, totalBits % 0x100000000, false);
    this.processBlock(this.block, 0);
    this.finalized = true;

    const out = new Uint8Array(32);
    const outView = new DataView(out.buffer);
    for (let i = 0; i < 8; i += 1) {
      outView.setUint32(i * 4, this.h[i] as number, false);
    }
    return out;
  }

  digestHex(): string {
    return Array.from(this.digest(), (b) => b.toString(16).padStart(2, '0')).join('');
  }

  private processBlock(input: Uint8Array, offset: number): void {
    const w = this.w;
    const view = new DataView(input.buffer, input.byteOffset + offset, 64);
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const x = w[i - 15] as number;
      const y = w[i - 2] as number;
      const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
      const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
      w[i] = ((w[i - 16] as number) + s0 + (w[i - 7] as number) + s1) >>> 0;
    }

    let a = this.h[0] as number;
    let b = this.h[1] as number;
    let c = this.h[2] as number;
    let d = this.h[3] as number;
    let e = this.h[4] as number;
    let f = this.h[5] as number;
    let g = this.h[6] as number;
    let hh = this.h[7] as number;

    for (let i = 0; i < 64; i += 1) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + (K[i] as number) + (w[i] as number)) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }

    this.h[0] = ((this.h[0] as number) + a) >>> 0;
    this.h[1] = ((this.h[1] as number) + b) >>> 0;
    this.h[2] = ((this.h[2] as number) + c) >>> 0;
    this.h[3] = ((this.h[3] as number) + d) >>> 0;
    this.h[4] = ((this.h[4] as number) + e) >>> 0;
    this.h[5] = ((this.h[5] as number) + f) >>> 0;
    this.h[6] = ((this.h[6] as number) + g) >>> 0;
    this.h[7] = ((this.h[7] as number) + hh) >>> 0;
  }
}
