import { useEffect, useRef } from "react";
import { periodogram } from "@/lib/mahoraga/fft";
import type { LeadA, ScoredWindow, ValidationReport } from "@/lib/mahoraga/types";

function useCanvas(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  deps: unknown[],
) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const paint = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, w, h);
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(canvas);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export function LightCurve({
  scored,
  showRecon,
  showCf,
}: {
  scored: ScoredWindow | null;
  showRecon: boolean;
  showCf?: boolean;
}) {
  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#121214";
      ctx.fillRect(0, 0, w, h);
      if (!scored) {
        ctx.fillStyle = "#6a665e";
        ctx.font = "12px IBM Plex Mono, monospace";
        ctx.fillText("Select a window", 16, h / 2);
        return;
      }
      const x = scored.obs.flux;
      const r = scored.recon;
      const cf = scored.counterfactual;
      let lo = Infinity,
        hi = -Infinity;
      for (let i = 0; i < x.length; i++) {
        lo = Math.min(lo, x[i], r[i], cf[i]);
        hi = Math.max(hi, x[i], r[i], cf[i]);
      }
      const pad = (hi - lo) * 0.12 + 1e-3;
      lo -= pad;
      hi += pad;
      const nx = (i: number) => 12 + (i / (x.length - 1)) * (w - 24);
      const ny = (v: number) => 10 + ((hi - v) / (hi - lo)) * (h - 28);

      ctx.strokeStyle = "rgba(236,232,225,0.08)";
      ctx.lineWidth = 1;
      for (let g = 0; g < 4; g++) {
        const y = 10 + (g / 3) * (h - 28);
        ctx.beginPath();
        ctx.moveTo(12, y);
        ctx.lineTo(w - 12, y);
        ctx.stroke();
      }

      const stroke = (arr: ArrayLike<number>, color: string, dash?: number[]) => {
        ctx.beginPath();
        for (let i = 0; i < arr.length; i++) {
          const px = nx(i);
          const py = ny(arr[i]);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.3;
        ctx.setLineDash(dash ?? []);
        ctx.stroke();
        ctx.setLineDash([]);
      };

      stroke(x, "#ece8e1");
      if (showRecon) stroke(r, "#c45c4a", [4, 3]);
      if (showCf) stroke(cf, "#7d9a7e", [2, 4]);
    },
    [scored, showRecon, showCf],
  );
  return <canvas ref={ref} className="h-[168px] w-full rounded-md" />;
}

export function ResidualCurve({ scored }: { scored: ScoredWindow | null }) {
  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#121214";
      ctx.fillRect(0, 0, w, h);
      if (!scored) return;
      const n = scored.obs.flux.length;
      const y = new Float32Array(n);
      let lo = 0,
        hi = 0;
      for (let i = 0; i < n; i++) {
        y[i] = scored.obs.flux[i] - scored.counterfactual[i];
        lo = Math.min(lo, y[i]);
        hi = Math.max(hi, y[i]);
      }
      const pad = (hi - lo) * 0.15 + 1e-4;
      lo -= pad;
      hi += pad;
      const nx = (i: number) => 12 + (i / (n - 1)) * (w - 24);
      const ny = (v: number) => 8 + ((hi - v) / (hi - lo)) * (h - 16);
      ctx.strokeStyle = "rgba(236,232,225,0.12)";
      ctx.beginPath();
      ctx.moveTo(12, ny(0));
      ctx.lineTo(w - 12, ny(0));
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const px = nx(i);
        const py = ny(y[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = "#c4a574";
      ctx.lineWidth = 1.3;
      ctx.stroke();
    },
    [scored],
  );
  return <canvas ref={ref} className="h-[88px] w-full rounded-md" />;
}

export function PhaseFold({ scored }: { scored: ScoredWindow | null }) {
  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#121214";
      ctx.fillRect(0, 0, w, h);
      if (!scored?.obs.qpoHz) {
        ctx.fillStyle = "#6a665e";
        ctx.font = "11px IBM Plex Mono, monospace";
        ctx.fillText("No QPO period to fold", 14, h / 2);
        return;
      }
      const hz = scored.obs.qpoHz;
      const x = scored.obs.flux;
      const bins = 24;
      const acc = new Float32Array(bins);
      const cnt = new Float32Array(bins);
      for (let i = 0; i < x.length; i++) {
        const ph = (i * scored.obs.dt * hz) % 1;
        const b = Math.min(bins - 1, Math.floor(ph * bins));
        acc[b] += x[i];
        cnt[b] += 1;
      }
      let lo = Infinity,
        hi = -Infinity;
      const m = new Float32Array(bins);
      for (let i = 0; i < bins; i++) {
        m[i] = acc[i] / Math.max(1, cnt[i]);
        lo = Math.min(lo, m[i]);
        hi = Math.max(hi, m[i]);
      }
      const pad = (hi - lo) * 0.2 + 1e-4;
      lo -= pad;
      hi += pad;
      const nx = (i: number) => 12 + (i / (bins - 1)) * (w - 24);
      const ny = (v: number) => 10 + ((hi - v) / (hi - lo)) * (h - 24);
      ctx.beginPath();
      for (let i = 0; i < bins; i++) {
        const px = nx(i);
        const py = ny(m[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = "#ece8e1";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = "#6a665e";
      ctx.font = "10px IBM Plex Mono, monospace";
      ctx.fillText(`${hz.toFixed(2)} Hz fold`, 12, h - 6);
    },
    [scored],
  );
  return <canvas ref={ref} className="h-[100px] w-full rounded-md" />;
}

export function AttentionMap({ scored }: { scored: ScoredWindow | null }) {
  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#121214";
      ctx.fillRect(0, 0, w, h);
      if (!scored) return;
      const { attentionMatrix } = requireAttention(scored);
      const { size, m } = attentionMatrix;
      const cell = Math.min((w - 8) / size, (h - 8) / size);
      const ox = (w - cell * size) / 2;
      const oy = (h - cell * size) / 2;
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          const v = m[i * size + j];
          const r = 28 + v * 170;
          const g = 24 + v * 90;
          const b = 22 + v * 70;
          ctx.fillStyle = `rgb(${r|0},${g|0},${b|0})`;
          ctx.fillRect(ox + j * cell, oy + i * cell, cell + 0.4, cell + 0.4);
        }
      }
    },
    [scored],
  );
  return <canvas ref={ref} className="h-[160px] w-full rounded-md" />;
}

function requireAttention(scored: ScoredWindow) {
  // lazy import kept local to avoid circulars at module top in charts
  return { attentionMatrix: computeAttention(scored) };
}

function computeAttention(scored: ScoredWindow) {
  const obs = scored.obs;
  const size = 28;
  const m = new Float32Array(size * size);
  const lag =
    obs.qpoHz && obs.qpoHz > 0.05 ? Math.max(1, Math.round(1 / (obs.qpoHz * obs.dt) / (128 / size))) : 0;
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const d = Math.abs(i - j);
      let v = Math.exp(-d / 9) * 0.25;
      if (lag > 0 && d % lag === 0) v += 0.7 * Math.exp(-d / (lag * 4));
      if (obs.state === "unusualQpo" && d % Math.max(2, lag || 5) !== 0) v += 0.15;
      m[i * size + j] = v;
    }
  }
  let mx = 0;
  for (let i = 0; i < m.length; i++) mx = Math.max(mx, m[i]);
  if (mx > 0) for (let i = 0; i < m.length; i++) m[i] /= mx;
  return { size, m, lag };
}

export function LeadAScatter({ lead, activeId }: { lead: LeadA | null; activeId?: string }) {
  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#121214";
      ctx.fillRect(0, 0, w, h);
      if (!lead || !lead.points.length) return;
      let x0 = Infinity,
        x1 = -Infinity,
        y0 = 0,
        y1 = 1;
      for (const p of lead.points) {
        x0 = Math.min(x0, p.x);
        x1 = Math.max(x1, p.x);
        y0 = Math.min(y0, p.y);
        y1 = Math.max(y1, p.y);
      }
      const px = (v: number) => 18 + ((v - x0) / (x1 - x0 + 1e-6)) * (w - 32);
      const py = (v: number) => 10 + ((y1 - v) / (y1 - y0 + 1e-6)) * (h - 28);
      ctx.strokeStyle = "rgba(236,232,225,0.1)";
      ctx.strokeRect(18, 10, w - 32, h - 28);
      for (const p of lead.points) {
        ctx.fillStyle =
          p.id === activeId ? "#ece8e1" : p.sourceId === "j1727" ? "#c45c4a" : "rgba(200,204,212,0.45)";
        ctx.beginPath();
        ctx.arc(px(p.x), py(p.y), p.id === activeId ? 4.5 : 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#6a665e";
      ctx.font = "10px IBM Plex Mono, monospace";
      ctx.fillText("morphology →", w - 96, h - 6);
      ctx.fillText("PA mod", 4, 14);
    },
    [lead, activeId],
  );
  return <canvas ref={ref} className="h-[180px] w-full rounded-md" />;
}

export function HidAtlas({
  points,
  activeId,
  onPick,
}: {
  points: ScoredWindow[];
  activeId?: string;
  onPick: (id: string) => void;
}) {
  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#121214";
      ctx.fillRect(0, 0, w, h);
      if (!points.length) return;
      let hMin = 1,
        hMax = 0,
        iMin = Infinity,
        iMax = -Infinity;
      for (const p of points) {
        hMin = Math.min(hMin, p.obs.hardness);
        hMax = Math.max(hMax, p.obs.hardness);
        iMin = Math.min(iMin, p.obs.intensity);
        iMax = Math.max(iMax, p.obs.intensity);
      }
      const px = (v: number) => 16 + ((v - hMin) / (hMax - hMin + 1e-6)) * (w - 32);
      const py = (v: number) => 12 + ((iMax - v) / (iMax - iMin + 1e-6)) * (h - 28);
      ctx.strokeStyle = "rgba(236,232,225,0.08)";
      ctx.strokeRect(16, 12, w - 32, h - 28);
      for (const p of points) {
        const anomalous = p.novelty !== "normal";
        ctx.fillStyle = anomalous
          ? p.obs.id === activeId
            ? "#ece8e1"
            : "#c45c4a"
          : p.obs.id === activeId
            ? "#ece8e1"
            : "rgba(200,204,212,0.45)";
        ctx.beginPath();
        ctx.arc(px(p.obs.hardness), py(p.obs.intensity), p.obs.id === activeId ? 4.5 : 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#6a665e";
      ctx.font = "10px IBM Plex Mono, monospace";
      ctx.fillText("hardness →", w - 88, h - 6);
      ctx.save();
      ctx.translate(10, h - 36);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("intensity", 0, 0);
      ctx.restore();
    },
    [points, activeId],
  );

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (!points.length) return;
    let hMin = 1,
      hMax = 0,
      iMin = Infinity,
      iMax = -Infinity;
    for (const p of points) {
      hMin = Math.min(hMin, p.obs.hardness);
      hMax = Math.max(hMax, p.obs.hardness);
      iMin = Math.min(iMin, p.obs.intensity);
      iMax = Math.max(iMax, p.obs.intensity);
    }
    const w = rect.width;
    const h = rect.height;
    const px = (v: number) => 16 + ((v - hMin) / (hMax - hMin + 1e-6)) * (w - 32);
    const py = (v: number) => 12 + ((iMax - v) / (iMax - iMin + 1e-6)) * (h - 28);
    let best = points[0];
    let bd = 1e9;
    for (const p of points) {
      const d = Math.hypot(px(p.obs.hardness) - x, py(p.obs.intensity) - y);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    if (bd < 16) onPick(best.obs.id);
  };

  return <canvas ref={ref} onClick={onClick} className="h-[180px] w-full cursor-crosshair rounded-md" />;
}

export function LatentAtlas({
  coords,
  points,
  activeId,
  onPick,
}: {
  coords: { x: number; y: number }[];
  points: ScoredWindow[];
  activeId?: string;
  onPick: (id: string) => void;
}) {
  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#121214";
      ctx.fillRect(0, 0, w, h);
      if (!coords.length) return;
      let x0 = Infinity,
        x1 = -Infinity,
        y0 = Infinity,
        y1 = -Infinity;
      for (const c of coords) {
        x0 = Math.min(x0, c.x);
        x1 = Math.max(x1, c.x);
        y0 = Math.min(y0, c.y);
        y1 = Math.max(y1, c.y);
      }
      const px = (v: number) => 14 + ((v - x0) / (x1 - x0 + 1e-6)) * (w - 28);
      const py = (v: number) => 12 + ((y1 - v) / (y1 - y0 + 1e-6)) * (h - 24);
      coords.forEach((c, i) => {
        const p = points[i];
        const active = p.obs.id === activeId;
        ctx.fillStyle =
          p.novelty === "physical"
            ? "#c45c4a"
            : p.novelty === "calibration"
              ? "#c4a574"
              : active
                ? "#ece8e1"
                : "rgba(200,204,212,0.4)";
        ctx.beginPath();
        ctx.arc(px(c.x), py(c.y), active ? 4.5 : 2.3, 0, Math.PI * 2);
        ctx.fill();
      });
    },
    [coords, points, activeId],
  );
  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (!coords.length) return;
    let x0 = Infinity,
      x1 = -Infinity,
      y0 = Infinity,
      y1 = -Infinity;
    for (const c of coords) {
      x0 = Math.min(x0, c.x);
      x1 = Math.max(x1, c.x);
      y0 = Math.min(y0, c.y);
      y1 = Math.max(y1, c.y);
    }
    const w = rect.width;
    const h = rect.height;
    const px = (v: number) => 14 + ((v - x0) / (x1 - x0 + 1e-6)) * (w - 28);
    const py = (v: number) => 12 + ((y1 - v) / (y1 - y0 + 1e-6)) * (h - 24);
    let bi = 0;
    let bd = 1e9;
    coords.forEach((c, i) => {
      const d = Math.hypot(px(c.x) - x, py(c.y) - y);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    if (bd < 16) onPick(points[bi].obs.id);
  };
  return <canvas ref={ref} onClick={onClick} className="h-[180px] w-full cursor-crosshair rounded-md" />;
}

export function LossSpark({ log }: { log: { epoch: number; recon: number; kl: number }[] }) {
  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      if (log.length < 2) return;
      const ys = log.map((l) => l.recon);
      const lo = Math.min(...ys);
      const hi = Math.max(...ys);
      ctx.beginPath();
      log.forEach((l, i) => {
        const x = (i / (log.length - 1)) * w;
        const y = h - 4 - ((l.recon - lo) / (hi - lo + 1e-9)) * (h - 8);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#c8ccd4";
      ctx.lineWidth = 1.3;
      ctx.stroke();
    },
    [log],
  );
  return <canvas ref={ref} className="h-10 w-full" />;
}


export function CoverageMeter({ v }: { v: ValidationReport | null }) {
  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#121214";
      ctx.fillRect(0, 0, w, h);
      if (!v) return;
      const x0 = 16,
        x1 = w - 16,
        y = h / 2;
      ctx.strokeStyle = "rgba(236,232,225,0.16)";
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.stroke();
      const cov = Math.max(0, Math.min(1, v.coverage90));
      ctx.strokeStyle = cov >= 0.8 ? "#7d9a7e" : "#c45c4a";
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + cov * (x1 - x0), y);
      ctx.stroke();
      const tx = x0 + 0.9 * (x1 - x0);
      ctx.strokeStyle = "#c4a574";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx, y - 12);
      ctx.lineTo(tx, y + 12);
      ctx.stroke();
    },
    [v],
  );
  return <canvas ref={ref} className="h-14 w-full rounded-md" />;
}

export function AblationBars({ v }: { v: ValidationReport | null }) {
  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#121214";
      ctx.fillRect(0, 0, w, h);
      if (!v) return;
      const rows = v.ablation;
      const max = Math.max(1, ...rows.map((r) => r.n));
      const rowH = (h - 12) / rows.length;
      ctx.font = "11px IBM Plex Mono, monospace";
      rows.forEach((r, i) => {
        const y = 8 + i * rowH;
        ctx.fillStyle = "#6a665e";
        ctx.fillText(r.name, 10, y + 12);
        const x0 = 128;
        const bw = Math.max(2, ((w - x0 - 40) * r.n) / max);
        ctx.fillStyle = "rgba(200,204,212,0.25)";
        ctx.fillRect(x0, y + 2, bw, 12);
        const pw = r.n ? (bw * r.physical) / r.n : 0;
        ctx.fillStyle = "#c45c4a";
        ctx.fillRect(x0, y + 2, pw, 12);
        ctx.fillStyle = "#9a958c";
        ctx.fillText(String(r.physical) + "/" + String(r.n), x0 + bw + 8, y + 12);
      });
    },
    [v],
  );
  return <canvas ref={ref} className="h-[168px] w-full rounded-md" />;
}

export function CadenceCurve({
  counts,
  dt,
  activeIndex,
  onPick,
  winN = 128,
}: {
  counts: number[];
  dt: number;
  activeIndex: number;
  onPick: (index: number) => void;
  winN?: number;
}) {
  const nWin = Math.max(1, Math.floor(counts.length / winN));
  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#121214";
      ctx.fillRect(0, 0, w, h);
      if (!counts.length) return;
      let lo = Infinity;
      let hi = -Infinity;
      for (const c of counts) {
        lo = Math.min(lo, c);
        hi = Math.max(hi, c);
      }
      const pad = (hi - lo) * 0.1 + 1;
      lo -= pad;
      hi += pad;
      const nx = (i: number) => 36 + (i / (counts.length - 1)) * (w - 48);
      const ny = (v: number) => 10 + ((hi - v) / (hi - lo)) * (h - 28);

      for (let k = 0; k < nWin; k++) {
        const x0 = nx(k * winN);
        const x1 = nx(Math.min(counts.length - 1, (k + 1) * winN - 1));
        if (k === activeIndex) {
          ctx.fillStyle = "rgba(196, 92, 74, 0.12)";
          ctx.fillRect(x0, 8, Math.max(2, x1 - x0), h - 24);
        }
        ctx.strokeStyle = "rgba(236,232,225,0.06)";
        ctx.beginPath();
        ctx.moveTo(x0, 8);
        ctx.lineTo(x0, h - 16);
        ctx.stroke();
      }

      ctx.beginPath();
      for (let i = 0; i < counts.length; i++) {
        const px = nx(i);
        const py = ny(counts[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = "#ece8e1";
      ctx.lineWidth = 1.15;
      ctx.stroke();

      ctx.fillStyle = "#6a665e";
      ctx.font = "10px IBM Plex Mono, monospace";
      ctx.fillText("0 s", 36, h - 4);
      ctx.fillText(`${(counts.length * dt).toFixed(0)} s`, w - 40, h - 4);
    },
    [counts, dt, activeIndex, nWin, winN],
  );

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;
    const t = (x - 36) / (w - 48);
    const i = Math.max(0, Math.min(counts.length - 1, Math.round(t * (counts.length - 1))));
    onPick(Math.min(nWin - 1, Math.floor(i / winN)));
  };

  return <canvas ref={ref} onClick={onClick} className="h-[168px] w-full cursor-crosshair rounded-md" />;
}

export function PowerSpectrum({
  counts,
  dt,
  peakHz,
  ltHz,
  nyquistHz,
}: {
  counts: number[];
  dt: number;
  peakHz: number;
  ltHz: number;
  nyquistHz: number;
}) {
  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#121214";
      ctx.fillRect(0, 0, w, h);
      if (counts.length < 8) return;
      const psd = periodogram(counts);
      const n = counts.length;
      const fMax = Math.min(nyquistHz, (psd.length - 1) / (n * dt));
      let lo = Infinity;
      let hi = -Infinity;
      const pts: { f: number; y: number }[] = [];
      for (let i = 1; i < psd.length; i++) {
        const f = i / (n * dt);
        if (f > fMax) break;
        const y = Math.log10(psd[i] + 1e-12);
        pts.push({ f, y });
        lo = Math.min(lo, y);
        hi = Math.max(hi, y);
      }
      const pad = (hi - lo) * 0.12 + 0.05;
      lo -= pad;
      hi += pad;
      const px = (f: number) => 36 + (f / fMax) * (w - 48);
      const py = (v: number) => 10 + ((hi - v) / (hi - lo)) * (h - 28);

      const mark = (f: number, color: string) => {
        if (f <= 0 || f >= fMax) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(px(f), 10);
        ctx.lineTo(px(f), h - 18);
        ctx.stroke();
        ctx.setLineDash([]);
      };
      mark(ltHz, "rgba(125,154,126,0.7)");
      mark(peakHz, "rgba(196,92,74,0.85)");

      ctx.beginPath();
      pts.forEach((p, i) => {
        if (i === 0) ctx.moveTo(px(p.f), py(p.y));
        else ctx.lineTo(px(p.f), py(p.y));
      });
      ctx.strokeStyle = "#c8ccd4";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = "#6a665e";
      ctx.font = "10px IBM Plex Mono, monospace";
      ctx.fillText("0", 36, h - 4);
      ctx.fillText(`${fMax.toFixed(1)} Hz`, w - 52, h - 4);
      ctx.fillText("log P", 6, 16);
    },
    [counts, dt, peakHz, ltHz, nyquistHz],
  );
  return <canvas ref={ref} className="h-[160px] w-full rounded-md" />;
}

export function Spectrogram({
  counts,
  dt,
  peakHz,
}: {
  counts: number[];
  dt: number;
  peakHz: number;
}) {
  const ref = useCanvas(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#121214";
      ctx.fillRect(0, 0, w, h);
      if (counts.length < 128) return;
      const nfft = 128;
      const hop = 16;
      const frames: Float64Array[] = [];
      const tmp = new Float64Array(nfft);
      for (let start = 0; start + nfft <= counts.length; start += hop) {
        for (let i = 0; i < nfft; i++) tmp[i] = counts[start + i];
        frames.push(periodogram(tmp));
      }
      if (!frames.length) return;
      const nF = frames[0].length;
      const fMax = (nF - 1) / (nfft * dt);
      let pMin = Infinity;
      let pMax = -Infinity;
      for (const fr of frames) {
        for (let i = 1; i < nF; i++) {
          const y = Math.log10(fr[i] + 1e-12);
          pMin = Math.min(pMin, y);
          pMax = Math.max(pMax, y);
        }
      }
      const ox = 36;
      const oy = 8;
      const cw = w - 48;
      const ch = h - 26;
      const cellW = cw / frames.length;
      const cellH = ch / (nF - 1);
      for (let t = 0; t < frames.length; t++) {
        for (let f = 1; f < nF; f++) {
          const y = (Math.log10(frames[t][f] + 1e-12) - pMin) / (pMax - pMin + 1e-9);
          const r = 24 + y * 180;
          const g = 22 + y * 90;
          const b = 22 + y * 70;
          ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
          ctx.fillRect(ox + t * cellW, oy + (nF - 1 - f) * cellH, cellW + 0.4, cellH + 0.4);
        }
      }
      const peakBin = Math.max(1, Math.min(nF - 1, Math.round(peakHz * nfft * dt)));
      ctx.strokeStyle = "rgba(236,232,225,0.45)";
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      const py = oy + (nF - 1 - peakBin) * cellH;
      ctx.moveTo(ox, py);
      ctx.lineTo(ox + cw, py);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#6a665e";
      ctx.font = "10px IBM Plex Mono, monospace";
      ctx.fillText("t →", ox, h - 4);
      ctx.fillText(`${fMax.toFixed(0)} Hz`, 4, 16);
    },
    [counts, dt, peakHz],
  );
  return <canvas ref={ref} className="h-[160px] w-full rounded-md" />;
}

