import {
  Activity,
  Aperture,
  Binary,
  Crosshair,
  FlaskConical,
  Layers,
  Loader2,
  Orbit,
  Scan,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AblationBars,
  AttentionMap,
  CoverageMeter,
  HidAtlas,
  LatentAtlas,
  LeadAScatter,
  LossSpark,
} from "@/components/mahoraga/charts";
import { CadenceObserve, LitProve } from "@/components/mahoraga/cadence";
import { Panel } from "@/components/mahoraga/panel";
import { AdaptationWheel } from "@/components/mahoraga/wheel";
import { BELLONI_CLASSES } from "@/lib/mahoraga/belloni";
import { CONTRADICTIONS } from "@/lib/mahoraga/contradictions";
import { interpretAnomaly } from "@/lib/mahoraga/interpret";
import { BLADES, DATASETS, FIELD_NOW, PATTERNS } from "@/lib/mahoraga/meta";
import { BOLLIMPALLI_NINE } from "@/lib/mahoraga/pipeline";
import { SOURCE_BY_ID, SOURCES } from "@/lib/mahoraga/sources";
import { activeWindow, useMahoraga } from "@/lib/mahoraga/store";
import type { ScoredWindow } from "@/lib/mahoraga/types";
import { cn } from "@/lib/utils";

const VIEWS = [
  { id: "observe" as const, label: "Observe", icon: Orbit },
  { id: "infer" as const, label: "Infer", icon: Binary },
  { id: "atlas" as const, label: "Atlas", icon: Layers },
  { id: "breaks" as const, label: "Breaks", icon: Crosshair },
  { id: "prove" as const, label: "Prove", icon: FlaskConical },
  { id: "core" as const, label: "Core", icon: Aperture },
];

function noveltyBadge(n: ScoredWindow["novelty"]) {
  if (n === "physical") return <Badge variant="anomaly">physical</Badge>;
  if (n === "calibration") return <Badge variant="warn">J1820 gate</Badge>;
  if (n === "statistical") return <Badge variant="default">statistical</Badge>;
  return <Badge variant="live">normal</Badge>;
}

export function MahoragaConsole() {
  const store = useMahoraga();
  const win = activeWindow(store);

  useEffect(() => {
    void store.loadCadence();
    void store.scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ranked = useMemo(() => {
    if (!store.result) return [];
    return [...store.result.scored].sort((a, b) => b.ensemble - a.ensemble);
  }, [store.result]);

  const flags = useMemo(() => {
    const seen = new Set<string>();
    const mixed: ScoredWindow[] = [];
    for (const s of ranked) {
      if (mixed.length >= 6) break;
      if (!seen.has(s.obs.state) || mixed.length < 3) {
        mixed.push(s);
        seen.add(s.obs.state);
      }
    }
    for (const s of ranked) {
      if (mixed.length >= 6) break;
      if (!mixed.includes(s)) mixed.push(s);
    }
    return mixed;
  }, [ranked]);

  const physical = ranked.filter((s) => s.novelty === "physical");
  const stars = ranked.filter((s) => s.fiveStar);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <Header stars={stars.length} />
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 pb-24 pt-4 md:gap-5 md:pb-8">
        {store.view === "observe" && <CadenceObserve win={win} ranked={flags} />}
        {store.view === "infer" && <Infer win={win} ranked={ranked} />}
        {store.view === "atlas" && <Atlas win={win} />}
        {store.view === "breaks" && <Breaks win={win} />}
        {store.view === "prove" && <Prove />}
        {store.view === "core" && <Core physical={physical.length} stars={stars.length} />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-6">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => store.setView(v.id)}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] uppercase tracking-[0.12em]",
                store.view === v.id ? "text-fg" : "text-faint",
              )}
            >
              <v.icon className="size-4" />
              {v.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function Header({ stars }: { stars: number }) {
  const store = useMahoraga();
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            Adaptation engine
          </p>
          <h1 className="font-sans text-2xl font-medium tracking-tight md:text-3xl">Mahoraga</h1>
        </div>
        <div className="hidden flex-wrap items-center gap-1 md:flex">
          {VIEWS.map((v) => (
            <Button
              key={v.id}
              size="sm"
              variant={store.view === v.id ? "default" : "ghost"}
              data-view={v.id}
              onClick={() => store.setView(v.id)}
            >
              {v.label}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={() => void store.scan()} disabled={store.scanning}>
          {store.scanning ? <Loader2 className="animate-spin" /> : <Scan />}
          {store.scanning ? `${Math.round(store.frac * 100)}%` : "Rescan"}
        </Button>
      </div>
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-4 pb-3">
        <Badge variant="live">{store.result?.fidelity ?? "Engineering"} · sealed</Badge>
        <Badge>VAE + patch-CNN</Badge>
        {store.result && store.result.realN > 0 && (
          <Badge variant="live">BAT/MAXI {store.result.realN}</Badge>
        )}
        {store.result && store.result.rxteN > 0 && (
          <Badge variant="live">RXTE {store.result.rxteN}</Badge>
        )}
        {store.result && store.result.cadenceN > 0 && (
          <Badge variant="live">QPO cadence {store.result.cadenceN}</Badge>
        )}
        {store.result && store.result.realN === 0 && store.result.rxteN === 0 && (
          <Badge variant="default">twin only</Badge>
        )}
        {stars > 0 && <Badge variant="anomaly">{stars} five-star</Badge>}
        {store.result && (
          <span className="font-mono text-[10px] tabular-nums text-faint">
            {store.result.scored.length} windows · seed {store.seed}
          </span>
        )}
      </div>
    </header>
  );
}



function ScoreBar({ label, value }: { label: string; value: number }) {
  const w = Math.min(100, Math.max(4, (1 - Math.exp(-Math.max(0, value))) * 100));
  return (
    <div className="grid grid-cols-[92px_1fr_40px] items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">{label}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-bg-subtle">
        <div className="h-full rounded-full bg-accent" style={{ width: `${w}%` }} />
      </div>
      <span className="font-mono text-[10px] tabular-nums text-muted">{value.toFixed(2)}</span>
    </div>
  );
}

function Infer({ win, ranked }: { win: ScoredWindow | null; ranked: ScoredWindow[] }) {
  const store = useMahoraga();
  const [err, setErr] = useState<string | null>(null);
  const diag = store.result?.diagnostics;
  const cmp = store.result?.ifVsVae;

  const ask = async () => {
    if (!win) return;
    useMahoraga.setState({ interpreting: true, interpret: null });
    const r = await interpretAnomaly({
      data: {
        source: SOURCE_BY_ID[win.obs.sourceId].name,
        state: win.obs.state,
        tag: win.obs.physicsTag,
        ensemble: Number(win.ensemble.toFixed(3)),
        conformalP: Number(win.conformalP.toFixed(3)),
        novelty: win.novelty,
        hits: win.hits,
        grmhd: Number(win.grmhdResidual.toFixed(2)),
        grmhdSigma: Number(win.grmhdSigma.toFixed(2)),
        star: win.star,
        isolation: Number(win.isolation.toFixed(3)),
        sharpness: Number(win.sharpness.toFixed(3)),
        fiveStar: win.fiveStar,
        nine: win.nine,
        scale: win.obs.scale,
        provenance: win.obs.provenance,
        dt: win.obs.dt,
        nyquistHz: win.obs.nyquistHz,
        belloniClass: win.obs.belloniClass,
        fiveStarLit: win.fiveStar ? "five-star — literature is post-score veto, not a feature" : undefined,
      },
    });
    if (!r.ok) {
      setErr(r.error);
      useMahoraga.setState({ interpreting: false });
      return;
    }
    setErr(null);
    useMahoraga.setState({ interpreting: false, interpret: r.text });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel title="Blade 1 · β-VAE" hint="real in-browser train" className="lg:col-span-4">
        <LossSpark log={store.log} />
        <p className="mt-2 font-mono text-[11px] tabular-nums text-muted">
          {store.log.length
            ? `epoch ${store.log.at(-1)!.epoch} · recon ${store.log.at(-1)!.recon.toFixed(3)} · KL ${store.log.at(-1)!.kl.toFixed(3)} · phys ${store.log.at(-1)!.phys.toFixed(3)}`
            : "awaiting scan"}
        </p>
        {diag && (
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Health: {diag.health}. Latent rms {diag.latentRms.toFixed(2)}
            {diag.bimodal ? " · bimodal scores" : ""}.
          </p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Encoder 128→48→24→8. β warmup to 0.4. Physics term: flux ≥ 0 and total variation. Trained only on
          hard, soft, and Type-C windows.
        </p>
        {cmp && (
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Isolation Forest vs VAE, top 12: IF recovers {cmp.ifTopPhysical} physical, VAE {cmp.vaeTopPhysical},
            overlap {cmp.agree}. VAE should win on morphology; IF on flux outliers.
          </p>
        )}
        <div className="mt-4">
          <AdaptationWheel active={store.blade} onPick={store.setBlade} />
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            {BLADES.find((b) => b.id === store.blade)?.name} · {BLADES.find((b) => b.id === store.blade)?.fidelity}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {BLADES.find((b) => b.id === store.blade)?.line}
          </p>
        </div>
      </Panel>
      <Panel title="Scores" hint={win ? `${win.star}-star` : "—"} className="lg:col-span-4">
        {win ? (
          <div className="flex flex-col gap-3">
            <ScoreBar label="Dense" value={win.scores.dense} />
            <ScoreBar label="CNN" value={win.scores.cnn} />
            <ScoreBar label="LSTM" value={win.scores.lstm} />
            <ScoreBar label="Transf." value={win.scores.transformer} />
            <ScoreBar label="KAN" value={win.scores.kan} />
            <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[11px] tabular-nums text-muted">
              <span>p_conf {win.conformalP.toFixed(3)}</span>
              <span>MF {win.matchedSnr.toFixed(2)}</span>
              <span>χ_LT {win.ltChi.toFixed(1)}</span>
              <span>χ100 {win.ltChi100.toFixed(1)}</span>
              <span>σ_GRMHD {win.grmhdSigma.toFixed(2)}</span>
              <span>IF {win.isolation.toFixed(2)}</span>
              <span>log p {win.logDensity.toFixed(1)}</span>
              <span>coh {win.coherence.toFixed(2)}</span>
              <span>HID {win.trajectory.toFixed(2)}</span>
              <span>PA {win.paMod.toFixed(2)}</span>
              <span>Γ {win.gammaMod.toFixed(2)}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {win.hits.map((id) => (
                <Badge key={id} variant="anomaly">
                  C{id}
                </Badge>
              ))}
              {noveltyBadge(win.novelty)}
              {win.ifFlag && <Badge variant="warn">IF flag</Badge>}
              {win.fiveStar && <Badge variant="anomaly">five-star</Badge>}
            </div>
            <Button variant="outline" onClick={() => void ask()} disabled={store.interpreting}>
              {store.interpreting ? <Loader2 className="animate-spin" /> : <Activity />}
              Interpret
            </Button>
            {err && <p className="text-sm text-anomaly">{err}</p>}
            {store.interpret && (
              <p className="text-sm leading-relaxed text-muted">{store.interpret}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">Scan first.</p>
        )}
      </Panel>
      <Panel title="Catalogue" hint="click to inspect" className="lg:col-span-4">
        <ul className="max-h-[560px] overflow-y-auto pr-1">
          {ranked.map((s) => (
            <li key={s.obs.id}>
              <button
                onClick={() => store.setActive(s.obs.id)}
                className={cn(
                  "flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-sm",
                  store.activeId === s.obs.id ? "bg-bg-subtle" : "hover:bg-bg-subtle/50",
                )}
              >
                <span className="truncate font-mono text-xs">
                  {s.obs.id}
                  {s.fiveStar ? " · 5★" : ""}
                </span>
                <span className="font-mono text-[10px] tabular-nums text-muted">{s.ensemble.toFixed(2)}</span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function Atlas({ win }: { win: ScoredWindow | null }) {
  const store = useMahoraga();
  const points = store.result?.scored ?? [];
  const enc = store.result?.encoders;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Latent PCA" hint="isolated points = candidates">
        <LatentAtlas
          coords={store.coords}
          points={points}
          activeId={store.activeId ?? undefined}
          onPick={store.setActive}
        />
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Physical novelty in copper. J1820-gate in ochre. A single giant clump would mean posterior collapse —
          reduce β.
        </p>
      </Panel>
      <Panel title="Hardness–intensity" hint="hysteresis is a path">
        <HidAtlas points={points} activeId={store.activeId ?? undefined} onPick={store.setActive} />
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Canonical q-track is the trained locus. Jumps that skip the intermediate are Contradiction 5.
        </p>
      </Panel>
      <Panel title="Encoder intersection" hint="Paper 3 split">
        {enc ? (
          <div className="flex flex-col gap-3 text-sm">
            <p className="leading-relaxed text-muted">
              Top-12 per encoder. Intersection of all five is the robust set. Unique-to-one is
              encoder-specific sensitivity.
            </p>
            <p className="font-mono text-[11px] text-fg">
              5-of-5 · {enc.intersection.length} &nbsp;·&nbsp; ≥3-of-5 · {(enc.majority ?? []).length}
            </p>
            <ul className="flex flex-col gap-1">
              {(enc.intersection.length ? enc.intersection : enc.majority ?? []).slice(0, 8).map((id) => (
                <li key={id}>
                  <button
                    onClick={() => store.setActive(id)}
                    className="min-h-10 w-full rounded-md px-2 text-left font-mono text-xs hover:bg-bg-subtle"
                  >
                    {id}
                  </button>
                </li>
              ))}
              {enc.intersection.length === 0 && (enc.majority ?? []).length === 0 && (
                <li className="text-muted">Empty this scan — no window is top-12 in three or more encoders.</li>
              )}
              {enc.intersection.length === 0 && (enc.majority ?? []).length > 0 && (
                <li className="text-muted">No 5-of-5 this scan. Showing majority (≥3) instead.</li>
              )}
            </ul>
            <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-faint">
              <span>Dense unique {enc.unique.dense.length}</span>
              <span>CNN unique {enc.unique.cnn.length}</span>
              <span>LSTM unique {enc.unique.lstm.length}</span>
              <span>Transf. unique {enc.unique.transformer.length}</span>
              <span>KAN unique {enc.unique.kan.length}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Scan first.</p>
        )}
      </Panel>
      <Panel title="Transformer attention" hint="Educational · QPO lag stripes">
        <AttentionMap scored={win} />
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Periodic diagonals at the QPO period are what a Transformer would learn unsupervised. This map is
          constructed from the known period as a didactic prior — not a trained attention head.
        </p>
      </Panel>
      <Panel title="Sources" hint="RXTE hunting grounds" className="lg:col-span-2">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SOURCES.map((s) => (
            <article key={s.id} className="rounded-lg border border-border bg-bg p-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium">{s.name}</h3>
                <span className="font-mono text-[10px] text-faint">i={s.inclinationDeg}°</span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-muted">{s.archive}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.note}</p>
            </article>
          ))}
        </div>
        {win && (
          <p className="mt-4 text-sm text-muted">
            Active: {SOURCE_BY_ID[win.obs.sourceId].name} · a={SOURCE_BY_ID[win.obs.sourceId].spin} ·{" "}
            {win.obs.physicsTag}
          </p>
        )}
      </Panel>
    </div>
  );
}

function Breaks({ win }: { win: ScoredWindow | null }) {
  const store = useMahoraga();
  const activeHits = new Set(win?.hits ?? []);
  const nine = new Set(win?.nine ?? []);
  const lead = store.result?.leadA ?? null;
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Lead A · PA vs morphology" hint="pre-registered">
          <LeadAScatter lead={lead} activeId={store.activeId ?? undefined} />
          {lead && (
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {lead.preregister} n={lead.n} · r={lead.corr.toFixed(2)} ·{" "}
              {lead.holds ? "anti-correlation holds on this twin." : "does not hold this seed — resample."} Copper
              points are Swift J1727.
            </p>
          )}
        </Panel>
        <Panel title="Bollimpalli Nine" hint={win ? win.obs.id : "active window"}>
          <ul className="flex flex-col gap-2">
            {BOLLIMPALLI_NINE.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "rounded-md border px-3 py-2",
                  nine.has(n.id) ? "border-anomaly/40" : "border-border",
                )}
              >
                <p className="font-mono text-[10px] text-faint">
                  N{n.id}
                  {nine.has(n.id) ? " · hits" : ""}
                </p>
                <p className="text-sm font-medium">{n.name}</p>
                <p className="text-sm leading-relaxed text-muted">{n.detail}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Educational checks on the synthetic twin; the 125 ms GRS 1915 dump is the real QPO-cadence
            counterpart. Research claims on ν wait on that Nyquist.
          </p>
        </Panel>
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-muted">
        Confirmed places where theory says X and the data say Y. Each flagged window is tested against this
        registry — not against a list of known states.
      </p>
      {CONTRADICTIONS.map((c) => (
        <article
          key={c.id}
          className={cn(
            "rounded-xl border bg-bg-elevated p-4",
            activeHits.has(c.id) ? "border-anomaly/50" : "border-border",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] text-faint">C{c.id}</span>
            <h3 className="text-base font-medium">{c.title}</h3>
            <Badge
              variant={
                c.status === "confirmed" ? "anomaly" : c.status === "emerging" ? "warn" : "lock"
              }
            >
              {c.status}
            </Badge>
            {activeHits.has(c.id) && <Badge variant="live">hits active window</Badge>}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <p className="text-sm leading-relaxed text-muted">
              <span className="text-faint">Theory. </span>
              {c.theory}
            </p>
            <p className="text-sm leading-relaxed text-muted">
              <span className="text-faint">Observation. </span>
              {c.observation}
            </p>
          </div>
          <p className="mt-3 text-sm leading-relaxed">{c.attack}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{c.field2026}</p>
          <p className="mt-2 font-mono text-[10px] text-faint">
            {c.cite} · {c.blades.join(" · ")}
          </p>
        </article>
      ))}
    </div>
  );
}

function Core({ physical, stars }: { physical: number; stars: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel title="What was absorbed" hint="combinational core" className="lg:col-span-7">
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-muted">
          Mahoraga is not another autoencoder on light curves. The state-of-the-art move is the
          intersection of these patterns — each already built somewhere in the portfolio, none published
          together on the RXTE archive.
        </p>
        <ol className="flex flex-col gap-4">
          {PATTERNS.map((p, i) => (
            <li key={p.name} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
              <p className="font-mono text-[10px] text-faint">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="text-base font-medium">{p.name}</h3>
              <p className="mt-1 text-sm leading-relaxed">{p.absorbs}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{p.why}</p>
              <p className="mt-1 font-mono text-[10px] text-faint">{p.from.join(" · ")}</p>
            </li>
          ))}
        </ol>
      </Panel>
      <div className="flex flex-col gap-4 lg:col-span-5">
        <Panel title="Field, August 2026" hint="do not claim settled ground">
          <ul className="flex flex-col gap-3">
            {FIELD_NOW.map((f) => (
              <li key={f.item}>
                <h3 className="text-sm font-medium">{f.item}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{f.text}</p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="This scan" hint="sealed · dual scale">
          <p className="text-3xl font-medium tabular-nums">{physical}</p>
          <p className="mt-1 text-sm text-muted">windows tagged physical novelty (outside the analytic surrogate).</p>
          <p className="mt-3 text-2xl font-medium tabular-nums">{stars}</p>
          <p className="mt-1 text-sm text-muted">five-star gates (all encoders + coherence + HID + not J1820 + σ-gap).</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            The VAE trains here. One real GRS 1915+105 RXTE/PCA 125 ms light curve (1996 Nov 19, Nyquist
            4 Hz) runs through the same sealed pipeline. Known Belloni classes are literature-vetoed.
            The 67 Hz HFQPO is above Nyquist and is not claimed.
          </p>
        </Panel>
        <Panel title="Hunting grounds" hint="dataset universe">
          <ul className="flex flex-col gap-3">
            {DATASETS.map((d) => (
              <li key={d.name}>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-medium">{d.name}</h3>
                  <span className="font-mono text-[10px] text-faint">{d.fidelity}</span>
                </div>
                <p className="font-mono text-[10px] text-muted">
                  {d.era} · {d.role}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{d.note}</p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Do not fuse" hint="Bankai / ledger">
          <p className="text-sm leading-relaxed text-muted">
            Mock modularity, Gowers inverse, and CosmoTwin DESI traces stay on their own coordinates. Memory-burden
            δK is a spectroscopic prior on the watch-list. GR is not the target — accretion is.
          </p>
        </Panel>
      </div>
    </div>
  );
}

function Prove() {
  const store = useMahoraga();
  const v = store.result?.validation ?? null;
  const roc = v?.roc;
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel title="Held-out conformal coverage" hint="target 0.90" className="lg:col-span-6">
        <CoverageMeter v={v} />
        {v && (
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Coverage {v.coverage90.toFixed(2)} on {v.holdN} unused normals (never in train or calibration). Ochre mark is 0.90.
            SSA Brain: naive Gaussian under-covers; conformal is the honest wrap.
          </p>
        )}
      </Panel>
      <Panel title="VAE vs Isolation Forest" hint="AUC on planted twin" className="lg:col-span-6">
        {roc ? (
          <div className="grid grid-cols-2 gap-3 font-mono text-sm tabular-nums">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-faint">VAE ensemble</p>
              <p className="text-2xl">{roc.vaeAuc.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-faint">Isolation Forest</p>
              <p className="text-2xl">{roc.ifAuc.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-faint">Patch-CNN</p>
              <p className="text-2xl">{roc.cnnAuc.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-faint">Matched filter</p>
              <p className="text-2xl">{roc.mfAuc.toFixed(2)}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Scan first.</p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Labels used only here: planted twin morphologies vs train-normal. Real daily windows are excluded — they have no QPO ground truth.
          VAE should beat IF on morphology.
        </p>
      </Panel>
      <Panel title="Ablation" hint="planted recovered / flagged" className="lg:col-span-6">
        <AblationBars v={v} />
      </Panel>
      <Panel title="Injection recovery" hint="twin families" className="lg:col-span-6">
        {v ? (
          <ul className="flex flex-col gap-2 text-sm">
            {v.injection.map((r) => (
              <li key={r.family} className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
                <span className="font-mono text-xs">{r.family}</span>
                <span className="font-mono text-[11px] tabular-nums text-muted">
                  n={r.n} · catch {r.completeness.toFixed(2)} · phys {r.physicalRate.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Scan first.</p>
        )}
      </Panel>
      <Panel title="Leave-one-source-out" hint="threshold, not full retrain" className="lg:col-span-6">
        {v ? (
          <ul className="flex flex-col gap-1 text-sm">
            {v.loso.map((r) => (
              <li key={r.sourceId} className="flex min-h-10 items-center justify-between gap-3">
                <span className="font-mono text-xs">{SOURCE_BY_ID[r.sourceId].name}</span>
                <span className="font-mono text-[11px] tabular-nums text-muted">
                  cov {r.coverage.toFixed(2)} · flag {r.flagged}/{r.n}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Conformal/IF cut from the other eight sources. Full VAE retrain LOSO waits on a GPU run.
        </p>
      </Panel>
      <Panel title="Lead A bootstrap" hint="pre-registered" className="lg:col-span-6">
        {v && (
          <>
            <p className="text-2xl font-medium tabular-nums">
              r = {v.leadA.corr.toFixed(2)}
              <span className="ml-2 font-mono text-sm text-muted">
                [{(v.leadA.ciLow ?? 0).toFixed(2)}, {(v.leadA.ciHigh ?? 0).toFixed(2)}]
              </span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{v.leadA.preregister}</p>
            <p className="mt-2 text-sm text-muted">
              {v.leadA.holds ? "Anti-correlation holds on this twin." : "Does not hold this seed."} Permutation
              five-star p = {v.permutation.p.toFixed(3)} · {v.permutation.nFiveStar} five-star · {v.realN} daily · {v.rxteN} RXTE · 
              {v.twinN} twin.
            </p>
          </>
        )}
      </Panel>

      <Panel title="Belloni literature cross-ref" hint="GRS 1915 RXTE/PCA · A&A 355, 271" className="lg:col-span-12">
        {v ? (
          <>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {v.belloni.map((r) => (
                <li key={r.cls} className="rounded-lg border border-border bg-bg p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                    {BELLONI_CLASSES.find((b) => b.id === r.cls)?.name ?? r.cls}
                  </p>
                  <p className="mt-1 font-mono text-sm tabular-nums">
                    n={r.n} · 5★ {r.fiveStar} · phys {r.physical} · stat {r.statistical}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              HEASARC RXTE SOF TOO ASCII (1 s and 125 ms). Nyquist 0.5 Hz / 4 Hz. Morphology is ACF+rms, Educational,
              mapped onto Belloni+2000 taxonomy. Known classes are vetoed from five-star — that is the literature
              gate. Unlisted is the only real-RXTE morph that may headline. {v.rxteN} PCA windows in this scan.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">Scan first.</p>
        )}
      </Panel>

      <LitProve />

      <Panel title="Falsification ledger" hint="claims that can fail" className="lg:col-span-12">
        {v ? (
          <ul className="flex flex-col gap-3">
            {v.claims.map((c) => (
              <li key={c.id} className="rounded-lg border border-border bg-bg p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{c.id}</span>
                  <Badge
                    variant={c.status === "holds" ? "live" : c.status === "fails" ? "anomaly" : "warn"}
                  >
                    {c.status}
                  </Badge>
                  <span className="font-mono text-[10px] text-faint">{c.fidelity}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed">{c.statement}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Scan first.</p>
        )}
      </Panel>
    </div>
  );
}

