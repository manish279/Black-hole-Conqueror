# Mahoraga — Black Hole Conqueror

VAE-based anomaly detection for black-hole X-ray light curves. A browser-playable research engine that trains a dense β-VAE and a patch encoder on mixed **timing-twin** windows and **real daily** Swift/BAT + MAXI outburst context, then scores novelty under a **sealed** pipeline (no injected/state label leak).

**Author:** Manish Malik  
**Repo:** [manish279/Black-hole-Conqueror](https://github.com/manish279/Black-hole-Conqueror)  
**Status:** dual-scale sealed scan + validation campaign. Honest fidelity: *engineering-grade engine, research-aligned claims*. Daily real data cannot five-star (cadence is days, not 0.25 s QPO morphology).

---

## What it does

Mahoraga is not a classifier of known accretion states. It hunts **windows where Lense–Thirring, GRMHD, and geometry already disagree**, then asks whether the reconstruction residual is:

1. a known rare class (heartbeat, J1820-like) → **calibration, not headline**
2. a theory-failure residual no nearby surrogate reproduces → **candidate**
3. an encoder-specific sensitivity (VAE vs patch-CNN) → **paper split, not a dashboard flourish**

The console has six views: **Observe / Infer / Atlas / Breaks / Prove / Core**.

| View | Role |
|---|---|
| Observe | Light curve, HID, PSD, source + scale badge |
| Infer | Sealed novelty, conformal p, five-star gate, interpret |
| Atlas | Multi-source map of scored windows |
| Breaks | Contradiction registry (LT vs IXPE vs GRMHD) |
| Prove | Coverage, ROC, ablation, Lead A CI, falsification ledger |
| Core | Combinational patterns absorbed from the research programme |

---

## Architecture

**Dual scale (do not mix claims):**

| Scale | Cadence | What it is allowed to say |
|---|---|---|
| `timing-twin` | 0.25 s, 128 bins | QPO morphology, five-star, Bollimpalli Nine, LT χ² |
| `daily-real` | 1 day, Swift/BAT 15–50 keV + MAXI/GSC | Outburst context flags only. **Cannot five-star.** |

**Encoders (browser, trained at scan time):**

- Dense β-VAE: `128 → 48 → 24 → 8`, Adam, β-warmup, flux ≥ 0 + total-variation in the loss
- Patch-CNN: 8-bin local patches → latent 8 (MLP over concatenated patches; not a strict conv)
- Isolation Forest baseline for ROC (VAE vs IF)

**Sealed scoring** (`src/lib/mahoraga/seal.ts`, `seal-core.ts`):

Novelty, hits, Nine, and five-star **never see** `injected` or `state`. Five-star additionally requires all instruments + coherence + HID + not-J1820 + outside surrogate + **twin-scale only**.

**Validation campaign** (`src/lib/mahoraga/validate.ts`):

- Conformal p-values, held-out calibration (70 / 15 / 15)
- Coverage diagnostic
- VAE-vs-IF ROC / AUC
- Injection-recovery per family
- Lead A pre-registered Pearson with bootstrap CI
- LOSO thresholds, permutation test, ablation table
- Falsification ledger (coverage, Lead A, rare five-star, real-no-headline, χ=1 vs χ=100)

---

## Data in the tree

Packed windows live in [`public/data/`](public/data/):

| File | Contents |
|---|---|
| `real-windows.json` | 67 compact 128-day Swift/BAT + MAXI windows (Cyg X-1, GRS 1915+105, GRO J1655-40, GX 339-4, XTE J1550-564, 4U 1630-47, MAXI J1820+070, Swift J1727, H1743-322) |
| `rxte-grs1915.json` | RXTE GRS 1915 context pack |
| `rxte-d324.json` | RXTE D324 context pack |

Raw BAT/MAXI ASCII is public NASA/RIKEN data and is **not** vendored (too large). Provenance is tagged on every window (`scale`, `instrument`, `mjd0`).

This is **not** RXTE PCA 0.25 s event-mode science data. Timing-twin windows are physics-informed stand-ins for QPO morphology until HEASARC event files are ingested.

---

## Run

```bash
npm install
npm run dev          # Vite + TanStack Start, http://localhost:8080
npm run typecheck
npm test             # includes src/lib/mahoraga/seal.test.ts and lit.test.ts
```

Scan from the console. Prove view reports coverage, VAE AUC, Lead A CI, and the falsification ledger for that run (stochastic training; numbers move).

---

## Fidelity (read this before citing)

| Claim | Badge |
|---|---|
| Browser β-VAE + sealed conformal scores | Engineering |
| Dual-scale gate (daily cannot five-star) | Research-aligned |
| Analytic GRMHD / LT surrogate residual | Educational–Engineering — **not HARM** |
| Patch-CNN | MLP over patches, not a strict conv |
| Five-star on real daily BAT/MAXI | **Forbidden by construction** |
| Paper-ready RXTE/NICER event-mode | **Not yet** |

The combinational patterns (contradiction-targeted scan, conformal wrap, J1820 calibration gate, assumption-light LT discriminator, epistemic ledger) are assembled in [`src/lib/mahoraga/meta.ts`](src/lib/mahoraga/meta.ts).

---

## Layout

```
src/lib/mahoraga/     engine, VAE, patch-CNN, seal, validate, realdata, pipeline
src/components/mahoraga/  Observe / Infer / Atlas / Breaks / Prove / Core
public/data/          packed real windows
```

---

## License

MIT. See [LICENSE](LICENSE).

Swift/BAT and MAXI light curves remain the property of their respective missions. This repo redistributes only compact derived windows for the scan.
