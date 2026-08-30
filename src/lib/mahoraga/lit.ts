import type { LitHit, LitReport, LitStar, LitVerdict, ScoredWindow, WindowObs } from "./types";

/** Five literature stars for GRS 1915+105 QPO work. Cross-ref only — never a scoring input. */
export const FIVE_LITERATURE: LitStar[] = [
  {
    id: "morgan1997",
    year: 1997,
    authors: "Morgan, Remillard & Greiner",
    venue: "ApJ 482, 993",
    title: "67 Hz QPO in GRS 1915+105",
    claim: "A stable 67 Hz HFQPO. Needs millisecond cadence (Nyquist ≫ 67 Hz).",
    band: "HFQPO 67 Hz",
    nyquistNeedHz: 67,
  },
  {
    id: "belloni2000",
    year: 2000,
    authors: "Belloni, Klein-Wolt, Méndez, van der Klis & van Paradijs",
    venue: "A&A 355, 271",
    title: "Twelve variability classes",
    claim: "Model-independent taxonomy ρ, κ, χ, φ, μ, … — known class is not a headline.",
    band: "morphology, seconds–minutes",
    nyquistNeedHz: null,
  },
  {
    id: "kleinwolt2002",
    year: 2002,
    authors: "Klein-Wolt, Fender, Pooley, Belloni, Migliari, Morgan & van der Klis",
    venue: "MNRAS 331, 745",
    title: "Hard states and radio emission",
    claim: "Class-to-jet mapping. χ and ρ already have a published radio context.",
    band: "X-ray class × radio",
    nyquistNeedHz: null,
  },
  {
    id: "ingram2019",
    year: 2019,
    authors: "Ingram & Motta",
    venue: "NewAR 85, 101524",
    title: "QPO origin review",
    claim: "LFQPOs as Lense–Thirring precession is the working theory; polarimetry now contradicts the simple version.",
    band: "LFQPO 0.1–10 Hz",
    nyquistNeedHz: 10,
  },
  {
    id: "orwat2022",
    year: 2022,
    authors: "Orwat-Kapola et al.",
    venue: "MNRAS",
    title: "LSTM-VAE fingerprints of GRS 1915+105",
    claim: "Closest ML predecessor. One source, class-aware. Multi-source unsupervised theory-failure scan is still open.",
    band: "learned morphology",
    nyquistNeedHz: null,
  },
];

export const LIT_BY_ID = Object.fromEntries(FIVE_LITERATURE.map((s) => [s.id, s])) as Record<
  string,
  LitStar
>;

export function nyquistOf(obs: Pick<WindowObs, "dt" | "nyquistHz">) {
  return obs.nyquistHz ?? 0.5 / Math.max(1e-9, obs.dt);
}

/** LFQPO band is reachable when Nyquist ≥ 1 Hz. 1 s dumps (0.5 Hz) and 16 s dumps are QPO-blind. */
export function isQpoCadence(obs: Pick<WindowObs, "dt" | "nyquistHz" | "scale">) {
  if (obs.scale === "daily-real") return false;
  return nyquistOf(obs) >= 1;
}

function hit(starId: string, verdict: LitVerdict, note: string): LitHit {
  return { starId, verdict, note };
}

export function crossRefWindow(s: ScoredWindow): LitReport {
  const { obs } = s;
  const nyq = nyquistOf(obs);
  const qpoCadence = isQpoCadence(obs);
  const known = Boolean(obs.belloniClass && obs.belloniClass !== "unlisted");
  const hits: LitHit[] = [];

  if (nyq < 67) {
    hits.push(
      hit(
        "morgan1997",
        "above-nyquist",
        `67 Hz sits ${((67 / nyq) | 0)}× above Nyquist ${nyq.toFixed(2)} Hz. Not a detection, not a non-detection.`,
      ),
    );
  }

  if (obs.scale === "timing-real" || obs.sourceId === "grs1915") {
    if (known) {
      hits.push(
        hit(
          "belloni2000",
          "known-class",
          `Belloni ${obs.belloniClass} — published class, vetoed from five-star headline.`,
        ),
      );
    } else if (obs.scale === "timing-real") {
      hits.push(
        hit(
          "belloni2000",
          "unmatched",
          "Does not match ρ/κ/χ/φ/μ ACF cuts. Unlisted is the only real-RXTE morph that may headline.",
        ),
      );
    }
  }

  if (known && (obs.belloniClass === "chi" || obs.belloniClass === "rho" || obs.belloniClass === "kappa")) {
    hits.push(
      hit(
        "kleinwolt2002",
        "known-class",
        `Class ${obs.belloniClass} already sits on the Klein-Wolt radio-state map.`,
      ),
    );
  } else if (obs.scale === "timing-real" && !known) {
    hits.push(
      hit("kleinwolt2002", "unmatched", "No published class-to-jet row for this window."),
    );
  }

  if (!qpoCadence) {
    hits.push(
      hit(
        "ingram2019",
        "qpo-blind",
        `Nyquist ${nyq.toFixed(3)} Hz cannot test an LFQPO. Daily/16 s/1 s dumps stay contextual.`,
      ),
    );
  } else if (obs.qpoHz && obs.qpoHz > 0) {
    hits.push(
      hit(
        "ingram2019",
        "precession-template",
        `ν=${obs.qpoHz.toFixed(3)} Hz vs χ=1 LT residual χ_LT=${s.ltChi.toFixed(1)}. Template comparison, not a discovery.`,
      ),
    );
  }

  if (obs.sourceId === "grs1915" && known) {
    hits.push(
      hit(
        "orwat2022",
        "predecessor",
        "LSTM-VAE fingerprints of GRS 1915 already cover this published class. Not new.",
      ),
    );
  } else if (s.fiveStar && obs.sourceId === "grs1915") {
    hits.push(
      hit(
        "orwat2022",
        "unmatched",
        "Unlisted under a multi-source unsupervised gate. Orwat-Kapola was one-source.",
      ),
    );
  }

  const blocked = hits.some((h) => h.verdict === "known-class" || h.verdict === "predecessor");
  const headline =
    s.fiveStar &&
    !blocked &&
    obs.scale === "timing-real" &&
    qpoCadence &&
    !known;

  let summary: string;
  if (headline) {
    summary = "Headline path: five-star, QPO-cadence, unlisted, no literature class match.";
  } else if (s.fiveStar && obs.scale === "timing-twin") {
    summary = "Five-star on the timing twin. Synthetic — literature does not apply.";
  } else if (blocked) {
    summary = "Literature veto: known Belloni/Klein-Wolt class or ML predecessor fingerprint.";
  } else if (!qpoCadence) {
    summary = "QPO-blind cadence. Context only.";
  } else {
    summary = "In-band, not five-star. Catalogue, not a headline.";
  }

  return {
    windowId: obs.id,
    fiveStar: s.fiveStar,
    qpoCadence,
    hits,
    headline,
    summary,
  };
}

export function crossRefFiveStars(scored: ScoredWindow[]) {
  const cadence = scored.filter((s) => isQpoCadence(s.obs) && s.obs.scale === "timing-real");
  const five = scored.filter((s) => s.fiveStar);
  const focus = new Map<string, ScoredWindow>();
  for (const s of [...cadence, ...five]) focus.set(s.obs.id, s);
  const reports = [...focus.values()].map(crossRefWindow);
  const nHeadline = reports.filter((r) => r.headline).length;
  const nVetoedKnown = reports.filter((r) => r.hits.some((h) => h.verdict === "known-class")).length;
  const morganOk = reports
    .filter((r) => r.hits.some((h) => h.starId === "morgan1997"))
    .every((r) => r.hits.filter((h) => h.starId === "morgan1997").every((h) => h.verdict === "above-nyquist"));
  return {
    nCadence: cadence.length,
    nFiveStar: five.length,
    nHeadline,
    nVetoedKnown,
    morganOk,
    reports,
  };
}
