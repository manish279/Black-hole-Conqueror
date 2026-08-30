/** Geometric units G = c = M = 1 unless noted. */

export function iscoPrograde(a: number) {
  const aa = Math.min(0.998, Math.max(0, a));
  const z1 =
    1 +
    Math.pow(1 - aa * aa, 1 / 3) *
      (Math.pow(1 + aa, 1 / 3) + Math.pow(1 - aa, 1 / 3));
  const z2 = Math.sqrt(3 * aa * aa + z1 * z1);
  return 3 + z2 - Math.sqrt((3 - z1) * (3 + z1 + 2 * z2));
}

/** Keplerian frequency in Hz for a stellar-mass Kerr hole. */
export function keplerHz(rOverM: number, a: number, massSolar: number) {
  const geom = 1 / (Math.pow(rOverM, 1.5) + a);
  const c3_GM = 32310 / massSolar; // Hz, ≈ c³/(2πGM_sun) scaled
  return geom * c3_GM;
}

/**
 * Approximate Lense–Thirring frequency for a torus at radius r.
 * Ω_LT ≈ 2a / r³  (G=c=M=1). Ferreira et al. 2022 note a χ≃100
 * secular factor is required to match the observed ν–r correlation.
 */
export function lenseThirringHz(
  rOverM: number,
  a: number,
  massSolar: number,
  chi = 1,
) {
  const omega = (2 * a) / Math.pow(rOverM, 3);
  const c3_2piGM = 32310 / massSolar;
  return chi * omega * c3_2piGM;
}

export function eddingtonLuminosity(massSolar: number) {
  return 1.26e38 * massSolar; // erg/s
}
