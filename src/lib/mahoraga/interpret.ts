import { createServerFn } from "@tanstack/react-start";

export const interpretAnomaly = createServerFn({ method: "POST" })
  .validator(
    (input: {
      source: string;
      state: string;
      tag: string;
      ensemble: number;
      conformalP: number;
      novelty: string;
      hits: number[];
      grmhd: number;
      grmhdSigma: number;
      star: number;
      isolation: number;
      sharpness: number;
      fiveStar: boolean;
      nine: number[];
      scale: string;
      provenance: string;
      dt?: number;
      nyquistHz?: number;
      belloniClass?: string;
      fiveStarLit?: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Interpretation is unavailable here." };

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 420,
        messages: [
          {
            role: "system",
            content:
              "You are a terse high-energy astrophysicist advising on Mahoraga. Be rigorous. Timing-twin windows are physics-motivated synthetics, not RXTE FITS. Daily-real windows are Swift/BAT or MAXI/GSC 1-day public data — Nyquist 0.5/day, QPO-blind; never call them Type-C detections. The 125 ms GRS 1915 RXTE/PCA dump (1996 Nov 19) is real QPO-cadence (Nyquist 4 Hz); 67 Hz HFQPO is above Nyquist and must not be claimed. Scoring is sealed: it does not see injected labels. Literature is consulted after scoring: Belloni ρ/κ/χ/φ/μ matches are statistical, never headline. Map scores to contradictions (QPO PA crisis, Cyg X-1 PD, spectro-polarimetry, Bollimpalli Nine + 2026 torque misalignment, hysteresis, jet-QPO, heartbeat). Distinguish statistical rarity from physical novelty. J1820 is calibration. Isolation Forest is the baseline; VAE/patch-CNN must win on morphology. Five-star: twin or unlisted real RXTE only. Keep under 180 words.",
          },
          {
            role: "user",
            content: JSON.stringify(data),
          },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `xAI error ${res.status}` };
    const body = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return { ok: true as const, text: body.choices[0]?.message.content ?? "" };
  });
