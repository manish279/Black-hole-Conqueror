export interface Contradiction {
  id: number;
  title: string;
  theory: string;
  observation: string;
  status: "confirmed" | "emerging" | "watch";
  blades: string[];
  cite: string;
  attack: string;
  field2026: string;
}

export const CONTRADICTIONS: Contradiction[] = [
  {
    id: 1,
    title: "QPO polarization crisis",
    theory: "LFQPOs are Lense–Thirring precession of the inner flow, so PA must rotate with QPO phase.",
    observation: "IXPE on Swift J1727: 1.34 Hz QPO, Γ modulates, PD and PA show zero phase modulation.",
    status: "confirmed",
    blades: ["Blade 1", "Blade 3"],
    cite: "arXiv:2401.08970 · Ninoyu+ 2025 ApJ 985:69 · Smith+ 2025 arXiv:2505.11446",
    attack: "Flag QPO morphologies that deviate from precession-driven templates. Assumption-light discriminator: timing + spectral-index + (when present) IXPE phase.",
    field2026:
      "Sharpened. Smith+ 2025 GRMHD+Pandurata: precession must imprint on PA. Ma/Done/Kubota 2025 still find ν–r slope supports LT. Field is circular — exactly why a model-light scan is the highest-value BH move.",
  },
  {
    id: 2,
    title: "Cyg X-1 polarization paradox",
    theory: "At i ≃ 27°, compact spherical corona predicts PD ~1–2%.",
    observation: "IXPE hard-state PD = 4.01 ± 0.20%. Implies slab/extended corona or pair plasma — which would bias continuum-fitting spins.",
    status: "confirmed",
    blades: ["Blade 1", "Blade 5"],
    cite: "ApJ Oct 2025",
    attack: "Source-specific variability anomalies vs the compact-corona timing template. Posterior on spin if pair plasma is allowed.",
    field2026: "Actively debated. Quote from the paper: results require revising many previously derived results.",
  },
  {
    id: 3,
    title: "Spectro-polarimetric geometry disagreement",
    theory: "Spectral fitting, reverberation, and polarimetry should agree on corona geometry.",
    observation: "They do not. Multi-source IXPE (arXiv:2506.03774): PD 3–20.6%, energy-dependent, contradictory with compact-corona spectro-timing.",
    status: "confirmed",
    blades: ["Blade 1", "Blade 4"],
    cite: "arXiv:2506.03774 June 2025 · Liu 2026 accretion-geometry review",
    attack: "Multi-source latent comparison. Sources whose latent locus disagrees with spectral-fitting geometry are the poorly understood coronae.",
    field2026: "Active crisis, not one source. Liu 2026 lists this as an open question.",
  },
  {
    id: 4,
    title: "The Bollimpalli Nine",
    theory: "GRMHD of LT precession reproduces Type-C QPO timing.",
    observation: "Nine quantitative failures: frequency-independent lags, runs too short for the PSD break, rms–flux slopes too small, no persistent Type-C, p-mode HF power, χ≃100 scaling, Type-B/C inclination reversal, Γ-modulation null, sonic-flow rigid precession unlikely.",
    status: "confirmed",
    blades: ["Blade 1"],
    cite: "Bollimpalli+ 2020 MNRAS 496:3808 · Ferreira+ 2022 · Bollimpalli+ 2026 A&A 707:A246",
    attack: "Systematic QPO anomaly catalog. Each flagged window scored against the nine predictions.",
    field2026:
      "2026 A&A paper: accretion torque can misalign the precession axis away from the BH spin — another reason a rigid-LT template is incomplete.",
  },
  {
    id: 5,
    title: "State-transition hysteresis",
    theory: "Hard→soft and soft→hard at the same luminosity.",
    observation: "q-diagram hysteresis in every outburst. No model reproduces it quantitatively across sources.",
    status: "confirmed",
    blades: ["Blade 3"],
    cite: "Belloni+ 2005 · 20+ years of outburst tracking",
    attack: "Trajectory anomalies in HID / latent path. Unusual hysteresis paths constrain the trigger.",
    field2026: "Still unexplained. Blade 3 (sequence memory) is the correct instrument, not snapshot VAEs.",
  },
  {
    id: 6,
    title: "Jet–QPO timing puzzle",
    theory: "Discrete jet ejection and QPO disappearance are independent.",
    observation: "Swift J1727: coincidence within tens of minutes. Single unknown trigger.",
    status: "confirmed",
    blades: ["Blade 2"],
    cite: "Hughes+ 2025 · Wood+ 2024 VLBI",
    attack: "X-ray precursors in the minutes before radio ejections. Cross-modal correlation breakdown is the signal.",
    field2026: "Best-timed jet/disk campaign of the decade. RXTE-era equivalents are still unmined.",
  },
  {
    id: 7,
    title: "Heartbeat reproduction failure",
    theory: "GRMHD should cover observed variability classes.",
    observation: "GRS 1915+105's 12 classes, and 4U 1630-47 QPO→heartbeat, are not reproduced. Radiation-pressure limit cycles and winds are missing physics.",
    status: "confirmed",
    blades: ["Blade 1", "Blade 4"],
    cite: "Belloni 2000 · 4U 1630-47 2025 transition",
    attack: "Separate statistical rarity (few examples) from physical novelty (outside surrogate parameter space).",
    field2026: "Still the sharpest 'simulation cannot speak this language' result in stellar-mass BH timing.",
  },
  {
    id: 8,
    title: "Dark-energy equation of state",
    theory: "w = −1 cosmological constant.",
    observation: "DESI DR2 evolving-DE ~3σ; phantom crossing persists after DES-Dovekie recalibration.",
    status: "emerging",
    blades: ["Blade 8"],
    cite: "DESI 2503.14738 · DES-Dovekie 2511.07517",
    attack: "Not a BHXRB blade. Methodology transfer: SN Ia anomaly scan. CosmoTwin owns this coordinate.",
    field2026: "Do not fuse into Mahoraga's BH paper. Keep as a sister-method lead.",
  },
  {
    id: 9,
    title: "IceCube source problem",
    theory: "Blazars dominate the neutrino flux.",
    observation: "Only ~5–10% explained by blazars. Galactic plane excess complicates the budget.",
    status: "emerging",
    blades: ["Blade 6"],
    cite: "IceCube 10-yr point source · ICECAT-1",
    attack: "VAE-defined MAXI anomaly windows reduce trial factor vs IceCube. Li & Ma inside physically motivated windows.",
    field2026: "Phase-2. Requires real MAXI+IceCube, not this in-browser engine.",
  },
  {
    id: 10,
    title: "Observer-algebra entropy",
    theory: "Gravitational entropy is a frame-independent geometric quantity.",
    observation: "2022–26: entropy is observer-dependent, set by the von Neumann type of the observer algebra. dS static patch is Type II₁.",
    status: "watch",
    blades: ["Horizon type-lock"],
    cite: "CLPW 2206.10780 · KLS 2309.15897 · De Vuyst+ JHEP 07(2025)146",
    attack: "Spectroscopic prior only. Memory-burden δK / swift-MB ringdown as an optional injected family — never a Paper 1 claim.",
    field2026: "Nearest neighbors and competitors are writing the cosmological-observer algebra now. Keep off the BH timing critical path.",
  },
];
