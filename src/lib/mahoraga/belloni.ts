/** Belloni et al. 2000, A&A 355, 271 — twelve variability classes of GRS 1915+105.
 *  Klein-Wolt et al. 2002, MNRAS 331, 745. Morphology labels on HEASARC TOO
 *  windows are Educational (ACF/rms), not a human re-annotation of the archive.
 */
export const BELLONI_CLASSES = [
  {
    id: "rho",
    name: "ρ heartbeat",
    period: "10–80 s",
    cite: "Belloni+2000",
    note: "Regular limit-cycle pulses. No GRMHD run reproduces the class (Contradiction 7).",
  },
  {
    id: "kappa",
    name: "κ dips",
    period: "40–200 s",
    cite: "Belloni+2000",
    note: "Quasi-regular ring-like dips. Radiation-pressure / wind physics.",
  },
  {
    id: "chi",
    name: "χ hard-noisy",
    period: "broadband",
    cite: "Belloni+2000",
    note: "Hard state, no structured pulse. Closest to the twin's trained 'hard'.",
  },
  {
    id: "phi",
    name: "φ quiet",
    period: "smooth",
    cite: "Belloni+2000",
    note: "Low-rms high flux. Soft-ish. Should look normal to a VAE trained on soft/hard.",
  },
  {
    id: "mu",
    name: "μ fast",
    period: "< 8 s",
    cite: "Belloni+2000",
    note: "Faster structured variability. 125 ms windows live here (Nyquist 4 Hz).",
  },
  {
    id: "unlisted",
    name: "unlisted",
    period: "—",
    cite: "this scan",
    note: "Does not match ρ/κ/χ/φ/μ cuts. The only morph that may five-star on real RXTE.",
  },
] as const;

export type BelloniId = (typeof BELLONI_CLASSES)[number]["id"];

export function knownBelloni(cls?: string | null) {
  return !!cls && cls !== "unlisted";
}
