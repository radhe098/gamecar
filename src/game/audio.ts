import type { Sim } from "@/game/sim";

export type EngineAudio = {
  unlock: () => void;
  update: (sim: Sim) => void;
};

export function createAudio(): EngineAudio {
  let ctx: AudioContext | null = null;
  let osc: OscillatorNode | null = null;
  let filter: BiquadFilterNode | null = null;
  let gain: GainNode | null = null;
  let noiseGain: GainNode | null = null;
  let started = false;

  function unlock() {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();
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
    band.Q.value = 0.7;
    noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;
    noise.connect(band);
    band.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start();
    started = true;
  }

  function update(sim: Sim) {
    if (!ctx || !osc || !filter || !gain || !noiseGain) return;
    const audible = sim.running && !sim.muted;
    const speed = Math.hypot(sim.vx, sim.vz);
    const targetGain = audible ? Math.min(0.07, 0.02 + Math.abs(sim.throttle) * 0.03 + speed * 0.0006) : 0;
    const freq = 48 + speed * 2.4 + Math.max(0, sim.throttle) * 28 + (sim.boost > 0 ? 30 : 0);
    const now = ctx.currentTime;
    osc.frequency.setTargetAtTime(freq, now, 0.05);
    filter.frequency.setTargetAtTime(380 + speed * 18, now, 0.08);
    gain.gain.setTargetAtTime(targetGain, now, 0.05);
    const screech = audible && sim.drifting ? Math.min(0.045, sim.slip * 0.0018) : 0;
    noiseGain.gain.setTargetAtTime(screech, now, 0.04);
  }

  return { unlock, update };
}
