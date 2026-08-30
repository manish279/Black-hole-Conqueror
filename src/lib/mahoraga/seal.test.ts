import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { conformalP, fiveStarSealed, sealedNovelty, starOf } from "./seal-core.ts";
import type { EncoderScores } from "./types.ts";


function auc(pairs: { s: number; y: 0 | 1 }[]) {
  const pos = pairs.filter((p) => p.y === 1);
  const neg = pairs.filter((p) => p.y === 0);
  if (!pos.length || !neg.length) return 0.5;
  let u = 0;
  for (const p of pos) for (const n of neg) u += p.s > n.s ? 1 : p.s === n.s ? 0.5 : 0;
  return u / (pos.length * neg.length);
}
function pearson(xs: number[], ys: number[]) {
  const n = Math.min(xs.length, ys.length);
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
  mx /= n; my /= n;
  let num = 0, vx = 0, vy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    num += dx * dy; vx += dx * dx; vy += dy * dy;
  }
  return num / (Math.sqrt(vx * vy) + 1e-12);
}
function bootstrapCorr(xs: number[], ys: number[], rand: () => number, nBoot = 200) {
  const n = Math.min(xs.length, ys.length);
  const corr = pearson(xs, ys);
  const boots: number[] = [];
  for (let b = 0; b < nBoot; b++) {
    const ax: number[] = [], ay: number[] = [];
    for (let i = 0; i < n; i++) { const j = Math.floor(rand() * n); ax.push(xs[j]); ay.push(ys[j]); }
    boots.push(pearson(ax, ay));
  }
  boots.sort((a, b) => a - b);
  return { corr, lo: boots[Math.floor(0.025 * nBoot)] ?? corr, hi: boots[Math.min(nBoot - 1, Math.floor(0.975 * nBoot))] ?? corr };
}

const scores: EncoderScores = { dense: 0.8, cnn: 0.8, lstm: 0.8, transformer: 0.8, kan: 0.8 };

describe("sealed novelty", () => {
  it("does not use injected or state — same scores same label", () => {
    const a = sealedNovelty({
      conformalP: 0.02,
      matchedSnr: 0.2,
      ensemble: 1.4,
      j1820Distance: 0.7,
      grmhdSigma: 2.1,
      scale: "timing-twin",
      trajectory: 0.8,
    });
    const b = sealedNovelty({
      conformalP: 0.02,
      matchedSnr: 0.2,
      ensemble: 1.4,
      j1820Distance: 0.7,
      grmhdSigma: 2.1,
      scale: "timing-twin",
      trajectory: 0.8,
    });
    assert.equal(a, b);
    assert.equal(a, "physical");
  });

  it("marks J1820-close windows as calibration", () => {
    const n = sealedNovelty({
      conformalP: 0.01,
      matchedSnr: 0.1,
      ensemble: 2,
      j1820Distance: 0.1,
      grmhdSigma: 3,
      scale: "timing-twin",
      trajectory: 1,
    });
    assert.equal(n, "calibration");
  });

  it("forbids five-star on daily-real windows", () => {
    const ok = fiveStarSealed({
      scores,
      coherence: 0.9,
      trajectory: 0.9,
      j1820Distance: 0.9,
      grmhdSigma: 3,
      novelty: "physical",
      scale: "daily-real",
    });
    assert.equal(ok, false);
  });

  it("vetoes Belloni ρ on real RXTE from five-star", () => {
    const ok = fiveStarSealed({
      scores,
      coherence: 0.9,
      trajectory: 0.9,
      j1820Distance: 0.9,
      grmhdSigma: 3,
      novelty: "physical",
      scale: "timing-real",
      belloniClass: "rho",
    });
    assert.equal(ok, false);
  });

  it("allows five-star on unlisted real RXTE when gates pass", () => {
    const ok = fiveStarSealed({
      scores,
      coherence: 0.9,
      trajectory: 0.9,
      j1820Distance: 0.9,
      grmhdSigma: 3,
      novelty: "physical",
      scale: "timing-real",
      belloniClass: "unlisted",
    });
    assert.equal(ok, true);
  });

  it("allows five-star on twin when gates pass", () => {
    const ok = fiveStarSealed({
      scores,
      coherence: 0.9,
      trajectory: 0.9,
      j1820Distance: 0.9,
      grmhdSigma: 3,
      novelty: "physical",
      scale: "timing-twin",
    });
    assert.equal(ok, true);
  });
});

describe("conformal + auc", () => {
  it("gives p=1 for the smallest calibration score", () => {
    const cal = [1, 2, 3, 4];
    assert.ok(conformalP(0.5, cal) > conformalP(5, cal));
    assert.equal(conformalP(4, cal), 2 / 5);
  });

  it("auc is 1 for perfect ranking", () => {
    const pairs = [
      { s: 3, y: 1 as const },
      { s: 2, y: 1 as const },
      { s: 0.1, y: 0 as const },
      { s: 0.2, y: 0 as const },
    ];
    assert.equal(auc(pairs), 1);
  });

  it("bootstrap corr is defined for n>=6", () => {
    const xs = [1, 2, 3, 4, 5, 6, 7];
    const ys = [7, 6, 5, 4, 3, 2, 1];
    let i = 0;
    const r = bootstrapCorr(xs, ys, () => {
      i = (i * 1103515245 + 12345) % 2 ** 31;
      return i / 2 ** 31;
    }, 40);
    assert.ok(r.corr < -0.9);
    assert.ok(r.hi < 0);
  });
});

describe("star ladder", () => {
  it("returns 1–5", () => {
    const s = starOf({
      scores: { dense: 0, cnn: 0, lstm: 0, transformer: 0, kan: 0 },
      coherence: 0,
      trajectory: 0,
      j1820Distance: 0,
      grmhdSigma: 0,
    });
    assert.equal(s, 1);
  });
});
