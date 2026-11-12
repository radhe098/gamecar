import { useEffect, useRef, useState, type ComponentType, type PointerEvent as ReactPointerEvent } from "react";
import { Camera, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { createAudio, type EngineAudio } from "@/game/audio";
import {
  createSim,
  formatTime,
  loadSave,
  ordinal,
  writeSave,
  type Save,
  type Sim,
} from "@/game/sim";
import { track } from "@/game/track";

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setSteer?: (v: number) => void;
      setKeys?: (codes: string[]) => void;
    };
  }
}

type Phase = "menu" | "race" | "paused" | "done";

const BLOCK = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

export function DriftApp() {
  const simRef = useRef<Sim | null>(null);
  if (!simRef.current) simRef.current = createSim();
  const sim = simRef.current;
  const audioRef = useRef<EngineAudio | null>(null);
  if (!audioRef.current) audioRef.current = createAudio();

  const [phase, setPhase] = useState<Phase>("menu");
  const phaseRef = useRef<Phase>("menu");
  const [records, setRecords] = useState<Save>({ v: 1, bestLap: null, bestRace: null, muted: false });
  const [splits, setSplits] = useState<number[]>([]);
  const [SceneComp, setSceneComp] = useState<ComponentType<{ sim: Sim }> | null>(null);
  const [sceneError, setSceneError] = useState("");
  const finishLatch = useRef(false);

  const lapRef = useRef<HTMLParagraphElement>(null);
  const timeRef = useRef<HTMLParagraphElement>(null);
  const bestRef = useRef<HTMLParagraphElement>(null);
  const placeRef = useRef<HTMLParagraphElement>(null);
  const speedRef = useRef<HTMLParagraphElement>(null);
  const driftRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLParagraphElement>(null);
  const wrongRef = useRef<HTMLParagraphElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const save = loadSave();
    sim.bestLap = save.bestLap;
    sim.bestRace = save.bestRace;
    sim.muted = save.muted;
    sim.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setRecords(save);
  }, [sim]);

  useEffect(() => {
    let live = true;
    void import("@/game/Scene")
      .then((m) => {
        if (live) setSceneComp(() => m.Scene);
      })
      .catch((err: unknown) => {
        if (live) setSceneError(err instanceof Error ? err.message : "The circuit failed to load.");
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const qa = import.meta.env.DEV || new URLSearchParams(window.location.search).has("qa");
    if (qa) {
      window.__controlsTest = {
        getYaw: () => sim.yaw,
        getSpeed: () => Math.hypot(sim.vx, sim.vz),
        setKeys: (codes) => sim.setKeys(codes),
        setSteer: (v) => sim.setSteer(v),
      };
    }

    const down = (e: KeyboardEvent) => {
      if (BLOCK.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      sim.realKeys.add(e.code);
      if (e.code === "KeyP" || e.code === "Escape") togglePause();
      if (e.code === "KeyC") sim.cam = sim.cam === "chase" ? "hood" : "chase";
      if (e.code === "KeyM") toggleMute();
    };
    const up = (e: KeyboardEvent) => {
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
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      let frame = (now - last) / 1000;
      last = now;
      if (frame > 0.1) frame = 0.1;
      sim.menuTime += frame;
      if (sim.running) {
        acc += frame;
        if (acc > 0.1) acc = 0.1;
        let guard = 0;
        while (acc >= step && guard++ < 4) {
          sim.step(step);
          acc -= step;
        }
      } else {
        acc = 0;
      }
      paintHud(sim);
      audioRef.current?.update(sim);
      if (sim.finished && !finishLatch.current) {
        finishLatch.current = true;
        phaseRef.current = "done";
        setPhase("done");
        setSplits(sim.splits.slice());
        const save: Save = { v: 1, bestLap: sim.bestLap, bestRace: sim.bestRace, muted: sim.muted };
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
    // toggle helpers close over latest via refs / sim mutation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim]);

  function paintHud(current: Sim) {
    const show = phaseRef.current === "race" || phaseRef.current === "paused";
    if (lapRef.current) lapRef.current.textContent = show ? `${Math.min(current.laps + 1, 3)} / 3` : "";
    if (timeRef.current) timeRef.current.textContent = show ? formatTime(current.raceTime) : "";
    if (bestRef.current) bestRef.current.textContent = show ? `BEST ${formatTime(current.bestLap)}` : "";
    if (placeRef.current) placeRef.current.textContent = show ? ordinal(current.place) : "";
    if (speedRef.current) speedRef.current.textContent = show ? String(Math.round(current.speed * 3.6)) : "";
    if (driftRef.current) {
      driftRef.current.style.transform = `scaleX(${current.driftCharge})`;
      driftRef.current.style.background = current.driftCharge > 0.72 ? "var(--color-fg)" : "var(--color-primary)";
    }
    if (bannerRef.current) {
      const text = current.bannerT > 0 ? current.banner : "";
      bannerRef.current.textContent = text;
      bannerRef.current.style.opacity = text ? "1" : "0";
    }
    if (wrongRef.current) {
      const on = current.running && current.wrongWay;
      wrongRef.current.style.opacity = on ? String(0.45 + 0.55 * Math.abs(Math.sin(current.raceTime * 8))) : "0";
    }
    if (vignetteRef.current) {
      vignetteRef.current.style.opacity = show ? String(Math.min(0.72, current.speed / 70)) : "0";
    }
    if (glowRef.current) {
      const hot = current.drifting ? 0.35 + current.driftCharge * 0.65 : current.boost > 0 ? 0.8 : 0;
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
    const save: Save = { v: 1, bestLap: sim.bestLap, bestRace: sim.bestRace, muted: sim.muted };
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

  const racing = phase === "race" || phase === "paused";

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg select-none">
      <div className="absolute inset-0">
        {SceneComp ? <SceneComp sim={sim} /> : <div className="h-full w-full bg-bg" />}
      </div>

      <div ref={vignetteRef} className="pointer-events-none absolute inset-0 opacity-0" style={{ background: "radial-gradient(ellipse at center, transparent 42%, var(--color-bg) 100%)" }} />
      <div ref={glowRef} className="pointer-events-none absolute inset-x-0 bottom-0 h-40 opacity-0" style={{ background: "linear-gradient(to top, color-mix(in oklab, var(--color-primary) 55%, transparent), transparent)" }} />

      <p ref={bannerRef} className="pointer-events-none absolute top-[16%] left-1/2 z-10 -translate-x-1/2 font-display text-5xl tracking-wide text-primary opacity-0 sm:text-6xl" />
      <p ref={wrongRef} className="pointer-events-none absolute top-[26%] left-1/2 z-10 -translate-x-1/2 font-display text-3xl tracking-widest text-fg opacity-0">
        WRONG WAY
      </p>

      {racing && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 pb-28 md:p-5 md:pb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-xs tracking-widest text-muted">LAP</p>
              <p ref={lapRef} className="font-display text-4xl leading-none tracking-wide" />
              <p ref={timeRef} className="mt-1 font-display text-xl leading-none text-primary-soft tabular-nums" />
              <p ref={bestRef} className="mt-1 text-xs tracking-wide text-muted tabular-nums" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="pointer-events-auto flex gap-2">
                <div className="md:hidden">
                  <IconButton label="Rescue" onClick={() => sim.respawn()}>
                    <RotateCcw className="size-5" />
                  </IconButton>
                </div>
                <IconButton label={records.muted ? "Unmute" : "Mute"} onClick={toggleMute}>
                  {records.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                </IconButton>
                <IconButton label="Camera" onClick={() => { sim.cam = sim.cam === "chase" ? "hood" : "chase"; }}>
                  <Camera className="size-5" />
                </IconButton>
                <IconButton label="Pause" onClick={togglePause}>
                  {phase === "paused" ? <Play className="size-5" /> : <Pause className="size-5" />}
                </IconButton>
              </div>
              <p ref={placeRef} className="font-display text-3xl leading-none tracking-wide" />
              <canvas ref={mapRef} width={192} height={192} className="size-24 rounded-md border border-border bg-surface sm:size-32" />
            </div>
          </div>
          <div className="mx-auto w-full max-w-xs text-center">
            <p ref={speedRef} className="font-display text-6xl leading-none tabular-nums sm:text-7xl" />
            <p className="text-xs tracking-widest text-muted">KM/H</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
              <div ref={driftRef} className="h-full w-full origin-left bg-primary" style={{ transform: "scaleX(0)" }} />
            </div>
            <p className="mt-1 text-xs tracking-widest text-muted">DRIFT</p>
          </div>
        </div>
      )}

      {phase === "race" && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-3 p-3 md:hidden">
          <div className="flex gap-2">
            <Hold label="Left" onDown={() => { sim.touchLeft = true; }} onUp={() => { sim.touchLeft = false; }} />
            <Hold label="Right" onDown={() => { sim.touchRight = true; }} onUp={() => { sim.touchRight = false; }} />
          </div>
          <div className="flex gap-2">
            <Hold label="Brake" onDown={() => { sim.touchBrake = true; }} onUp={() => { sim.touchBrake = false; }} />
            <Hold label="Drift" tone="accent" onDown={() => { sim.touchDrift = true; }} onUp={() => { sim.touchDrift = false; }} />
            <Hold label="Gas" tone="primary" onDown={() => { audioRef.current?.unlock(); sim.touchGas = true; }} onUp={() => { sim.touchGas = false; }} />
          </div>
        </div>
      )}

      {phase === "race" && (
        <button type="button" className="absolute bottom-3 left-1/2 z-20 hidden h-11 -translate-x-1/2 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm text-fg md:flex" onClick={() => sim.respawn()}>
          <RotateCcw className="size-4" />
          Rescue
        </button>
      )}

      {phase === "menu" && (
        <div className="absolute inset-0 z-30 flex flex-col justify-end p-4 sm:justify-end sm:p-8">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 sm:p-6">
            <p className="text-xs tracking-widest text-primary">ASH MERIDIAN · 3 LAPS</p>
            <h1 className="mt-1 font-display text-6xl leading-none tracking-wide sm:text-7xl">CINDERLINE</h1>
            <p className="mt-3 max-w-sm text-sm text-muted">
              Dusk drops into neon while you run the circuit. Steer into the corner, hold drift, release for a boost.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-fg">
              <p><span className="text-muted">W / S</span> throttle</p>
              <p><span className="text-muted">A / D</span> steer</p>
              <p><span className="text-muted">Space</span> drift</p>
              <p><span className="text-muted">C</span> camera</p>
              <p><span className="text-muted">R</span> rescue</p>
              <p><span className="text-muted">P</span> pause</p>
            </div>
            <div className="mt-4 flex gap-6 text-sm tabular-nums text-muted">
              <p>Best lap <span className="text-fg">{formatTime(records.bestLap)}</span></p>
              <p>Best race <span className="text-fg">{formatTime(records.bestRace)}</span></p>
            </div>
            {sceneError && <p className="mt-3 text-sm text-primary">{sceneError}</p>}
            <div className="mt-5 flex items-center gap-3">
              <button type="button" onClick={start} className="h-12 flex-1 rounded-md bg-primary px-6 font-display text-2xl tracking-wide text-bg sm:flex-none">
                Start
              </button>
              <IconButton label={records.muted ? "Unmute" : "Mute"} onClick={toggleMute}>
                {records.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
              </IconButton>
            </div>
          </div>
        </div>
      )}

      {phase === "paused" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 text-center">
            <h2 className="font-display text-5xl tracking-wide">PAUSED</h2>
            <p className="mt-2 text-sm text-muted">The clock is frozen on the last gate you earned.</p>
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" onClick={togglePause} className="h-12 rounded-md bg-primary font-display text-2xl tracking-wide text-bg">
                Resume
              </button>
              <button type="button" onClick={backToMenu} className="h-11 rounded-md border border-border text-sm text-fg">
                Quit to pits
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="absolute inset-0 z-30 flex items-end justify-center p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6">
            <p className="text-xs tracking-widest text-primary">CHEQUERED</p>
            <h2 className="font-display text-5xl leading-none tracking-wide">FINISHED</h2>
            <p className="mt-3 font-display text-3xl tabular-nums">{formatTime(sim.raceTime)}</p>
            <p className="text-sm text-muted">Best race {formatTime(records.bestRace)}</p>
            <ul className="mt-4 space-y-1 text-sm tabular-nums">
              {splits.map((lap, i) => (
                <li key={i} className="flex justify-between">
                  <span className="text-muted">Lap {i + 1}</span>
                  <span>{formatTime(lap)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" onClick={restart} className="h-12 rounded-md bg-primary font-display text-2xl tracking-wide text-bg">
                Run it back
              </button>
              <button type="button" onClick={backToMenu} className="h-11 rounded-md border border-border text-sm">
                Back to pits
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex size-11 items-center justify-center rounded-md border border-border bg-surface text-fg">
      {children}
    </button>
  );
}

function Hold({
  label,
  onDown,
  onUp,
  tone = "ghost",
}: {
  label: string;
  onDown: () => void;
  onUp: () => void;
  tone?: "ghost" | "primary" | "accent";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary text-bg border-primary"
      : tone === "accent"
        ? "bg-surface text-primary border-primary"
        : "bg-surface text-fg border-border";
  const bind = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    onDown();
  };
  return (
    <button
      type="button"
      className={`h-14 min-w-16 rounded-md border px-3 font-display text-lg tracking-wide ${toneClass}`}
      onPointerDown={bind}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

function drawMap(canvas: HTMLCanvasElement, sim: Sim) {
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
  const pad = 14;
  const sx = (maxX - minX) || 1;
  const sz = (maxZ - minZ) || 1;
  const scale = Math.min((w - pad * 2) / sx, (h - pad * 2) / sz);
  const ox = (w - sx * scale) / 2;
  const oy = (h - sz * scale) / 2;
  const X = (x: number) => ox + (x - minX) * scale;
  const Y = (z: number) => oy + (z - minZ) * scale;
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
