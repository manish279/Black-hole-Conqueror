import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { crossRefWindow, isQpoCadence, nyquistOf } from "./lit.ts";
import type { EncoderScores, ScoredWindow, WindowObs } from "./types.ts";

const scores: EncoderScores = { dense: 0.8, cnn: 0.8, lstm: 0.8, transformer: 0.8, kan: 0.8 };

function obs(partial: Partial<WindowObs>): WindowObs {
  return {
    id: "t",
    sourceId: "grs1915",
    state: "unusualQpo",
    flux: new Float32Array(128),
    radio: new Float32Array(128),
    optical: new Float32Array(128),
    hardness: 0.6,
    intensity: 1,
    dt: 0.125,
    qpoHz: 0.336,
    trainNormal: false,
    injected: false,
    physicsTag: "",
    paMod: 0.1,
    gammaMod: 0.1,
    scale: "timing-real",
    provenance: "rxte-pca",
    nyquistHz: 4,
    belloniClass: "mu",
    ...partial,
  };
}

function row(o: WindowObs, extra: Partial<ScoredWindow> = {}): ScoredWindow {
  return {
    obs: o,
    recon: new Float32Array(128),
    latent: new Float32Array(8),
    reconMse: 1,
    conformalP: 0.01,
    matchedSnr: 0.2,
    scores,
    ensemble: 1.4,
    star: 5,
    grmhdResidual: 2,
    grmhdSigma: 2.2,
    ltChi: 40,
    ltChi100: 2,
    coherence: 0.7,
    trajectory: 0.7,
    j1820Distance: 0.8,
    hits: [],
    novelty: "statistical",
    isolation: 0.5,
    logDensity: -1,
    counterfactual: new Float32Array(128),
    sharpness: 0.1,
    nine: [],
    fiveStar: false,
    paMod: 0.1,
    gammaMod: 0.1,
    ifFlag: false,
    cnnMse: 0.2,
    ...extra,
  };
}

describe("QPO cadence gate", () => {
  it("treats 125 ms as QPO cadence and 16 s as blind", () => {
    assert.equal(isQpoCadence(obs({ dt: 0.125, nyquistHz: 4 })), true);
    assert.equal(isQpoCadence(obs({ dt: 16, nyquistHz: 0.0313 })), false);
    assert.equal(isQpoCadence(obs({ dt: 86400, nyquistHz: 0.5 / 86400, scale: "daily-real" })), false);
  });

  it("Nyquist of 125 ms is 4 Hz", () => {
    assert.equal(nyquistOf(obs({ dt: 0.125, nyquistHz: 4 })), 4);
  });
});

describe("literature cross-ref of five-stars", () => {
  it("vetoes Belloni μ from headline even if five-star bits are high", () => {
    const r = crossRefWindow(row(obs({ belloniClass: "mu" }), { fiveStar: true }));
    assert.equal(r.headline, false);
    assert.ok(r.hits.some((h) => h.starId === "belloni2000" && h.verdict === "known-class"));
    assert.ok(r.hits.some((h) => h.starId === "orwat2022" && h.verdict === "predecessor"));
  });

  it("tags Morgan 67 Hz as above-nyquist on the 125 ms dump", () => {
    const r = crossRefWindow(row(obs({})));
    const m = r.hits.find((h) => h.starId === "morgan1997");
    assert.equal(m?.verdict, "above-nyquist");
  });

  it("allows headline only for unlisted five-star QPO-cadence real RXTE", () => {
    const r = crossRefWindow(
      row(obs({ belloniClass: "unlisted" }), { fiveStar: true, novelty: "physical" }),
    );
    assert.equal(r.headline, true);
    assert.ok(r.hits.some((h) => h.starId === "belloni2000" && h.verdict === "unmatched"));
  });

  it("does not headline the timing twin", () => {
    const r = crossRefWindow(
      row(obs({ scale: "timing-twin", provenance: "twin", belloniClass: undefined }), { fiveStar: true }),
    );
    assert.equal(r.headline, false);
  });
});
