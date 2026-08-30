import type { EncoderScores, ScoredWindow, WindowObs } from "./types";

export function conformalP(score: number, cal: number[]) {
  let ge = 0;
  for (const c of cal) if (c >= score) ge++;
  return (1 + ge) / (cal.length + 1);
}

export function sealedNovelty(row: {
  conformalP: number;
  matchedSnr: number;
  ensemble: number;
  j1820Distance: number;
  grmhdSigma: number;
  scale: WindowObs["scale"];
  trajectory: number;
  belloniClass?: string | null;
}): ScoredWindow["novelty"] {
  if (row.conformalP > 0.1) return "normal";
  if (row.j1820Distance < 0.28) return "calibration";
  if (row.scale === "daily-real") {
    if (row.grmhdSigma > 2.2 && row.ensemble > 1.3 && row.trajectory > 0.7) return "physical";
    return "statistical";
  }
  if (row.scale === "timing-real" && row.belloniClass && row.belloniClass !== "unlisted") {
    return "statistical";
  }
  if (row.matchedSnr > 0.55 && row.ensemble < 1.05) return "statistical";
  if (row.grmhdSigma > 1.8 && row.ensemble > 0.85) return "physical";
  return "statistical";
}

export function fiveStarSealed(s: {
  scores: EncoderScores;
  coherence: number;
  trajectory: number;
  j1820Distance: number;
  grmhdSigma: number;
  novelty: ScoredWindow["novelty"];
  scale: WindowObs["scale"];
  belloniClass?: string | null;
}) {
  if (s.scale === "daily-real") return false;
  if (s.scale === "timing-real" && s.belloniClass && s.belloniClass !== "unlisted") return false;
  if (s.scale !== "timing-twin" && s.scale !== "timing-real") return false;
  const keys: (keyof EncoderScores)[] = ["dense", "cnn", "lstm", "transformer", "kan"];
  const all = keys.every((k) => s.scores[k] >= 0.5);
  return (
    all &&
    s.coherence > 0.55 &&
    s.trajectory > 0.55 &&
    s.j1820Distance > 0.4 &&
    s.grmhdSigma > 1.8 &&
    s.novelty !== "calibration"
  );
}

export function starOf(s: {
  scores: EncoderScores;
  coherence: number;
  trajectory: number;
  j1820Distance: number;
  grmhdSigma: number;
}): 1 | 2 | 3 | 4 | 5 {
  let n = 0;
  if (s.scores.dense >= 0.55) n++;
  if (s.scores.cnn >= 0.55) n++;
  if (s.scores.lstm >= 0.55) n++;
  if (s.scores.transformer >= 0.55) n++;
  if (s.scores.kan >= 0.55) n++;
  const extra =
    (s.coherence > 0.6 ? 1 : 0) +
    (s.trajectory > 0.6 ? 1 : 0) +
    (s.j1820Distance > 0.45 ? 1 : 0) +
    (s.grmhdSigma > 1.2 ? 1 : 0);
  return Math.min(5, Math.max(1, Math.round(n / 2 + extra / 2))) as 1 | 2 | 3 | 4 | 5;
}
