import { Badge } from "@/components/ui/badge";
import {
  CadenceCurve,
  LightCurve,
  PhaseFold,
  PowerSpectrum,
  ResidualCurve,
  Spectrogram,
} from "@/components/mahoraga/charts";
import { GeodesicView } from "@/components/mahoraga/geodesic";
import { Panel } from "@/components/mahoraga/panel";
import { lenseThirringHz } from "@/lib/mahoraga/kerr";
import { crossRefWindow, FIVE_LITERATURE } from "@/lib/mahoraga/lit";
import { SOURCE_BY_ID } from "@/lib/mahoraga/sources";
import { useMahoraga } from "@/lib/mahoraga/store";
import type { LitVerdict, ScoredWindow } from "@/lib/mahoraga/types";
import { cn } from "@/lib/utils";

function noveltyBadge(n: ScoredWindow["novelty"]) {
  if (n === "physical") return <Badge variant="anomaly">physical</Badge>;
  if (n === "calibration") return <Badge variant="warn">J1820 gate</Badge>;
  if (n === "statistical") return <Badge variant="default">statistical</Badge>;
  return <Badge variant="live">normal</Badge>;
}

function verdictBadge(v: LitVerdict) {
  if (v === "known-class" || v === "predecessor") return <Badge variant="warn">{v}</Badge>;
  if (v === "above-nyquist" || v === "qpo-blind") return <Badge variant="lock">{v}</Badge>;
  if (v === "unmatched") return <Badge variant="anomaly">unmatched</Badge>;
  return <Badge variant="default">{v}</Badge>;
}

export function CadenceObserve({ win, ranked }: { win: ScoredWindow | null; ranked: ScoredWindow[] }) {
  const store = useMahoraga();
  const cadence = store.cadence;
  const spin = win ? SOURCE_BY_ID[win.obs.sourceId].spin : SOURCE_BY_ID.grs1915.spin;
  const src = SOURCE_BY_ID.grs1915;
  const lt = lenseThirringHz(28, src.spin, src.massSolar, 1);
  const lt100 = lenseThirringHz(28, src.spin, src.massSolar, 100);

  const windowIds = cadence?.windowIds ?? [];
  const activeIndex = Math.max(
    0,
    windowIds.findIndex((id) => id === store.activeId),
  );
  const lit = win ? crossRefWindow(win) : null;
  const cadenceScored = (store.result?.scored ?? []).filter((s) => s.obs.id.includes("d324_125ms"));
  const litBundle = store.result?.validation?.lit;

  return (
    <div className="grid gap-4">
      <Panel
        title="GRS 1915+105 · one real TOO dump"
        hint={cadence ? `${cadence.utc} · 125 ms · Nyquist 4 Hz` : "loading HEASARC"}
      >
        {cadence ? (
          <>
            <CadenceCurve
              counts={cadence.counts}
              dt={cadence.dt}
              activeIndex={activeIndex}
              onPick={(i) => {
                const id = cadence.windowIds[i];
                if (id) store.setActive(id);
              }}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="live">Research data</Badge>
              <Badge>PCA 2–60 keV</Badge>
              <Badge variant="warn">Belloni μ</Badge>
              <span className="font-mono text-[11px] tabular-nums text-muted">
                {cadence.n} bins · {cadence.durationS.toFixed(0)} s · rms {cadence.fracRms.toFixed(2)} · νP peak{" "}
                {cadence.peakHz.toFixed(3)} Hz
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">{cadence.note}</p>
            <p className="mt-1 font-mono text-[10px] text-faint">{cadence.citation}</p>
          </>
        ) : (
          <p className="text-sm text-muted">Fetching the 1996 November 19 125 ms light curve.</p>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Power spectrum" hint="copper = νP peak · sage = χ=1 LT">
          {cadence ? (
            <>
              <PowerSpectrum
                counts={cadence.counts}
                dt={cadence.dt}
                peakHz={cadence.peakHz}
                ltHz={lt}
                nyquistHz={cadence.nyquistHz}
              />
              <p className="mt-2 font-mono text-[11px] tabular-nums text-muted">
                peak {cadence.peakHz.toFixed(3)} Hz · χ=1 LT {lt.toFixed(2)} Hz · χ=100 LT {lt100.toFixed(1)} Hz
                (off-scale) · 67 Hz HFQPO off-scale
              </p>
            </>
          ) : (
            <div className="h-40" />
          )}
        </Panel>
        <Panel title="Dynamical spectrum" hint="128-bin FFT · hop 2 s">
          {cadence ? (
            <>
              <Spectrogram counts={cadence.counts} dt={cadence.dt} peakHz={cadence.peakHz} />
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Bone–copper log power. Dashed line is the 0.336 Hz νP(ν) peak — μ-class, a few-second
                oscillation, in-band at Nyquist 4 Hz.
              </p>
            </>
          ) : (
            <div className="h-40" />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Panel title="Photon ring" hint="AstroNova geodesic · Educational" className="lg:col-span-5">
          <div className="h-[220px] md:h-[280px]">
            <GeodesicView spin={spin} playing={!store.scanning} />
          </div>
        </Panel>
        <div className="flex flex-col gap-4 lg:col-span-7">
          <Panel title="Sealed window" hint={win ? win.obs.id : "scan to score"}>
            <LightCurve scored={win} showRecon showCf />
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
              bone = real · copper dash = VAE recon · sage dash = Stage-2 counterpart
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
              {win && (
                <>
                  <span>{SOURCE_BY_ID[win.obs.sourceId].name}</span>
                  <span className="text-faint">/</span>
                  <span className="font-mono text-xs">{win.obs.state}</span>
                  {noveltyBadge(win.novelty)}
                  {win.fiveStar && <Badge variant="anomaly">five-star</Badge>}
                  {win.obs.belloniClass && <Badge variant="warn">Belloni {win.obs.belloniClass}</Badge>}
                  <Badge variant="default">
                    {win.obs.scale === "timing-real"
                      ? "rxte-pca"
                      : win.obs.scale === "daily-real"
                        ? win.obs.provenance
                        : "twin"}
                  </Badge>
                </>
              )}
            </div>
            {win && <p className="mt-2 text-sm leading-relaxed text-muted">{win.obs.physicsTag}</p>}
          </Panel>
          <div className="grid gap-4 sm:grid-cols-2">
            <Panel title="Residual" hint="real − counterpart">
              <ResidualCurve scored={win} />
              {win && (
                <p className="mt-2 font-mono text-[11px] tabular-nums text-muted">
                  sharpness {win.sharpness.toFixed(3)} · σ_GRMHD {win.grmhdSigma.toFixed(2)}
                </p>
              )}
            </Panel>
            <Panel title="Phase fold" hint="QPO period">
              <PhaseFold scored={win} />
            </Panel>
          </div>
        </div>
      </div>

      <Panel title="Five literature stars" hint="cross-ref, never a score">
        <p className="mb-4 max-w-3xl text-sm leading-relaxed text-muted">
          Same sealed pipeline. Literature is consulted after scoring, not before. A five-star window that
          matches a published class is vetoed. The 67 Hz QPO cannot be claimed from 125 ms data.
        </p>
        <ul className="grid gap-3 lg:grid-cols-5 sm:grid-cols-2">
          {FIVE_LITERATURE.map((star) => {
            const h = lit?.hits.find((x) => x.starId === star.id);
            return (
              <li key={star.id} className="rounded-lg border border-border bg-bg p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                  {star.year} · {star.venue}
                </p>
                <h3 className="mt-1 text-sm font-medium">{star.title}</h3>
                <p className="mt-1 font-mono text-[10px] text-muted">{star.authors}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{star.claim}</p>
                <div className="mt-2">{h ? verdictBadge(h.verdict) : <Badge variant="lock">n/a</Badge>}</div>
                {h && <p className="mt-2 text-sm leading-relaxed text-muted">{h.note}</p>}
              </li>
            );
          })}
        </ul>
        {lit && (
          <p className="mt-4 text-sm leading-relaxed">
            {lit.headline ? (
              <span className="text-anomaly">{lit.summary}</span>
            ) : (
              <span className="text-muted">{lit.summary}</span>
            )}
          </p>
        )}
        {litBundle && (
          <p className="mt-2 font-mono text-[11px] tabular-nums text-faint">
            QPO-cadence windows {litBundle.nCadence} · five-star {litBundle.nFiveStar} · known-class veto{" "}
            {litBundle.nVetoedKnown} · headlines {litBundle.nHeadline}
          </p>
        )}
      </Panel>

      <Panel title="Eight 16 s windows of this dump" hint="click the curve or a row">
        <ul className="grid gap-1 sm:grid-cols-2">
          {windowIds.map((id, i) => {
            const s = cadenceScored.find((r) => r.obs.id === id);
            return (
              <li key={id}>
                <button
                  onClick={() => store.setActive(id)}
                  className={cn(
                    "flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-2 text-left text-sm",
                    store.activeId === id ? "bg-bg-subtle" : "hover:bg-bg-subtle/60",
                  )}
                >
                  <span className="truncate font-mono text-xs">
                    w{i}
                    {s ? ` · ${s.obs.belloniClass ?? "—"}` : ""}
                    {s?.fiveStar ? " · 5★" : ""}
                  </span>
                  <span className="flex items-center gap-2">
                    {s ? noveltyBadge(s.novelty) : <Badge variant="lock">pending</Badge>}
                    {s && <span className="font-mono text-xs tabular-nums">{s.ensemble.toFixed(2)}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="Top flags" hint="ensemble rank · whole scan">
        <ul className="flex flex-col gap-1">
          {ranked.slice(0, 6).map((s) => (
            <li key={s.obs.id}>
              <button
                onClick={() => store.setActive(s.obs.id)}
                className={cn(
                  "flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-2 text-left text-sm",
                  store.activeId === s.obs.id ? "bg-bg-subtle" : "hover:bg-bg-subtle/60",
                )}
              >
                <span className="truncate">
                  {SOURCE_BY_ID[s.obs.sourceId].name}
                  <span className="ml-2 font-mono text-[10px] text-faint">{s.obs.state}</span>
                </span>
                <span className="flex items-center gap-2">
                  {noveltyBadge(s.novelty)}
                  <span className="font-mono text-xs tabular-nums">{s.ensemble.toFixed(2)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

export function LitProve() {
  const store = useMahoraga();
  const lit = store.result?.validation?.lit;
  const scored = store.result?.scored ?? [];
  if (!lit) return null;
  const five = scored.filter((s) => s.fiveStar);
  return (
    <Panel title="Literature cross-ref of the five-stars" hint="post-score, sealed" className="lg:col-span-12">
      {five.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted">
          No five-star windows this seed. Known Belloni classes on the real 125 ms dump are vetoed by
          construction — that is the literature gate working.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {five.map((s) => {
            const r = lit.reports.find((x) => x.windowId === s.obs.id) ?? crossRefWindow(s);
            return (
              <li key={s.obs.id} className="rounded-lg border border-border bg-bg p-3">
                <button
                  onClick={() => {
                    store.setActive(s.obs.id);
                    store.setView("observe");
                  }}
                  className="flex w-full flex-col items-start gap-2 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{s.obs.id}</span>
                    {r.headline ? <Badge variant="anomaly">headline</Badge> : <Badge>catalogue</Badge>}
                    {r.qpoCadence ? <Badge variant="live">QPO cadence</Badge> : <Badge variant="lock">QPO-blind</Badge>}
                  </div>
                  <p className="text-sm leading-relaxed text-muted">{r.summary}</p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
