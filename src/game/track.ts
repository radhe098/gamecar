export type Sample = {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  tz: number;
  rx: number;
  rz: number;
  half: number;
  wall: number;
  bank: number;
  dist: number;
  curv: number;
};

export type Gate = {
  si: number;
  x: number;
  y: number;
  z: number;
  nx: number;
  nz: number;
  rx: number;
  rz: number;
  half: number;
};

export type Track = {
  samples: Sample[];
  gates: Gate[];
  length: number;
  startIndex: number;
};

function angDist(a: number, b: number) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function centerAt(t: number): [number, number, number, number] {
  const n1 = Math.exp(-((angDist(t, 1.65) / 0.2) ** 2));
  const n2 = Math.exp(-((angDist(t, 4.15) / 0.34) ** 2));
  const r = 128 + 26 * Math.sin(2 * t) + 14 * Math.cos(3 * t) - 50 * n1 - 24 * n2;
  const y = 3.2 + 6.4 * Math.sin(t + 0.45) + 2.4 * Math.sin(2 * t) + 5.5 * n1;
  return [Math.cos(t) * r * 1.22, y, Math.sin(t) * r, n1 + n2 * 0.65];
}

function buildTrack(): Track {
  const raw: { x: number; y: number; z: number; notch: number }[] = [];
  const NRAW = 420;
  for (let i = 0; i < NRAW; i++) {
    const t = (i / NRAW) * Math.PI * 2;
    const [x, y, z, notch] = centerAt(t);
    raw.push({ x, y, z, notch });
  }

  const cum = [0];
  for (let i = 0; i < NRAW; i++) {
    const a = raw[i];
    const b = raw[(i + 1) % NRAW];
    const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    cum.push(cum[i] + d);
  }
  const length = cum[NRAW];
  const step = 2.4;
  const count = Math.max(8, Math.floor(length / step));

  const pts: { x: number; y: number; z: number; notch: number; dist: number }[] = [];
  for (let i = 0; i < count; i++) {
    const dist = (i / count) * length;
    let lo = 0;
    let hi = NRAW - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid + 1] < dist) lo = mid + 1;
      else hi = mid;
    }
    const span = cum[lo + 1] - cum[lo] || 1;
    const u = (dist - cum[lo]) / span;
    const a = raw[lo];
    const b = raw[(lo + 1) % NRAW];
    pts.push({
      x: a.x + (b.x - a.x) * u,
      y: a.y + (b.y - a.y) * u,
      z: a.z + (b.z - a.z) * u,
      notch: a.notch + (b.notch - a.notch) * u,
      dist,
    });
  }

  const samples: Sample[] = pts.map((p, i) => {
    const n = pts.length;
    const b = pts[(i + 1) % n];
    let tx = b.x - p.x;
    let ty = b.y - p.y;
    let tz = b.z - p.z;
    const mag = Math.hypot(tx, ty, tz) || 1;
    tx /= mag;
    ty /= mag;
    tz /= mag;
    const horiz = Math.hypot(tx, tz) || 1;
    const htx = tx / horiz;
    const htz = tz / horiz;
    return {
      x: p.x,
      y: p.y,
      z: p.z,
      tx,
      ty,
      tz,
      rx: -htz,
      rz: htx,
      half: 10,
      wall: 13,
      bank: 0,
      dist: p.dist,
      curv: 0,
    };
  });

  for (let i = 0; i < samples.length; i++) {
    const n = samples.length;
    const prev = samples[(i - 1 + n) % n];
    const cur = samples[i];
    const cross = prev.tx * cur.tz - prev.tz * cur.tx;
    cur.curv = cross;
    const wide = Math.min(1, Math.abs(cross) * 7 + pts[i].notch);
    cur.half = 9.2 + wide * 5.2;
    cur.wall = cur.half + 2.6;
    cur.bank = Math.max(-0.42, Math.min(0.42, -cross * 6.5));
  }

  const gates: Gate[] = [];
  const gateCount = 8;
  for (let g = 0; g < gateCount; g++) {
    const target = (g / gateCount) * length;
    let si = 0;
    let best = Infinity;
    for (let i = 0; i < samples.length; i++) {
      const d = Math.abs(samples[i].dist - target);
      if (d < best) {
        best = d;
        si = i;
      }
    }
    const s = samples[si];
    gates.push({
      si,
      x: s.x,
      y: s.y,
      z: s.z,
      nx: s.tx,
      nz: s.tz,
      rx: s.rx,
      rz: s.rz,
      half: s.wall + 1.5,
    });
  }

  return {
    samples,
    gates,
    length,
    startIndex: Math.max(6, Math.round(samples.length * 0.018)),
  };
}

export const track = buildTrack();

export function yawFromSample(s: Sample) {
  return Math.atan2(-s.tx, -s.tz);
}
