import { track, yawFromSample, type Sample } from "@/game/track";

export const SKID_MAX = 320;
export const SKID_STRIDE = 7;

export type Rival = {
  name: string;
  color: string;
  accent: string;
  baseSpeed: number;
  offset: number;
  progress: number;
  lap: number;
  speed: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  bank: number;
};

export type Sim = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  pitch: number;
  bank: number;
  speed: number;
  fwd: number;
  lat: number;
  slip: number;
  throttle: number;
  steer: number;
  visualSteer: number;
  drifting: boolean;
  driftCharge: number;
  boost: number;
  shake: number;
  offTrack: boolean;
  sampleIndex: number;
  lastSi: number;
  next: number;
  laps: number;
  lapTime: number;
  raceTime: number;
  lastLap: number;
  bestLap: number | null;
  bestRace: number | null;
  splits: number[];
  progress: number;
  place: number;
  finished: boolean;
  running: boolean;
  wrongWay: boolean;
  wrongT: number;
  banner: string;
  bannerT: number;
  cam: "chase" | "hood";
  muted: boolean;
  menuTime: number;
  reduceMotion: boolean;
  skidData: Float32Array;
  skidWrite: number;
  skidCount: number;
  realKeys: Set<string>;
  injected: Set<string> | null;
  steerOverride: number | null;
  touchLeft: boolean;
  touchRight: boolean;
  touchGas: boolean;
  touchBrake: boolean;
  touchDrift: boolean;
  ai: Rival[];
  resetHeld: boolean;
  driftHeld: boolean;
  stuck: number;
  step: (dt: number) => void;
  reset: () => void;
  respawn: () => void;
  setKeys: (codes: string[]) => void;
  setSteer: (v: number) => void;
};

const ACCEL = 34;
const BRAKE = 46;
const REVERSE = 16;
const MAX_SPEED = 56;
const TURN = 2.35;

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function placeRival(r: Rival) {
  const n = track.samples.length;
  const u = ((r.progress % 1) + 1) % 1;
  const si = Math.min(n - 1, Math.floor(u * n));
  const s = track.samples[si];
  const sway = Math.sin(u * Math.PI * 8 + r.offset) * 1.1 + r.offset;
  r.x = s.x + s.rx * sway;
  r.y = s.y + 0.08;
  r.z = s.z + s.rz * sway;
  r.yaw = yawFromSample(s);
  r.bank = s.bank;
}

function nearest(sim: Sim, x: number, z: number) {
  const s = track.samples;
  const n = s.length;
  const last = sim.sampleIndex;
  let best = last;
  let bestD = Infinity;
  const W = 56;
  for (let k = -W; k <= W; k++) {
    const i = (last + k + n * 8) % n;
    const dx = s[i].x - x;
    const dz = s[i].z - z;
    const d = dx * dx + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  if (bestD > 1600) {
    for (let i = 0; i < n; i++) {
      const dx = s[i].x - x;
      const dz = s[i].z - z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
  }
  return best;
}

function pushSkid(sim: Sim, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, heat: number) {
  const o = sim.skidWrite * SKID_STRIDE;
  const d = sim.skidData;
  d[o] = x1;
  d[o + 1] = y1;
  d[o + 2] = z1;
  d[o + 3] = x2;
  d[o + 4] = y2;
  d[o + 5] = z2;
  d[o + 6] = heat;
  sim.skidWrite = (sim.skidWrite + 1) % SKID_MAX;
  sim.skidCount = Math.min(SKID_MAX, sim.skidCount + 1);
}

const lastL = { x: 0, z: 0, hot: false };
const lastR = { x: 0, z: 0, hot: false };

function crossed(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  gate: { x: number; z: number; nx: number; nz: number; rx: number; rz: number; half: number },
) {
  const da = (ax - gate.x) * gate.nx + (az - gate.z) * gate.nz;
  const db = (bx - gate.x) * gate.nx + (bz - gate.z) * gate.nz;
  if (!(da < 0 && db >= 0)) return false;
  const t = da / (da - db || 1e-6);
  const ix = ax + (bx - ax) * t;
  const iz = az + (bz - az) * t;
  const lat = (ix - gate.x) * gate.rx + (iz - gate.z) * gate.rz;
  return Math.abs(lat) < gate.half;
}

function readInput(sim: Sim) {
  const keys = sim.injected ?? sim.realKeys;
  let steer = 0;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) steer += 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) steer -= 1;
  if (sim.touchLeft) steer += 1;
  if (sim.touchRight) steer -= 1;
  steer = clamp(steer, -1, 1);
  if (sim.steerOverride != null) steer = clamp(sim.steerOverride, -1, 1);

  let throttle = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp") || sim.touchGas) throttle += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown") || sim.touchBrake) throttle -= 1;
  throttle = clamp(throttle, -1, 1);

  const drift =
    keys.has("Space") || keys.has("ShiftLeft") || keys.has("ShiftRight") || sim.touchDrift;
  const reset = keys.has("KeyR");
  return { steer, throttle, drift, reset };
}

function poseOn(sample: Sample, lateral = 0) {
  return {
    x: sample.x + sample.rx * lateral,
    y: sample.y + 0.08,
    z: sample.z + sample.rz * lateral,
    yaw: yawFromSample(sample),
  };
}

export function createSim(): Sim {
  const sim: Sim = {
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vz: 0,
    yaw: 0,
    pitch: 0,
    bank: 0,
    speed: 0,
    fwd: 0,
    lat: 0,
    slip: 0,
    throttle: 0,
    steer: 0,
    visualSteer: 0,
    drifting: false,
    driftCharge: 0,
    boost: 0,
    shake: 0,
    offTrack: false,
    sampleIndex: track.startIndex,
    lastSi: track.startIndex,
    next: 1,
    laps: 0,
    lapTime: 0,
    raceTime: 0,
    lastLap: 0,
    bestLap: null,
    bestRace: null,
    splits: [] as number[],
    progress: 0,
    place: 1,
    finished: false,
    running: false,
    wrongWay: false,
    wrongT: 0,
    banner: "",
    bannerT: 0,
    cam: "chase" as const,
    muted: false,
    menuTime: 0,
    reduceMotion: false,
    skidData: new Float32Array(SKID_MAX * SKID_STRIDE),
    skidWrite: 0,
    skidCount: 0,
    realKeys: new Set<string>(),
    injected: null as Set<string> | null,
    steerOverride: null as number | null,
    touchLeft: false,
    touchRight: false,
    touchGas: false,
    touchBrake: false,
    touchDrift: false,
    ai: [
      { name: "Vesper", color: "#cfc8bc", accent: "#ff4d1a", baseSpeed: 31, offset: -2.1, progress: 0, lap: 0, speed: 0, x: 0, y: 0, z: 0, yaw: 0, bank: 0 },
      { name: "Kite", color: "#23262e", accent: "#f3ede4", baseSpeed: 33.5, offset: 0.4, progress: 0, lap: 0, speed: 0, x: 0, y: 0, z: 0, yaw: 0, bank: 0 },
      { name: "Morrow", color: "#6a4532", accent: "#ffb088", baseSpeed: 29.5, offset: 2.3, progress: 0, lap: 0, speed: 0, x: 0, y: 0, z: 0, yaw: 0, bank: 0 },
    ],
    resetHeld: false,
    driftHeld: false,
    stuck: 0,
    step: () => {},
    reset: () => {},
    respawn: () => {},
    setKeys: () => {},
    setSteer: () => {},
  };

  function respawn() {
    const s = track.samples[sim.lastSi] ?? track.samples[track.startIndex];
    const pose = poseOn(s, 0);
    sim.x = pose.x;
    sim.y = pose.y;
    sim.z = pose.z;
    sim.yaw = pose.yaw;
    sim.vx = s.tx * 18;
    sim.vz = s.tz * 18;
    sim.sampleIndex = sim.lastSi;
    sim.boost = 0;
    sim.driftCharge = 0;
    sim.drifting = false;
    sim.stuck = 0;
    sim.shake = 0.35;
  }

  function reset() {
    const s = track.samples[track.startIndex];
    const pose = poseOn(s, -1.4);
    sim.x = pose.x;
    sim.y = pose.y;
    sim.z = pose.z;
    sim.yaw = pose.yaw;
    sim.vx = 0;
    sim.vz = 0;
    sim.pitch = s.ty;
    sim.bank = s.bank;
    sim.speed = 0;
    sim.fwd = 0;
    sim.lat = 0;
    sim.slip = 0;
    sim.throttle = 0;
    sim.steer = 0;
    sim.visualSteer = 0;
    sim.drifting = false;
    sim.driftCharge = 0;
    sim.boost = 0;
    sim.shake = 0;
    sim.offTrack = false;
    sim.sampleIndex = track.startIndex;
    sim.lastSi = track.startIndex;
    sim.next = 1;
    sim.laps = 0;
    sim.lapTime = 0;
    sim.raceTime = 0;
    sim.lastLap = 0;
    sim.splits = [];
    sim.progress = track.startIndex / track.samples.length;
    sim.place = 1;
    sim.finished = false;
    sim.running = false;
    sim.wrongWay = false;
    sim.wrongT = 0;
    sim.banner = "";
    sim.bannerT = 0;
    sim.skidWrite = 0;
    sim.skidCount = 0;
    sim.skidData.fill(0);
    sim.driftHeld = false;
    sim.stuck = 0;
    lastL.hot = false;
    lastR.hot = false;
    const startU = track.startIndex / track.samples.length;
    sim.ai.forEach((r, i) => {
      r.progress = Math.max(0.002, startU - 0.012 * (i + 1));
      r.lap = 0;
      r.speed = 0;
      placeRival(r);
    });
  }

  function step(dt: number) {
    if (!sim.running || sim.finished) return;
    const input = readInput(sim);
    if (input.reset && !sim.resetHeld) respawn();
    sim.resetHeld = input.reset;

    sim.throttle = input.throttle;
    sim.steer = input.steer;
    sim.visualSteer += (input.steer - sim.visualSteer) * Math.min(1, dt * 10);

    let { vx, vz, yaw } = sim;
    const speedNow = Math.hypot(vx, vz);
    let fvx = -Math.sin(yaw);
    let fvz = -Math.cos(yaw);
    const wantDrift = input.drift && speedNow > 11;

    if (input.throttle > 0) {
      vx += fvx * ACCEL * input.throttle * dt;
      vz += fvz * ACCEL * input.throttle * dt;
    } else if (input.throttle < 0) {
      const fwdNow = vx * fvx + vz * fvz;
      if (fwdNow > 3) {
        vx += fvx * BRAKE * input.throttle * dt;
        vz += fvz * BRAKE * input.throttle * dt;
      } else {
        vx += fvx * REVERSE * input.throttle * dt;
        vz += fvz * REVERSE * input.throttle * dt;
      }
    }

    if (sim.boost > 0) {
      vx += fvx * 28 * dt;
      vz += fvz * 28 * dt;
      sim.boost = Math.max(0, sim.boost - dt);
    }

    const drag = 0.26 + (sim.offTrack ? 1.65 : 0) + (input.throttle > 0 ? 0 : 0.22) + (wantDrift ? 0.7 : 0) - (sim.boost > 0 ? 0.18 : 0);
    const damp = Math.exp(-drag * dt);
    vx *= damp;
    vz *= damp;

    const cap = MAX_SPEED + (sim.boost > 0 ? 10 : 0);
    const sp = Math.hypot(vx, vz);
    if (sp > cap) {
      vx *= cap / sp;
      vz *= cap / sp;
    }

    const fwdBefore = vx * fvx + vz * fvz;
    const speedFactor = clamp(Math.abs(fwdBefore) / 14, 0.22, 1);
    const reverse = fwdBefore >= -0.4 ? 1 : -1;
    // A / ← is steer +1 and must increase yaw while moving forward (chase cam, nose left).
    yaw += input.steer * TURN * (wantDrift ? 1.42 : 1) * speedFactor * reverse * dt;

    fvx = -Math.sin(yaw);
    fvz = -Math.cos(yaw);
    const rvx = Math.cos(yaw);
    const rvz = -Math.sin(yaw);
    let fwd = vx * fvx + vz * fvz;
    let lat = vx * rvx + vz * rvz;
    const drifting = wantDrift && (Math.abs(input.steer) > 0.12 || Math.abs(lat) > 4);
    const grip = drifting ? 2.05 : 9.2;
    lat *= Math.exp(-grip * dt);
    vx = fvx * fwd + rvx * lat;
    vz = fvz * fwd + rvz * lat;

    const prevX = sim.x;
    const prevZ = sim.z;
    let x = sim.x + vx * dt;
    let z = sim.z + vz * dt;

    const si = nearest(sim, x, z);
    const sample = track.samples[si];
    let latOff = (x - sample.x) * sample.rx + (z - sample.z) * sample.rz;
    const limit = sample.wall - 1.15;
    if (Math.abs(latOff) > limit) {
      const sign = latOff >= 0 ? 1 : -1;
      x = sample.x + sample.rx * sign * limit;
      z = sample.z + sample.rz * sign * limit;
      const outward = vx * sample.rx + vz * sample.rz;
      if (outward * sign > 0) {
        vx -= sample.rx * outward;
        vz -= sample.rz * outward;
        vx *= 0.84;
        vz *= 0.84;
      }
      latOff = sign * limit;
    }

    sim.x = x;
    sim.y = sample.y + 0.08;
    sim.z = z;
    sim.vx = vx;
    sim.vz = vz;
    sim.yaw = yaw;
    sim.pitch = Math.atan2(sample.ty, Math.hypot(sample.tx, sample.tz));
    sim.bank = sample.bank;
    sim.sampleIndex = si;
    sim.offTrack = Math.abs(latOff) > sample.half - 0.15;
    fwd = vx * fvx + vz * fvz;
    lat = vx * rvx + vz * rvz;
    sim.fwd = fwd;
    sim.lat = lat;
    sim.slip = Math.abs(lat);
    sim.speed = Math.hypot(vx, vz);
    sim.drifting = drifting && sim.slip > 3.2;

    if (sim.drifting) {
      sim.driftCharge = Math.min(1, sim.driftCharge + dt * (0.28 + sim.slip * 0.018));
    } else if (!(sim.driftHeld && !input.drift)) {
      sim.driftCharge = Math.max(0, sim.driftCharge - dt * 0.42);
    }

    if (sim.driftHeld && !input.drift && sim.driftCharge > 0.42 && sim.speed > 12) {
      const kick = 11 + sim.driftCharge * 16;
      sim.vx += fvx * kick;
      sim.vz += fvz * kick;
      sim.boost = 0.38 + sim.driftCharge * 0.9;
      sim.shake = 1;
      sim.banner = "BOOST";
      sim.bannerT = 0.7;
      sim.driftCharge = 0;
    }
    sim.driftHeld = input.drift;

    const along = vx * sample.tx + vz * sample.tz;
    if (along < -7) sim.wrongT += dt;
    else sim.wrongT = Math.max(0, sim.wrongT - dt * 2);
    sim.wrongWay = sim.wrongT > 0.4;

    const gate = track.gates[sim.next];
    if (crossed(prevX, prevZ, x, z, gate)) {
      sim.lastSi = gate.si;
      if (sim.next === 0) {
        sim.splits.push(sim.lapTime);
        sim.lastLap = sim.lapTime;
        if (sim.bestLap == null || sim.lapTime < sim.bestLap) sim.bestLap = sim.lapTime;
        sim.laps += 1;
        sim.lapTime = 0;
        if (sim.laps >= 3) {
          sim.finished = true;
          sim.running = false;
          if (sim.bestRace == null || sim.raceTime < sim.bestRace) sim.bestRace = sim.raceTime;
          sim.banner = "FINISH";
          sim.bannerT = 2;
        } else {
          sim.banner = `LAP ${sim.laps + 1}`;
          sim.bannerT = 1.4;
        }
      }
      sim.next = (sim.next + 1) % track.gates.length;
    }

    sim.progress = si / track.samples.length;
    sim.raceTime += dt;
    sim.lapTime += dt;
    if (sim.bannerT > 0) sim.bannerT = Math.max(0, sim.bannerT - dt);
    if (sim.shake > 0) sim.shake = Math.max(0, sim.shake - dt * 1.6);

    if (sim.speed < 1.2 && input.throttle > 0) sim.stuck += dt;
    else sim.stuck = 0;
    if (sim.stuck > 2.6) respawn();

    for (let i = 0; i < SKID_MAX; i++) {
      const h = i * SKID_STRIDE + 6;
      sim.skidData[h] *= Math.exp(-0.22 * dt);
    }

    if (sim.drifting) {
      const rearX = x - fvx * 1.35;
      const rearZ = z - fvz * 1.35;
      const y = sim.y + 0.04;
      const tires = [
        { x: rearX - rvx * 0.78, z: rearZ - rvz * 0.78, mem: lastL },
        { x: rearX + rvx * 0.78, z: rearZ + rvz * 0.78, mem: lastR },
      ];
      for (const tire of tires) {
        if (!tire.mem.hot) {
          tire.mem.x = tire.x;
          tire.mem.z = tire.z;
          tire.mem.hot = true;
        } else {
          const dx = tire.x - tire.mem.x;
          const dz = tire.z - tire.mem.z;
          if (dx * dx + dz * dz > 0.45) {
            pushSkid(sim, tire.mem.x, y, tire.mem.z, tire.x, y, tire.z, 0.55 + sim.driftCharge * 0.6);
            tire.mem.x = tire.x;
            tire.mem.z = tire.z;
          }
        }
      }
    } else {
      lastL.hot = false;
      lastR.hot = false;
    }

    let place = 1;
    const mine = sim.laps + sim.progress;
    for (const r of sim.ai) {
      const siA = Math.min(track.samples.length - 1, Math.floor((((r.progress % 1) + 1) % 1) * track.samples.length));
      const curv = Math.abs(track.samples[siA].curv);
      const notchSlow = track.samples[siA].half > 12 ? 0.08 : 0;
      const target = r.baseSpeed * (1 - Math.min(0.48, curv * 9) - notchSlow);
      r.speed += (target - r.speed) * Math.min(1, dt * 1.6);
      r.progress += (r.speed * dt) / track.length;
      if (r.progress >= 1) {
        r.progress -= 1;
        r.lap += 1;
      }
      placeRival(r);
      if (r.lap + r.progress > mine + 0.004) place += 1;
    }
    sim.place = place;
  }

  sim.step = step;
  sim.reset = reset;
  sim.respawn = respawn;
  sim.setKeys = (codes: string[]) => {
    sim.injected = codes.length ? new Set(codes) : null;
    sim.steerOverride = null;
  };
  sim.setSteer = (v: number) => {
    sim.steerOverride = v;
  };

  reset();
  return sim;
}

export function formatTime(seconds: number | null) {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rem = s - m * 60;
  const whole = Math.floor(rem);
  const frac = Math.floor((rem - whole) * 100);
  return `${m}:${String(whole).padStart(2, "0")}.${String(frac).padStart(2, "0")}`;
}

export function ordinal(n: number) {
  if (n === 1) return "1ST";
  if (n === 2) return "2ND";
  if (n === 3) return "3RD";
  return `${n}TH`;
}

const SAVE_KEY = "cinderline-v1";

export type Save = { v: 1; bestLap: number | null; bestRace: number | null; muted: boolean };

export function loadSave(): Save {
  const blank: Save = { v: 1, bestLap: null, bestRace: null, muted: false };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return blank;
    const parsed = JSON.parse(raw) as Partial<Save>;
    if (parsed.v !== 1) return blank;
    return {
      v: 1,
      bestLap: typeof parsed.bestLap === "number" ? parsed.bestLap : null,
      bestRace: typeof parsed.bestRace === "number" ? parsed.bestRace : null,
      muted: Boolean(parsed.muted),
    };
  } catch {
    return blank;
  }
}

export function writeSave(save: Save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    /* ignore quota */
  }
}
