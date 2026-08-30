import { randn } from "./rng";
import { N } from "./lightcurve";

const H1 = 48;
const H2 = 24;
const Z = 8;

function relu(x: number) {
  return x > 0 ? x : 0;
}
function drelu(x: number) {
  return x > 0 ? 1 : 0;
}

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
    const { ni, no, w, b } = this;
    for (let o = 0; o < no; o++) {
      let s = b[o];
      const off = o * ni;
      for (let i = 0; i < ni; i++) s += w[off + i] * x[i];
      y[o] = act ? relu(s) : s;
    }
    return y;
  }
  backward(gy: Float32Array, act: boolean) {
    const { ni, no, w, x, pre } = this;
    const gx = new Float32Array(ni);
    for (let o = 0; o < no; o++) {
      const g = act ? gy[o] * drelu(pre[o]) : gy[o];
      this.db[o] += g;
      const off = o * ni;
      for (let i = 0; i < ni; i++) {
        this.dw[off + i] += g * x[i];
        gx[i] += w[off + i] * g;
      }
    }
    return gx;
  }
  step(lr: number, t: number, beta1 = 0.9, beta2 = 0.999) {
    const bc1 = 1 - Math.pow(beta1, t);
    const bc2 = 1 - Math.pow(beta2, t);
    const eps = 1e-8;
    const clip = 5;
    for (let i = 0; i < this.w.length; i++) {
      const g = Math.max(-clip, Math.min(clip, this.dw[i]));
      this.mw[i] = beta1 * this.mw[i] + (1 - beta1) * g;
      this.vw[i] = beta2 * this.vw[i] + (1 - beta2) * g * g;
      this.w[i] -= (lr * this.mw[i]) / bc1 / (Math.sqrt(this.vw[i] / bc2) + eps);
      this.dw[i] = 0;
    }
    for (let i = 0; i < this.b.length; i++) {
      const g = Math.max(-clip, Math.min(clip, this.db[i]));
      this.mb[i] = beta1 * this.mb[i] + (1 - beta1) * g;
      this.vb[i] = beta2 * this.vb[i] + (1 - beta2) * g * g;
      this.b[i] -= (lr * this.mb[i]) / bc1 / (Math.sqrt(this.vb[i] / bc2) + eps);
      this.db[i] = 0;
    }
  }
}

export class BetaVAE {
  e1: Dense;
  e2: Dense;
  mu: Dense;
  lv: Dense;
  d1: Dense;
  d2: Dense;
  d3: Dense;
  t = 0;
  mean = 0;
  std = 1;
  constructor(rand: () => number) {
    this.e1 = new Dense(N, H1, 1, rand);
    this.e2 = new Dense(H1, H2, 1, rand);
    this.mu = new Dense(H2, Z, 0.5, rand);
    this.lv = new Dense(H2, Z, 0.5, rand);
    this.d1 = new Dense(Z, H2, 1, rand);
    this.d2 = new Dense(H2, H1, 1, rand);
    this.d3 = new Dense(H1, N, 0.5, rand);
  }
  fitNorm(batch: Float32Array[]) {
    let m = 0;
    let c = 0;
    for (const x of batch) {
      for (let i = 0; i < x.length; i++) {
        m += x[i];
        c++;
      }
    }
    m /= c;
    let v = 0;
    for (const x of batch) {
      for (let i = 0; i < x.length; i++) {
        const d = x[i] - m;
        v += d * d;
      }
    }
    this.mean = m;
    this.std = Math.sqrt(v / c) + 1e-6;
  }
  normalize(x: Float32Array) {
    const y = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) y[i] = (x[i] - this.mean) / this.std;
    return y;
  }
  denorm(x: Float32Array) {
    const y = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) y[i] = x[i] * this.std + this.mean;
    return y;
  }
  encode(xn: Float32Array) {
    const h1 = this.e1.forward(xn, true);
    const h2 = this.e2.forward(h1, true);
    const mu = this.mu.forward(h2, false);
    const lv = this.lv.forward(h2, false);
    return { mu, lv, h2 };
  }
  decode(z: Float32Array) {
    const a = this.d1.forward(z, true);
    const b = this.d2.forward(a, true);
    return this.d3.forward(b, false);
  }
  step(x: Float32Array, beta: number, rand: () => number) {
    const xn = this.normalize(x);
    const { mu, lv } = this.encode(xn);
    const z = new Float32Array(Z);
    const std = new Float32Array(Z);
    const eps = new Float32Array(Z);
    let kl = 0;
    for (let i = 0; i < Z; i++) {
      const logv = Math.max(-8, Math.min(4, lv[i]));
      std[i] = Math.exp(0.5 * logv);
      eps[i] = randn(rand);
      z[i] = mu[i] + std[i] * eps[i];
      kl += -0.5 * (1 + logv - mu[i] * mu[i] - Math.exp(logv));
    }
    kl /= Z;
    const rec = this.decode(z);
    let mse = 0;
    const dRec = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const e = rec[i] - xn[i];
      mse += e * e;
      dRec[i] = (2 * e) / N;
    }
    mse /= N;

    const physLambda = 0.06;
    let phys = 0;
    for (let i = 1; i < N; i++) {
      const d = rec[i] - rec[i - 1];
      phys += d * d;
      dRec[i] += (physLambda * 2 * d) / N;
      dRec[i - 1] -= (physLambda * 2 * d) / N;
    }
    phys /= N;
    for (let i = 0; i < N; i++) {
      const f = rec[i] * this.std + this.mean;
      if (f < 0) {
        phys += f * f;
        dRec[i] += (physLambda * 2 * f * this.std) / N;
      }
    }

    const gz = this.d3.backward(dRec, false);
    const gz2 = this.d2.backward(gz, true);
    const gz3 = this.d1.backward(gz2, true);

    const dMu = new Float32Array(Z);
    const dLv = new Float32Array(Z);
    for (let i = 0; i < Z; i++) {
      dMu[i] = gz3[i] + (beta * mu[i]) / Z;
      const logv = Math.max(-8, Math.min(4, lv[i]));
      dLv[i] = gz3[i] * std[i] * eps[i] * 0.5 + (beta * 0.5 * (Math.exp(logv) - 1)) / Z;
    }
    const dhA = this.mu.backward(dMu, false);
    const dhB = this.lv.backward(dLv, false);
    const dh = new Float32Array(H2);
    for (let i = 0; i < H2; i++) dh[i] = dhA[i] + dhB[i];
    const dh1 = this.e2.backward(dh, true);
    this.e1.backward(dh1, true);

    this.t += 1;
    const lr = 0.006;
    this.e1.step(lr, this.t);
    this.e2.step(lr, this.t);
    this.mu.step(lr, this.t);
    this.lv.step(lr, this.t);
    this.d1.step(lr, this.t);
    this.d2.step(lr, this.t);
    this.d3.step(lr, this.t);

    return { mse, kl, phys, total: mse + beta * kl + physLambda * phys };
  }
  infer(x: Float32Array) {
    const xn = this.normalize(x);
    const { mu } = this.encode(xn);
    const recN = this.decode(mu);
    const rec = this.denorm(recN);
    let mse = 0;
    for (let i = 0; i < N; i++) {
      const e = recN[i] - xn[i];
      mse += e * e;
    }
    mse /= N;
    return { recon: rec, latent: mu, mse };
  }
}

export { Z as LATENT_DIM };
