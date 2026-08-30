/** In-place radix-2 FFT. n must be a power of 2. */
export function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k];
        const uIm = im[i + k];
        const vRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const vIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + len / 2] = uRe - vRe;
        im[i + k + len / 2] = uIm - vIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

export function periodogram(x: ArrayLike<number>) {
  const n = x.length;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  let mean = 0;
  for (let i = 0; i < n; i++) mean += x[i];
  mean /= n;
  for (let i = 0; i < n; i++) re[i] = x[i] - mean;
  fft(re, im);
  const half = n / 2;
  const psd = new Float64Array(half);
  for (let i = 0; i < half; i++) {
    psd[i] = (re[i] * re[i] + im[i] * im[i]) / n;
  }
  return psd;
}

export function peakHz(psd: Float64Array, dt: number, minBin = 2) {
  let best = minBin;
  for (let i = minBin; i < psd.length; i++) {
    if (psd[i] > psd[best]) best = i;
  }
  return { hz: best / (psd.length * 2 * dt), power: psd[best], bin: best };
}

/** Frequency of bin i for a periodogram of length n/2 from n samples. */
export function binHz(bin: number, n: number, dt: number) {
  return bin / (n * dt);
}

/** νP(ν) peak above minHz — suppresses the red-noise floor that wins a raw periodogram. */
export function nuPPeak(psd: Float64Array, dt: number, minHz = 0.1) {
  const n = psd.length * 2;
  let best = 1;
  let bestV = -1;
  for (let i = 1; i < psd.length; i++) {
    const hz = binHz(i, n, dt);
    if (hz < minHz) continue;
    const v = hz * psd[i];
    if (v > bestV) {
      bestV = v;
      best = i;
    }
  }
  return { hz: binHz(best, n, dt), power: psd[best], bin: best, nuP: bestV };
}

export function spectrogram(x: ArrayLike<number>, nfft = 128, hop = 16) {
  const frames: Float64Array[] = [];
  const tmp = new Float64Array(nfft);
  for (let start = 0; start + nfft <= x.length; start += hop) {
    for (let i = 0; i < nfft; i++) tmp[i] = x[start + i];
    frames.push(periodogram(tmp));
  }
  return frames;
}
