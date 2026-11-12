import { i as __toESM } from "../_runtime.mjs";
import { J as require_jsx_runtime, Y as require_react } from "../_libs/@react-three/fiber+[...].mjs";
import { a as Play, i as RotateCcw, n as Volume2, o as Pause, s as Camera, t as VolumeX } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BVPd1B5d.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
function angDist(a, b) {
	return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}
function centerAt(t) {
	const n1 = Math.exp(-((angDist(t, 1.65) / .2) ** 2));
	const n2 = Math.exp(-((angDist(t, 4.15) / .34) ** 2));
	const r = 128 + 26 * Math.sin(2 * t) + 14 * Math.cos(3 * t) - 50 * n1 - 24 * n2;
	const y = 3.2 + 6.4 * Math.sin(t + .45) + 2.4 * Math.sin(2 * t) + 5.5 * n1;
	return [
		Math.cos(t) * r * 1.22,
		y,
		Math.sin(t) * r,
		n1 + n2 * .65
	];
}
function buildTrack() {
	const raw = [];
	const NRAW = 420;
	for (let i = 0; i < NRAW; i++) {
		const [x, y, z, notch] = centerAt(i / NRAW * Math.PI * 2);
		raw.push({
			x,
			y,
			z,
			notch
		});
	}
	const cum = [0];
	for (let i = 0; i < NRAW; i++) {
		const a = raw[i];
		const b = raw[(i + 1) % NRAW];
		const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
		cum.push(cum[i] + d);
	}
	const length = cum[NRAW];
	const count = Math.max(8, Math.floor(length / 2.4));
	const pts = [];
	for (let i = 0; i < count; i++) {
		const dist = i / count * length;
		let lo = 0;
		let hi = 419;
		while (lo < hi) {
			const mid = lo + hi >> 1;
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
			dist
		});
	}
	const samples = pts.map((p, i) => {
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
			curv: 0
		};
	});
	for (let i = 0; i < samples.length; i++) {
		const n = samples.length;
		const prev = samples[(i - 1 + n) % n];
		const cur = samples[i];
		const cross = prev.tx * cur.tz - prev.tz * cur.tx;
		cur.curv = cross;
		cur.half = 9.2 + Math.min(1, Math.abs(cross) * 7 + pts[i].notch) * 5.2;
		cur.wall = cur.half + 2.6;
		cur.bank = Math.max(-.42, Math.min(.42, -cross * 6.5));
	}
	const gates = [];
	const gateCount = 8;
	for (let g = 0; g < gateCount; g++) {
		const target = g / gateCount * length;
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
			half: s.wall + 1.5
		});
	}
	return {
		samples,
		gates,
		length,
		startIndex: Math.max(6, Math.round(samples.length * .018))
	};
}
var track = buildTrack();
function yawFromSample(s) {
	return Math.atan2(-s.tx, -s.tz);
}
var ACCEL = 34;
var BRAKE = 46;
var REVERSE = 16;
var MAX_SPEED = 56;
var TURN = 2.35;
function clamp(v, a, b) {
	return Math.max(a, Math.min(b, v));
}
function placeRival(r) {
	const n = track.samples.length;
	const u = (r.progress % 1 + 1) % 1;
	const si = Math.min(n - 1, Math.floor(u * n));
	const s = track.samples[si];
	const sway = Math.sin(u * Math.PI * 8 + r.offset) * 1.1 + r.offset;
	r.x = s.x + s.rx * sway;
	r.y = s.y + .08;
	r.z = s.z + s.rz * sway;
	r.yaw = yawFromSample(s);
	r.bank = s.bank;
}
function nearest(sim, x, z) {
	const s = track.samples;
	const n = s.length;
	const last = sim.sampleIndex;
	let best = last;
	let bestD = Infinity;
	const W = 56;
	for (let k = -56; k <= W; k++) {
		const i = (last + k + n * 8) % n;
		const dx = s[i].x - x;
		const dz = s[i].z - z;
		const d = dx * dx + dz * dz;
		if (d < bestD) {
			bestD = d;
			best = i;
		}
	}
	if (bestD > 1600) for (let i = 0; i < n; i++) {
		const dx = s[i].x - x;
		const dz = s[i].z - z;
		const d = dx * dx + dz * dz;
		if (d < bestD) {
			bestD = d;
			best = i;
		}
	}
	return best;
}
function pushSkid(sim, x1, y1, z1, x2, y2, z2, heat) {
	const o = sim.skidWrite * 7;
	const d = sim.skidData;
	d[o] = x1;
	d[o + 1] = y1;
	d[o + 2] = z1;
	d[o + 3] = x2;
	d[o + 4] = y2;
	d[o + 5] = z2;
	d[o + 6] = heat;
	sim.skidWrite = (sim.skidWrite + 1) % 320;
	sim.skidCount = Math.min(320, sim.skidCount + 1);
}
var lastL = {
	x: 0,
	z: 0,
	hot: false
};
var lastR = {
	x: 0,
	z: 0,
	hot: false
};
function crossed(ax, az, bx, bz, gate) {
	const da = (ax - gate.x) * gate.nx + (az - gate.z) * gate.nz;
	const db = (bx - gate.x) * gate.nx + (bz - gate.z) * gate.nz;
	if (!(da < 0 && db >= 0)) return false;
	const t = da / (da - db || 1e-6);
	const ix = ax + (bx - ax) * t;
	const iz = az + (bz - az) * t;
	const lat = (ix - gate.x) * gate.rx + (iz - gate.z) * gate.rz;
	return Math.abs(lat) < gate.half;
}
function readInput(sim) {
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
	const drift = keys.has("Space") || keys.has("ShiftLeft") || keys.has("ShiftRight") || sim.touchDrift;
	const reset = keys.has("KeyR");
	return {
		steer,
		throttle,
		drift,
		reset
	};
}
function poseOn(sample, lateral = 0) {
	return {
		x: sample.x + sample.rx * lateral,
		y: sample.y + .08,
		z: sample.z + sample.rz * lateral,
		yaw: yawFromSample(sample)
	};
}
function createSim() {
	const sim = {
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
		splits: [],
		progress: 0,
		place: 1,
		finished: false,
		running: false,
		wrongWay: false,
		wrongT: 0,
		banner: "",
		bannerT: 0,
		cam: "chase",
		muted: false,
		menuTime: 0,
		reduceMotion: false,
		skidData: /* @__PURE__ */ new Float32Array(2240),
		skidWrite: 0,
		skidCount: 0,
		realKeys: /* @__PURE__ */ new Set(),
		injected: null,
		steerOverride: null,
		touchLeft: false,
		touchRight: false,
		touchGas: false,
		touchBrake: false,
		touchDrift: false,
		ai: [
			{
				name: "Vesper",
				color: "#cfc8bc",
				accent: "#ff4d1a",
				baseSpeed: 31,
				offset: -2.1,
				progress: 0,
				lap: 0,
				speed: 0,
				x: 0,
				y: 0,
				z: 0,
				yaw: 0,
				bank: 0
			},
			{
				name: "Kite",
				color: "#23262e",
				accent: "#f3ede4",
				baseSpeed: 33.5,
				offset: .4,
				progress: 0,
				lap: 0,
				speed: 0,
				x: 0,
				y: 0,
				z: 0,
				yaw: 0,
				bank: 0
			},
			{
				name: "Morrow",
				color: "#6a4532",
				accent: "#ffb088",
				baseSpeed: 29.5,
				offset: 2.3,
				progress: 0,
				lap: 0,
				speed: 0,
				x: 0,
				y: 0,
				z: 0,
				yaw: 0,
				bank: 0
			}
		],
		resetHeld: false,
		driftHeld: false,
		stuck: 0,
		step: () => {},
		reset: () => {},
		respawn: () => {},
		setKeys: () => {},
		setSteer: () => {}
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
		sim.shake = .35;
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
			r.progress = Math.max(.002, startU - .012 * (i + 1));
			r.lap = 0;
			r.speed = 0;
			placeRival(r);
		});
	}
	function step(dt) {
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
			if (vx * fvx + vz * fvz > 3) {
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
		const drag = .26 + (sim.offTrack ? 1.65 : 0) + (input.throttle > 0 ? 0 : .22) + (wantDrift ? .7 : 0) - (sim.boost > 0 ? .18 : 0);
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
		const speedFactor = clamp(Math.abs(fwdBefore) / 14, .22, 1);
		const reverse = fwdBefore >= -.4 ? 1 : -1;
		yaw += input.steer * TURN * (wantDrift ? 1.42 : 1) * speedFactor * reverse * dt;
		fvx = -Math.sin(yaw);
		fvz = -Math.cos(yaw);
		const rvx = Math.cos(yaw);
		const rvz = -Math.sin(yaw);
		let fwd = vx * fvx + vz * fvz;
		let lat = vx * rvx + vz * rvz;
		const drifting = wantDrift && (Math.abs(input.steer) > .12 || Math.abs(lat) > 4);
		lat *= Math.exp(-(drifting ? 2.05 : 9.2) * dt);
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
				vx *= .84;
				vz *= .84;
			}
			latOff = sign * limit;
		}
		sim.x = x;
		sim.y = sample.y + .08;
		sim.z = z;
		sim.vx = vx;
		sim.vz = vz;
		sim.yaw = yaw;
		sim.pitch = Math.atan2(sample.ty, Math.hypot(sample.tx, sample.tz));
		sim.bank = sample.bank;
		sim.sampleIndex = si;
		sim.offTrack = Math.abs(latOff) > sample.half - .15;
		fwd = vx * fvx + vz * fvz;
		lat = vx * rvx + vz * rvz;
		sim.fwd = fwd;
		sim.lat = lat;
		sim.slip = Math.abs(lat);
		sim.speed = Math.hypot(vx, vz);
		sim.drifting = drifting && sim.slip > 3.2;
		if (sim.drifting) sim.driftCharge = Math.min(1, sim.driftCharge + dt * (.28 + sim.slip * .018));
		else if (!(sim.driftHeld && !input.drift)) sim.driftCharge = Math.max(0, sim.driftCharge - dt * .42);
		if (sim.driftHeld && !input.drift && sim.driftCharge > .42 && sim.speed > 12) {
			const kick = 11 + sim.driftCharge * 16;
			sim.vx += fvx * kick;
			sim.vz += fvz * kick;
			sim.boost = .38 + sim.driftCharge * .9;
			sim.shake = 1;
			sim.banner = "BOOST";
			sim.bannerT = .7;
			sim.driftCharge = 0;
		}
		sim.driftHeld = input.drift;
		if (vx * sample.tx + vz * sample.tz < -7) sim.wrongT += dt;
		else sim.wrongT = Math.max(0, sim.wrongT - dt * 2);
		sim.wrongWay = sim.wrongT > .4;
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
		for (let i = 0; i < 320; i++) {
			const h = i * 7 + 6;
			sim.skidData[h] *= Math.exp(-.22 * dt);
		}
		if (sim.drifting) {
			const rearX = x - fvx * 1.35;
			const rearZ = z - fvz * 1.35;
			const y = sim.y + .04;
			const tires = [{
				x: rearX - rvx * .78,
				z: rearZ - rvz * .78,
				mem: lastL
			}, {
				x: rearX + rvx * .78,
				z: rearZ + rvz * .78,
				mem: lastR
			}];
			for (const tire of tires) if (!tire.mem.hot) {
				tire.mem.x = tire.x;
				tire.mem.z = tire.z;
				tire.mem.hot = true;
			} else {
				const dx = tire.x - tire.mem.x;
				const dz = tire.z - tire.mem.z;
				if (dx * dx + dz * dz > .45) {
					pushSkid(sim, tire.mem.x, y, tire.mem.z, tire.x, y, tire.z, .55 + sim.driftCharge * .6);
					tire.mem.x = tire.x;
					tire.mem.z = tire.z;
				}
			}
		} else {
			lastL.hot = false;
			lastR.hot = false;
		}
		let place = 1;
		const mine = sim.laps + sim.progress;
		for (const r of sim.ai) {
			const siA = Math.min(track.samples.length - 1, Math.floor((r.progress % 1 + 1) % 1 * track.samples.length));
			const curv = Math.abs(track.samples[siA].curv);
			const notchSlow = track.samples[siA].half > 12 ? .08 : 0;
			const target = r.baseSpeed * (1 - Math.min(.48, curv * 9) - notchSlow);
			r.speed += (target - r.speed) * Math.min(1, dt * 1.6);
			r.progress += r.speed * dt / track.length;
			if (r.progress >= 1) {
				r.progress -= 1;
				r.lap += 1;
			}
			placeRival(r);
			if (r.lap + r.progress > mine + .004) place += 1;
		}
		sim.place = place;
	}
	sim.step = step;
	sim.reset = reset;
	sim.respawn = respawn;
	sim.setKeys = (codes) => {
		sim.injected = codes.length ? new Set(codes) : null;
		sim.steerOverride = null;
	};
	sim.setSteer = (v) => {
		sim.steerOverride = v;
	};
	reset();
	return sim;
}
function formatTime(seconds) {
	if (seconds == null || !Number.isFinite(seconds)) return "—";
	const s = Math.max(0, seconds);
	const m = Math.floor(s / 60);
	const rem = s - m * 60;
	const whole = Math.floor(rem);
	const frac = Math.floor((rem - whole) * 100);
	return `${m}:${String(whole).padStart(2, "0")}.${String(frac).padStart(2, "0")}`;
}
function ordinal(n) {
	if (n === 1) return "1ST";
	if (n === 2) return "2ND";
	if (n === 3) return "3RD";
	return `${n}TH`;
}
var SAVE_KEY = "cinderline-v1";
function loadSave() {
	const blank = {
		v: 1,
		bestLap: null,
		bestRace: null,
		muted: false
	};
	try {
		const raw = localStorage.getItem(SAVE_KEY);
		if (!raw) return blank;
		const parsed = JSON.parse(raw);
		if (parsed.v !== 1) return blank;
		return {
			v: 1,
			bestLap: typeof parsed.bestLap === "number" ? parsed.bestLap : null,
			bestRace: typeof parsed.bestRace === "number" ? parsed.bestRace : null,
			muted: Boolean(parsed.muted)
		};
	} catch {
		return blank;
	}
}
function writeSave(save) {
	try {
		localStorage.setItem(SAVE_KEY, JSON.stringify(save));
	} catch {}
}
function createAudio() {
	let ctx = null;
	let osc = null;
	let filter = null;
	let gain = null;
	let noiseGain = null;
	let started = false;
	function unlock() {
		const AC = window.AudioContext || window.webkitAudioContext;
		if (!AC) return;
		if (!ctx) ctx = new AC();
		if (ctx.state === "suspended") ctx.resume();
		if (started) return;
		osc = ctx.createOscillator();
		osc.type = "sawtooth";
		filter = ctx.createBiquadFilter();
		filter.type = "lowpass";
		filter.frequency.value = 420;
		gain = ctx.createGain();
		gain.gain.value = 0;
		osc.connect(filter);
		filter.connect(gain);
		gain.connect(ctx.destination);
		osc.start();
		const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
		const noise = ctx.createBufferSource();
		noise.buffer = buffer;
		noise.loop = true;
		const band = ctx.createBiquadFilter();
		band.type = "bandpass";
		band.frequency.value = 900;
		band.Q.value = .7;
		noiseGain = ctx.createGain();
		noiseGain.gain.value = 0;
		noise.connect(band);
		band.connect(noiseGain);
		noiseGain.connect(ctx.destination);
		noise.start();
		started = true;
	}
	function update(sim) {
		if (!ctx || !osc || !filter || !gain || !noiseGain) return;
		const audible = sim.running && !sim.muted;
		const speed = Math.hypot(sim.vx, sim.vz);
		const targetGain = audible ? Math.min(.07, .02 + Math.abs(sim.throttle) * .03 + speed * 6e-4) : 0;
		const freq = 48 + speed * 2.4 + Math.max(0, sim.throttle) * 28 + (sim.boost > 0 ? 30 : 0);
		const now = ctx.currentTime;
		osc.frequency.setTargetAtTime(freq, now, .05);
		filter.frequency.setTargetAtTime(380 + speed * 18, now, .08);
		gain.gain.setTargetAtTime(targetGain, now, .05);
		const screech = audible && sim.drifting ? Math.min(.045, sim.slip * .0018) : 0;
		noiseGain.gain.setTargetAtTime(screech, now, .04);
	}
	return {
		unlock,
		update
	};
}
var BLOCK = /* @__PURE__ */ new Set([
	"Space",
	"ArrowUp",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight"
]);
function DriftApp() {
	const simRef = (0, import_react.useRef)(null);
	if (!simRef.current) simRef.current = createSim();
	const sim = simRef.current;
	const audioRef = (0, import_react.useRef)(null);
	if (!audioRef.current) audioRef.current = createAudio();
	const [phase, setPhase] = (0, import_react.useState)("menu");
	const phaseRef = (0, import_react.useRef)("menu");
	const [records, setRecords] = (0, import_react.useState)({
		v: 1,
		bestLap: null,
		bestRace: null,
		muted: false
	});
	const [splits, setSplits] = (0, import_react.useState)([]);
	const [SceneComp, setSceneComp] = (0, import_react.useState)(null);
	const [sceneError, setSceneError] = (0, import_react.useState)("");
	const finishLatch = (0, import_react.useRef)(false);
	const lapRef = (0, import_react.useRef)(null);
	const timeRef = (0, import_react.useRef)(null);
	const bestRef = (0, import_react.useRef)(null);
	const placeRef = (0, import_react.useRef)(null);
	const speedRef = (0, import_react.useRef)(null);
	const driftRef = (0, import_react.useRef)(null);
	const bannerRef = (0, import_react.useRef)(null);
	const wrongRef = (0, import_react.useRef)(null);
	const vignetteRef = (0, import_react.useRef)(null);
	const glowRef = (0, import_react.useRef)(null);
	const mapRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const save = loadSave();
		sim.bestLap = save.bestLap;
		sim.bestRace = save.bestRace;
		sim.muted = save.muted;
		sim.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		setRecords(save);
	}, [sim]);
	(0, import_react.useEffect)(() => {
		let live = true;
		import("./Scene-Bqse2z3S.mjs").then((m) => {
			if (live) setSceneComp(() => m.Scene);
		}).catch((err) => {
			if (live) setSceneError(err instanceof Error ? err.message : "The circuit failed to load.");
		});
		return () => {
			live = false;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		if (new URLSearchParams(window.location.search).has("qa")) window.__controlsTest = {
			getYaw: () => sim.yaw,
			getSpeed: () => Math.hypot(sim.vx, sim.vz),
			setKeys: (codes) => sim.setKeys(codes),
			setSteer: (v) => sim.setSteer(v)
		};
		const down = (e) => {
			if (BLOCK.has(e.code)) e.preventDefault();
			if (e.repeat) return;
			sim.realKeys.add(e.code);
			if (e.code === "KeyP" || e.code === "Escape") togglePause();
			if (e.code === "KeyC") sim.cam = sim.cam === "chase" ? "hood" : "chase";
			if (e.code === "KeyM") toggleMute();
		};
		const up = (e) => {
			sim.realKeys.delete(e.code);
		};
		const clear = () => sim.realKeys.clear();
		window.addEventListener("keydown", down);
		window.addEventListener("keyup", up);
		window.addEventListener("blur", clear);
		document.addEventListener("visibilitychange", () => {
			if (document.hidden) clear();
		});
		let raf = 0;
		let last = performance.now();
		let acc = 0;
		const step = 1 / 60;
		const loop = (now) => {
			raf = requestAnimationFrame(loop);
			let frame = (now - last) / 1e3;
			last = now;
			if (frame > .1) frame = .1;
			sim.menuTime += frame;
			if (sim.running) {
				acc += frame;
				if (acc > .1) acc = .1;
				let guard = 0;
				while (acc >= step && guard++ < 4) {
					sim.step(step);
					acc -= step;
				}
			} else acc = 0;
			paintHud(sim);
			audioRef.current?.update(sim);
			if (sim.finished && !finishLatch.current) {
				finishLatch.current = true;
				phaseRef.current = "done";
				setPhase("done");
				setSplits(sim.splits.slice());
				const save = {
					v: 1,
					bestLap: sim.bestLap,
					bestRace: sim.bestRace,
					muted: sim.muted
				};
				writeSave(save);
				setRecords(save);
			}
		};
		raf = requestAnimationFrame(loop);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("keydown", down);
			window.removeEventListener("keyup", up);
			window.removeEventListener("blur", clear);
		};
	}, [sim]);
	function paintHud(current) {
		const show = phaseRef.current === "race" || phaseRef.current === "paused";
		if (lapRef.current) lapRef.current.textContent = show ? `${Math.min(current.laps + 1, 3)} / 3` : "";
		if (timeRef.current) timeRef.current.textContent = show ? formatTime(current.raceTime) : "";
		if (bestRef.current) bestRef.current.textContent = show ? `BEST ${formatTime(current.bestLap)}` : "";
		if (placeRef.current) placeRef.current.textContent = show ? ordinal(current.place) : "";
		if (speedRef.current) speedRef.current.textContent = show ? String(Math.round(current.speed * 3.6)) : "";
		if (driftRef.current) {
			driftRef.current.style.transform = `scaleX(${current.driftCharge})`;
			driftRef.current.style.background = current.driftCharge > .72 ? "var(--color-fg)" : "var(--color-primary)";
		}
		if (bannerRef.current) {
			const text = current.bannerT > 0 ? current.banner : "";
			bannerRef.current.textContent = text;
			bannerRef.current.style.opacity = text ? "1" : "0";
		}
		if (wrongRef.current) {
			const on = current.running && current.wrongWay;
			wrongRef.current.style.opacity = on ? String(.45 + .55 * Math.abs(Math.sin(current.raceTime * 8))) : "0";
		}
		if (vignetteRef.current) vignetteRef.current.style.opacity = show ? String(Math.min(.72, current.speed / 70)) : "0";
		if (glowRef.current) {
			const hot = current.drifting ? .35 + current.driftCharge * .65 : current.boost > 0 ? .8 : 0;
			glowRef.current.style.opacity = String(hot);
		}
		const map = mapRef.current;
		if (map && show) drawMap(map, current);
	}
	function togglePause() {
		if (phaseRef.current === "menu" || phaseRef.current === "done" || sim.finished) return;
		if (phaseRef.current === "paused") {
			sim.running = true;
			phaseRef.current = "race";
			setPhase("race");
		} else if (sim.running) {
			sim.running = false;
			phaseRef.current = "paused";
			setPhase("paused");
		}
	}
	function toggleMute() {
		sim.muted = !sim.muted;
		const save = {
			v: 1,
			bestLap: sim.bestLap,
			bestRace: sim.bestRace,
			muted: sim.muted
		};
		writeSave(save);
		setRecords(save);
	}
	function start() {
		audioRef.current?.unlock();
		finishLatch.current = false;
		sim.reset();
		sim.bestLap = records.bestLap;
		sim.bestRace = records.bestRace;
		sim.muted = records.muted;
		sim.running = true;
		sim.banner = "GO";
		sim.bannerT = 1.2;
		phaseRef.current = "race";
		setPhase("race");
	}
	function restart() {
		audioRef.current?.unlock();
		finishLatch.current = false;
		sim.reset();
		sim.running = true;
		sim.banner = "GO";
		sim.bannerT = 1.2;
		phaseRef.current = "race";
		setPhase("race");
	}
	function backToMenu() {
		finishLatch.current = false;
		sim.reset();
		sim.running = false;
		phaseRef.current = "menu";
		setPhase("menu");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "relative h-dvh w-full overflow-hidden bg-bg text-fg select-none",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0",
				children: SceneComp ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SceneComp, { sim }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-full w-full bg-bg" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: vignetteRef,
				className: "pointer-events-none absolute inset-0 opacity-0",
				style: { background: "radial-gradient(ellipse at center, transparent 42%, var(--color-bg) 100%)" }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: glowRef,
				className: "pointer-events-none absolute inset-x-0 bottom-0 h-40 opacity-0",
				style: { background: "linear-gradient(to top, color-mix(in oklab, var(--color-primary) 55%, transparent), transparent)" }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				ref: bannerRef,
				className: "pointer-events-none absolute top-[16%] left-1/2 z-10 -translate-x-1/2 font-display text-5xl tracking-wide text-primary opacity-0 sm:text-6xl"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				ref: wrongRef,
				className: "pointer-events-none absolute top-[26%] left-1/2 z-10 -translate-x-1/2 font-display text-3xl tracking-widest text-fg opacity-0",
				children: "WRONG WAY"
			}),
			(phase === "race" || phase === "paused") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 pb-28 md:p-5 md:pb-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-xs tracking-widest text-muted",
							children: "LAP"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							ref: lapRef,
							className: "font-display text-4xl leading-none tracking-wide"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							ref: timeRef,
							className: "mt-1 font-display text-xl leading-none text-primary-soft tabular-nums"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							ref: bestRef,
							className: "mt-1 text-xs tracking-wide text-muted tabular-nums"
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col items-end gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "pointer-events-auto flex gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "md:hidden",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
											label: "Rescue",
											onClick: () => sim.respawn(),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-5" })
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
										label: records.muted ? "Unmute" : "Mute",
										onClick: toggleMute,
										children: records.muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-5" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
										label: "Camera",
										onClick: () => {
											sim.cam = sim.cam === "chase" ? "hood" : "chase";
										},
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "size-5" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
										label: "Pause",
										onClick: togglePause,
										children: phase === "paused" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-5" })
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								ref: placeRef,
								className: "font-display text-3xl leading-none tracking-wide"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
								ref: mapRef,
								width: 192,
								height: 192,
								className: "size-24 rounded-md border border-border bg-surface sm:size-32"
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto w-full max-w-xs text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							ref: speedRef,
							className: "font-display text-6xl leading-none tabular-nums sm:text-7xl"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs tracking-widest text-muted",
							children: "KM/H"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 h-2 overflow-hidden rounded-full bg-surface",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								ref: driftRef,
								className: "h-full w-full origin-left bg-primary",
								style: { transform: "scaleX(0)" }
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs tracking-widest text-muted",
							children: "DRIFT"
						})
					]
				})]
			}),
			phase === "race" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-3 p-3 md:hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hold, {
						label: "Left",
						onDown: () => {
							sim.touchLeft = true;
						},
						onUp: () => {
							sim.touchLeft = false;
						}
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hold, {
						label: "Right",
						onDown: () => {
							sim.touchRight = true;
						},
						onUp: () => {
							sim.touchRight = false;
						}
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hold, {
							label: "Brake",
							onDown: () => {
								sim.touchBrake = true;
							},
							onUp: () => {
								sim.touchBrake = false;
							}
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hold, {
							label: "Drift",
							tone: "accent",
							onDown: () => {
								sim.touchDrift = true;
							},
							onUp: () => {
								sim.touchDrift = false;
							}
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hold, {
							label: "Gas",
							tone: "primary",
							onDown: () => {
								audioRef.current?.unlock();
								sim.touchGas = true;
							},
							onUp: () => {
								sim.touchGas = false;
							}
						})
					]
				})]
			}),
			phase === "race" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "absolute bottom-3 left-1/2 z-20 hidden h-11 -translate-x-1/2 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm text-fg md:flex",
				onClick: () => sim.respawn(),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-4" }), "Rescue"]
			}),
			phase === "menu" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 z-30 flex flex-col justify-end p-4 sm:justify-end sm:p-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "w-full max-w-md rounded-lg border border-border bg-surface p-5 sm:p-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs tracking-widest text-primary",
							children: "ASH MERIDIAN · 3 LAPS"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-1 font-display text-6xl leading-none tracking-wide sm:text-7xl",
							children: "CINDERLINE"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 max-w-sm text-sm text-muted",
							children: "Dusk drops into neon while you run the circuit. Steer into the corner, hold drift, release for a boost."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-fg",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted",
									children: "W / S"
								}), " throttle"] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted",
									children: "A / D"
								}), " steer"] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted",
									children: "Space"
								}), " drift"] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted",
									children: "C"
								}), " camera"] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted",
									children: "R"
								}), " rescue"] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted",
									children: "P"
								}), " pause"] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 flex gap-6 text-sm tabular-nums text-muted",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: ["Best lap ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-fg",
								children: formatTime(records.bestLap)
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: ["Best race ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-fg",
								children: formatTime(records.bestRace)
							})] })]
						}),
						sceneError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm text-primary",
							children: sceneError
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: start,
								className: "h-12 flex-1 rounded-md bg-primary px-6 font-display text-2xl tracking-wide text-bg sm:flex-none",
								children: "Start"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
								label: records.muted ? "Unmute" : "Mute",
								onClick: toggleMute,
								children: records.muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-5" })
							})]
						})
					]
				})
			}),
			phase === "paused" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 z-30 flex items-center justify-center p-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "w-full max-w-sm rounded-lg border border-border bg-surface p-6 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-5xl tracking-wide",
							children: "PAUSED"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: "The clock is frozen on the last gate you earned."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 flex flex-col gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: togglePause,
								className: "h-12 rounded-md bg-primary font-display text-2xl tracking-wide text-bg",
								children: "Resume"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: backToMenu,
								className: "h-11 rounded-md border border-border text-sm text-fg",
								children: "Quit to pits"
							})]
						})
					]
				})
			}),
			phase === "done" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-0 z-30 flex items-end justify-center p-4 sm:items-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "w-full max-w-sm rounded-lg border border-border bg-surface p-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs tracking-widest text-primary",
							children: "CHEQUERED"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-5xl leading-none tracking-wide",
							children: "FINISHED"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 font-display text-3xl tabular-nums",
							children: formatTime(sim.raceTime)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-muted",
							children: ["Best race ", formatTime(records.bestRace)]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-4 space-y-1 text-sm tabular-nums",
							children: splits.map((lap, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-muted",
									children: ["Lap ", i + 1]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatTime(lap) })]
							}, i))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 flex flex-col gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: restart,
								className: "h-12 rounded-md bg-primary font-display text-2xl tracking-wide text-bg",
								children: "Run it back"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: backToMenu,
								className: "h-11 rounded-md border border-border text-sm",
								children: "Back to pits"
							})]
						})
					]
				})
			})
		]
	});
}
function IconButton({ label, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-label": label,
		onClick,
		className: "flex size-11 items-center justify-center rounded-md border border-border bg-surface text-fg",
		children
	});
}
function Hold({ label, onDown, onUp, tone = "ghost" }) {
	const toneClass = tone === "primary" ? "bg-primary text-bg border-primary" : tone === "accent" ? "bg-surface text-primary border-primary" : "bg-surface text-fg border-border";
	const bind = (e) => {
		e.preventDefault();
		e.currentTarget.setPointerCapture(e.pointerId);
		onDown();
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		className: `h-14 min-w-16 rounded-md border px-3 font-display text-lg tracking-wide ${toneClass}`,
		onPointerDown: bind,
		onPointerUp: onUp,
		onPointerCancel: onUp,
		onContextMenu: (e) => e.preventDefault(),
		children: label
	});
}
function drawMap(canvas, sim) {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	const w = canvas.width;
	const h = canvas.height;
	const styles = getComputedStyle(document.documentElement);
	const bg = styles.getPropertyValue("--color-surface").trim() || "#14161c";
	const fg = styles.getPropertyValue("--color-fg").trim() || "#f3ede4";
	const muted = styles.getPropertyValue("--color-muted").trim() || "#8b93a7";
	const primary = styles.getPropertyValue("--color-primary").trim() || "#ff4d1a";
	ctx.clearRect(0, 0, w, h);
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, w, h);
	let minX = Infinity;
	let maxX = -Infinity;
	let minZ = Infinity;
	let maxZ = -Infinity;
	for (const s of track.samples) {
		minX = Math.min(minX, s.x);
		maxX = Math.max(maxX, s.x);
		minZ = Math.min(minZ, s.z);
		maxZ = Math.max(maxZ, s.z);
	}
	const sx = maxX - minX || 1;
	const sz = maxZ - minZ || 1;
	const scale = Math.min((w - 28) / sx, (h - 28) / sz);
	const ox = (w - sx * scale) / 2;
	const oy = (h - sz * scale) / 2;
	const X = (x) => ox + (x - minX) * scale;
	const Y = (z) => oy + (z - minZ) * scale;
	ctx.beginPath();
	track.samples.forEach((s, i) => {
		const x = X(s.x);
		const y = Y(s.z);
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	});
	ctx.closePath();
	ctx.strokeStyle = muted;
	ctx.lineWidth = 4;
	ctx.stroke();
	ctx.strokeStyle = fg;
	ctx.lineWidth = 1.5;
	ctx.stroke();
	const gate = track.gates[0];
	ctx.fillStyle = primary;
	ctx.fillRect(X(gate.x) - 2, Y(gate.z) - 2, 4, 4);
	for (const r of sim.ai) {
		ctx.fillStyle = muted;
		ctx.beginPath();
		ctx.arc(X(r.x), Y(r.z), 3, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.fillStyle = primary;
	ctx.beginPath();
	ctx.arc(X(sim.x), Y(sim.z), 4.5, 0, Math.PI * 2);
	ctx.fill();
}
var routes_exports = /* @__PURE__ */ __exportAll({ component: () => Home });
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DriftApp, {});
}
//#endregion
export { track as n, yawFromSample as r, routes_exports as t };
