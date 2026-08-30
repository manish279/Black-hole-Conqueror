import { periodogram, peakHz } from "./fft";
import { N } from "./lightcurve";
import type { EncoderScores, WindowObs } from "./types";

function rms(x: ArrayLike<number>) {
  let m = 0;
  for (let i = 0; i < x.length; i++) m += x[i];
  m /= x.length;
  let s = 0;
  for (let i = 0; i < x.length; i++) {
    const d = x[i] - m;
    s += d * d;
  }
  return Math.sqrt(s / x.length);
}

function acf(x: ArrayLike<number>, lag: number) {
  let m = 0;
  for (let i = 0; i < x.length; i++) m += x[i];
  m /= x.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < x.length; i++) {
    const d = x[i] - m;
    den += d * d;
    if (i + lag < x.length) num += d * (x[i + lag] - m);
  }
  return den > 0 ? num / den : 0;
}

/** CNN-like: local 8-bin pattern energy vs global. */
function cnnScore(x: Float32Array) {
  const g = rms(x) + 1e-8;
  let max = 0;
  for (let i = 0; i < x.length - 8; i += 4) {
    let s = 0;
    for (let k = 0; k < 8; k++) {
      const d = x[i + k] - x[i];
      s += d * d;
    }
    max = Math.max(max, Math.sqrt(s / 8) / g);
  }
  return max;
}

/** LSTM-like: AR(2) residual — causal surprise. */
function lstmScore(x: Float32Array) {
  if (x.length < 6) return 0;
  let xx1 = 0,
    xx2 = 0,
    x1y = 0,
    x2y = 0,
    x1x2 = 0;
  for (let i = 2; i < x.length; i++) {
    const y = x[i];
    const a = x[i - 1];
    const b = x[i - 2];
    xx1 += a * a;
    xx2 += b * b;
    x1y += a * y;
    x2y += b * y;
    x1x2 += a * b;
  }
  const det = xx1 * xx2 - x1x2 * x1x2 + 1e-8;
  const p1 = (x1y * xx2 - x2y * x1x2) / det;
  const p2 = (x2y * xx1 - x1y * x1x2) / det;
  let e = 0;
  for (let i = 2; i < x.length; i++) {
    const pred = p1 * x[i - 1] + p2 * x[i - 2];
    const d = x[i] - pred;
    e += d * d;
  }
  return Math.sqrt(e / (x.length - 2)) / (rms(x) + 1e-8);
}

/** Transformer-like: long-range ACF + incommensurate harmonic power. */
function transformerScore(x: Float32Array, dt: number) {
  const a8 = Math.abs(acf(x, 8));
  const a24 = Math.abs(acf(x, 24));
  const psd = periodogram(x);
  const { power, hz } = peakHz(psd, dt);
  let harm = 0;
  const tot = psd.reduce((s, v) => s + v, 0) + 1e-8;
  for (let i = 2; i < psd.length; i++) {
    const f = i / (psd.length * 2 * dt);
    if (hz > 0.05 && Math.abs(f / hz - Math.round(f / hz)) > 0.12) harm += psd[i];
  }
  return a8 + a24 + 2 * (power / tot) + harm / tot;
}

/** KAN-like: residual vs shot-noise + sinusoid physics template. */
function kanScore(obs: WindowObs) {
  const x = obs.flux;
  const n = x.length;
  let m = 0;
  for (let i = 0; i < n; i++) m += x[i];
  m /= n;
  const hz = obs.qpoHz ?? 0;
  if (hz <= 0) {
    return rms(x) / (Math.abs(m) + 1e-6);
  }
  let c = 0,
    s = 0,
    cc = 0,
    ss = 0,
    cs = 0;
  for (let i = 0; i < n; i++) {
    const t = i * obs.dt;
    const co = Math.cos(2 * Math.PI * hz * t);
    const si = Math.sin(2 * Math.PI * hz * t);
    const y = x[i] - m;
    c += y * co;
    s += y * si;
    cc += co * co;
    ss += si * si;
    cs += co * si;
  }
  const det = cc * ss - cs * cs + 1e-8;
  const a = (c * ss - s * cs) / det;
  const b = (s * cc - c * cs) / det;
  let e = 0;
  for (let i = 0; i < n; i++) {
    const t = i * obs.dt;
    const pred = m + a * Math.cos(2 * Math.PI * hz * t) + b * Math.sin(2 * Math.PI * hz * t);
    const d = x[i] - pred;
    e += d * d;
  }
  return Math.sqrt(e / n) / (Math.abs(m) + 1e-6);
}

export function featureScores(obs: WindowObs, denseMse: number): EncoderScores {
  return {
    dense: denseMse,
    cnn: cnnScore(obs.flux),
    lstm: lstmScore(obs.flux),
    transformer: transformerScore(obs.flux, obs.dt),
    kan: kanScore(obs),
  };
}

export function coherenceBreak(obs: WindowObs) {
  let mx = 0,
    mr = 0,
    mo = 0;
  for (let i = 0; i < N; i++) {
    mx += obs.flux[i];
    mr += obs.radio[i];
    mo += obs.optical[i];
  }
  mx /= N;
  mr /= N;
  mo /= N;
  const xHard = obs.hardness;
  const expectedRadio = 0.15 + 0.8 * xHard;
  const expectedOpt = 0.9 - 0.5 * xHard;
  return Math.abs(mr - expectedRadio) + Math.abs(mo - expectedOpt) + Math.abs(mx / 2 - (1.6 - xHard));
}

export function matchedFilterSnr(flux: Float32Array, dt: number) {
  const nyq = 0.45 / Math.max(dt, 1e-6);
  const T = flux.length * dt;
  const templates = [1.5 / T, 0.02, 0.04, 0.08, 0.15, 0.2, 0.5, 1, 2, 4, 6, 8].filter((hz) => hz > 0 && hz < nyq);
  let best = 0;
  let m = 0;
  for (let i = 0; i < flux.length; i++) m += flux[i];
  m /= flux.length;
  const y = new Float32Array(flux.length);
  for (let i = 0; i < flux.length; i++) y[i] = flux[i] - m;
  const yn = rms(y) + 1e-8;
  for (const hz of templates) {
    let c = 0,
      s = 0;
    for (let i = 0; i < y.length; i++) {
      const t = i * dt;
      c += y[i] * Math.cos(2 * Math.PI * hz * t);
      s += y[i] * Math.sin(2 * Math.PI * hz * t);
    }
    const snr = Math.sqrt(c * c + s * s) / (yn * Math.sqrt(y.length));
    if (snr > best) best = snr;
  }
  return best;
}

export function pca2(latents: Float32Array[]) {
  const n = latents.length;
  if (n === 0) return [];
  const d = latents[0].length;
  const mean = new Float32Array(d);
  for (const z of latents) for (let i = 0; i < d; i++) mean[i] += z[i];
  for (let i = 0; i < d; i++) mean[i] /= n;
  const cov = new Float64Array(d * d);
  for (const z of latents) {
    for (let i = 0; i < d; i++) {
      const ai = z[i] - mean[i];
      for (let j = 0; j < d; j++) cov[i * d + j] += ai * (z[j] - mean[j]);
    }
  }
  for (let i = 0; i < cov.length; i++) cov[i] /= Math.max(1, n - 1);
  let v0 = new Float64Array(d);
  let v1 = new Float64Array(d);
  for (let i = 0; i < d; i++) {
    v0[i] = i === 0 ? 1 : 0.01 * i;
    v1[i] = i === 1 ? 1 : -0.02 * i;
  }
  const power = (v: Float64Array) => {
    const o = new Float64Array(d);
    for (let i = 0; i < d; i++) {
      let s = 0;
      for (let j = 0; j < d; j++) s += cov[i * d + j] * v[j];
      o[i] = s;
    }
    let nrm = 0;
    for (let i = 0; i < d; i++) nrm += o[i] * o[i];
    nrm = Math.sqrt(nrm) + 1e-12;
    for (let i = 0; i < d; i++) o[i] /= nrm;
    return o;
  };
  for (let k = 0; k < 24; k++) v0 = power(v0);
  let dot = 0;
  for (let i = 0; i < d; i++) dot += v1[i] * v0[i];
  for (let i = 0; i < d; i++) v1[i] -= dot * v0[i];
  for (let k = 0; k < 24; k++) {
    v1 = power(v1);
    let d2 = 0;
    for (let i = 0; i < d; i++) d2 += v1[i] * v0[i];
    for (let i = 0; i < d; i++) v1[i] -= d2 * v0[i];
    let nrm = 0;
    for (let i = 0; i < d; i++) nrm += v1[i] * v1[i];
    nrm = Math.sqrt(nrm) + 1e-12;
    for (let i = 0; i < d; i++) v1[i] /= nrm;
  }
  return latents.map((z) => {
    let x = 0,
      y = 0;
    for (let i = 0; i < d; i++) {
      const a = z[i] - mean[i];
      x += a * v0[i];
      y += a * v1[i];
    }
    return { x, y };
  });
}
