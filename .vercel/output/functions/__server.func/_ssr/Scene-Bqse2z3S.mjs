import { i as __toESM } from "../_runtime.mjs";
import { D as MeshBasicMaterial, F as SRGBColorSpace, G as Vector3, J as require_jsx_runtime, P as RepeatWrapping, R as Shape, Y as require_react, _ as DodecahedronGeometry, c as BufferAttribute, d as ClampToEdgeWrapping, f as Color, j as Object3D, k as MeshStandardMaterial, l as BufferGeometry, m as CylinderGeometry, p as ConeGeometry, r as useFrame, s as BoxGeometry, t as Canvas, u as CanvasTexture, x as InstancedMesh, z as ShapeGeometry } from "../_libs/@react-three/fiber+[...].mjs";
import { n as track, r as yawFromSample } from "./routes-BVPd1B5d.mjs";
import { n as EffectComposer, t as Bloom } from "../_libs/@react-three/postprocessing+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/Scene-Bqse2z3S.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var _desired = new Vector3();
var _look = new Vector3();
var _fog = new Color();
var _sun = new Vector3();
function nightAmount(sim) {
	if (!(sim.running || sim.finished || sim.raceTime > .05)) {
		if (sim.reduceMotion) return .2;
		return .18 + Math.sin(sim.menuTime * .22) * .025;
	}
	return Math.min(1, .2 + sim.raceTime / 72);
}
function makeAsphalt() {
	const canvas = document.createElement("canvas");
	canvas.width = 512;
	canvas.height = 512;
	const g = canvas.getContext("2d");
	if (!g) return new CanvasTexture(canvas);
	g.fillStyle = "#2c2e33";
	g.fillRect(0, 0, 512, 512);
	for (let i = 0; i < 5e3; i++) {
		const v = 28 + Math.random() * 36;
		g.fillStyle = `rgba(${v},${v},${v + 3},0.18)`;
		g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
	}
	g.fillStyle = "#f3ede4";
	g.fillRect(16, 0, 12, 512);
	g.fillRect(484, 0, 12, 512);
	g.fillStyle = "#ff4d1a";
	g.fillRect(32, 0, 5, 512);
	g.fillRect(475, 0, 5, 512);
	g.fillStyle = "#f3ede4";
	for (let y = 8; y < 512; y += 72) g.fillRect(246, y, 20, 38);
	const tex = new CanvasTexture(canvas);
	tex.wrapS = ClampToEdgeWrapping;
	tex.wrapT = RepeatWrapping;
	tex.colorSpace = SRGBColorSpace;
	tex.anisotropy = 8;
	return tex;
}
function ribbonGeometry(inset, extra, lift) {
	const samples = track.samples;
	const n = samples.length;
	const pos = new Float32Array(n * 2 * 3);
	const uv = new Float32Array(n * 2 * 2);
	const idx = new Uint32Array(n * 6);
	for (let i = 0; i < n; i++) {
		const p = samples[i];
		const half = p.half + extra;
		const inner = inset;
		const yL = p.y - p.bank * (inner > 0 ? .15 : 1) + lift;
		const yR = p.y + p.bank * (inner > 0 ? .15 : 1) + lift;
		const left = inner === 0 ? half : p.half + inset;
		inner === 0 || p.half + inset + extra;
		const lx = p.x - p.rx * (inner === 0 ? half : left);
		const lz = p.z - p.rz * (inner === 0 ? half : left);
		const rx = p.x + p.rx * (inner === 0 ? half : left);
		const rz = p.z + p.rz * (inner === 0 ? half : left);
		const i2 = i * 2;
		pos[i2 * 3] = lx;
		pos[i2 * 3 + 1] = yL;
		pos[i2 * 3 + 2] = lz;
		pos[(i2 + 1) * 3] = rx;
		pos[(i2 + 1) * 3 + 1] = yR;
		pos[(i2 + 1) * 3 + 2] = rz;
		const v = p.dist * .055;
		uv[i2 * 2] = 0;
		uv[i2 * 2 + 1] = v;
		uv[(i2 + 1) * 2] = 1;
		uv[(i2 + 1) * 2 + 1] = v;
		const j2 = (i + 1) % n * 2;
		const a = i2;
		const b = i2 + 1;
		const c = j2;
		const d = j2 + 1;
		const k = i * 6;
		idx[k] = a;
		idx[k + 1] = b;
		idx[k + 2] = c;
		idx[k + 3] = b;
		idx[k + 4] = d;
		idx[k + 5] = c;
	}
	const geo = new BufferGeometry();
	geo.setAttribute("position", new BufferAttribute(pos, 3));
	geo.setAttribute("uv", new BufferAttribute(uv, 2));
	geo.setIndex(new BufferAttribute(idx, 1));
	geo.computeVertexNormals();
	return geo;
}
function edgeGeometry() {
	const samples = track.samples;
	const n = samples.length;
	const pos = new Float32Array(n * 4 * 3);
	const idx = [];
	for (let i = 0; i < n; i++) {
		const p = samples[i];
		const y = p.y + .07;
		for (const side of [-1, 1]) {
			const base = p.half * side;
			const outer = (p.half + .28) * side;
			const o = (i * 2 + (side < 0 ? 0 : 1)) * 2;
			pos[o * 3] = p.x + p.rx * base;
			pos[o * 3 + 1] = y - p.bank * (side < 0 ? 1 : -1) * .2;
			pos[o * 3 + 2] = p.z + p.rz * base;
			pos[(o + 1) * 3] = p.x + p.rx * outer;
			pos[(o + 1) * 3 + 1] = y;
			pos[(o + 1) * 3 + 2] = p.z + p.rz * outer;
		}
	}
	for (let side = 0; side < 2; side++) for (let i = 0; i < n; i++) {
		const i2 = (i + 1) % n;
		const a = (i * 2 + side) * 2;
		const b = a + 1;
		const c = (i2 * 2 + side) * 2;
		const d = c + 1;
		idx.push(a, b, c, b, d, c);
	}
	const geo = new BufferGeometry();
	geo.setAttribute("position", new BufferAttribute(pos, 3));
	geo.setIndex(idx);
	geo.computeVertexNormals();
	return geo;
}
var skyVert = `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
var skyFrag = `
  varying vec3 vDir;
  uniform float uNight;
  uniform vec3 uSun;
  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;
    vec3 horizon = mix(vec3(0.96, 0.40, 0.14), vec3(0.06, 0.07, 0.11), uNight);
    vec3 zenith = mix(vec3(0.16, 0.28, 0.52), vec3(0.012, 0.015, 0.032), uNight);
    vec3 below = mix(vec3(0.16, 0.08, 0.05), vec3(0.02, 0.018, 0.02), uNight);
    float up = smoothstep(-0.05, 0.55, h);
    vec3 col = mix(mix(below, horizon, smoothstep(-0.2, 0.08, h)), zenith, up);
    vec3 sunDir = normalize(uSun);
    float sun = pow(max(dot(dir, sunDir), 0.0), mix(50.0, 240.0, uNight));
    float glow = pow(max(dot(dir, sunDir), 0.0), 5.0);
    vec3 sunCol = mix(vec3(1.0, 0.68, 0.28), vec3(0.45, 0.55, 0.75), uNight);
    col += sunCol * sun * mix(1.5, 0.12, uNight);
    col += sunCol * glow * mix(0.38, 0.03, uNight);
    float band = exp(-abs(h) * 16.0);
    col += vec3(1.0, 0.32, 0.1) * band * uNight * 0.42;
    gl_FragColor = vec4(col, 1.0);
  }
`;
function World({ sim, bloom }) {
	const skyRef = (0, import_react.useRef)(null);
	const edgeMat = (0, import_react.useRef)(null);
	const starMat = (0, import_react.useRef)(null);
	const sunRef = (0, import_react.useRef)(null);
	const hemiRef = (0, import_react.useRef)(null);
	const uniforms = (0, import_react.useMemo)(() => ({
		uNight: { value: .15 },
		uSun: { value: new Vector3(.6, .32, -.4) }
	}), []);
	const asphalt = (0, import_react.useMemo)(() => makeAsphalt(), []);
	const roadGeo = (0, import_react.useMemo)(() => ribbonGeometry(0, 0, .02), []);
	const shoulderGeo = (0, import_react.useMemo)(() => ribbonGeometry(0, 4.2, -.05), []);
	const edgesGeo = (0, import_react.useMemo)(() => edgeGeometry(), []);
	const dress = (0, import_react.useMemo)(() => buildDressing(), []);
	(0, import_react.useLayoutEffect)(() => {
		dress.barriers.instanceMatrix.needsUpdate = true;
		dress.chevrons.instanceMatrix.needsUpdate = true;
		dress.rocks.instanceMatrix.needsUpdate = true;
		dress.trees.instanceMatrix.needsUpdate = true;
		dress.trunks.instanceMatrix.needsUpdate = true;
		dress.buildings.instanceMatrix.needsUpdate = true;
		dress.windows.instanceMatrix.needsUpdate = true;
		dress.mountains.instanceMatrix.needsUpdate = true;
	}, [dress]);
	useFrame(({ camera, scene }, dt) => {
		const d = Math.min(dt, .1);
		const night = nightAmount(sim);
		uniforms.uNight.value = night;
		_sun.set(.62, .34 - night * .5, -.42);
		uniforms.uSun.value.copy(_sun);
		if (skyRef.current) skyRef.current.position.copy(camera.position);
		if (edgeMat.current) {
			const k = .25 + night * 1.7 + Math.sin(sim.menuTime * 3 + sim.raceTime * 6) * .08;
			edgeMat.current.color.setRGB(1.55 * k, .32 * k, .07 * k);
		}
		{
			const k = .35 + night * 1.5;
			dress.winMat.color.setRGB(1.2 * k, .52 * k, .18 * k);
		}
		if (starMat.current) starMat.current.opacity = night * .85;
		if (sunRef.current) {
			sunRef.current.position.set(_sun.x * 80, Math.max(6, _sun.y * 80), _sun.z * 80);
			sunRef.current.intensity = 1.7 - night * 1.35;
			sunRef.current.color.setRGB(1, .78 - night * .25, .5 - night * .28);
		}
		if (hemiRef.current) hemiRef.current.intensity = .62 - night * .34;
		const fog = scene.fog;
		if (fog) {
			_fog.setRGB(.55 - night * .5, .26 - night * .21, .12 - night * .08);
			fog.color.copy(_fog);
			fog.near = 110;
			fog.far = 520 - night * 140;
		}
		const chase = sim.cam === "chase" || !sim.running;
		const fx = -Math.sin(sim.yaw);
		const fz = -Math.cos(sim.yaw);
		const rx = Math.cos(sim.yaw);
		const rz = -Math.sin(sim.yaw);
		const menu = !sim.running && sim.raceTime < .05 && !sim.finished;
		if (menu) {
			const s = track.samples[track.startIndex];
			const ang = sim.reduceMotion ? .8 : sim.menuTime * .18;
			_desired.set(s.x + Math.sin(ang) * 16, s.y + 5.2, s.z + Math.cos(ang) * 16);
			_look.set(s.x, s.y + 1.1, s.z);
		} else if (!chase) {
			_desired.set(sim.x + fx * .85 + rx * .32, sim.y + 1.15, sim.z + fz * .85 + rz * .32);
			_look.set(sim.x + fx * 14, sim.y + .95, sim.z + fz * 14);
		} else {
			const dist = 8.2 + Math.min(3.2, sim.speed * .05);
			const height = 2.85 + Math.min(1.1, sim.speed * .02);
			const shake = sim.shake * .18;
			_desired.set(sim.x - fx * dist + rx * sim.lat * .05 + Math.sin(sim.raceTime * 70) * shake, sim.y + height + Math.cos(sim.raceTime * 54) * shake * .4, sim.z - fz * dist + rz * sim.lat * .05);
			_look.set(sim.x + fx * 7.5, sim.y + 1.15, sim.z + fz * 7.5);
		}
		const lerp = 1 - Math.exp((menu ? -1.6 : -5.2) * d);
		camera.position.lerp(_desired, lerp);
		camera.lookAt(_look);
		if (!menu) camera.rotateZ(sim.visualSteer * -.05);
		const cam = camera;
		const targetFov = !chase && !menu ? 80 : 62 + Math.min(16, sim.speed * .22) + (sim.boost > 0 ? 8 : 0);
		cam.fov += (targetFov - cam.fov) * (1 - Math.exp(-4 * d));
		cam.updateProjectionMatrix();
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("color", {
			attach: "background",
			args: ["#07080c"]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("fog", {
			attach: "fog",
			args: [
				"#6b3418",
				80,
				360
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("hemisphereLight", {
			ref: hemiRef,
			args: [
				"#9eb4d4",
				"#2a1a12",
				.5
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("directionalLight", {
			ref: sunRef,
			position: [
				40,
				24,
				-20
			],
			intensity: 1.2,
			color: "#ffc48a"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			ref: skyRef,
			frustumCulled: false,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sphereGeometry", { args: [
				520,
				28,
				18
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("shaderMaterial", { args: [{
				uniforms,
				vertexShader: skyVert,
				fragmentShader: skyFrag,
				side: 1,
				depthWrite: false
			}] })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("points", {
			geometry: dress.starGeo,
			frustumCulled: false,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pointsMaterial", {
				ref: starMat,
				color: "#f3ede4",
				size: 1.4,
				sizeAttenuation: true,
				transparent: true,
				opacity: 0,
				depthWrite: false
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
			rotation: [
				-Math.PI / 2,
				0,
				0
			],
			position: [
				0,
				-.8,
				0
			],
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circleGeometry", { args: [520, 48] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#100e0c",
				roughness: 1
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
			geometry: shoulderGeo,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				color: "#3a332b",
				roughness: .95
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
			geometry: roadGeo,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
				map: asphalt,
				roughness: .88,
				metalness: .05
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
			geometry: edgesGeo,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", {
				ref: edgeMat,
				color: "#ff4d1a",
				toneMapped: false
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("primitive", { object: dress.barriers }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("primitive", { object: dress.rails }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("primitive", { object: dress.chevrons }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("primitive", { object: dress.rocks }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("primitive", { object: dress.trunks }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("primitive", { object: dress.trees }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("primitive", { object: dress.mountains }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("primitive", { object: dress.buildings }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("primitive", { object: dress.windows }),
		track.gates.map((g, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
			position: [
				g.x,
				g.y,
				g.z
			],
			rotation: [
				0,
				yawFromSample(track.samples[g.si]) + Math.PI,
				0
			],
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
					position: [
						-(g.half - 1.2),
						2.1,
						0
					],
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
						.45,
						4.2,
						.45
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
						color: "#1a1816",
						metalness: .4,
						roughness: .5
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
					position: [
						g.half - 1.2,
						2.1,
						0
					],
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
						.45,
						4.2,
						.45
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
						color: "#1a1816",
						metalness: .4,
						roughness: .5
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
					position: [
						0,
						4.15,
						0
					],
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
						g.half * 2 - 1.4,
						.38,
						.5
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
						color: i === 0 ? "#ff4d1a" : "#2a241e",
						emissive: i === 0 ? "#ff4d1a" : "#000000",
						emissiveIntensity: i === 0 ? .7 : 0
					})]
				}),
				i === 0 && [
					-1,
					0,
					1
				].map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
					position: [
						k * 1.4,
						4.15,
						.32
					],
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("sphereGeometry", { args: [
						.18,
						12,
						12
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", {
						color: "#f3ede4",
						toneMapped: false
					})]
				}, k))
			]
		}, i)),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Racer, {
			sim,
			slot: "player"
		}),
		sim.ai.map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Racer, {
			sim,
			slot: i
		}, i)),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skids, { sim }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparks, { sim }),
		bloom && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EffectComposer, {
			multisampling: 0,
			enableNormalPass: false,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bloom, {
				mipmapBlur: true,
				intensity: .38,
				luminanceThreshold: .88,
				luminanceSmoothing: .12
			})
		})
	] });
}
function buildDressing() {
	const dummy = new Object3D();
	const samples = track.samples;
	const n = samples.length;
	const barrierGeo = new BoxGeometry(.28, .8, 1.35);
	const barrierMat = new MeshStandardMaterial({
		color: "#1c1a18",
		metalness: .62,
		roughness: .38
	});
	const railGeo = new BoxGeometry(.12, .1, 1.35);
	const railMat = new MeshStandardMaterial({
		color: "#8d939e",
		metalness: .8,
		roughness: .25
	});
	const barrierCount = Math.floor(n / 3) * 2;
	const barriers = new InstancedMesh(barrierGeo, barrierMat, barrierCount);
	const rails = new InstancedMesh(railGeo, railMat, barrierCount);
	let b = 0;
	for (let i = 0; i < n; i += 3) {
		const p = samples[i];
		const yaw = yawFromSample(p) + Math.PI;
		for (const side of [-1, 1]) {
			dummy.position.set(p.x + p.rx * side * (p.wall - .35), p.y + .42, p.z + p.rz * side * (p.wall - .35));
			dummy.rotation.set(0, yaw, 0);
			dummy.scale.set(1, 1, 1);
			dummy.updateMatrix();
			barriers.setMatrixAt(b, dummy.matrix);
			dummy.position.y = p.y + .86;
			dummy.updateMatrix();
			rails.setMatrixAt(b, dummy.matrix);
			b += 1;
		}
	}
	barriers.count = b;
	rails.count = b;
	const shape = new Shape();
	shape.moveTo(0, .85);
	shape.lineTo(.5, -.4);
	shape.lineTo(0, -.08);
	shape.lineTo(-.5, -.4);
	shape.closePath();
	const chevGeo = new ShapeGeometry(shape);
	chevGeo.rotateX(Math.PI / 2);
	const chevMat = new MeshBasicMaterial({
		color: "#ffb088",
		toneMapped: false
	});
	const chevronSlots = [];
	for (let i = 4; i < n; i += 9) chevronSlots.push(i);
	const chevrons = new InstancedMesh(chevGeo, chevMat, chevronSlots.length);
	chevronSlots.forEach((i, idx) => {
		const p = samples[i];
		dummy.position.set(p.x, p.y + .08, p.z);
		dummy.rotation.set(0, yawFromSample(p) + Math.PI, 0);
		dummy.scale.set(1.35, 1, 1.35);
		dummy.updateMatrix();
		chevrons.setMatrixAt(idx, dummy.matrix);
	});
	const rand = mulberry32(7);
	const rockGeo = new DodecahedronGeometry(1, 0);
	const rockMat = new MeshStandardMaterial({
		color: "#3d3832",
		roughness: .92
	});
	const rocks = new InstancedMesh(rockGeo, rockMat, 70);
	for (let i = 0; i < 70; i++) {
		const p = samples[Math.floor(rand() * n)];
		const side = rand() > .5 ? 1 : -1;
		const dist = p.wall + 3 + rand() * 14;
		const scl = .5 + rand() * 1.8;
		dummy.position.set(p.x + p.rx * side * dist, p.y + scl * .35, p.z + p.rz * side * dist);
		dummy.rotation.set(rand(), rand(), rand());
		dummy.scale.set(scl, scl * (.6 + rand() * .6), scl);
		dummy.updateMatrix();
		rocks.setMatrixAt(i, dummy.matrix);
	}
	const trunkGeo = new CylinderGeometry(.18, .28, 1.6, 5);
	const treeGeo = new ConeGeometry(1.5, 3.4, 6);
	const trunkMat = new MeshStandardMaterial({
		color: "#3a2c24",
		roughness: 1
	});
	const treeMat = new MeshStandardMaterial({
		color: "#1d2b24",
		roughness: .9
	});
	const trunks = new InstancedMesh(trunkGeo, trunkMat, 48);
	const trees = new InstancedMesh(treeGeo, treeMat, 48);
	for (let i = 0; i < 48; i++) {
		const p = samples[Math.floor(rand() * n)];
		const side = rand() > .5 ? 1 : -1;
		const dist = p.wall + 6 + rand() * 18;
		const x = p.x + p.rx * side * dist;
		const z = p.z + p.rz * side * dist;
		dummy.position.set(x, p.y + .8, z);
		dummy.rotation.set(0, 0, 0);
		dummy.scale.set(1, 1, 1);
		dummy.updateMatrix();
		trunks.setMatrixAt(i, dummy.matrix);
		dummy.position.set(x, p.y + 2.8, z);
		dummy.scale.set(.8 + rand() * .7, .85 + rand() * .5, .8 + rand() * .7);
		dummy.updateMatrix();
		trees.setMatrixAt(i, dummy.matrix);
	}
	const mountGeo = new ConeGeometry(1, 1, 5);
	mountGeo.translate(0, .5, 0);
	const mountMat = new MeshStandardMaterial({
		color: "#17120f",
		roughness: 1
	});
	const mountains = new InstancedMesh(mountGeo, mountMat, 18);
	for (let i = 0; i < 18; i++) {
		const a = i / 18 * Math.PI * 2;
		const rad = 300 + i % 3 * 18;
		const h = 46 + i % 5 * 14;
		dummy.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad);
		dummy.rotation.set(0, a, 0);
		dummy.scale.set(28 + i % 4 * 8, h, 22);
		dummy.updateMatrix();
		mountains.setMatrixAt(i, dummy.matrix);
	}
	const bGeo = new BoxGeometry(1, 1, 1);
	bGeo.translate(0, .5, 0);
	const bMat = new MeshStandardMaterial({
		color: "#14181f",
		roughness: .8,
		metalness: .2
	});
	const buildings = new InstancedMesh(bGeo, bMat, 56);
	const wGeo = new BoxGeometry(.7, .28, .08);
	const winMat = new MeshBasicMaterial({
		color: "#ffb088",
		toneMapped: false
	});
	const windows = new InstancedMesh(wGeo, winMat, 56);
	for (let i = 0; i < 56; i++) {
		const a = i / 56 * Math.PI * 2 + .1;
		const rad = 230 + i % 4 * 10;
		const h = 10 + i * 17 % 32;
		const w = 6 + i % 3 * 2;
		dummy.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad);
		dummy.rotation.set(0, -a, 0);
		dummy.scale.set(w, h, w);
		dummy.updateMatrix();
		buildings.setMatrixAt(i, dummy.matrix);
		dummy.position.set(Math.cos(a) * (rad - w * .55), h * .62, Math.sin(a) * (rad - w * .55));
		dummy.scale.set(w * .45, 1.4, 1);
		dummy.updateMatrix();
		windows.setMatrixAt(i, dummy.matrix);
	}
	const starGeo = new BufferGeometry();
	const starPos = /* @__PURE__ */ new Float32Array(660);
	for (let i = 0; i < 220; i++) {
		const a = rand() * Math.PI * 2;
		const y = 40 + rand() * 220;
		const rad = 200 + rand() * 240;
		starPos[i * 3] = Math.cos(a) * rad;
		starPos[i * 3 + 1] = y;
		starPos[i * 3 + 2] = Math.sin(a) * rad;
	}
	starGeo.setAttribute("position", new BufferAttribute(starPos, 3));
	barriers.frustumCulled = false;
	rails.frustumCulled = false;
	chevrons.frustumCulled = false;
	rocks.frustumCulled = false;
	trees.frustumCulled = false;
	trunks.frustumCulled = false;
	mountains.frustumCulled = false;
	buildings.frustumCulled = false;
	windows.frustumCulled = false;
	return {
		barriers,
		rails,
		chevrons,
		rocks,
		trees,
		trunks,
		mountains,
		buildings,
		windows,
		winMat,
		starGeo
	};
}
function mulberry32(seed) {
	let a = seed;
	return () => {
		a |= 0;
		a = a + 1831565813 | 0;
		let t = Math.imul(a ^ a >>> 15, 1 | a);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
function Racer({ sim, slot }) {
	const group = (0, import_react.useRef)(null);
	const spin = (0, import_react.useRef)(0);
	const wheelL = (0, import_react.useRef)(null);
	const wheelR = (0, import_react.useRef)(null);
	const spinA = (0, import_react.useRef)(null);
	const spinB = (0, import_react.useRef)(null);
	const spinC = (0, import_react.useRef)(null);
	const spinD = (0, import_react.useRef)(null);
	const spotL = (0, import_react.useRef)(null);
	const spotR = (0, import_react.useRef)(null);
	const target = (0, import_react.useRef)(null);
	const hero = slot === "player";
	const paint = hero ? "#17191f" : sim.ai[slot].color;
	const accent = hero ? "#ff4d1a" : sim.ai[slot].accent;
	const glowMat = (0, import_react.useMemo)(() => new MeshStandardMaterial({
		color: accent,
		emissive: accent,
		emissiveIntensity: .45,
		toneMapped: false
	}), [accent]);
	const brakeMat = (0, import_react.useMemo)(() => new MeshStandardMaterial({
		color: "#ff2a1a",
		emissive: "#ff2a1a",
		emissiveIntensity: .5,
		toneMapped: false
	}), []);
	useFrame((_, dt) => {
		const g = group.current;
		if (!g) return;
		const d = Math.min(dt, .1);
		const heroPose = slot === "player";
		const x = heroPose ? sim.x : sim.ai[slot].x;
		const y = heroPose ? sim.y : sim.ai[slot].y;
		const z = heroPose ? sim.z : sim.ai[slot].z;
		const yaw = heroPose ? sim.yaw : sim.ai[slot].yaw;
		const pitch = heroPose ? sim.pitch : 0;
		const bank = heroPose ? sim.bank : sim.ai[slot].bank;
		const visualSteer = heroPose ? sim.visualSteer : 0;
		const fwd = heroPose ? sim.fwd : sim.ai[slot].speed;
		const charge = heroPose ? sim.driftCharge : 0;
		const boost = heroPose ? sim.boost : 0;
		const throttle = heroPose ? sim.throttle : .4;
		g.position.set(x, y, z);
		g.rotation.order = "YXZ";
		g.rotation.y = yaw + Math.PI;
		g.rotation.x = -pitch;
		g.rotation.z = -bank * .8 - visualSteer * .055;
		spin.current += fwd * d * 2.6;
		const steerY = visualSteer * .38;
		if (wheelL.current) wheelL.current.rotation.y = steerY;
		if (wheelR.current) wheelR.current.rotation.y = steerY;
		if (spinA.current) spinA.current.rotation.x = spin.current;
		if (spinB.current) spinB.current.rotation.x = spin.current;
		if (spinC.current) spinC.current.rotation.x = spin.current;
		if (spinD.current) spinD.current.rotation.x = spin.current;
		glowMat.emissiveIntensity = hero ? .35 + charge * 2.6 + (boost > 0 ? 2.2 : 0) : .2;
		brakeMat.emissiveIntensity = throttle < 0 ? 2.6 : .4;
		const night = nightAmount(sim);
		if (spotL.current && target.current) {
			spotL.current.target = target.current;
			spotL.current.intensity = hero ? 8 + night * 36 : 0;
		}
		if (spotR.current && target.current) {
			spotR.current.target = target.current;
			spotR.current.intensity = hero ? 8 + night * 36 : 0;
		}
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
		ref: group,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					.48,
					0
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					1.78,
					.4,
					4.05
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: paint,
					metalness: .55,
					roughness: .38
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					.3,
					0
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					1.92,
					.16,
					4.15
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#0e0f13",
					metalness: .3,
					roughness: .6
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					.52,
					.05
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					.16,
					.42,
					3.7
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: accent,
					emissive: accent,
					emissiveIntensity: .55,
					toneMapped: false
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					.86,
					-.28
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					1.42,
					.36,
					1.65
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#10141a",
					metalness: .72,
					roughness: .18
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					0,
					.72,
					1.15
				],
				rotation: [
					-.14,
					0,
					0
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					1.62,
					.14,
					1.35
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: paint,
					metalness: .5,
					roughness: .4
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
				position: [
					0,
					1.02,
					-1.82
				],
				material: glowMat,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					1.45,
					.06,
					.32
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					-.45,
					.78,
					-1.82
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					.08,
					.28,
					.08
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { color: "#141414" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					.45,
					.78,
					-1.82
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					.08,
					.28,
					.08
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", { color: "#141414" })]
			}),
			[-.55, .55].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				position: [
					x,
					.52,
					2.04
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					.32,
					.1,
					.08
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", {
					color: "#fff4dc",
					toneMapped: false
				})]
			}, x)),
			[-.62, .62].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
				position: [
					x,
					.5,
					-2.02
				],
				material: brakeMat,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					.34,
					.12,
					.06
				] })
			}, `t${x}`)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
				position: [
					0,
					.2,
					0
				],
				material: glowMat,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [
					1.3,
					.04,
					3.1
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("object3D", {
				ref: target,
				position: [
					0,
					.2,
					10
				]
			}),
			hero && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("spotLight", {
				ref: spotL,
				position: [
					.5,
					.62,
					1.7
				],
				angle: .48,
				penumbra: .75,
				distance: 60,
				decay: 2,
				color: "#fff3d4"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("spotLight", {
				ref: spotR,
				position: [
					-.5,
					.62,
					1.7
				],
				angle: .48,
				penumbra: .75,
				distance: 60,
				decay: 2,
				color: "#fff3d4"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheel, {
				x: -.86,
				z: 1.28,
				steerRef: wheelL,
				spinRef: spinA
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheel, {
				x: .86,
				z: 1.28,
				steerRef: wheelR,
				spinRef: spinB
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheel, {
				x: -.9,
				z: -1.32,
				spinRef: spinC
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wheel, {
				x: .9,
				z: -1.32,
				spinRef: spinD
			})
		]
	});
}
function Wheel({ x, z, steerRef, spinRef }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("group", {
		position: [
			x,
			.36,
			z
		],
		ref: steerRef,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", {
			ref: spinRef,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				rotation: [
					0,
					0,
					Math.PI / 2
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
					.36,
					.36,
					.32,
					16
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#141414",
					roughness: .72
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", {
				rotation: [
					0,
					0,
					Math.PI / 2
				],
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("cylinderGeometry", { args: [
					.2,
					.2,
					.34,
					12
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshStandardMaterial", {
					color: "#9aa0aa",
					metalness: .8,
					roughness: .25
				})]
			})]
		})
	});
}
function Skids({ sim }) {
	const pos = (0, import_react.useMemo)(() => /* @__PURE__ */ new Float32Array(5760), []);
	const col = (0, import_react.useMemo)(() => /* @__PURE__ */ new Float32Array(5760), []);
	const geo = (0, import_react.useMemo)(() => {
		const g = new BufferGeometry();
		g.setAttribute("position", new BufferAttribute(pos, 3));
		g.setAttribute("color", new BufferAttribute(col, 3));
		return g;
	}, [pos, col]);
	(0, import_react.useRef)(null);
	useFrame(() => {
		const pAttr = geo.getAttribute("position");
		const cAttr = geo.getAttribute("color");
		const arr = pAttr.array;
		const carr = cAttr.array;
		for (let k = 0; k < 320; k++) {
			const o = k * 7;
			const heat = sim.skidData[o + 6];
			const base = k * 18;
			if (heat < .03) {
				for (let v = 0; v < 18; v++) arr[base + v] = 0;
				arr[base + 1] = -40;
				continue;
			}
			const x1 = sim.skidData[o];
			const y1 = sim.skidData[o + 1] + .05;
			const z1 = sim.skidData[o + 2];
			const x2 = sim.skidData[o + 3];
			const z2 = sim.skidData[o + 5];
			const dx = x2 - x1;
			const dz = z2 - z1;
			const len = Math.hypot(dx, dz) || 1;
			const px = -dz / len * .16;
			const pz = dx / len * .16;
			arr[base] = x1 + px;
			arr[base + 1] = y1;
			arr[base + 2] = z1 + pz;
			arr[base + 3] = x1 - px;
			arr[base + 4] = y1;
			arr[base + 5] = z1 - pz;
			arr[base + 6] = x2 + px;
			arr[base + 7] = y1;
			arr[base + 8] = z2 + pz;
			arr[base + 9] = x1 - px;
			arr[base + 10] = y1;
			arr[base + 11] = z1 - pz;
			arr[base + 12] = x2 - px;
			arr[base + 13] = y1;
			arr[base + 14] = z2 - pz;
			arr[base + 15] = x2 + px;
			arr[base + 16] = y1;
			arr[base + 17] = z2 + pz;
			const r = .04 + heat * .55;
			const gch = .03 + heat * .12;
			const b = .03;
			for (let v = 0; v < 6; v++) {
				carr[base + v * 3] = r;
				carr[base + v * 3 + 1] = gch;
				carr[base + v * 3 + 2] = b;
			}
		}
		pAttr.needsUpdate = true;
		cAttr.needsUpdate = true;
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("mesh", {
		geometry: geo,
		frustumCulled: false,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", {
			vertexColors: true,
			transparent: true,
			depthWrite: false,
			toneMapped: false
		})
	});
}
function Sparks({ sim }) {
	const MAX = 180;
	const pool = (0, import_react.useRef)(Array.from({ length: MAX }, () => ({
		x: 0,
		y: -80,
		z: 0,
		vx: 0,
		vy: 0,
		vz: 0,
		life: 0,
		max: 1,
		heat: 0
	})));
	const cursor = (0, import_react.useRef)(0);
	const positions = (0, import_react.useMemo)(() => /* @__PURE__ */ new Float32Array(540), []);
	const colors = (0, import_react.useMemo)(() => /* @__PURE__ */ new Float32Array(540), []);
	const geo = (0, import_react.useMemo)(() => {
		const g = new BufferGeometry();
		g.setAttribute("position", new BufferAttribute(positions, 3));
		g.setAttribute("color", new BufferAttribute(colors, 3));
		return g;
	}, [positions, colors]);
	useFrame((_, dt) => {
		const d = Math.min(dt, .1);
		const parts = pool.current;
		const emit = (x, y, z, vx, vy, vz, life, heat) => {
			const p = parts[cursor.current];
			cursor.current = (cursor.current + 1) % MAX;
			p.x = x;
			p.y = y;
			p.z = z;
			p.vx = vx;
			p.vy = vy;
			p.vz = vz;
			p.life = life;
			p.max = life;
			p.heat = heat;
		};
		if (sim.running && sim.drifting) {
			const fx = -Math.sin(sim.yaw);
			const fz = -Math.cos(sim.yaw);
			const rx = Math.cos(sim.yaw);
			const rz = -Math.sin(sim.yaw);
			for (const side of [-.78, .78]) emit(sim.x - fx * 1.4 + rx * side, sim.y + .28, sim.z - fz * 1.4 + rz * side, -fx * 2 + (Math.random() - .5) * 2, .8 + Math.random() * 1.4, -fz * 2 + (Math.random() - .5) * 2, .35 + Math.random() * .25, .45 + sim.driftCharge * .55);
		}
		if (sim.running && sim.speed > 32) {
			const fx = -Math.sin(sim.yaw);
			const fz = -Math.cos(sim.yaw);
			const rx = Math.cos(sim.yaw);
			const rz = -Math.sin(sim.yaw);
			const side = (Math.random() - .5) * 10;
			emit(sim.x + rx * side, sim.y + .5 + Math.random() * 1.4, sim.z + rz * side, -fx * 8, 0, -fz * 8, .22, .25);
		}
		const pAttr = geo.getAttribute("position");
		const cAttr = geo.getAttribute("color");
		const arr = pAttr.array;
		const carr = cAttr.array;
		for (let i = 0; i < MAX; i++) {
			const p = parts[i];
			if (p.life > 0) {
				p.life -= d;
				p.x += p.vx * d;
				p.y += p.vy * d;
				p.z += p.vz * d;
				p.vy -= 2.2 * d;
			}
			const alive = p.life > 0;
			arr[i * 3] = p.x;
			arr[i * 3 + 1] = alive ? p.y : -80;
			arr[i * 3 + 2] = p.z;
			const fade = alive ? p.life / p.max : 0;
			carr[i * 3] = fade * (.7 + p.heat);
			carr[i * 3 + 1] = fade * (.22 + (1 - p.heat) * .2);
			carr[i * 3 + 2] = fade * .08;
		}
		pAttr.needsUpdate = true;
		cAttr.needsUpdate = true;
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("points", {
		geometry: geo,
		frustumCulled: false,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pointsMaterial", {
			vertexColors: true,
			transparent: true,
			depthWrite: false,
			size: .42,
			sizeAttenuation: true,
			blending: 2,
			toneMapped: false
		})
	});
}
function Scene({ sim }) {
	const bloom = (0, import_react.useMemo)(() => {
		if (typeof window === "undefined") return false;
		return window.innerWidth >= 760;
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Canvas, {
		className: "h-full w-full touch-none",
		dpr: [1, 1.6],
		camera: {
			position: [
				0,
				8,
				22
			],
			fov: 64,
			near: .12,
			far: 950
		},
		gl: {
			antialias: true,
			alpha: false,
			powerPreference: "high-performance"
		},
		onCreated: ({ gl }) => {
			gl.toneMapping = 4;
			gl.toneMappingExposure = 1.12;
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(World, {
			sim,
			bloom
		})
	});
}
//#endregion
export { Scene };
