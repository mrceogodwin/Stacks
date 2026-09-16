/** Original WAV beds and hits. No sample pack. Mono 22.05 kHz. */

const SR = 22050;

function clamp(n: number, a = -1, b = 1) {
  return Math.max(a, Math.min(b, n));
}

function env(i: number, n: number, attack = 0.04, release = 0.18) {
  const a = Math.min(1, i / Math.max(1, attack * n));
  const r = Math.min(1, (n - 1 - i) / Math.max(1, release * n));
  return Math.max(0, Math.min(a, r));
}

function midi(n: number) {
  return 440 * Math.pow(2, (n - 69) / 12);
}

function mixToWav(samples: Float32Array) {
  let peak = 0.0001;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]!));
  const scale = 0.88 / peak;
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.round(clamp(samples[i]! * scale) * 32767);
    data.writeInt16LE(v, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const PROGRESSIONS: Record<string, number[][]> = {
  ambient: [
    [48, 55, 60, 67],
    [53, 60, 65, 72],
    [55, 62, 67, 74],
    [50, 57, 62, 69],
  ],
  cinematic: [
    [45, 52, 59, 64],
    [48, 55, 60, 67],
    [41, 48, 55, 60],
    [43, 50, 57, 62],
  ],
  afrobeat: [
    [45, 49, 52, 57],
    [47, 50, 54, 59],
    [40, 47, 52, 56],
    [42, 45, 49, 54],
  ],
  "lo-fi": [
    [50, 53, 57, 62],
    [48, 52, 55, 60],
    [53, 57, 60, 65],
    [46, 50, 53, 58],
  ],
  corporate: [
    [48, 52, 55, 60],
    [50, 53, 57, 62],
    [52, 55, 59, 64],
    [47, 50, 55, 62],
  ],
};

export function renderMusic(opts: {
  genre?: string;
  mood?: string;
  bpm?: string;
  seconds?: string;
}): Buffer {
  const genre = (opts.genre || "ambient").toLowerCase();
  const key = genre.includes("afro") ? "afrobeat" : genre.includes("cinema") ? "cinematic" : genre.includes("lo") ? "lo-fi" : genre.includes("corp") || genre.includes("business") ? "corporate" : "ambient";
  const chords = PROGRESSIONS[key] ?? PROGRESSIONS.ambient!;
  const bpm = Math.max(60, Math.min(140, parseInt(opts.bpm || "88", 10) || 88));
  const seconds = Math.max(4, Math.min(10, parseInt(opts.seconds || "8", 10) || 8));
  const n = SR * seconds;
  const out = new Float32Array(n);
  const chordLen = Math.floor((60 / bpm) * 4 * SR);
  let pos = 0;
  let ci = 0;
  const mood = (opts.mood || "").toLowerCase();
  const bright = mood.includes("bright") || mood.includes("happy") ? 1.08 : mood.includes("dark") ? 0.92 : 1;
  while (pos < n) {
    const take = Math.min(chordLen, n - pos);
    const notes = chords[ci % chords.length]!;
    for (let i = 0; i < take; i++) {
      const t = (pos + i) / SR;
      let s = 0;
      notes.forEach((m, k) => {
        const f = midi(m) * bright;
        s += Math.sin(2 * Math.PI * f * t) * (0.18 - k * 0.03);
        s += Math.sin(2 * Math.PI * f * 2 * t) * 0.04;
      });
      s += Math.sin(2 * Math.PI * (midi(notes[0]!) / 2) * t) * 0.12;
      s *= env(i, take, 0.08, 0.22);
      out[pos + i] += s;
    }
    pos += take;
    ci += 1;
  }
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i]! += Math.sin(2 * Math.PI * 0.25 * t) * 0.02;
  }
  return mixToWav(out);
}

const SFX: Record<string, (n: number, out: Float32Array) => void> = {
  click(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = (Math.random() * 2 - 1) * Math.exp(-t * 48) * 0.7 + Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 30) * 0.4;
    }
  },
  whoosh(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = 220 + 1400 * (i / n);
      out[i] = (Math.random() * 2 - 1) * 0.35 * env(i, n, 0.15, 0.35) + Math.sin(2 * Math.PI * f * t) * 0.2 * env(i, n);
    }
  },
  hit(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] =
        Math.sin(2 * Math.PI * 70 * t) * Math.exp(-t * 8) * 0.9 +
        Math.sin(2 * Math.PI * 140 * t) * Math.exp(-t * 12) * 0.4 +
        (Math.random() * 2 - 1) * Math.exp(-t * 20) * 0.25;
    }
  },
  notify(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = t < 0.12 ? 880 : 1320;
      out[i] = Math.sin(2 * Math.PI * f * t) * env(i, n, 0.02, 0.4) * 0.7;
    }
  },
  rise(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = 180 + 720 * (i / n);
      out[i] = Math.sin(2 * Math.PI * f * t) * env(i, n, 0.2, 0.15) * 0.55;
    }
  },
  ambient(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] =
        Math.sin(2 * Math.PI * 110 * t) * 0.18 +
        Math.sin(2 * Math.PI * 165 * t) * 0.12 +
        Math.sin(2 * Math.PI * 220 * t) * 0.08;
      out[i]! *= env(i, n, 0.2, 0.25);
    }
  },
};

export function renderSfx(opts: { type?: string; seconds?: string }): Buffer {
  const type = (opts.type || "whoosh").toLowerCase();
  const seconds = Math.max(0.4, Math.min(4, parseFloat(opts.seconds || "1.6") || 1.6));
  const n = Math.floor(SR * seconds);
  const out = new Float32Array(n);
  const fn = SFX[type] || SFX.whoosh!;
  fn(n, out);
  return mixToWav(out);
}

export function wavDataUrl(buf: Buffer) {
  return `data:audio/wav;base64,${buf.toString("base64")}`;
}
