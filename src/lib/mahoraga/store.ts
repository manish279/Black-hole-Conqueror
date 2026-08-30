import { create } from "zustand";
import { pca2 } from "./ensemble";
import { runScan } from "./engine";
import { loadCadenceObservation } from "./realdata";
import type { CadenceObs, ScanResult, ScoredWindow, TrainLog } from "./types";

type View = "observe" | "infer" | "atlas" | "breaks" | "prove" | "core";

interface MahoragaState {
  view: View;
  blade: string;
  seed: number;
  scanning: boolean;
  frac: number;
  log: TrainLog[];
  result: ScanResult | null;
  activeId: string | null;
  coords: { x: number; y: number }[];
  interpret: string | null;
  interpreting: boolean;
  cadence: CadenceObs | null;
  setView: (v: View) => void;
  setBlade: (b: string) => void;
  setActive: (id: string) => void;
  loadCadence: () => Promise<void>;
  scan: () => Promise<void>;
}

function pickActive(scored: ScoredWindow[]) {
  const cadence = scored.filter((s) => s.obs.id.includes("d324_125ms"));
  return (
    cadence.find((s) => s.fiveStar) ??
    cadence.find((s) => s.novelty === "physical") ??
    cadence[0] ??
    scored.find((s) => s.fiveStar) ??
    scored.find((s) => s.novelty === "physical") ??
    scored.find((s) => s.obs.injected) ??
    scored[0]
  );
}

export const useMahoraga = create<MahoragaState>((set, get) => ({
  view: "observe",
  blade: "b1",
  seed: 20260830,
  scanning: false,
  frac: 0,
  log: [],
  result: null,
  activeId: null,
  coords: [],
  interpret: null,
  interpreting: false,
  cadence: null,
  setView: (view) => set({ view }),
  setBlade: (blade) => set({ blade }),
  setActive: (activeId) => set({ activeId, interpret: null }),
  loadCadence: async () => {
    if (get().cadence) return;
    const cadence = await loadCadenceObservation();
    if (cadence) {
      set({
        cadence,
        activeId: get().activeId ?? cadence.windowIds[0] ?? null,
      });
    }
  },
  scan: async () => {
    if (get().scanning) return;
    set({ scanning: true, frac: 0, log: [], interpret: null });
    const result = await runScan(get().seed, (row, frac) => {
      set((s) => ({ frac, log: [...s.log, row] }));
    });
    const coords = pca2(result.scored.map((s) => s.latent));
    const first = pickActive(result.scored);
    set({
      scanning: false,
      result,
      coords,
      activeId: first?.obs.id ?? get().activeId,
      frac: 1,
    });
  },
}));

export function activeWindow(s: MahoragaState): ScoredWindow | null {
  if (!s.result || !s.activeId) return null;
  return s.result.scored.find((w) => w.obs.id === s.activeId) ?? null;
}
