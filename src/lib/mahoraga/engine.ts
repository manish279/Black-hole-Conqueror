import { PatchCNN } from "./cnn";
import { coherenceBreak, featureScores, matchedFilterSnr } from "./ensemble";
import { lenseThirringHz } from "./kerr";
import { buildArchive } from "./lightcurve";
import {
  counterpart,
  diagnose,
  encoderSets,
  gaussianLogDensity,
  grmhdChi2,
  ifFeatures,
  isolationForest,
  latentMoments,
  leadATest,
  mse,
} from "./pipeline";
import { loadRealArchive, loadRxteArchive, realToObs, rxteToObs } from "./realdata";
import { mulberry32 } from "./rng";
import {
  conformalP,
  fiveStarSealed,
  sealedHits,
  sealedNine,
  sealedNovelty,
  splitNormals,
  starOf,
} from "./seal";
import { SOURCE_BY_ID } from "./sources";
import type { EncoderScores, ScanResult, ScoredWindow, TrainLog, WindowObs } from "./types";
import { runValidation } from "./validate";
import { BetaVAE } from "./vae";

function zscore(v: number, mu: number, sd: number) {
  return (v - mu) / (sd + 1e-8);
}

function stats(xs: number[]) {
  const n = xs.length || 1;
  let m = 0;
  for (const x of xs) m += x;
  m /= n;
  let v = 0;
  for (const x of xs) {
    const d = x - m;
    v += d * d;
  }
  return { m, sd: Math.sqrt(v / n) };
}

export async function runScan(
  seed: number,
  onEpoch?: (log: TrainLog, frac: number) => void,
): Promise<ScanResult> {
  const twin = buildArchive(seed);
  const realFile = await loadRealArchive();
  const rxteFile = await loadRxteArchive();
  const real: WindowObs[] = realFile
    ? realFile.windows.map((w, i) => realToObs(w, seed, i))
    : [];
  const rxte: WindowObs[] = rxteFile
    ? rxteFile.windows.map((w, i) => rxteToObs(w, seed, 400 + i))
    : [];
  const cadenceN = rxte.filter((w) => (w.nyquistHz ?? 0) >= 1).length;
  const archive = [...twin, ...real, ...rxte];
  const rand = mulberry32(seed + 17);
  const normals = archive.filter((w) => w.trainNormal);
  const { train, cal, hold } = splitNormals(normals, rand);
  const holdIds = new Set(hold.map((w) => w.id));

  const vae = new BetaVAE(rand);
  vae.fitNorm(train.map((w) => w.flux));
  const cnn = new PatchCNN(rand);
  cnn.fitNorm(train.map((w) => w.flux));

  const log: TrainLog[] = [];
  const epochs = 20;
  const cnnEpochs = 10;
  const totalSteps = epochs + cnnEpochs;

  for (let e = 0; e < epochs; e++) {
    const order = train.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const beta = Math.min(0.4, 0.02 + e * 0.02);
    let recon = 0;
    let kl = 0;
    let phys = 0;
    let tot = 0;
    for (const i of order) {
      const r = vae.step(train[i].flux, beta, rand);
      recon += r.mse;
      kl += r.kl;
      phys += r.phys;
      tot += r.total;
    }
    const row = {
      epoch: e + 1,
      recon: recon / train.length,
      kl: kl / train.length,
      phys: phys / train.length,
      total: tot / train.length,
    };
    log.push(row);
    onEpoch?.(row, (e + 1) / totalSteps);
    if (e % 2 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  for (let e = 0; e < cnnEpochs; e++) {
    const order = train.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    let cm = 0;
    for (const i of order) cm += cnn.step(train[i].flux);
    onEpoch?.(
      {
        epoch: epochs + e + 1,
        recon: cm / train.length,
        kl: log.at(-1)?.kl ?? 0,
        phys: log.at(-1)?.phys ?? 0,
        total: cm / train.length,
      },
      (epochs + e + 1) / totalSteps,
    );
    if (e % 2 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  const calInf = cal.map((w) => vae.infer(w.flux));
  const calScores = calInf.map((x) => x.mse);
  const trainInf = train.map((w) => vae.infer(w.flux));
  const trainLatents = trainInf.map((x) => x.latent);
  const { mean: zMean, std: zStd } = latentMoments(trainLatents);

  const featRaw = archive.map((w) => {
    const inf = vae.infer(w.flux);
    const cinf = cnn.infer(w.flux);
    const feat = featureScores(w, inf.mse);
    feat.cnn = cinf.mse;
    return { w, inf, feat, mf: matchedFilterSnr(w.flux, w.dt), cnnMse: cinf.mse };
  });

  const keys: (keyof EncoderScores)[] = ["dense", "cnn", "lstm", "transformer", "kan"];
  const st = Object.fromEntries(
    keys.map((k) => [k, stats(featRaw.filter((x) => x.w.trainNormal).map((x) => x.feat[k]))]),
  ) as Record<keyof EncoderScores, { m: number; sd: number }>;

  const ifTrain = featRaw.filter((x) => x.w.trainNormal).map((x) => ifFeatures(x.w, x.feat, x.mf));
  const ifScore = isolationForest(ifTrain, rand);
  const ifCal = ifTrain.map((f) => ifScore(f));
  const ifCut = [...ifCal].sort((a, b) => a - b)[Math.floor(ifCal.length * 0.9)] ?? 0.6;

  const j1820 = featRaw.filter((x) => x.w.sourceId === "j1820" && x.w.state === "j1820like");
  const jLat = j1820[0]?.inf.latent;
  const hidTrain = train.map((w) => ({ h: w.hardness, i: w.intensity }));

  const chiTrain = train.map((w) => {
    const src = SOURCE_BY_ID[w.sourceId];
    const lt = lenseThirringHz(28, src.spin, src.massSolar, 1);
    return grmhdChi2(w, src.spin, src.massSolar, lt);
  });
  const chiMed = [...chiTrain].sort((a, b) => a - b)[Math.floor(chiTrain.length / 2)] || 1;

  const scored: ScoredWindow[] = featRaw.map(({ w, inf, feat, mf, cnnMse }) => {
    const scores: EncoderScores = {
      dense: Math.max(0, zscore(feat.dense, st.dense.m, st.dense.sd)),
      cnn: Math.max(0, zscore(feat.cnn, st.cnn.m, st.cnn.sd)),
      lstm: Math.max(0, zscore(feat.lstm, st.lstm.m, st.lstm.sd)),
      transformer: Math.max(0, zscore(feat.transformer, st.transformer.m, st.transformer.sd)),
      kan: Math.max(0, zscore(feat.kan, st.kan.m, st.kan.sd)),
    };
    const ensemble =
      0.32 * scores.dense +
      0.22 * scores.cnn +
      0.16 * scores.lstm +
      0.16 * scores.transformer +
      0.14 * scores.kan;
    const src = SOURCE_BY_ID[w.sourceId];
    const lt = lenseThirringHz(28, src.spin, src.massSolar, 1);
    const lt100 = lenseThirringHz(28, src.spin, src.massSolar, 100);
    const ltChi = w.qpoHz && lt > 1e-6 ? Math.abs(w.qpoHz / lt) * 50 : 1;
    const ltChi100 = w.qpoHz && lt100 > 1e-6 ? Math.abs(w.qpoHz / lt100) * 50 : 1;
    const coh = coherenceBreak(w);
    const traj = hidTrain.reduce((best, p) => {
      const d = Math.hypot(p.h - w.hardness, (p.i - w.intensity) / 3);
      return d < best ? d : best;
    }, 99);
    let jDist = 1;
    if (jLat) {
      let d = 0;
      for (let i = 0; i < inf.latent.length; i++) {
        const e = inf.latent[i] - jLat[i];
        d += e * e;
      }
      jDist = Math.sqrt(d / inf.latent.length);
    }
    const chi = grmhdChi2(w, src.spin, src.massSolar, lt);
    const grmhdSigma = chi / (chiMed + 1e-6);
    const iso = ifScore(ifFeatures(w, feat, mf));
    const cf = counterpart(vae, inf.latent, trainLatents, 5);
    const sharp = mse(w.flux, cf);

    const row: ScoredWindow = {
      obs: w,
      recon: inf.recon,
      latent: inf.latent,
      reconMse: inf.mse,
      conformalP: conformalP(inf.mse, calScores),
      matchedSnr: mf,
      scores,
      ensemble,
      star: 1,
      grmhdResidual: grmhdSigma,
      grmhdSigma,
      ltChi,
      ltChi100,
      coherence: coh,
      trajectory: traj,
      j1820Distance: jDist,
      hits: [],
      novelty: "normal",
      isolation: iso,
      logDensity: gaussianLogDensity(inf.latent, zMean, zStd),
      counterfactual: cf,
      sharpness: sharp,
      nine: [],
      fiveStar: false,
      paMod: w.paMod,
      gammaMod: w.gammaMod,
      ifFlag: iso >= ifCut,
      cnnMse,
    };
    row.novelty = sealedNovelty({ ...row, scale: row.obs.scale, belloniClass: row.obs.belloniClass });
    row.hits = sealedHits(row);
    row.nine = sealedNine(row);
    row.star = starOf(row);
    row.fiveStar = fiveStarSealed({ ...row, scale: row.obs.scale, belloniClass: row.obs.belloniClass });
    return row;
  });

  const rankedVae = [...scored].sort((a, b) => b.ensemble - a.ensemble).slice(0, 12);
  const rankedIf = [...scored].sort((a, b) => b.isolation - a.isolation).slice(0, 12);
  const vaeTopPhysical = rankedVae.filter((s) => s.novelty === "physical").length;
  const ifTopPhysical = rankedIf.filter((s) => s.novelty === "physical").length;
  const ifIds = new Set(rankedIf.map((s) => s.obs.id));
  const agree = rankedVae.filter((s) => ifIds.has(s.obs.id)).length;

  const leadA = leadATest(scored);
  const validation = runValidation(scored, holdIds, leadA, rand);
  const coverageOk = validation.coverage90 >= 0.8;
  const realOk = real.length > 0;
  const rxteOk = rxte.length > 0;
  const fidelity = coverageOk && (realOk || rxteOk) ? "Engineering" : "Educational";

  return {
    scored,
    log,
    calibrated: true,
    fidelity,
    seed,
    trainedAt: Date.now(),
    diagnostics: diagnose(
      log,
      trainLatents,
      scored.map((s) => s.ensemble),
    ),
    encoders: encoderSets(scored, 12),
    leadA: validation.leadA,
    ifVsVae: { ifTopPhysical, vaeTopPhysical, agree },
    validation,
    realN: real.length,
    twinN: twin.length,
    rxteN: rxte.length,
    cadenceN,
  };
}
