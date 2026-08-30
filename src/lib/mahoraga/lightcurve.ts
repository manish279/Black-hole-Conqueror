import { lenseThirringHz } from "./kerr";
import { mulberry32, randn } from "./rng";
import { SOURCE_BY_ID } from "./sources";
import type { AccretionState, SourceId, WindowObs } from "./types";

export const N = 128;
export const DT = 0.25; // seconds → 32 s window

function ar1(rand: () => number, n: number, alpha: number, sigma: number) {
  const x = new Float32Array(n);
  x[0] = randn(rand) * sigma;
  for (let i = 1; i < n; i++) x[i] = alpha * x[i - 1] + sigma * randn(rand);
  return x;
}

function qpo(
  n: number,
  dt: number,
  hz: number,
  amp: number,
  rand: () => number,
  wander = 0.02,
) {
  const x = new Float32Array(n);
  let phase = rand() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    phase += 2 * Math.PI * hz * dt * (1 + wander * randn(rand));
    x[i] = amp * Math.sin(phase);
  }
  return x;
}

function add(a: Float32Array, b: Float32Array, s = 1) {
  const o = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) o[i] = a[i] + s * b[i];
  return o;
}

function scale(a: Float32Array, m: number, c: number) {
  const o = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) o[i] = m * a[i] + c;
  return o;
}

function slow(n: number, dt: number, hz: number, amp: number, phi: number) {
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = amp * Math.sin(2 * Math.PI * hz * i * dt + phi);
  return x;
}

export interface GenOpts {
  sourceId: SourceId;
  state: AccretionState;
  seed: number;
  index: number;
}

export function generateWindow(opts: GenOpts): WindowObs {
  const src = SOURCE_BY_ID[opts.sourceId];
  const rand = mulberry32(opts.seed + opts.index * 7919 + hash(opts.sourceId + opts.state));
  const noise = ar1(rand, N, 0.86, 1);

  let mean = 1;
  let rms = 0.12;
  let qpoHz: number | null = null;
  let flux: Float32Array;
  let hardness = 0.7;
  let radioMean = 0.6;
  let optMean = 0.5;
  let trainNormal = false;
  let injected = false;
  let tag = "";

  const rTrunc = 20 + 25 * rand();
  const lt = lenseThirringHz(rTrunc, src.spin, src.massSolar, 1);

  switch (opts.state) {
    case "soft": {
      mean = 2.4 + 0.3 * rand();
      rms = 0.035;
      hardness = 0.22 + 0.05 * rand();
      radioMean = 0.08;
      optMean = 0.85;
      flux = scale(noise, rms * mean, mean);
      trainNormal = true;
      tag = "thermal disk · jet off";
      break;
    }
    case "hard": {
      mean = 0.7 + 0.15 * rand();
      rms = 0.22;
      hardness = 0.82 + 0.06 * rand();
      radioMean = 0.75;
      optMean = 0.35;
      flux = scale(noise, rms * mean, mean);
      trainNormal = true;
      tag = "corona-dominated shot noise";
      break;
    }
    case "typeC": {
      mean = 1.15;
      rms = 0.18;
      hardness = 0.62;
      qpoHz = 0.8 + 2.4 * rand();
      radioMean = 0.55;
      optMean = 0.45;
      flux = add(scale(noise, rms * mean, mean), qpo(N, DT, qpoHz, 0.14 * mean, rand, 0.03));
      trainNormal = true;
      tag = `Type-C ~${qpoHz.toFixed(2)} Hz · LT template`;
      break;
    }
    case "typeB": {
      mean = 1.6;
      rms = 0.1;
      hardness = 0.4;
      qpoHz = 4 + 2 * rand();
      radioMean = 0.3;
      flux = add(scale(noise, rms * mean, mean), qpo(N, DT, qpoHz, 0.08 * mean, rand, 0.01));
      injected = true;
      tag = `Type-B ~${qpoHz.toFixed(2)} Hz · reversed i–rms vs Type-C`;
      break;
    }
    case "heartbeat": {
      mean = 1.8;
      rms = 0.08;
      hardness = 0.35;
      qpoHz = 0.06 + 0.03 * rand();
      const beat = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const ph = (i * DT * qpoHz) % 1;
        beat[i] = ph < 0.55 ? 0.55 * Math.sin(Math.PI * ph / 0.55) : -0.25 * ((ph - 0.55) / 0.45);
      }
      flux = add(scale(noise, rms * mean, mean), scale(beat, mean, 0));
      injected = true;
      tag = "ρ-class heartbeat · radiation-pressure limit cycle";
      break;
    }
    case "flipflop": {
      mean = 1.2;
      hardness = 0.5;
      const x = new Float32Array(N);
      let level = rand() > 0.5 ? 1.5 : 0.7;
      for (let i = 0; i < N; i++) {
        if (rand() < 0.04) level = level > 1 ? 0.7 : 1.5;
        x[i] = level + 0.06 * randn(rand);
      }
      flux = x;
      injected = true;
      tag = "flip-flop · no physical explanation (Buisson 2021 analogue)";
      break;
    }
    case "jetPrecursor": {
      mean = 1.1;
      hardness = 0.58;
      qpoHz = 2.2;
      const x = scale(noise, 0.16 * mean, mean);
      const qp = qpo(N, DT, qpoHz, 0.12 * mean, rand, 0.04);
      for (let i = 0; i < N; i++) {
        const fade = i > 40 ? Math.max(0, 1 - (i - 40) / 50) : 1;
        x[i] += qp[i] * fade;
        if (i > 70 && i < 95) x[i] *= 0.72;
      }
      flux = x;
      radioMean = 0.2 + (opts.index % 2 === 0 ? 1.4 : 0);
      injected = true;
      tag = "QPO fade + flux dip · jet-launch precursor morphology";
      break;
    }
    case "unusualQpo": {
      mean = 1.05;
      hardness = 0.66;
      qpoHz = lt * 0.12;
      flux = add(scale(noise, 0.2 * mean, mean), qpo(N, DT, qpoHz, 0.22 * mean, rand, 0.08));
      injected = true;
      tag = `QPO ${qpoHz.toFixed(2)} Hz vs LT ${lt.toFixed(2)} Hz · χ would need ≫100`;
      break;
    }
    case "hysteresisJump": {
      mean = 1.4;
      hardness = 0.28 + 0.5 * Math.min(1, opts.index / 6);
      const x = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const g = i / N;
        x[i] = (g < 0.35 ? 0.8 : g < 0.5 ? 0.8 + (g - 0.35) * 6 : 2.1) + 0.08 * randn(rand);
      }
      flux = x;
      injected = true;
      tag = "non-canonical HID path · skipped intermediate";
      break;
    }
    case "j1820like": {
      mean = 1.3;
      hardness = 0.48;
      qpoHz = 0.45;
      flux = add(scale(noise, 0.14 * mean, mean), qpo(N, DT, qpoHz, 0.09 * mean, rand, 0.05));
      for (let i = 40; i < 70; i++) flux[i] *= 1.15 + 0.2 * Math.sin(i);
      injected = true;
      tag = "J1820-like imaginary-QPO / flip analogue · calibration, not headline";
      break;
    }
    case "memoryBurden": {
      mean = 0.9;
      hardness = 0.9;
      const ring = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const t = i * DT;
        ring[i] = 0.35 * Math.exp(-t / 3.2) * Math.sin(2 * Math.PI * 7.4 * t);
      }
      flux = add(scale(noise, 0.1 * mean, mean), ring);
      injected = true;
      tag = "watch-list: swift-MB ringdown δK prior · not a Paper 1 claim";
      break;
    }
    default: {
      flux = scale(noise, 0.1, 1);
      tag = "unspecified";
    }
  }

  const radio = add(
    slow(N, DT, 0.03, 0.08, rand() * 6),
    ar1(rand, N, 0.95, 0.04),
  );
  for (let i = 0; i < N; i++) radio[i] = Math.max(0.01, radioMean + radio[i]);

  const optical = add(
    slow(N, DT, 0.015, 0.06, rand() * 6),
    ar1(rand, N, 0.97, 0.02),
  );
  for (let i = 0; i < N; i++) optical[i] = Math.max(0.01, optMean + optical[i]);

  let intensity = 0;
  for (let i = 0; i < N; i++) intensity += flux[i];
  intensity /= N;

  let paMod = 0.22 + 0.08 * rand();
  let gammaMod = 0.08 + 0.04 * rand();
  if (opts.sourceId === "j1727" && qpoHz) {
    paMod = 0.02 + 0.02 * rand();
    gammaMod = 0.32 + 0.08 * rand();
  } else if (opts.state === "unusualQpo") {
    paMod = 0.04 + 0.03 * rand();
    gammaMod = 0.28 + 0.08 * rand();
  } else if (opts.state === "typeC") {
    paMod = 0.3 + 0.08 * rand();
    gammaMod = 0.2 + 0.06 * rand();
  } else if (opts.sourceId === "cygx1") {
    paMod = 0.1 + 0.04 * rand();
  } else if (opts.state === "jetPrecursor") {
    paMod = 0.07 + 0.03 * rand();
    gammaMod = 0.18;
  }

  return {
    id: `${opts.sourceId}-${opts.state}-${opts.index}`,
    sourceId: opts.sourceId,
    state: opts.state,
    flux,
    radio,
    optical,
    hardness,
    intensity,
    dt: DT,
    qpoHz,
    trainNormal,
    injected,
    physicsTag: tag,
    paMod,
    gammaMod,
    scale: "timing-twin",
    provenance: "twin",
    instrument: "rxte-twin",
  };
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const TRAIN_STATES: AccretionState[] = ["soft", "hard", "typeC"];
const SCAN_STATES: AccretionState[] = [
  "soft",
  "hard",
  "typeC",
  "typeB",
  "heartbeat",
  "flipflop",
  "jetPrecursor",
  "unusualQpo",
  "hysteresisJump",
  "j1820like",
  "memoryBurden",
];

export function buildArchive(seed: number): WindowObs[] {
  const ids = Object.keys(SOURCE_BY_ID) as SourceId[];
  const out: WindowObs[] = [];
  let k = 0;
  for (const id of ids) {
    for (const st of TRAIN_STATES) {
      for (let i = 0; i < 4; i++) {
        out.push(generateWindow({ sourceId: id, state: st, seed, index: k++ }));
      }
    }
    for (const st of SCAN_STATES) {
      if (TRAIN_STATES.includes(st)) continue;
      out.push(generateWindow({ sourceId: id, state: st, seed, index: k++ }));
    }
  }
  return out;
}
