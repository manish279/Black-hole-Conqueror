import { N } from "./lightcurve";
import { randn } from "./rng";

const Z = 8;
const P = 8;
const STRIDE = 4;
export const N_PATCH = 1 + Math.floor((N - P) / STRIDE);
const IN = N_PATCH * P;

class Dense {
  w: Float32Array;
  b: Float32Array;
  dw: Float32Array;
  db: Float32Array;
  mw: Float32Array;
  vw: Float32Array;
  mb: Float32Array;
  vb: Float32Array;
  x!: Float32Array;
  pre!: Float32Array;
  constructor(
    readonly ni: number,
    readonly no: number,
    scale: number,
    rand: () => number,
  ) {
    this.w = new Float32Array(ni * no);
    this.b = new Float32Array(no);
    this.dw = new Float32Array(ni * no);
    this.db = new Float32Array(no);
    this.mw = new Float32Array(ni * no);
    this.vw = new Float32Array(ni * no);
    this.mb = new Float32Array(no);
    this.vb = new Float32Array(no);
    const s = Math.sqrt(2 / ni) * scale;
    for (let i = 0; i < this.w.length; i++) this.w[i] = randn(rand) * s;
  }
  forward(x: Float32Array, act: boolean) {
    this.x = x;
    const y = new Float32Array(this.no);
    this.pre = y;
    for (let o = 0; o < this.no; o++) {
      let s = this.b[o];
      const off = o * this.ni;
      for (let i = 0; i < this.ni; i++) s += this.w[off + i] * x[i];
      y[o] = act ? (s > 0 ? s : 0) : s;
    }
    return y;
  }
  backward(gy: Float32Array, act: boolean) {
    const gx = new Float32Array(this.ni);
    for (let o = 0; o < this.no; o++) {
      const g = act ? (this.pre[o] > 0 ? gy[o] : 0) : gy[o];
      this.db[o] += g;
      const off = o * this.ni;
      for (let i = 0; i < this.ni; i++) {
        this.dw[off + i] += g * this.x[i];
        gx[i] += this.w[off + i] * g;
      }
    }
    return gx;
  }
  step(lr: number, t: number) {
    const b1 = 0.9,
      b2 = 0.999,
      eps = 1e-8;
    const bc1 = 1 - Math.pow(b1, t);
    const bc2 = 1 - Math.pow(b2, t);
    for (let i = 0; i < this.w.length; i++) {
      const g = Math.max(-5, Math.min(5, this.dw[i]));
      this.mw[i] = b1 * this.mw[i] + (1 - b1) * g;
      this.vw[i] = b2 * this.vw[i] + (1 - b2) * g * g;
      this.w[i] -= (lr * this.mw[i]) / bc1 / (Math.sqrt(this.vw[i] / bc2) + eps);
      this.dw[i] = 0;
    }
    for (let i = 0; i < this.b.length; i++) {
      const g = Math.max(-5, Math.min(5, this.db[i]));
      this.mb[i] = b1 * this.mb[i] + (1 - b1) * g;
      this.vb[i] = b2 * this.vb[i] + (1 - b2) * g * g;
      this.b[i] -= (lr * this.mb[i]) / bc1 / (Math.sqrt(this.vb[i] / bc2) + eps);
      this.db[i] = 0;
    }
  }
}

function patches(xn: Float32Array) {
  const cat = new Float32Array(IN);
  for (let p = 0; p < N_PATCH; p++) {
    const off = p * STRIDE;
    for (let k = 0; k < P; k++) cat[p * P + k] = xn[Math.min(N - 1, off + k)];
  }
  return cat;
}

/** Trained 8-bin patch encoder — local QPO morphology, not a bag of fluxes. */
export class PatchCNN {
  e1: Dense;
  e2: Dense;
  z: Dense;
  d1: Dense;
  d2: Dense;
  t = 0;
  mean = 0;
  std = 1;
  constructor(rand: () => number) {
    this.e1 = new Dense(IN, 36, 1, rand);
    this.e2 = new Dense(36, 16, 1, rand);
    this.z = new Dense(16, Z, 0.5, rand);
    this.d1 = new Dense(Z, 48, 1, rand);
    this.d2 = new Dense(48, N, 0.5, rand);
  }
  fitNorm(batch: Float32Array[]) {
    let m = 0,
      c = 0;
    for (const x of batch) {
      for (let i = 0; i < x.length; i++) {
        m += x[i];
        c++;
      }
    }
    m /= Math.max(1, c);
    let v = 0;
    for (const x of batch) for (let i = 0; i < x.length; i++) v += (x[i] - m) ** 2;
    this.mean = m;
    this.std = Math.sqrt(v / Math.max(1, c)) + 1e-6;
  }
  private xn(x: Float32Array) {
    const y = new Float32Array(N);
    for (let i = 0; i < N; i++) y[i] = (x[i] - this.mean) / this.std;
    return y;
  }
  encode(xn: Float32Array) {
    const h1 = this.e1.forward(patches(xn), true);
    const h2 = this.e2.forward(h1, true);
    return this.z.forward(h2, false);
  }
  decode(z: Float32Array) {
    return this.d2.forward(this.d1.forward(z, true), false);
  }
  step(x: Float32Array) {
    const xn = this.xn(x);
    const z = this.encode(xn);
    const rec = this.decode(z);
    let mse = 0;
    const dRec = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const e = rec[i] - xn[i];
      mse += e * e;
      dRec[i] = (2 * e) / N;
    }
    mse /= N;
    const gz2 = this.d2.backward(dRec, false);
    const gz = this.d1.backward(gz2, true);
    const dh2 = this.z.backward(gz, false);
    const dh1 = this.e2.backward(dh2, true);
    this.e1.backward(dh1, true);
    this.t += 1;
    const lr = 0.007;
    this.e1.step(lr, this.t);
    this.e2.step(lr, this.t);
    this.z.step(lr, this.t);
    this.d1.step(lr, this.t);
    this.d2.step(lr, this.t);
    return mse;
  }
  infer(x: Float32Array) {
    const xn = this.xn(x);
    const z = this.encode(xn);
    const recN = this.decode(z);
    let mse = 0;
    for (let i = 0; i < N; i++) {
      const e = recN[i] - xn[i];
      mse += e * e;
    }
    return { mse: mse / N, latent: z };
  }
}
