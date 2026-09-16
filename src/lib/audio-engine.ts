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

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
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

function pickProgression(text: string) {
  const t = text.toLowerCase();
  if (/afro|afrobeats|highlife|fuji|amapiano/.test(t)) return "afrobeat";
  if (/cinema|epic|trailer|score|orchestr/.test(t)) return "cinematic";
  if (/lo-?fi|chill|dusty|tape/.test(t)) return "lo-fi";
  if (/corp|business|brand|clean|pop/.test(t)) return "corporate";
  return "ambient";
}

export function renderMusic(opts: {
  genre?: string;
  mood?: string;
  bpm?: string;
  seconds?: string;
  prompt?: string;
}): Buffer {
  const blob = `${opts.prompt || ""} ${opts.genre || ""} ${opts.mood || ""}`.toLowerCase();
  const key = pickProgression(blob || opts.genre || "ambient");
  const chords = PROGRESSIONS[key] ?? PROGRESSIONS.ambient!;
  const bpm = Math.max(60, Math.min(160, parseInt(opts.bpm || (/fast|hype|dance/.test(blob) ? "118" : "88"), 10) || 88));
  const seconds = Math.max(4, Math.min(12, parseInt(opts.seconds || "8", 10) || 8));
  const n = SR * seconds;
  const out = new Float32Array(n);
  const chordLen = Math.floor((60 / bpm) * 4 * SR);
  let pos = 0;
  let ci = 0;
  const mood = blob;
  const bright = /bright|happy|hope|sun/.test(mood) ? 1.1 : /dark|sad|night|heavy/.test(mood) ? 0.9 : 1;
  const seed = hash(blob || "stacks");
  while (pos < n) {
    const take = Math.min(chordLen, n - pos);
    const notes = chords[ci % chords.length]!;
    for (let i = 0; i < take; i++) {
      const t = (pos + i) / SR;
      let s = 0;
      notes.forEach((m, k) => {
        const f = midi(m) * bright * (1 + ((seed % 9) - 4) * 0.003);
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
    out[i]! += Math.sin(2 * Math.PI * (0.2 + (seed % 5) * 0.03) * t) * 0.02;
  }
  return mixToWav(out);
}

type Synth = (n: number, out: Float32Array, seed: number) => void;

const SFX: Record<string, Synth> = {
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
  laser(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = 1400 - 900 * (i / n);
      out[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 6) * 0.7;
    }
  },
  rain(n, out) {
    for (let i = 0; i < n; i++) out[i] = (Math.random() * 2 - 1) * 0.22 * env(i, n, 0.05, 0.2);
  },
  coin(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = t < 0.08 ? 1800 : 2400;
      out[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 14) * 0.75;
    }
  },
  glitch(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const burst = Math.sin(t * 90) > 0 ? 1 : 0.15;
      out[i] = (Math.random() * 2 - 1) * 0.4 * burst * env(i, n);
    }
  },
  bass(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = Math.sin(2 * Math.PI * 48 * t) * Math.exp(-t * 4) * 0.95 + Math.sin(2 * Math.PI * 96 * t) * Math.exp(-t * 8) * 0.3;
    }
  },
  thunder(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] =
        Math.sin(2 * Math.PI * 38 * t) * Math.exp(-t * 2.2) * 0.85 +
        (Math.random() * 2 - 1) * Math.exp(-t * 3.5) * 0.45 +
        Math.sin(2 * Math.PI * 19 * t) * Math.exp(-t * 1.6) * 0.4;
    }
  },
  footsteps(n, out) {
    const gap = Math.floor(SR * 0.38);
    for (let i = 0; i < n; i++) {
      const local = i % gap;
      const t = local / SR;
      out[i] = (Math.random() * 2 - 1) * Math.exp(-t * 40) * 0.55 + Math.sin(2 * Math.PI * 90 * t) * Math.exp(-t * 18) * 0.25;
    }
  },
  heartbeat(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const beat = t % 0.72;
      const lub = Math.exp(-beat * 28) * Math.sin(2 * Math.PI * 52 * t);
      const dub = beat > 0.16 ? Math.exp(-(beat - 0.16) * 32) * Math.sin(2 * Math.PI * 44 * t) : 0;
      out[i] = (lub * 0.7 + dub * 0.45) * env(i, n, 0.04, 0.12);
    }
  },
  explosion(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] =
        Math.sin(2 * Math.PI * 42 * t) * Math.exp(-t * 3.5) * 0.95 +
        (Math.random() * 2 - 1) * Math.exp(-t * 5) * 0.7 +
        Math.sin(2 * Math.PI * 18 * t) * Math.exp(-t * 2) * 0.4;
    }
  },
  glass(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] =
        Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-t * 10) * 0.5 +
        Math.sin(2 * Math.PI * 3700 * t) * Math.exp(-t * 14) * 0.35 +
        (Math.random() * 2 - 1) * Math.exp(-t * 22) * 0.25;
    }
  },
  metal(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] =
        Math.sin(2 * Math.PI * 620 * t) * Math.exp(-t * 6) * 0.45 +
        Math.sin(2 * Math.PI * 1240 * t) * Math.exp(-t * 8) * 0.3 +
        (Math.random() * 2 - 1) * Math.exp(-t * 16) * 0.2;
    }
  },
  ocean(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const swell = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.35 * t);
      out[i] = (Math.random() * 2 - 1) * 0.28 * swell * env(i, n, 0.12, 0.18);
    }
  },
  fire(n, out) {
    for (let i = 0; i < n; i++) {
      const crack = Math.random() > 0.992 ? (Math.random() * 2 - 1) * 0.6 : 0;
      out[i] = (Math.random() * 2 - 1) * 0.16 * env(i, n, 0.08, 0.15) + crack;
    }
  },
  siren(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = 680 + 220 * Math.sin(2 * Math.PI * 1.6 * t);
      out[i] = Math.sin(2 * Math.PI * f * t) * env(i, n, 0.08, 0.12) * 0.55;
    }
  },
  horn(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] =
        (Math.sin(2 * Math.PI * 220 * t) + Math.sin(2 * Math.PI * 330 * t) * 0.5) * env(i, n, 0.04, 0.2) * 0.5;
    }
  },
  typewriter(n, out) {
    const gap = Math.floor(SR * 0.09);
    for (let i = 0; i < n; i++) {
      const local = i % gap;
      const t = local / SR;
      out[i] = (Math.random() * 2 - 1) * Math.exp(-t * 70) * 0.55;
    }
  },
  shutter(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const click = Math.exp(-t * 55) * (Math.random() * 2 - 1);
      const slap = t > 0.04 && t < 0.12 ? Math.sin(2 * Math.PI * 180 * t) * Math.exp(-(t - 0.04) * 40) : 0;
      out[i] = click * 0.55 + slap * 0.4;
    }
  },
  applause(n, out) {
    for (let i = 0; i < n; i++) out[i] = (Math.random() * 2 - 1) * 0.32 * env(i, n, 0.08, 0.2);
  },
  splash(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] =
        (Math.random() * 2 - 1) * Math.exp(-t * 8) * 0.5 + Math.sin(2 * Math.PI * 420 * t) * Math.exp(-t * 10) * 0.2;
    }
  },
  wind(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = 180 + 90 * Math.sin(2 * Math.PI * 0.4 * t);
      out[i] = (Math.random() * 2 - 1) * 0.22 * env(i, n) + Math.sin(2 * Math.PI * f * t) * 0.08;
    }
  },
  engine(n, out) {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = 42 + 18 * Math.sin(2 * Math.PI * 2 * t);
      out[i] = Math.sin(2 * Math.PI * f * t) * 0.55 + (Math.random() * 2 - 1) * 0.08;
      out[i]! *= env(i, n, 0.1, 0.15);
    }
  },
};

function matchKind(text: string): string | null {
  const t = text.toLowerCase();
  if (/whoosh|swoosh|pass[- ]by|fly[- ]by/.test(t)) return "whoosh";
  if (/click|tap|ui |button|toggle|switch/.test(t)) return "click";
  if (/thunder|lightning/.test(t)) return "thunder";
  if (/footstep|foot fall|walk on|boots/.test(t)) return "footsteps";
  if (/heart ?beat|pulse/.test(t)) return "heartbeat";
  if (/explod|blast|boom|bomb/.test(t)) return "explosion";
  if (/glass|shatter|bottle smash/.test(t)) return "glass";
  if (/metal|anvil|sword|steel/.test(t)) return "metal";
  if (/ocean|wave|shore|surf/.test(t)) return "ocean";
  if (/fire|flame|campfire|crackle/.test(t)) return "fire";
  if (/siren|alarm/.test(t)) return "siren";
  if (/horn|honk/.test(t)) return "horn";
  if (/typewriter|keyboard|keys clack/.test(t)) return "typewriter";
  if (/shutter|camera/.test(t)) return "shutter";
  if (/applause|clap|crowd clap/.test(t)) return "applause";
  if (/splash|puddle/.test(t)) return "splash";
  if (/wind|breeze/.test(t)) return "wind";
  if (/engine|motor|rev/.test(t)) return "engine";
  if (/hit|kick|punch|impact|slam|door|knock/.test(t)) return "hit";
  if (/notif|ding|bell|chime|ping|alert|message/.test(t)) return "notify";
  if (/rise|riser|build|swell|lift/.test(t)) return "rise";
  if (/laser|zap|beam|sci-?fi/.test(t)) return "laser";
  if (/rain|drizzle|storm|tin roof/.test(t)) return "rain";
  if (/coin|cash|register|bling|cha-?ching/.test(t)) return "coin";
  if (/glitch|stutter|buffer|digital|error/.test(t)) return "glitch";
  if (/bass|drop|sub|808|thud/.test(t)) return "bass";
  if (/amb|drone|pad|room tone|air|space/.test(t)) return "ambient";
  return null;
}

function spaceTail(text: string, n: number, out: Float32Array) {
  const t = text.toLowerCase();
  const wet = /hall|church|parkade|cathedral|warehouse|tunnel/.test(t)
    ? 0.42
    : /room|office|studio|close/.test(t)
      ? 0.18
      : /street|outdoor|market/.test(t)
        ? 0.12
        : 0.08;
  const delay = Math.floor(SR * (/hall|church|cathedral/.test(t) ? 0.12 : 0.045));
  if (delay <= 0 || delay >= n) return;
  for (let i = n - 1; i >= delay; i--) out[i]! += out[i - delay]! * wet;
}

function intensityGain(text: string) {
  const t = text.toLowerCase();
  if (/huge|loud|hard|heavy|massive/.test(t)) return 1.28;
  if (/soft|quiet|gentle|distant|far/.test(t)) return 0.62;
  if (/medium/.test(t)) return 1;
  return 1;
}

function renderDescribed(text: string, n: number, out: Float32Array) {
  const h = hash(text || "sfx");
  const f0 = 80 + (h % 1400);
  const f1 = 120 + ((h >> 8) % 1800);
  const noise = 0.12 + ((h >> 16) % 40) / 100;
  const decay = 4 + ((h >> 4) % 24);
  const gritBoost = /grit|dirt|gravel|concrete|rough/.test(text.toLowerCase()) ? 1.6 : 1;
  const toneBoost = /tone|note|musical|bell|ping/.test(text.toLowerCase()) ? 1.4 : 1;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const sweep = f0 + (f1 - f0) * (i / n);
    const tone = Math.sin(2 * Math.PI * sweep * t) * Math.exp(-t * (decay / 4)) * toneBoost;
    const grit = (Math.random() * 2 - 1) * noise * Math.exp(-t * decay) * gritBoost;
    const sub = Math.sin(2 * Math.PI * (40 + (h % 60)) * t) * Math.exp(-t * 5) * 0.35;
    out[i] = (tone * 0.55 + grit + sub) * env(i, n, 0.03, 0.22);
  }
}

export function renderSfx(opts: { type?: string; prompt?: string; seconds?: string }): Buffer {
  const text = `${opts.prompt || ""} ${opts.type || ""}`.trim() || "whoosh";
  const seconds = Math.max(
    0.4,
    Math.min(6, parseFloat(opts.seconds || (/long|tail|reverb|hall/.test(text.toLowerCase()) ? "2.4" : "1.6")) || 1.6),
  );
  const n = Math.floor(SR * seconds);
  const out = new Float32Array(n);
  const seed = hash(text);
  const kind = (opts.type && SFX[opts.type.toLowerCase()] ? opts.type.toLowerCase() : matchKind(text)) || "";
  if (kind && SFX[kind]) SFX[kind](n, out, seed);
  else renderDescribed(text, n, out);
  spaceTail(text, n, out);
  const tilt = (1 + ((seed % 11) - 5) * 0.012) * intensityGain(text);
  for (let i = 0; i < n; i++) out[i]! *= tilt;
  return mixToWav(out);
}

export function wavDataUrl(buf: Buffer) {
  return `data:audio/wav;base64,${buf.toString("base64")}`;
}
