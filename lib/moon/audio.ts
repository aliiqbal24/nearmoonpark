export class MoonAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  muted = true;
  toggle() {
    this.muted = !this.muted;
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.connect(this.context.destination);
    }
    void this.context.resume();
    this.master!.gain.setTargetAtTime(
      this.muted ? 0 : 0.18,
      this.context.currentTime,
      0.15,
    );
    if (!this.timer) this.timer = setInterval(() => this.music(), 650);
    return this.muted;
  }
  private tone(
    f: number,
    duration: number,
    type: OscillatorType = "triangle",
    volume = 0.4,
  ) {
    if (!this.context || !this.master || this.muted) return;
    const ctx = this.context,
      o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(ctx.currentTime + duration + 0.05);
  }
  private music() {
    const notes = [
      261.63, 329.63, 392, 440, 392, 329.63, 293.66, 329.63, 261.63, 392,
      523.25, 440, 392, 329.63, 293.66, 196,
    ];
    if (this.step % 4 === 0)
      this.tone(
        [130.81, 110, 146.83, 98][Math.floor(this.step / 4) % 4],
        2.4,
        "sine",
        0.35,
      );
    this.tone(notes[this.step % notes.length], 0.9, "triangle", 0.12);
    this.step++;
  }
  effect(kind: "build" | "cash" | "rocket" | "finish" | "error") {
    if (kind === "build") {
      this.tone(392, 0.15);
      setTimeout(() => this.tone(523, 0.25), 90);
    } else if (kind === "rocket") {
      this.tone(55, 2, "sawtooth", 0.07);
      this.tone(82, 2, "sine", 0.2);
    } else if (kind === "finish") {
      [261.63, 329.63, 392, 523.25].forEach((n, i) =>
        setTimeout(() => this.tone(n, 1.5), i * 130),
      );
    } else if (kind === "error") this.tone(160, 0.14, "sine", 0.18);
    else this.tone(880, 0.12, "sine", 0.06);
  }
  dispose() {
    if (this.timer) clearInterval(this.timer);
    void this.context?.close();
  }
}
