import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { SKID_MAX, SKID_STRIDE, type Sim } from "@/game/sim";
import { track, yawFromSample } from "@/game/track";

const _desired = new THREE.Vector3();
const _look = new THREE.Vector3();
const _fog = new THREE.Color();
const _sun = new THREE.Vector3();

function nightAmount(sim: Sim) {
  const racing = sim.running || sim.finished || sim.raceTime > 0.05;
  if (!racing) {
    if (sim.reduceMotion) return 0.2;
    return 0.18 + Math.sin(sim.menuTime * 0.22) * 0.025;
  }
  return Math.min(1, 0.2 + sim.raceTime / 72);
}

function makeAsphalt() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const g = canvas.getContext("2d");
  if (!g) return new THREE.CanvasTexture(canvas);
  g.fillStyle = "#2c2e33";
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5000; i++) {
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
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function ribbonGeometry(inset: number, extra: number, lift: number) {
  const samples = track.samples;
  const n = samples.length;
  const pos = new Float32Array(n * 2 * 3);
  const uv = new Float32Array(n * 2 * 2);
  const idx = new Uint32Array(n * 6);
  for (let i = 0; i < n; i++) {
    const p = samples[i];
    const half = p.half + extra;
    const inner = inset;
    const yL = p.y - p.bank * (inner > 0 ? 0.15 : 1) + lift;
    const yR = p.y + p.bank * (inner > 0 ? 0.15 : 1) + lift;
    const left = inner === 0 ? half : p.half + inset;
    const right = inner === 0 ? half : p.half + inset + extra;
    const lx = p.x - p.rx * (inner === 0 ? half : left);
    const lz = p.z - p.rz * (inner === 0 ? half : left);
    const rx = p.x + p.rx * (inner === 0 ? half : left);
    const rz = p.z + p.rz * (inner === 0 ? half : left);
    void right;
    const i2 = i * 2;
    pos[i2 * 3] = lx;
    pos[i2 * 3 + 1] = yL;
    pos[i2 * 3 + 2] = lz;
    pos[(i2 + 1) * 3] = rx;
    pos[(i2 + 1) * 3 + 1] = yR;
    pos[(i2 + 1) * 3 + 2] = rz;
    const v = p.dist * 0.055;
    uv[i2 * 2] = 0;
    uv[i2 * 2 + 1] = v;
    uv[(i2 + 1) * 2] = 1;
    uv[(i2 + 1) * 2 + 1] = v;
    const j2 = ((i + 1) % n) * 2;
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
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  return geo;
}

function edgeGeometry() {
  const samples = track.samples;
  const n = samples.length;
  const pos = new Float32Array(n * 4 * 3);
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = samples[i];
    const y = p.y + 0.07;
    for (const side of [-1, 1]) {
      const base = p.half * side;
      const outer = (p.half + 0.28) * side;
      const o = (i * 2 + (side < 0 ? 0 : 1)) * 2;
      pos[o * 3] = p.x + p.rx * base;
      pos[o * 3 + 1] = y - p.bank * (side < 0 ? 1 : -1) * 0.2;
      pos[o * 3 + 2] = p.z + p.rz * base;
      pos[(o + 1) * 3] = p.x + p.rx * outer;
      pos[(o + 1) * 3 + 1] = y;
      pos[(o + 1) * 3 + 2] = p.z + p.rz * outer;
    }
  }
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < n; i++) {
      const i2 = (i + 1) % n;
      const a = (i * 2 + side) * 2;
      const b = a + 1;
      const c = (i2 * 2 + side) * 2;
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFrag = /* glsl */ `
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

type Spark = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  heat: number;
};

function World({ sim, bloom }: { sim: Sim; bloom: boolean }) {
  const skyRef = useRef<THREE.Mesh>(null);
  const edgeMat = useRef<THREE.MeshBasicMaterial>(null);
  const starMat = useRef<THREE.PointsMaterial>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const uniforms = useMemo(
    () => ({
      uNight: { value: 0.15 },
      uSun: { value: new THREE.Vector3(0.6, 0.32, -0.4) },
    }),
    [],
  );
  const asphalt = useMemo(() => makeAsphalt(), []);
  const roadGeo = useMemo(() => ribbonGeometry(0, 0, 0.02), []);
  const shoulderGeo = useMemo(() => ribbonGeometry(0, 4.2, -0.05), []);
  const edgesGeo = useMemo(() => edgeGeometry(), []);

  const dress = useMemo(() => buildDressing(), []);

  useLayoutEffect(() => {
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
    const d = Math.min(dt, 0.1);
    const night = nightAmount(sim);
    uniforms.uNight.value = night;
    _sun.set(0.62, 0.34 - night * 0.5, -0.42);
    uniforms.uSun.value.copy(_sun);
    if (skyRef.current) skyRef.current.position.copy(camera.position);
    if (edgeMat.current) {
      const k = 0.25 + night * 1.7 + Math.sin(sim.menuTime * 3 + sim.raceTime * 6) * 0.08;
      edgeMat.current.color.setRGB(1.55 * k, 0.32 * k, 0.07 * k);
    }
    {
      const k = 0.35 + night * 1.5;
      dress.winMat.color.setRGB(1.2 * k, 0.52 * k, 0.18 * k);
    }
    if (starMat.current) starMat.current.opacity = night * 0.85;
    if (sunRef.current) {
      sunRef.current.position.set(_sun.x * 80, Math.max(6, _sun.y * 80), _sun.z * 80);
      sunRef.current.intensity = 1.7 - night * 1.35;
      sunRef.current.color.setRGB(1, 0.78 - night * 0.25, 0.5 - night * 0.28);
    }
    if (hemiRef.current) hemiRef.current.intensity = 0.62 - night * 0.34;
    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      _fog.setRGB(0.55 - night * 0.5, 0.26 - night * 0.21, 0.12 - night * 0.08);
      fog.color.copy(_fog);
      fog.near = 110;
      fog.far = 520 - night * 140;
    }

    const chase = sim.cam === "chase" || !sim.running;
    const fx = -Math.sin(sim.yaw);
    const fz = -Math.cos(sim.yaw);
    const rx = Math.cos(sim.yaw);
    const rz = -Math.sin(sim.yaw);
    const menu = !sim.running && sim.raceTime < 0.05 && !sim.finished;
    if (menu) {
      const s = track.samples[track.startIndex];
      const ang = sim.reduceMotion ? 0.8 : sim.menuTime * 0.18;
      _desired.set(s.x + Math.sin(ang) * 16, s.y + 5.2, s.z + Math.cos(ang) * 16);
      _look.set(s.x, s.y + 1.1, s.z);
    } else if (!chase) {
      _desired.set(sim.x + fx * 0.85 + rx * 0.32, sim.y + 1.15, sim.z + fz * 0.85 + rz * 0.32);
      _look.set(sim.x + fx * 14, sim.y + 0.95, sim.z + fz * 14);
    } else {
      const dist = 8.2 + Math.min(3.2, sim.speed * 0.05);
      const height = 2.85 + Math.min(1.1, sim.speed * 0.02);
      const shake = sim.shake * 0.18;
      _desired.set(
        sim.x - fx * dist + rx * sim.lat * 0.05 + Math.sin(sim.raceTime * 70) * shake,
        sim.y + height + Math.cos(sim.raceTime * 54) * shake * 0.4,
        sim.z - fz * dist + rz * sim.lat * 0.05,
      );
      _look.set(sim.x + fx * 7.5, sim.y + 1.15, sim.z + fz * 7.5);
    }
    const lerp = 1 - Math.exp((menu ? -1.6 : -5.2) * d);
    camera.position.lerp(_desired, lerp);
    camera.lookAt(_look);
    if (!menu) camera.rotateZ(sim.visualSteer * -0.05);
    const cam = camera as THREE.PerspectiveCamera;
    const targetFov = !chase && !menu ? 80 : 62 + Math.min(16, sim.speed * 0.22) + (sim.boost > 0 ? 8 : 0);
    cam.fov += (targetFov - cam.fov) * (1 - Math.exp(-4 * d));
    cam.updateProjectionMatrix();
  });

  return (
    <>
      <color attach="background" args={["#07080c"]} />
      <fog attach="fog" args={["#6b3418", 80, 360]} />
      <hemisphereLight ref={hemiRef} args={["#9eb4d4", "#2a1a12", 0.5]} />
      <directionalLight ref={sunRef} position={[40, 24, -20]} intensity={1.2} color="#ffc48a" />
      <mesh ref={skyRef} frustumCulled={false}>
        <sphereGeometry args={[520, 28, 18]} />
        <shaderMaterial
          args={[{ uniforms, vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false }]}
        />
      </mesh>
      <points geometry={dress.starGeo} frustumCulled={false}>
        <pointsMaterial ref={starMat} color="#f3ede4" size={1.4} sizeAttenuation transparent opacity={0} depthWrite={false} />
      </points>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
        <circleGeometry args={[520, 48]} />
        <meshStandardMaterial color="#100e0c" roughness={1} />
      </mesh>
      <mesh geometry={shoulderGeo}>
        <meshStandardMaterial color="#3a332b" roughness={0.95} />
      </mesh>
      <mesh geometry={roadGeo}>
        <meshStandardMaterial map={asphalt} roughness={0.88} metalness={0.05} />
      </mesh>
      <mesh geometry={edgesGeo}>
        <meshBasicMaterial ref={edgeMat} color="#ff4d1a" toneMapped={false} />
      </mesh>
      <primitive object={dress.barriers} />
      <primitive object={dress.rails} />
      <primitive object={dress.chevrons} />
      <primitive object={dress.rocks} />
      <primitive object={dress.trunks} />
      <primitive object={dress.trees} />
      <primitive object={dress.mountains} />
      <primitive object={dress.buildings} />
      <primitive object={dress.windows} />
      {track.gates.map((g, i) => (
        <group key={i} position={[g.x, g.y, g.z]} rotation={[0, yawFromSample(track.samples[g.si]) + Math.PI, 0]}>
          <mesh position={[-(g.half - 1.2), 2.1, 0]}>
            <boxGeometry args={[0.45, 4.2, 0.45]} />
            <meshStandardMaterial color="#1a1816" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[g.half - 1.2, 2.1, 0]}>
            <boxGeometry args={[0.45, 4.2, 0.45]} />
            <meshStandardMaterial color="#1a1816" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, 4.15, 0]}>
            <boxGeometry args={[g.half * 2 - 1.4, 0.38, 0.5]} />
            <meshStandardMaterial color={i === 0 ? "#ff4d1a" : "#2a241e"} emissive={i === 0 ? "#ff4d1a" : "#000000"} emissiveIntensity={i === 0 ? 0.7 : 0} />
          </mesh>
          {i === 0 &&
            [-1, 0, 1].map((k) => (
              <mesh key={k} position={[k * 1.4, 4.15, 0.32]}>
                <sphereGeometry args={[0.18, 12, 12]} />
                <meshBasicMaterial color="#f3ede4" toneMapped={false} />
              </mesh>
            ))}
        </group>
      ))}
      <Racer sim={sim} slot="player" />
      {sim.ai.map((_, i) => (
        <Racer key={i} sim={sim} slot={i} />
      ))}
      <Skids sim={sim} />
      <Sparks sim={sim} />
      {bloom && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={0.38} luminanceThreshold={0.88} luminanceSmoothing={0.12} />
        </EffectComposer>
      )}
    </>
  );
}

function buildDressing() {
  const dummy = new THREE.Object3D();
  const samples = track.samples;
  const n = samples.length;
  const barrierGeo = new THREE.BoxGeometry(0.28, 0.8, 1.35);
  const barrierMat = new THREE.MeshStandardMaterial({ color: "#1c1a18", metalness: 0.62, roughness: 0.38 });
  const railGeo = new THREE.BoxGeometry(0.12, 0.1, 1.35);
  const railMat = new THREE.MeshStandardMaterial({ color: "#8d939e", metalness: 0.8, roughness: 0.25 });
  const barrierCount = Math.floor(n / 3) * 2;
  const barriers = new THREE.InstancedMesh(barrierGeo, barrierMat, barrierCount);
  const rails = new THREE.InstancedMesh(railGeo, railMat, barrierCount);
  let b = 0;
  for (let i = 0; i < n; i += 3) {
    const p = samples[i];
    const yaw = yawFromSample(p) + Math.PI;
    for (const side of [-1, 1]) {
      dummy.position.set(p.x + p.rx * side * (p.wall - 0.35), p.y + 0.42, p.z + p.rz * side * (p.wall - 0.35));
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      barriers.setMatrixAt(b, dummy.matrix);
      dummy.position.y = p.y + 0.86;
      dummy.updateMatrix();
      rails.setMatrixAt(b, dummy.matrix);
      b += 1;
    }
  }
  barriers.count = b;
  rails.count = b;

  const shape = new THREE.Shape();
  shape.moveTo(0, 0.85);
  shape.lineTo(0.5, -0.4);
  shape.lineTo(0, -0.08);
  shape.lineTo(-0.5, -0.4);
  shape.closePath();
  const chevGeo = new THREE.ShapeGeometry(shape);
  chevGeo.rotateX(Math.PI / 2);
  const chevMat = new THREE.MeshBasicMaterial({ color: "#ffb088", toneMapped: false });
  const chevronSlots: number[] = [];
  for (let i = 4; i < n; i += 9) chevronSlots.push(i);
  const chevrons = new THREE.InstancedMesh(chevGeo, chevMat, chevronSlots.length);
  chevronSlots.forEach((i, idx) => {
    const p = samples[i];
    dummy.position.set(p.x, p.y + 0.08, p.z);
    dummy.rotation.set(0, yawFromSample(p) + Math.PI, 0);
    dummy.scale.set(1.35, 1, 1.35);
    dummy.updateMatrix();
    chevrons.setMatrixAt(idx, dummy.matrix);
  });

  const rand = mulberry32(7);
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: "#3d3832", roughness: 0.92 });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 70);
  for (let i = 0; i < 70; i++) {
    const p = samples[Math.floor(rand() * n)];
    const side = rand() > 0.5 ? 1 : -1;
    const dist = p.wall + 3 + rand() * 14;
    const scl = 0.5 + rand() * 1.8;
    dummy.position.set(p.x + p.rx * side * dist, p.y + scl * 0.35, p.z + p.rz * side * dist);
    dummy.rotation.set(rand(), rand(), rand());
    dummy.scale.set(scl, scl * (0.6 + rand() * 0.6), scl);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }

  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 1.6, 5);
  const treeGeo = new THREE.ConeGeometry(1.5, 3.4, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: "#3a2c24", roughness: 1 });
  const treeMat = new THREE.MeshStandardMaterial({ color: "#1d2b24", roughness: 0.9 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, 48);
  const trees = new THREE.InstancedMesh(treeGeo, treeMat, 48);
  for (let i = 0; i < 48; i++) {
    const p = samples[Math.floor(rand() * n)];
    const side = rand() > 0.5 ? 1 : -1;
    const dist = p.wall + 6 + rand() * 18;
    const x = p.x + p.rx * side * dist;
    const z = p.z + p.rz * side * dist;
    dummy.position.set(x, p.y + 0.8, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, p.y + 2.8, z);
    dummy.scale.set(0.8 + rand() * 0.7, 0.85 + rand() * 0.5, 0.8 + rand() * 0.7);
    dummy.updateMatrix();
    trees.setMatrixAt(i, dummy.matrix);
  }

  const mountGeo = new THREE.ConeGeometry(1, 1, 5);
  mountGeo.translate(0, 0.5, 0);
  const mountMat = new THREE.MeshStandardMaterial({ color: "#17120f", roughness: 1 });
  const mountains = new THREE.InstancedMesh(mountGeo, mountMat, 18);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const rad = 300 + (i % 3) * 18;
    const h = 46 + (i % 5) * 14;
    dummy.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad);
    dummy.rotation.set(0, a, 0);
    dummy.scale.set(28 + (i % 4) * 8, h, 22);
    dummy.updateMatrix();
    mountains.setMatrixAt(i, dummy.matrix);
  }

  const bGeo = new THREE.BoxGeometry(1, 1, 1);
  bGeo.translate(0, 0.5, 0);
  const bMat = new THREE.MeshStandardMaterial({ color: "#14181f", roughness: 0.8, metalness: 0.2 });
  const buildings = new THREE.InstancedMesh(bGeo, bMat, 56);
  const wGeo = new THREE.BoxGeometry(0.7, 0.28, 0.08);
  const winMat = new THREE.MeshBasicMaterial({ color: "#ffb088", toneMapped: false });
  const windows = new THREE.InstancedMesh(wGeo, winMat, 56);
  for (let i = 0; i < 56; i++) {
    const a = (i / 56) * Math.PI * 2 + 0.1;
    const rad = 230 + (i % 4) * 10;
    const h = 10 + ((i * 17) % 32);
    const w = 6 + (i % 3) * 2;
    dummy.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad);
    dummy.rotation.set(0, -a, 0);
    dummy.scale.set(w, h, w);
    dummy.updateMatrix();
    buildings.setMatrixAt(i, dummy.matrix);
    dummy.position.set(Math.cos(a) * (rad - w * 0.55), h * 0.62, Math.sin(a) * (rad - w * 0.55));
    dummy.scale.set(w * 0.45, 1.4, 1);
    dummy.updateMatrix();
    windows.setMatrixAt(i, dummy.matrix);
  }

  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(220 * 3);
  for (let i = 0; i < 220; i++) {
    const a = rand() * Math.PI * 2;
    const y = 40 + rand() * 220;
    const rad = 200 + rand() * 240;
    starPos[i * 3] = Math.cos(a) * rad;
    starPos[i * 3 + 1] = y;
    starPos[i * 3 + 2] = Math.sin(a) * rad;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));

  barriers.frustumCulled = false;
  rails.frustumCulled = false;
  chevrons.frustumCulled = false;
  rocks.frustumCulled = false;
  trees.frustumCulled = false;
  trunks.frustumCulled = false;
  mountains.frustumCulled = false;
  buildings.frustumCulled = false;
  windows.frustumCulled = false;

  return { barriers, rails, chevrons, rocks, trees, trunks, mountains, buildings, windows, winMat, starGeo };
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Racer({ sim, slot }: { sim: Sim; slot: number | "player" }) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef(0);
  const wheelL = useRef<THREE.Group>(null);
  const wheelR = useRef<THREE.Group>(null);
  const spinA = useRef<THREE.Group>(null);
  const spinB = useRef<THREE.Group>(null);
  const spinC = useRef<THREE.Group>(null);
  const spinD = useRef<THREE.Group>(null);
  const spotL = useRef<THREE.SpotLight>(null);
  const spotR = useRef<THREE.SpotLight>(null);
  const target = useRef<THREE.Object3D>(null);
  const hero = slot === "player";
  const paint = hero ? "#17191f" : sim.ai[slot].color;
  const accent = hero ? "#ff4d1a" : sim.ai[slot].accent;
  const glowMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.45, toneMapped: false }),
    [accent],
  );
  const brakeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ff2a1a", emissive: "#ff2a1a", emissiveIntensity: 0.5, toneMapped: false }),
    [],
  );

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const d = Math.min(dt, 0.1);
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
    const throttle = heroPose ? sim.throttle : 0.4;
    g.position.set(x, y, z);
    g.rotation.order = "YXZ";
    g.rotation.y = yaw + Math.PI;
    g.rotation.x = -pitch;
    g.rotation.z = -bank * 0.8 - visualSteer * 0.055;
    spin.current += fwd * d * 2.6;
    const steerY = visualSteer * 0.38;
    if (wheelL.current) wheelL.current.rotation.y = steerY;
    if (wheelR.current) wheelR.current.rotation.y = steerY;
    if (spinA.current) spinA.current.rotation.x = spin.current;
    if (spinB.current) spinB.current.rotation.x = spin.current;
    if (spinC.current) spinC.current.rotation.x = spin.current;
    if (spinD.current) spinD.current.rotation.x = spin.current;
    glowMat.emissiveIntensity = hero ? 0.35 + charge * 2.6 + (boost > 0 ? 2.2 : 0) : 0.2;
    brakeMat.emissiveIntensity = throttle < 0 ? 2.6 : 0.4;
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

  return (
    <group ref={group}>
      <mesh position={[0, 0.48, 0]}>
        <boxGeometry args={[1.78, 0.4, 4.05]} />
        <meshStandardMaterial color={paint} metalness={0.55} roughness={0.38} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.92, 0.16, 4.15]} />
        <meshStandardMaterial color="#0e0f13" metalness={0.3} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.52, 0.05]}>
        <boxGeometry args={[0.16, 0.42, 3.7]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.55} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.86, -0.28]}>
        <boxGeometry args={[1.42, 0.36, 1.65]} />
        <meshStandardMaterial color="#10141a" metalness={0.72} roughness={0.18} />
      </mesh>
      <mesh position={[0, 0.72, 1.15]} rotation={[-0.14, 0, 0]}>
        <boxGeometry args={[1.62, 0.14, 1.35]} />
        <meshStandardMaterial color={paint} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.02, -1.82]} material={glowMat}>
        <boxGeometry args={[1.45, 0.06, 0.32]} />
      </mesh>
      <mesh position={[-0.45, 0.78, -1.82]}>
        <boxGeometry args={[0.08, 0.28, 0.08]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
      <mesh position={[0.45, 0.78, -1.82]}>
        <boxGeometry args={[0.08, 0.28, 0.08]} />
        <meshStandardMaterial color="#141414" />
      </mesh>
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.52, 2.04]}>
          <boxGeometry args={[0.32, 0.1, 0.08]} />
          <meshBasicMaterial color="#fff4dc" toneMapped={false} />
        </mesh>
      ))}
      {[-0.62, 0.62].map((x) => (
        <mesh key={`t${x}`} position={[x, 0.5, -2.02]} material={brakeMat}>
          <boxGeometry args={[0.34, 0.12, 0.06]} />
        </mesh>
      ))}
      <mesh position={[0, 0.2, 0]} material={glowMat}>
        <boxGeometry args={[1.3, 0.04, 3.1]} />
      </mesh>
      <object3D ref={target} position={[0, 0.2, 10]} />
      {hero && (
        <>
          <spotLight ref={spotL} position={[0.5, 0.62, 1.7]} angle={0.48} penumbra={0.75} distance={60} decay={2} color="#fff3d4" />
          <spotLight ref={spotR} position={[-0.5, 0.62, 1.7]} angle={0.48} penumbra={0.75} distance={60} decay={2} color="#fff3d4" />
        </>
      )}
      <Wheel x={-0.86} z={1.28} steerRef={wheelL} spinRef={spinA} />
      <Wheel x={0.86} z={1.28} steerRef={wheelR} spinRef={spinB} />
      <Wheel x={-0.9} z={-1.32} spinRef={spinC} />
      <Wheel x={0.9} z={-1.32} spinRef={spinD} />
    </group>
  );
}

function Wheel({
  x,
  z,
  steerRef,
  spinRef,
}: {
  x: number;
  z: number;
  steerRef?: RefObject<THREE.Group | null>;
  spinRef: RefObject<THREE.Group | null>;
}) {
  return (
    <group position={[x, 0.36, z]} ref={steerRef}>
      <group ref={spinRef}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.36, 0.36, 0.32, 16]} />
          <meshStandardMaterial color="#141414" roughness={0.72} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.34, 12]} />
          <meshStandardMaterial color="#9aa0aa" metalness={0.8} roughness={0.25} />
        </mesh>
      </group>
    </group>
  );
}

function Skids({ sim }: { sim: Sim }) {
  const pos = useMemo(() => new Float32Array(SKID_MAX * 18), []);
  const col = useMemo(() => new Float32Array(SKID_MAX * 18), []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [pos, col]);
  const ref = useRef<THREE.BufferAttribute>(null);

  useFrame(() => {
    const pAttr = geo.getAttribute("position") as THREE.BufferAttribute;
    const cAttr = geo.getAttribute("color") as THREE.BufferAttribute;
    const arr = pAttr.array as Float32Array;
    const carr = cAttr.array as Float32Array;
    for (let k = 0; k < SKID_MAX; k++) {
      const o = k * SKID_STRIDE;
      const heat = sim.skidData[o + 6];
      const base = k * 18;
      if (heat < 0.03) {
        for (let v = 0; v < 18; v++) arr[base + v] = 0;
        arr[base + 1] = -40;
        continue;
      }
      const x1 = sim.skidData[o];
      const y1 = sim.skidData[o + 1] + 0.05;
      const z1 = sim.skidData[o + 2];
      const x2 = sim.skidData[o + 3];
      const z2 = sim.skidData[o + 5];
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz) || 1;
      const px = (-dz / len) * 0.16;
      const pz = (dx / len) * 0.16;
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
      const r = 0.04 + heat * 0.55;
      const gch = 0.03 + heat * 0.12;
      const b = 0.03;
      for (let v = 0; v < 6; v++) {
        carr[base + v * 3] = r;
        carr[base + v * 3 + 1] = gch;
        carr[base + v * 3 + 2] = b;
      }
    }
    pAttr.needsUpdate = true;
    cAttr.needsUpdate = true;
    void ref;
  });

  return (
    <mesh geometry={geo} frustumCulled={false}>
      <meshBasicMaterial vertexColors transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Sparks({ sim }: { sim: Sim }) {
  const MAX = 180;
  const pool = useRef<Spark[]>(
    Array.from({ length: MAX }, () => ({ x: 0, y: -80, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, heat: 0 })),
  );
  const cursor = useRef(0);
  const positions = useMemo(() => new Float32Array(MAX * 3), []);
  const colors = useMemo(() => new Float32Array(MAX * 3), []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [positions, colors]);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.1);
    const parts = pool.current;
    const emit = (x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, heat: number) => {
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
      for (const side of [-0.78, 0.78]) {
        emit(
          sim.x - fx * 1.4 + rx * side,
          sim.y + 0.28,
          sim.z - fz * 1.4 + rz * side,
          -fx * 2 + (Math.random() - 0.5) * 2,
          0.8 + Math.random() * 1.4,
          -fz * 2 + (Math.random() - 0.5) * 2,
          0.35 + Math.random() * 0.25,
          0.45 + sim.driftCharge * 0.55,
        );
      }
    }
    if (sim.running && sim.speed > 32) {
      const fx = -Math.sin(sim.yaw);
      const fz = -Math.cos(sim.yaw);
      const rx = Math.cos(sim.yaw);
      const rz = -Math.sin(sim.yaw);
      const side = (Math.random() - 0.5) * 10;
      emit(
        sim.x + rx * side,
        sim.y + 0.5 + Math.random() * 1.4,
        sim.z + rz * side,
        -fx * 8,
        0,
        -fz * 8,
        0.22,
        0.25,
      );
    }
    const pAttr = geo.getAttribute("position") as THREE.BufferAttribute;
    const cAttr = geo.getAttribute("color") as THREE.BufferAttribute;
    const arr = pAttr.array as Float32Array;
    const carr = cAttr.array as Float32Array;
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
      carr[i * 3] = fade * (0.7 + p.heat);
      carr[i * 3 + 1] = fade * (0.22 + (1 - p.heat) * 0.2);
      carr[i * 3 + 2] = fade * 0.08;
    }
    pAttr.needsUpdate = true;
    cAttr.needsUpdate = true;
  });

  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial vertexColors transparent depthWrite={false} size={0.42} sizeAttenuation blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
}

export function Scene({ sim }: { sim: Sim }) {
  const bloom = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= 760;
  }, []);

  return (
    <Canvas
      className="h-full w-full touch-none"
      dpr={[1, 1.6]}
      camera={{ position: [0, 8, 22], fov: 64, near: 0.12, far: 950 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.12;
      }}
    >
      <World sim={sim} bloom={bloom} />
    </Canvas>
  );
}
