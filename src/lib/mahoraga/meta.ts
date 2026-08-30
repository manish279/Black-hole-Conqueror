export interface Pattern {
  name: string;
  from: string[];
  absorbs: string;
  why: string;
}

export const PATTERNS: Pattern[] = [
  {
    name: "Contradiction-targeted unsupervised scan",
    from: ["Mahoraga Blade 1", "Owl credits 1–2", "Field map"],
    absorbs:
      "Do not classify known states. Hunt windows where LT, GRMHD, and IXPE already disagree.",
    why: "Orwat-Kapola 2022 is one-source LSTM-VAE fingerprints. Garg 2026 is supervised RXTE spectra. The gap is still multi-source unsupervised, theory-failure-aimed.",
  },
  {
    name: "Five-encoder intersection / union",
    from: ["Encoder-decoder experiments", "Upgraded form", "Paper 3 plan"],
    absorbs:
      "Dense = flux distribution. CNN = local QPO morphology. LSTM = causal trajectory. Transformer = long-range harmonics. KAN = residual vs a physics template.",
    why: "Intersection → robust discovery. Union minus intersection → encoder-specific sensitivity. That split is a paper, not a dashboard flourish.",
  },
  {
    name: "Cross-wavelength coherence subspace",
    from: ["Blade 2", "IXPE geometry crisis", "Fender jet paradigm"],
    absorbs:
      "Anomalies in the relationship between X-ray, radio, and optical — even when each band looks locally ordinary.",
    why: "This is the disk–corona–jet geometry contradiction, expressed in timing rather than polarimetry.",
  },
  {
    name: "HID trajectory memory",
    from: ["Blade 3", "Mamba-3 note", "Hysteresis mystery"],
    absorbs:
      "Unusual paths through hardness–intensity, not unusual snapshots. Hysteresis is a trajectory problem.",
    why: "Snapshot VAEs cannot see skipped intermediates. Sequence models can.",
  },
  {
    name: "Conformal p-values on reconstruction",
    from: ["SSA Brain", "Frontier architecture June 2026"],
    absorbs:
      "Distribution-free coverage wrapping VAE MSE. Naive Gaussians under-cover; conformal is the honest threshold.",
    why: "Needed before any multi-messenger significance (Blade 6 Li & Ma windows).",
  },
  {
    name: "Matched-filter QPO bank",
    from: ["SSA Brain matched filter", "Contradiction 1"],
    absorbs:
      "High VAE + low matched-filter = not a known QPO variant. Separates statistical rarity from morphological novelty.",
    why: "Heartbeat classes are rare and will score high on recon error. That is not new physics by itself.",
  },
  {
    name: "Analytic GRMHD / LT surrogate residual",
    from: ["AstroNova v13 emission", "Blade 4", "Bollimpalli Nine"],
    absorbs:
      "Closest-template distance in (spin, ṁ, i, tilt, ν_LT). Anomalies no parameter combination reproduces are theory failures.",
    why: "Fidelity: Educational–Engineering. Not HARM. Honest badge is the AstroNova doctrine.",
  },
  {
    name: "MAXI J1820+070 calibration gate",
    from: ["Project brief", "Owl credit 2"],
    absorbs:
      "Every flag is asked: J1820-like (unusual but published) or not (headline). Prevents rediscovering Bellavita/Ma/Buisson.",
    why: "This is how an independent researcher avoids a referee's first kill shot.",
  },
  {
    name: "Physics-informed constraints",
    from: ["AstroNova inverse GR", "SSA augmented Lagrangian"],
    absorbs: "Flux ≥ 0, total-variation bound inside the loss. Decoder cannot hallucinate negative flux.",
    why: "Stops unphysical reconstructions from poisoning anomaly ranks.",
  },
  {
    name: "Assumption-light LT discriminator",
    from: ["Bankai synthesis June 18", "Smith 2025 vs Ma/Done 2025"],
    absorbs:
      "The field is circular: polarimetry kills simple precession, spectral-timing still likes ν–r. Combine light curve + photon-index proxy + (later) IXPE phase without assuming the model.",
    why: "Highest-value black-hole move on the registry. Paper 1 introduction lives here.",
  },
  {
    name: "Fidelity badges + epistemic ledger",
    from: ["AstroNova validation", "Physics Threads honest ledger"],
    absorbs:
      "Arcade / Educational / Engineering / Research. Claims are gated. Memory-burden δK is watch-list, never a timing headline.",
    why: "This is what makes the stack frontier-aligned rather than a demo with stolen vocabulary.",
  },
  {
    name: "Sister-method, not fusion",
    from: ["CosmoTwin", "Type-lock", "Green–Tao ledger", "HŌGYOKU"],
    absorbs:
      "Differentiable kernels, conformal UQ, and world-model discipline transfer. Invariants do not. Do not fuse mock modularity or Gowers into QPO scores.",
    why: "The June 2026 Bankai pass already scored this. Mixing coordinates is how independent work looks unserious.",
  },
  {
    name: "VAE detects · counterpart characterises · surrogate contextualises",
    from: ["Diffusion Integration", "Level 3 GRMHD", "Project brief Stage 2–3"],
    absorbs:
      "k-NN latent decode as Educational stand-in for conditional diffusion. Residual = real − normal neighbour. σ-gap to analytic GRMHD grid.",
    why: "The Paper 2 figure is four panels: real, counterpart, residual, σ-outside-space. Diffusion itself waits on a working VAE catalogue — this engine now produces that catalogue.",
  },
  {
    name: "Isolation Forest as honest baseline",
    from: ["Frontier architecture week 2", "Pinciroli Vago 2026 ISOF on spectral latents"],
    absorbs:
      "Same windows, tree isolation on (mean, rms, hardness, intensity, ν, CNN, matched-filter). VAE must beat it on subtle morphology, not on flux outliers.",
    why: "Reviewers will ask. Pinciroli Vago 2026 already used Isolation Forest on X-ray spectral embeddings. Timing still has no published IF vs VAE.",
  },
  {
    name: "Pre-registered PA–morphology test (Lead A)",
    from: ["Bankai synthesis Lead A", "Ninoyu 2025 ApJ 985:69", "Zhao 2024 2401.08970"],
    absorbs:
      "QPO windows: CNN+Transformer morphology vs mock IXPE PA modulation. Pre-register anti-correlation. If LT precession is true, the correlation is zero.",
    why: "Fastest citeable BH result in the portfolio. Swift J1727 is the live target; RXTE-era equivalents are unmined.",
  },
  {
    name: "Bollimpalli Nine as a per-window checklist",
    from: ["Owl credit 1", "Bollimpalli 2020 + 2026 A&A 707:A246"],
    absorbs:
      "Each flagged window is scored against the nine quantitative GRMHD/LT failures, not a single 'weird' bit.",
    why: "2026 torque-misalignment paper adds a tenth reason a rigid-LT template is incomplete. The checklist is the Paper 1 results table.",
  },
  {
    name: "Five-star Nature Astronomy gate",
    from: ["Project brief", "Multi-dataset confidence ladder"],
    absorbs:
      "All five encoders high + coherence breakdown + unusual HID path + not J1820-like + outside surrogate σ. Only then is it a headline.",
    why: "Levels 1–3 stay in the catalogue. Headline claims need the full gate. Prevents writing the paper on a heartbeat class that is merely rare.",
  },
  {
    name: "Encoder-specific scientific questions",
    from: ["Encoder-decoder experiments"],
    absorbs:
      "Dense asks flux distribution. CNN asks local QPO shape. LSTM asks causal sequence. Transformer asks harmonics. KAN asks the functional form.",
    why: "You are not switching architectures because one is popular. Each encoder is a different instrument on the same hole.",
  },
  {
    name: "Dual-scale sealed scan",
    from: ["Multi-dataset universe", "SSA conformal", "Owl credits", "Bankai Lead A"],
    absorbs:
      "QPO morphology lives on the timing twin and the 125 ms GRS 1915 dump. Outburst context lives on real Swift/BAT + MAXI daily windows. Scoring never sees planted labels. Five-star is twin or unlisted real RXTE — daily Nyquist cannot see a Hertz QPO.",
    why: "The combinational move that was never assembled: theory-failure scan + held-out conformal + IF baseline + trained patch encoder + one real QPO-cadence light curve, with an honest Nyquist badge.",
  },
];

export const FIELD_NOW = [
  {
    item: "This observation",
    text: "GRS 1915+105 RXTE/PCA 1996 November 19 04:07:11–04:09:19 UTC, 125 ms bins, 128 s. Nyquist 4 Hz reaches the LFQPO band. A 0.336 Hz νP(ν) peak is μ-class (Belloni+2000). The 67 Hz HFQPO of Morgan+1997 is not accessible and is not claimed.",
  },
  {
    item: "Closest predecessor",
    text: "Orwat-Kapola et al. 2022 MNRAS — LSTM-VAE fingerprints of GRS 1915+105 only. Supervised or single-source. Multi-source unsupervised theory-failure scan is still open.",
  },
  {
    item: "2026 supervised RXTE",
    text: "Garg et al. 2026 arXiv:2601.18139 — neuro-parametric nets on RXTE spectra for BH vs NS classification. Different task. Cite as adjacent, not competition.",
  },
  {
    item: "2026 X-ray latent spectra",
    text: "Pinciroli Vago et al. 2026 Neural Computing — transformer autoencoder on X-ray spectra, Isolation Forest on the latent, PULX / lens follow-ups. Spectra, not timing. Architecture rhyme; they already used the baseline we now run.",
  },
  {
    item: "LT 2026",
    text: "Bollimpalli, Horák, Kluźniak, Fragile 2026 A&A 707:A246 (arXiv:2503.20577) — accretion torque misaligns the LT axis away from BH spin. Stellar wobble LT (Science Advances Dec 2025) is a different regime; it does not rescue BHXRB QPO polarimetry.",
  },
  {
    item: "IXPE circularity",
    text: "Ninoyu+ 2025 ApJ 985:69: LFQPO PA of Swift J1727. Zhao 2024 (2401.08970) zero PA modulation vs Smith+ 2025 must-imprint vs Ma/Done/Kubota 2025 ν–r still LT-like. Discriminator > new model.",
  },
  {
    item: "Geometry review 2026",
    text: "Liu 2026 Ap&SS 371:27 — accretion-geometry open questions; QPO origin still listed. Spectro-temporal vs polarimetry disagreement is the live crisis.",
  },
  {
    item: "Tooling gap",
    text: "Stingray.jl still has an open 2025 issue asking for AI anomaly detection on astronomical light curves. The community tooling has not closed Mahoraga's gap.",
  },
  {
    item: "GW side-channel",
    text: "GWTC-5 (May 2026) doubled the merger sample. Blade 7 stays locked. Do not dilute Paper 1 with LIGO.",
  },
  {
    item: "Roman hook",
    text: "Roman targeting note (30 Aug 2026) is a later multi-messenger door, not a VAE input. Keep as career/map, not architecture.",
  },
];

export const BLADES = [
  {
    id: "b1" as const,
    name: "Dense VAE",
    status: "live",
    fidelity: "Engineering",
    target: "C1 C2 C4 C7",
    line: "128-bin β-VAE, physics-informed TV + flux≥0, conformal-wrapped MSE.",
  },
  {
    id: "b2" as const,
    name: "Multimodal",
    status: "live-lite",
    fidelity: "Educational",
    target: "C6 C3",
    line: "X-ray + radio + optical coherence residual. Synthetic bands, real logic.",
  },
  {
    id: "b3" as const,
    name: "Trajectory",
    status: "live-lite",
    fidelity: "Educational",
    target: "C5 C1",
    line: "HID path distance from the trained locus. LSTM/Mamba deferred; AR residual stands in.",
  },
  {
    id: "b4" as const,
    name: "GRMHD surrogate",
    status: "analytic",
    fidelity: "Educational",
    target: "C3 C4 C7",
    line: "LT + emission template residual in σ of the train χ². Not HARM. Flags the unsimulatable.",
  },
  {
    id: "b5" as const,
    name: "SBI / flows",
    status: "locked",
    fidelity: "Research",
    target: "C2",
    line: "Flow-matching posterior on (a, ṁ, i). PhD-year blade. Latent Gaussian log-density stands in.",
  },
  {
    id: "b6" as const,
    name: "MAXI × IceCube",
    status: "locked",
    fidelity: "Research",
    target: "C9",
    line: "Anomaly windows as neutrino trial-factor reduction.",
  },
  {
    id: "b7" as const,
    name: "GW strain VAE",
    status: "locked",
    fidelity: "Research",
    target: "unmodeled",
    line: "LIGO O4/O5 unmodeled bursts. After Paper 1.",
  },
  {
    id: "b8" as const,
    name: "Cosmology SBI",
    status: "sister",
    fidelity: "Research",
    target: "C8",
    line: "CosmoTwin coordinate. Do not fuse.",
  },
];

export const DATASETS = [
  { name: "RXTE PCA TOO", era: "1996 Nov 19", role: "One real QPO-cadence LC", fidelity: "Research data", note: "HEASARC SOF ASCII GRS1915_d324_125ms: 1024 bins × 0.125 s, Nyquist 4 Hz. νP(ν) peak 0.336 Hz (μ). Morgan 67 Hz is above Nyquist. Belloni+2000 literature veto on five-star." },
  { name: "RXTE PCA", era: "1996–2012", role: "Timing twin", fidelity: "Engineering twin", note: "QPO-timescale 128-bin windows. Not HEASARC FITS. Morphology / Lead A / Bollimpalli live here." },
  { name: "Swift/BAT", era: "2005–now", role: "Real daily monitor", fidelity: "Engineering real", note: "15–50 keV public transient-monitor daily averages for 8 BHXRBs including J1820 2018 and J1727. QPO-blind. Outburst context + J1820 gate." },
  { name: "NICER XTI", era: "2017–now", role: "Modern cross-reference", fidelity: "Locked", note: "100 ns timing. J1820 2018 outburst is the calibration source." },
  { name: "MAXI GSC", era: "2009–now", role: "Outburst context", fidelity: "Engineering · 1-day real", note: "H1743-322 1-day public LC windowed. Nyquist 0.5/day. Recurrence/hysteresis, not QPO morphology." },
  { name: "IXPE", era: "2022–now", role: "Geometry validator", fidelity: "Educational mock", note: "Lead A uses a mock PA series. Real Stokes cubes wait on HEASARC." },
  { name: "VLA / ZTF", era: "archive", role: "Blade 2 scouts", fidelity: "Educational", note: "Radio jet and optical outer-disk. Synthetic coherence only." },
  { name: "Einstein Probe", era: "2024–now", role: "MPE live door", fidelity: "Locked", note: "Career target, not an input. Methodology transfers; data loader does not exist here." },
];
