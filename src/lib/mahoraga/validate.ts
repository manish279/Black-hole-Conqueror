import { crossRefFiveStars } from "./lit";
import { pearson } from "./pipeline";
import type { LeadA, ScoredWindow, ValidationReport } from "./types";

export function auc(pairs: { s: number; y: 0 | 1 }[]) {
  const pos = pairs.filter((p) => p.y === 1);
  const neg = pairs.filter((p) => p.y === 0);
  if (!pos.length || !neg.length) return 0.5;
  let u = 0;
  for (const p of pos) {
    for (const n of neg) {
      if (p.s > n.s) u += 1;
      else if (p.s === n.s) u += 0.5;
    }
  }
  return u / (pos.length * neg.length);
}

export function bootstrapCorr(
  xs: number[],
  ys: number[],
  rand: () => number,
  nBoot = 200,
) {
  const n = Math.min(xs.length, ys.length);
  if (n < 6) return { corr: 0, lo: 0, hi: 0 };
  const corr = pearson(xs, ys);
  const boots: number[] = [];
  for (let b = 0; b < nBoot; b++) {
    const ax: number[] = [];
    const ay: number[] = [];
    for (let i = 0; i < n; i++) {
      const j = Math.floor(rand() * n);
      ax.push(xs[j]);
      ay.push(ys[j]);
    }
    boots.push(pearson(ax, ay));
  }
  boots.sort((a, b) => a - b);
  return {
    corr,
    lo: boots[Math.floor(0.025 * nBoot)] ?? corr,
    hi: boots[Math.min(nBoot - 1, Math.floor(0.975 * nBoot))] ?? corr,
  };
}

function rocPairs(rows: ScoredWindow[], score: (s: ScoredWindow) => number) {
  return rows
    .filter((r) => r.obs.scale === "timing-twin")
    .map((r) => ({ s: score(r), y: (r.obs.injected ? 1 : 0) as 0 | 1 }));
}

export function runValidation(
  scored: ScoredWindow[],
  holdIds: Set<string>,
  lead: LeadA,
  rand: () => number,
): ValidationReport {
  const hold = scored.filter((s) => holdIds.has(s.obs.id) && s.obs.trainNormal);
  const coverage90 = hold.length ? hold.filter((s) => s.conformalP > 0.1).length / hold.length : 0;

  const twin = scored.filter((s) => s.obs.scale === "timing-twin");
  const vaeAuc = auc(rocPairs(twin, (s) => s.ensemble));
  const ifAuc = auc(rocPairs(twin, (s) => s.isolation));
  const mfAuc = auc(rocPairs(twin, (s) => s.matchedSnr));
  const cnnAuc = auc(rocPairs(twin, (s) => s.scores.cnn));

  const sources = [...new Set(scored.map((s) => s.obs.sourceId))];
  const loso = sources.map((sourceId) => {
    const rest = scored.filter((s) => s.obs.sourceId !== sourceId && s.obs.trainNormal);
    const here = scored.filter((s) => s.obs.sourceId === sourceId);
    const cal = rest.map((s) => s.reconMse).sort((a, b) => a - b);
    const cut = cal[Math.floor(cal.length * 0.9)] ?? 1;
    const flagged = here.filter((s) => s.reconMse >= cut);
    const physical = flagged.filter((s) => s.novelty === "physical").length;
    const normals = here.filter((s) => s.obs.trainNormal);
    const cov = normals.length ? normals.filter((s) => s.reconMse < cut).length / normals.length : 1;
    return { sourceId, n: here.length, flagged: flagged.length, physical, coverage: cov };
  });

  const families = ["heartbeat", "unusualQpo", "jetPrecursor", "flipflop", "j1820like", "hysteresisJump"] as const;
  const injection = families.map((family) => {
    const planted = twin.filter((s) => s.obs.state === family && s.obs.injected);
    const caught = planted.filter((s) => s.novelty === "physical" || s.novelty === "statistical" || s.novelty === "calibration");
    const phys = planted.filter((s) => s.novelty === "physical");
    const flagged = scored.filter((s) => s.novelty === "physical" && s.obs.scale === "timing-twin");
    const purityDenom = flagged.length || 1;
    const purity = flagged.filter((s) => s.obs.injected).length / purityDenom;
    return {
      family,
      n: planted.length,
      completeness: planted.length ? caught.length / planted.length : 0,
      physicalRate: planted.length ? phys.length / planted.length : 0,
      purity,
    };
  });

  const ablation = [
    { name: "VAE ensemble", n: twin.filter((s) => s.ensemble > 0.9).length, physical: twin.filter((s) => s.ensemble > 0.9 && s.obs.injected).length },
    { name: "Isolation Forest", n: twin.filter((s) => s.ifFlag).length, physical: twin.filter((s) => s.ifFlag && s.obs.injected).length },
    { name: "Matched filter", n: twin.filter((s) => s.matchedSnr > 0.5).length, physical: twin.filter((s) => s.matchedSnr > 0.5 && s.obs.injected).length },
    { name: "Patch-CNN", n: twin.filter((s) => s.scores.cnn > 0.7).length, physical: twin.filter((s) => s.scores.cnn > 0.7 && s.obs.injected).length },
    { name: "Five-star gate", n: twin.filter((s) => s.fiveStar).length, physical: twin.filter((s) => s.fiveStar && s.obs.injected).length },
  ];

  const five = twin.filter((s) => s.fiveStar);
  const fiveInjected = five.filter((s) => s.obs.injected).length;
  const nInj = twin.filter((s) => s.obs.injected).length;
  let ge = 0;
  const nPerm = 400;
  for (let i = 0; i < nPerm; i++) {
    let k = 0;
    for (let j = 0; j < five.length; j++) {
      const pick = twin[Math.floor(rand() * twin.length)];
      if (pick.obs.injected) k++;
    }
    if (k >= fiveInjected) ge++;
  }
  const permP = (1 + ge) / (nPerm + 1);

  const qpo = twin.filter((s) => s.obs.qpoHz && s.obs.qpoHz > 0);
  const boot = bootstrapCorr(
    qpo.map((p) => p.scores.cnn + 0.4 * p.scores.transformer),
    qpo.map((p) => p.paMod),
    rand,
  );

  const real = scored.filter((s) => s.obs.scale === "daily-real");
  const rxte = scored.filter((s) => s.obs.scale === "timing-real");
  const twinN = twin.length;
  const classes = [...new Set(rxte.map((s) => s.obs.belloniClass || "unlisted"))];
  const belloni = classes.map((cls) => {
    const rows = rxte.filter((s) => (s.obs.belloniClass || "unlisted") === cls);
    return {
      cls,
      n: rows.length,
      fiveStar: rows.filter((s) => s.fiveStar).length,
      physical: rows.filter((s) => s.novelty === "physical").length,
      statistical: rows.filter((s) => s.novelty === "statistical").length,
    };
  });
  const knownFive = rxte.filter((s) => s.obs.belloniClass && s.obs.belloniClass !== "unlisted" && s.fiveStar).length;
  const lit = crossRefFiveStars(scored);
  const cadenceN = lit.nCadence;

  const claims: ValidationReport["claims"] = [
    {
      id: "coverage",
      statement: "Held-out conformal coverage on unused normals is ≥ 0.80 (target 0.90).",
      status: coverage90 >= 0.8 ? "holds" : "fails",
      fidelity: coverage90 >= 0.88 ? "Engineering" : "Educational",
    },
    {
      id: "vae-vs-if",
      statement: "VAE ensemble beats Isolation Forest AUC on planted morphology (not flux outliers).",
      status: vaeAuc > ifAuc ? "holds" : "fails",
      fidelity: "Engineering",
    },
    {
      id: "lead-a",
      statement: "Pre-registered: anomalous QPO morphology anti-correlates with mock IXPE PA. CI excludes 0.",
      status: boot.hi < 0 ? "holds" : boot.lo > 0 ? "fails" : "watch",
      fidelity: "Educational",
    },
    {
      id: "five-star-rare",
      statement: "Five-star rate on planted windows exceeds permutation null.",
      status: permP < 0.05 && five.length > 0 ? "holds" : five.length === 0 ? "watch" : "fails",
      fidelity: "Engineering",
    },
    {
      id: "j1820-gate",
      statement: "J1820-like windows are calibration, never five-star.",
      status: twin.filter((s) => s.obs.state === "j1820like" && s.fiveStar).length === 0 ? "holds" : "fails",
      fidelity: "Engineering",
    },
    {
      id: "real-no-headline",
      statement: "Daily real windows cannot five-star (Nyquist 0.5/day; QPO-blind).",
      status: real.filter((s) => s.fiveStar).length === 0 ? "holds" : "fails",
      fidelity: "Research",
    },
    {
      id: "belloni-veto",
      statement: "Real RXTE windows matching a Belloni class (ρ/κ/χ/φ/μ) never five-star — known, not headline.",
      status: rxte.length === 0 ? "watch" : knownFive === 0 ? "holds" : "fails",
      fidelity: "Research",
    },
    {
      id: "chi-100",
      statement: "Windows with χ=1 residual ≫ χ=100 residual are Ferreira secular-factor, not new physics.",
      status: "watch",
      fidelity: "Educational",
    },
    {
      id: "qpo-cadence",
      statement:
        "A real GRS 1915 RXTE/PCA 125 ms light curve (Nyquist 4 Hz) is in the sealed scan. Morgan 67 Hz is never claimed.",
      status: cadenceN > 0 && lit.morganOk ? "holds" : cadenceN > 0 ? "watch" : "fails",
      fidelity: "Research",
    },
    {
      id: "lit-five-star",
      statement:
        "Five-star real RXTE matching Belloni ρ/κ/χ/φ/μ never headlines. Unlisted + five-star + QPO-cadence is the only real-data headline path.",
      status: lit.nHeadline === 0 && knownFive === 0 ? "holds" : knownFive > 0 ? "fails" : "watch",
      fidelity: "Research",
    },
  ];

  return {
    coverage90,
    target90: 0.9,
    holdN: hold.length,
    roc: { vaeAuc, ifAuc, mfAuc, cnnAuc },
    loso,
    injection,
    ablation,
    permutation: { nFiveStar: five.length, injectedInFive: fiveInjected, nInjected: nInj, p: permP },
    leadA: { ...lead, ciLow: boot.lo, ciHigh: boot.hi, nBoot: 200 },
    realN: real.length,
    twinN,
    rxteN: rxte.length,
    belloni,
    lit,
    claims,
  };
}
