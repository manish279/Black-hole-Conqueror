import { SOURCE_BY_ID } from "./sources";
import type { EncoderScores, WindowObs } from "./types";
export { conformalP, fiveStarSealed, sealedNovelty, starOf } from "./seal-core";

export function splitNormals(normals: WindowObs[], rand: () => number) {
  const idx = normals.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const nTrain = Math.max(8, Math.floor(idx.length * 0.7));
  const nCal = Math.max(6, Math.floor(idx.length * 0.15));
  const train = idx.slice(0, nTrain).map((i) => normals[i]);
  const cal = idx.slice(nTrain, nTrain + nCal).map((i) => normals[i]);
  const hold = idx.slice(nTrain + nCal).map((i) => normals[i]);
  return { train, cal, hold: hold.length ? hold : cal.slice(0, Math.ceil(cal.length / 3)) };
}

export function sealedHits(row: {
  obs: WindowObs;
  scores: EncoderScores;
  coherence: number;
  trajectory: number;
  ltChi: number;
  grmhdSigma: number;
  sharpness: number;
  matchedSnr: number;
}): number[] {
  const h: number[] = [];
  const { obs, scores } = row;
  const morph = scores.cnn + 0.4 * scores.transformer;
  if (obs.qpoHz && morph > 0.9 && obs.paMod < 0.08) h.push(1);
  if (obs.sourceId === "cygx1" && scores.dense > 0.7) h.push(2);
  if (row.coherence > 0.55) h.push(3, 6);
  if (row.ltChi > 40 || row.grmhdSigma > 1.5) h.push(4);
  if (row.trajectory > 0.8) h.push(5);
  if (obs.scale === "timing-twin" && row.sharpness > 0.08 && row.matchedSnr < 0.35 && scores.dense > 0.6) {
    h.push(7);
  }
  if (obs.sourceId === "j1727" && obs.qpoHz && obs.paMod < 0.08) h.push(1, 6);
  return [...new Set(h)].sort((a, b) => a - b);
}

export function sealedNine(row: {
  obs: WindowObs;
  ltChi: number;
  ltChi100: number;
  grmhdSigma: number;
  matchedSnr: number;
  scores: EncoderScores;
}): number[] {
  const h: number[] = [];
  const { obs } = row;
  if (row.ltChi > 35 && row.ltChi100 < 8) h.push(1);
  const q = obs.qpoHz ?? 0;
  if (q > 0.4 && q < 3.2 && obs.hardness > 0.55) h.push(2);
  if (q > 3.8 && q < 8 && obs.hardness < 0.5) h.push(3);
  if (obs.sourceId === "h1743" && obs.gammaMod < 0.12) h.push(4);
  if (row.scores.transformer > 0.8 && row.matchedSnr < 0.35) h.push(5);
  if (obs.dt * obs.flux.length < 40) h.push(6);
  if (obs.scale === "timing-twin") {
    let m = 0;
    for (let i = 0; i < obs.flux.length; i++) m += obs.flux[i];
    m /= obs.flux.length;
    let v = 0;
    for (let i = 0; i < obs.flux.length; i++) v += (obs.flux[i] - m) ** 2;
    if (Math.sqrt(v / obs.flux.length) / (m + 1e-6) < 0.06 && obs.hardness > 0.3) h.push(7);
  }
  if (q > 6) h.push(8);
  if (q > 0 && row.grmhdSigma > 1.2) h.push(9);
  if (SOURCE_BY_ID[obs.sourceId].inclinationDeg >= 60 && row.ltChi > 20 && q > 0) h.push(10);
  return [...new Set(h)].sort((a, b) => a - b);
}

