import { useEffect, useRef } from "react";
import { iscoPrograde } from "@/lib/mahoraga/kerr";

function ramp(t: number): [number, number, number] {
  const T = Math.min(1.35, Math.max(0.1, t));
  if (T < 0.38) {
    const u = (T - 0.1) / 0.28;
    return [0.42 + 0.4 * u, 0.1 + 0.22 * u, 0.05 + 0.08 * u];
  }
  if (T < 0.72) {
    const u = (T - 0.38) / 0.34;
    return [0.82 + 0.14 * u, 0.32 + 0.46 * u, 0.13 + 0.4 * u];
  }
  const u = (T - 0.72) / 0.63;
  return [0.96 - 0.12 * u, 0.78 + 0.08 * u, 0.53 + 0.4 * u];
}

function hash01(i: number, salt: number) {
  let x = Math.imul(i + 1 + salt * 1973, 1597334677) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 2246822519) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 3266489917) >>> 0;
  return (x >>> 0) / 4294967296;
}

export function GeodesicView({ spin, playing }: { spin: number; playing: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const playRef = useRef(playing);
  playRef.current = playing;
  const spinRef = useRef(spin);
  spinRef.current = spin;
  const isco = iscoPrograde(spin);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let t0 = performance.now();
    let phi = 0.4;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - t0) / 1000);
      t0 = now;
      if (playRef.current) phi += 0.32 * dt;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const bw = Math.max(64, Math.floor(w * dpr));
      const bh = Math.max(64, Math.floor(h * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#07070a";
      ctx.fillRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.52;
      const a = spinRef.current;
      const rIsco = iscoPrograde(a);
      const scale = Math.min(w, h) / 40;
      const inc = 1.18;
      const cosI = Math.cos(inc);
      const sinI = Math.sin(inc);

      ctx.fillStyle = "rgba(210,200,180,0.55)";
      for (let s = 0; s < 90; s++) {
        const u = hash01(s, 11);
        const v = hash01(s, 29);
        const x = (u - 0.5) * w;
        const y = (v - 0.5) * h;
        ctx.fillRect(cx + x * 0.9, cy + y * 0.9, 1, 1);
      }

      const rOut = 22;
      const rIn = Math.max(rIsco, 1.8);
      const n = 1700;
      for (let s = 0; s < n; s++) {
        const u1 = hash01(s, 7);
        const u2 = hash01(s, 13);
        const rr = rIn + (rOut - rIn) * Math.pow(u1, 0.52);
        const ang = u2 * Math.PI * 2 + phi * Math.pow(6 / rr, 1.5);
        const x = rr * Math.cos(ang);
        const y = rr * Math.sin(ang);
        const xp = x;
        const yp = y * cosI;
        const doppler = 1 / (1 + 0.48 * Math.sin(ang) * sinI * Math.sqrt(1 / rr));
        const temp = Math.pow(rIn / rr, 0.75) * doppler;
        const [cr, cg, cb] = ramp(temp);
        const I = Math.pow(doppler, 3.4) * Math.pow(rIn / rr, 1.55);
        const px = cx + xp * scale;
        const py = cy + yp * scale;
        const rad = Math.max(0.7, 1.25 * scale * (0.35 + 0.7 * I));
        ctx.fillStyle = `rgba(${Math.floor(cr * 255)},${Math.floor(cg * 255)},${Math.floor(cb * 255)},${Math.min(0.92, 0.22 + I * 0.5)})`;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      const shadowR = 2.55 * scale * (1 + 0.14 * a);
      const grd = ctx.createRadialGradient(cx, cy, shadowR * 0.15, cx, cy, shadowR * 1.45);
      grd.addColorStop(0, "#000");
      grd.addColorStop(0.68, "#000");
      grd.addColorStop(1, "rgba(196,168,130,0.42)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(cx, cy, shadowR * 1.08, shadowR * (0.9 + 0.1 * Math.abs(cosI)), 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(236,224,204,0.72)";
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.ellipse(
        cx,
        cy,
        2.85 * scale,
        2.85 * scale * Math.max(0.16, Math.abs(cosI) * 0.38 + 0.1),
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();

      ctx.strokeStyle = "rgba(196,92,74,0.45)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      const rI = rIsco * scale;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rI, rI * Math.max(0.16, Math.abs(cosI) * 0.38 + 0.1), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative h-full min-h-[220px] w-full overflow-hidden rounded-lg bg-bg">
      <canvas ref={ref} className="block h-full w-full" />
      <div className="pointer-events-none absolute left-3 top-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        Kerr disk · Educational
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 font-mono text-[10px] tabular-nums text-faint">
        r_ISCO(a={spin.toFixed(2)}) = {isco.toFixed(2)} M · Cunningham g
      </div>
    </div>
  );
}
