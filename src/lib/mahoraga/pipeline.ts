import { N } from "./lightcurve";
import type { EncoderScores, ScoredWindow, TrainLog, WindowObs } from "./types";
import type { BetaVAE } from "./vae";

export const BOLLIMPALLI_NINE = [
  { id: 1, name: "χ ≃ 100 secular factor", detail: "Observed ν_QPO / ν_LT requires an unjustified χ." },
  { id: 2, name: "Solid-body LT at sonic flow", detail: "Rigid precession unlikely where Type-C actually occur." },
  { id: 3, name: "Type-B/C inclination reversal", detail: "Both cannot be LT if i–rms slopes oppose." },
  { id: 4, name: "Γ-modulation null (H1743)", detail: "LT predicts spectral-index swing; H1743 does not show it." },
  { id: 5, name: "Frequency-independent lags", detail: "GRMHD lags flat; RXTE lags are frequency-dependent." },
  { id: 6, name: "Runs too short for PSD break", detail: "Simulations miss the sub-Hz break RXTE lives on." },
  { id: 7, name: "rms–flux slope too small", detail: "Simulated variability under-produces the observed rms–flux." },
  { id: 8, name: "HF power as non-radiative p-modes", detail: "High-frequency power in GRMHD is not the observed light curve." },
  { id: 9, name: "No persistent Type-C", detail: "No GRMHD run has robustly reproduced standing Type-C QPOs." },
  {
    id: 10,
    name: "Torque-misaligned LT axis",
    detail: "Bollimpalli 2026 A&A: accretion torque can misalign the precession axis away from BH spin.",
  },
] as const;

type IFNode = {
  feat: number;
  thr: number;
  L: IFNode | null;
  R: IFNode | null;
  size: number;
};

function cFactor(n: number) {
  if (n <= 2) return 1;
  return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n;
}

export function isolationForest(X: number[][], rand: () => number, nTrees = 48) {
  const n = X.length;
  const dim = X[0]?.length ?? 0;
  const maxH = Math.ceil(Math.log2(Math.max(2, n)));
  const split = (idx: number[], h: number): IFNode => {
    if (h >= maxH || idx.length <= 1 || dim === 0) {
      return { feat: -1, thr: 0, L: null, R: null, size: idx.length };
    }
    const feat = Math.floor(rand() * dim);
    let lo = Infinity;
    let hi = -Infinity;
    for (const i of idx) {
      lo = Math.min(lo, X[i][feat]);
      hi = Math.max(hi, X[i][feat]);
    }
    if (hi - lo < 1e-9) return { feat: -1, thr: 0, L: null, R: null, size: idx.length };
    const thr = lo + rand() * (hi - lo);
    const L: number[] = [];
    const R: number[] = [];
    for (const i of idx) (X[i][feat] < thr ? L : R).push(i);
    if (!L.length || !R.length) return { feat: -1, thr: 0, L: null, R: null, size: idx.length };
    return { feat, thr, L: split(L, h + 1), R: split(R, h + 1), size: idx.length };
  };
  const trees = Array.from({ length: nTrees }, () => split(X.map((_, i) => i), 0));
  const cn = cFactor(n);
  const path = (node: IFNode, x: number[], h: number): number => {
    if (node.feat < 0 || !node.L || !node.R) return h + cFactor(Math.max(1, node.size));
    return path(x[node.feat] < node.thr ? node.L : node.R, x, h + 1);
  };
  return (x: number[]) => {
    let s = 0;
    for (const t of trees) s += path(t, x, 0);
    return Math.pow(2, -(s / trees.length) / cn);
  };
}

export function ifFeatures(obs: WindowObs, feat: EncoderScores, mf: number) {
  let m = 0;
  for (let i = 0; i < obs.flux.length; i++) m += obs.flux[i];
  m /= obs.flux.length;
  let v = 0;
  for (let i = 0; i < obs.flux.length; i++) {
    const d = obs.flux[i] - m;
    v += d * d;
  }
  return [m, Math.sqrt(v / obs.flux.length), obs.hardness, obs.intensity, obs.qpoHz ?? 0, feat.cnn, mf];
}

export function gaussianLogDensity(z: Float32Array, mean: Float32Array, std: Float32Array) {
  let s = 0;
  for (let i = 0; i < z.length; i++) {
    const d = (z[i] - mean[i]) / (std[i] + 1e-8);
    s += 0.5 * d * d + Math.log(std[i] + 1e-8);
  }
  return -s;
}

export function latentMoments(latents: Float32Array[]) {
  const d = latents[0]?.length ?? 0;
  const mean = new Float32Array(d);
  for (const z of latents) for (let i = 0; i < d; i++) mean[i] += z[i];
  const n = Math.max(1, latents.length);
  for (let i = 0; i < d; i++) mean[i] /= n;
  const std = new Float32Array(d);
  for (const z of latents) {
    for (let i = 0; i < d; i++) {
      const e = z[i] - mean[i];
      std[i] += e * e;
    }
  }
  for (let i = 0; i < d; i++) std[i] = Math.sqrt(std[i] / n) + 1e-6;
  return { mean, std };
}

export function counterpart(vae: BetaVAE, latent: Float32Array, trainLatents: Float32Array[], k = 5) {
  const scored = trainLatents
    .map((z, i) => {
      let d = 0;
      for (let j = 0; j < z.length; j++) {
        const e = z[j] - latent[j];
        d += e * e;
      }
      return { i, d };
    })
    .sort((a, b) => a.d - b.d)
    .slice(0, Math.min(k, trainLatents.length));
  const z = new Float32Array(latent.length);
  for (const s of scored) {
    const src = trainLatents[s.i];
    for (let j = 0; j < z.length; j++) z[j] += src[j];
  }
  const den = Math.max(1, scored.length);
  for (let j = 0; j < z.length; j++) z[j] /= den;
  return vae.denorm(vae.decode(z));
}

export function mse(a: ArrayLike<number>, b: ArrayLike<number>) {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const e = a[i] - b[i];
    s += e * e;
  }
  return s / n;
}

export function grmhdChi2(obs: WindowObs, spin: number, mass: number, ltHz: number) {
  const q = obs.qpoHz ?? 0;
  const qPred = Math.max(1e-4, ltHz);
  const qTerm = q > 0 ? ((q - qPred) / (qPred + 0.3)) ** 2 : 0.04;
  const hardPred = 0.55 + 0.25 * (1 - spin);
  const hardTerm = ((obs.hardness - hardPred) / 0.35) ** 2;
  const mdotProxy = obs.intensity;
  const mdotTerm = ((mdotProxy - 1.2) / 1.1) ** 2;
  return qTerm + hardTerm + 0.4 * mdotTerm + 0 * mass;
}

export function nineHits(row: {
  obs: WindowObs;
  ltChi: number;
  grmhdResidual: number;
  matchedSnr: number;
}): number[] {
  const h: number[] = [];
  const { obs } = row;
  if (row.ltChi > 35) h.push(1);
  if (obs.state === "typeC" && obs.hardness > 0.55) h.push(2);
  if (obs.state === "typeB") h.push(3);
  if (obs.sourceId === "h1743") h.push(4);
  if (obs.state === "unusualQpo" || obs.state === "j1820like") h.push(5);
  if (obs.dt * N < 40) h.push(6);
  if (obs.state !== "soft" && obs.state !== "heartbeat") {
    let m = 0;
    for (let i = 0; i < obs.flux.length; i++) m += obs.flux[i];
    m /= obs.flux.length;
    let v = 0;
    for (let i = 0; i < obs.flux.length; i++) {
      const d = obs.flux[i] - m;
      v += d * d;
    }
    if (Math.sqrt(v / obs.flux.length) / (m + 1e-6) < 0.06) h.push(7);
  }
  if ((obs.qpoHz ?? 0) > 6) h.push(8);
  if ((obs.state === "typeC" || obs.state === "unusualQpo") && row.grmhdResidual > 0.9) h.push(9);
  if (obs.state === "heartbeat" || obs.state === "flipflop") h.push(9);
  return [...new Set(h)].sort((a, b) => a - b);
}

export function pearson(xs: number[], ys: number[]) {
  const n = Math.min(xs.length, ys.length);
  if (n < 4) return 0;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += xs[i];
    my += ys[i];
  }
  mx /= n;
  my /= n;
  let num = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  return num / (Math.sqrt(vx * vy) + 1e-12);
}

export function leadATest(rows: ScoredWindow[]) {
  const pts = rows.filter((r) => r.obs.qpoHz && r.obs.qpoHz > 0);
  const xs = pts.map((p) => p.scores.cnn + 0.4 * p.scores.transformer);
  const ys = pts.map((p) => p.paMod);
  const corr = pearson(xs, ys);
  return {
    n: pts.length,
    corr,
    holds: corr < -0.2,
    preregister:
      "Anomalous QPO morphology (CNN+Transformer) anti-correlates with mock IXPE PA modulation. If precession is the QPO, no such anti-correlation.",
    points: pts.map((p) => ({
      id: p.obs.id,
      x: p.scores.cnn + 0.4 * p.scores.transformer,
      y: p.paMod,
      sourceId: p.obs.sourceId,
      novelty: p.novelty,
    })),
  };
}

export function encoderSets(scored: ScoredWindow[], k = 12) {
  const keys: (keyof EncoderScores)[] = ["dense", "cnn", "lstm", "transformer", "kan"];
  const topIds = Object.fromEntries(
    keys.map((key) => [
      key,
      [...scored]
        .sort((a, b) => b.scores[key] - a.scores[key])
        .slice(0, k)
        .map((s) => s.obs.id),
    ]),
  ) as Record<keyof EncoderScores, string[]>;
  const count = new Map<string, number>();
  for (const key of keys) for (const id of topIds[key]) count.set(id, (count.get(id) ?? 0) + 1);
  const intersection = [...count.entries()].filter(([, n]) => n === 5).map(([id]) => id);
  const majority = [...count.entries()]
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
  const unique = Object.fromEntries(
    keys.map((key) => {
      const others = new Set(keys.filter((k2) => k2 !== key).flatMap((k2) => topIds[k2]));
      return [key, topIds[key].filter((id) => !others.has(id))];
    }),
  ) as Record<keyof EncoderScores, string[]>;
  return { topIds, intersection, majority, unique };
}

export function diagnose(log: TrainLog[], trainLatents: Float32Array[], ensembles: number[]) {
  const first = log[0];
  const last = log[log.length - 1];
  const { std } = latentMoments(trainLatents);
  let latentRms = 0;
  for (let i = 0; i < std.length; i++) latentRms += std[i] * std[i];
  latentRms = Math.sqrt(latentRms / Math.max(1, std.length));
  const klDrop = first && last ? first.kl - last.kl : 0;
  const reconDrop = first && last ? first.recon - last.recon : 0;
  const collapse = Boolean(last && last.kl < 0.03 && latentRms < 0.18);
  const bins = new Array(10).fill(0) as number[];
  let lo = Infinity;
  let hi = -Infinity;
  for (const e of ensembles) {
    lo = Math.min(lo, e);
    hi = Math.max(hi, e);
  }
  for (const e of ensembles) {
    const b = Math.min(9, Math.floor(((e - lo) / (hi - lo + 1e-9)) * 10));
    bins[b]++;
  }
  let peaks = 0;
  for (let i = 1; i < 9; i++) if (bins[i] > bins[i - 1] && bins[i] > bins[i + 1] && bins[i] > 3) peaks++;
  const bimodal = peaks >= 2;
  let health = "watch";
  if (collapse) health = "posterior collapse — reduce β";
  else if (reconDrop > 0 && last && last.kl > 0.04 && last.kl < 1.2) health = "healthy";
  else if (last && last.kl > 1.6) health = "latent not organising — raise LR";
  return { collapse, klDrop, reconDrop, latentRms, bimodal, health };
}

export function attentionMatrix(obs: WindowObs, size = 28) {
  const m = new Float32Array(size * size);
  const lag =
    obs.qpoHz && obs.qpoHz > 0.05 ? Math.max(1, Math.round(1 / (obs.qpoHz * obs.dt) / (N / size))) : 0;
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const d = Math.abs(i - j);
      let v = Math.exp(-d / 9) * 0.25;
      if (lag > 0 && d % lag === 0) v += 0.7 * Math.exp(-d / (lag * 4));
      if (obs.state === "unusualQpo" && d % Math.max(2, lag || 5) !== 0) v += 0.15;
      m[i * size + j] = v;
    }
  }
  let mx = 0;
  for (let i = 0; i < m.length; i++) mx = Math.max(mx, m[i]);
  if (mx > 0) for (let i = 0; i < m.length; i++) m[i] /= mx;
  return { size, m, lag };
}

export function fiveStar(s: {
  scores: EncoderScores;
  coherence: number;
  trajectory: number;
  j1820Distance: number;
  grmhdSigma: number;
  novelty: ScoredWindow["novelty"];
}) {
  const keys: (keyof EncoderScores)[] = ["dense", "cnn", "lstm", "transformer", "kan"];
  const all = keys.every((k) => s.scores[k] >= 0.5);
  return (
    all &&
    s.coherence > 0.55 &&
    s.trajectory > 0.55 &&
    s.j1820Distance > 0.4 &&
    s.grmhdSigma > 1.8 &&
    s.novelty !== "calibration"
  );
}
