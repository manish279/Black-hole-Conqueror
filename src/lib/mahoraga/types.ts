export type AccretionState =
  | "soft"
  | "hard"
  | "typeC"
  | "typeB"
  | "heartbeat"
  | "flipflop"
  | "jetPrecursor"
  | "unusualQpo"
  | "hysteresisJump"
  | "j1820like"
  | "memoryBurden";

export type Fidelity = "Arcade" | "Educational" | "Engineering" | "Research";

export type SourceId =
  | "cygx1"
  | "grs1915"
  | "gx339"
  | "j1550"
  | "gro1655"
  | "h1743"
  | "u1630"
  | "j1820"
  | "j1727";

export type BladeId = "b1" | "b2" | "b3" | "b4" | "b5" | "b6" | "b7" | "b8";

export type Scale = "timing-twin" | "daily-real" | "timing-real";
export type Provenance = "twin" | "swift-bat" | "maxi-gsc" | "rxte-pca";

export interface Source {
  id: SourceId;
  name: string;
  massSolar: number;
  spin: number;
  inclinationDeg: number;
  archive: string;
  note: string;
  contradictions: number[];
}

export interface WindowObs {
  id: string;
  sourceId: SourceId;
  state: AccretionState;
  flux: Float32Array;
  radio: Float32Array;
  optical: Float32Array;
  hardness: number;
  intensity: number;
  dt: number;
  qpoHz: number | null;
  trainNormal: boolean;
  injected: boolean;
  physicsTag: string;
  paMod: number;
  gammaMod: number;
  scale: Scale;
  provenance: Provenance;
  instrument?: string;
  mjd0?: number;
  belloniClass?: string;
  periodS?: number;
  nyquistHz?: number;
}

export interface EncoderScores {
  dense: number;
  cnn: number;
  lstm: number;
  transformer: number;
  kan: number;
}

export interface ScoredWindow {
  obs: WindowObs;
  recon: Float32Array;
  latent: Float32Array;
  reconMse: number;
  conformalP: number;
  matchedSnr: number;
  scores: EncoderScores;
  ensemble: number;
  star: 1 | 2 | 3 | 4 | 5;
  grmhdResidual: number;
  grmhdSigma: number;
  ltChi: number;
  ltChi100: number;
  coherence: number;
  trajectory: number;
  j1820Distance: number;
  hits: number[];
  novelty: "statistical" | "physical" | "calibration" | "normal";
  isolation: number;
  logDensity: number;
  counterfactual: Float32Array;
  sharpness: number;
  nine: number[];
  fiveStar: boolean;
  paMod: number;
  gammaMod: number;
  ifFlag: boolean;
  cnnMse: number;
}

export interface TrainLog {
  epoch: number;
  recon: number;
  kl: number;
  phys: number;
  total: number;
}

export interface Diagnostics {
  collapse: boolean;
  klDrop: number;
  reconDrop: number;
  latentRms: number;
  bimodal: boolean;
  health: string;
}

export interface EncoderSets {
  topIds: Record<keyof EncoderScores, string[]>;
  intersection: string[];
  majority: string[];
  unique: Record<keyof EncoderScores, string[]>;
}

export interface LeadA {
  n: number;
  corr: number;
  holds: boolean;
  preregister: string;
  points: { id: string; x: number; y: number; sourceId: SourceId; novelty: ScoredWindow["novelty"] }[];
  ciLow?: number;
  ciHigh?: number;
  nBoot?: number;
}

export type LitVerdict =
  | "known-class"
  | "predecessor"
  | "precession-template"
  | "above-nyquist"
  | "unmatched"
  | "qpo-blind";

export interface LitStar {
  id: string;
  year: number;
  authors: string;
  venue: string;
  title: string;
  claim: string;
  band: string;
  nyquistNeedHz: number | null;
}

export interface LitHit {
  starId: string;
  verdict: LitVerdict;
  note: string;
}

export interface LitReport {
  windowId: string;
  fiveStar: boolean;
  qpoCadence: boolean;
  hits: LitHit[];
  headline: boolean;
  summary: string;
}

export interface LitBundle {
  nCadence: number;
  nFiveStar: number;
  nHeadline: number;
  nVetoedKnown: number;
  morganOk: boolean;
  reports: LitReport[];
}

export interface CadenceObs {
  id: string;
  sourceId: SourceId;
  file: string;
  utc: string;
  utcEnd: string;
  dt: number;
  nyquistHz: number;
  n: number;
  durationS: number;
  meanCounts: number;
  rmsCounts: number;
  fracRms: number;
  peakHz: number;
  year: number;
  doy: number;
  windowIds: string[];
  counts: number[];
  flux: number[];
  note: string;
  citation: string;
  qpoHz?: number;
  peakKind?: string;
}

export interface ValidationReport {
  coverage90: number;
  target90: number;
  holdN: number;
  roc: { vaeAuc: number; ifAuc: number; mfAuc: number; cnnAuc: number };
  loso: { sourceId: SourceId; n: number; flagged: number; physical: number; coverage: number }[];
  injection: { family: string; n: number; completeness: number; physicalRate: number; purity: number }[];
  ablation: { name: string; n: number; physical: number }[];
  permutation: { nFiveStar: number; injectedInFive: number; nInjected: number; p: number };
  leadA: LeadA;
  realN: number;
  twinN: number;
  rxteN: number;
  belloni: { cls: string; n: number; fiveStar: number; physical: number; statistical: number }[];
  lit: LitBundle;
  claims: { id: string; statement: string; status: "holds" | "fails" | "watch"; fidelity: Fidelity }[];
}

export interface ScanResult {
  scored: ScoredWindow[];
  log: TrainLog[];
  calibrated: boolean;
  fidelity: Fidelity;
  seed: number;
  trainedAt: number;
  diagnostics: Diagnostics;
  encoders: EncoderSets;
  leadA: LeadA;
  ifVsVae: { ifTopPhysical: number; vaeTopPhysical: number; agree: number };
  validation: ValidationReport | null;
  realN: number;
  twinN: number;
  rxteN: number;
  cadenceN: number;
}
