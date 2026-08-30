import { N } from "./lightcurve";
import { mulberry32, randn } from "./rng";
import type { AccretionState, CadenceObs, Provenance, Scale, SourceId, WindowObs } from "./types";

export interface RealPacked {
  id: string;
  sourceId: SourceId;
  instrument: string;
  band: string;
  mjd0?: number;
  dtDays?: number;
  dt?: number;
  trainNormal: boolean;
  hardness: number;
  intensity: number;
  flux: number[];
  morphClass?: string;
  periodS?: number;
  qpoHz?: number | null;
  nyquistHz?: number;
  year?: number;
  doy?: number;
  utc?: string;
  file?: string;
}

export interface RealArchiveFile {
  fetched: string;
  cadence?: string;
  nyquistHz?: number;
  note?: string;
  source?: string;
  citation?: string;
  n: number;
  windows: RealPacked[];
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export async function loadRealArchive(): Promise<RealArchiveFile | null> {
  return fetchJson<RealArchiveFile>("/data/real-windows.json");
}

export async function loadRxteArchive(): Promise<RealArchiveFile | null> {
  return fetchJson<RealArchiveFile>("/data/rxte-grs1915.json");
}

export async function loadCadenceObservation(): Promise<CadenceObs | null> {
  const j = await fetchJson<CadenceObs>("/data/rxte-d324.json");
  if (!j?.counts?.length) return null;
  return j;
}

function morphState(cls: string | undefined, hard: number): AccretionState {
  if (cls === "rho" || cls === "kappa") return "heartbeat";
  if (cls === "mu") return "unusualQpo";
  if (cls === "chi") return "hard";
  if (cls === "phi") return "soft";
  if (cls === "unlisted") return "unusualQpo";
  return hard > 0.55 ? "hard" : "soft";
}

function packToObs(
  pack: RealPacked,
  seed: number,
  index: number,
  scale: Scale,
  provenance: Provenance,
  dt: number,
): WindowObs {
  const rand = mulberry32(seed + 9000 + index);
  const flux = new Float32Array(N);
  for (let i = 0; i < N; i++) flux[i] = pack.flux[i] ?? 0.2;
  const radio = new Float32Array(N);
  const optical = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    radio[i] = 0.45 + 0.02 * randn(rand);
    optical[i] = 0.5 + 0.02 * randn(rand);
  }
  const hard = pack.hardness || 0.62;
  const cls = pack.morphClass;
  const state = morphState(cls, hard);
  const nyq = pack.nyquistHz ?? 0.5 / dt;
  const qpoCadence = nyq >= 1;
  const tag =
    scale === "timing-real"
      ? `RXTE/PCA ${pack.dt ?? dt}s · ${pack.utc || `doy ${pack.doy}`} · Belloni morph ${cls ?? "—"} · Nyquist ${nyq.toFixed(2)} Hz${qpoCadence ? " · QPO cadence" : " · QPO-blind"}`
      : `${pack.instrument} ${pack.band} · MJD ${pack.mjd0?.toFixed(0) ?? "—"} · daily, QPO-blind`;
  return {
    id: pack.id,
    sourceId: pack.sourceId,
    state,
    flux,
    radio,
    optical,
    hardness: hard,
    intensity: pack.intensity,
    dt,
    qpoHz: pack.qpoHz ?? null,
    trainNormal: pack.trainNormal,
    injected: false,
    physicsTag: tag,
    paMod: 0.12,
    gammaMod: 0.1,
    scale,
    provenance,
    instrument: pack.instrument,
    mjd0: pack.mjd0,
    belloniClass: cls,
    periodS: pack.periodS,
    nyquistHz: nyq,
  };
}

export function realToObs(pack: RealPacked, seed: number, index: number): WindowObs {
  return packToObs(pack, seed, index, "daily-real", pack.instrument as Provenance, 86400);
}

export function rxteToObs(pack: RealPacked, seed: number, index: number): WindowObs {
  const dt = pack.dt ?? 1;
  return packToObs(pack, seed, index, "timing-real", "rxte-pca", dt);
}
