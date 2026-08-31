import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { NUP_BINS, nuPVector } from "./fft.ts";
import { fiveStarSealed, sealedNovelty } from "./seal-core.ts";

describe("NICER photon-bus packs", () => {
  it("ships 12+12 event-mode JSON views with solver-board lag/rms", () => {
    const a = JSON.parse(readFileSync(new URL("../../../public/data/nicer-j1820.json", import.meta.url), "utf8"));
    const b = JSON.parse(readFileSync(new URL("../../../public/data/nicer-j1727.json", import.meta.url), "utf8"));
    assert.equal(a.n, 12);
    assert.equal(b.n, 12);
    assert.equal(a.nyquistHz, 64);
    assert.equal(a.windows[0].hfqpoCapable, true);
    assert.equal(a.windows[0].flux.length, 128);
    assert.ok(a.windows[0].lagE.length > 0);
    assert.ok(a.windows[0].rmsE.length > 0);
    assert.equal(a.windows[0].labelSource, "nicer-event");
    assert.equal(b.windows[0].sourceId, "j1727");
    assert.ok(a.parentDtS < 1e-7);
  });
});

describe("Dual-TF grid", () => {
  it("resamples νP(ν) onto a 32-bin 0–2 Hz vector", () => {
    const x = new Float32Array(128);
    for (let i = 0; i < 128; i++) x[i] = Math.sin((2 * Math.PI * 0.4 * i) / 128);
    const v = nuPVector(x, 0.25);
    assert.equal(v.length, NUP_BINS);
    assert.ok(v.some((z) => z > 0));
  });
});

describe("J1820 NICER gate", () => {
  const scores = { dense: 0.9, cnn: 0.9, lstm: 0.9, transformer: 0.9, kan: 0.9 };
  it("cannot five-star J1820", () => {
    assert.equal(
      fiveStarSealed({
        scores,
        coherence: 0.9,
        trajectory: 0.9,
        j1820Distance: 0.9,
        grmhdSigma: 3,
        novelty: "physical",
        scale: "timing-real",
        sourceId: "j1820",
      }),
      false,
    );
  });
  it("labels J1820 source as calibration", () => {
    assert.equal(
      sealedNovelty({
        conformalP: 0.01,
        matchedSnr: 0.2,
        ensemble: 2,
        j1820Distance: 0.9,
        grmhdSigma: 3,
        scale: "timing-real",
        trajectory: 1,
        sourceId: "j1820",
      }),
      "calibration",
    );
  });
});
