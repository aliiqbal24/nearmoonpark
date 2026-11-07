type Effect =
  "build" | "cash" | "rocket" | "finish" | "error" | "reward" | "contract";
const TRACKS = [
  "lunar-day",
  "build",
  "cash",
  "rocket",
  "finish",
  "error",
  "reward",
  "contract",
] as const;

export class MoonAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private music: AudioBufferSourceNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private voices = new Set<AudioBufferSourceNode>();
  private loading: Promise<void> | null = null;
  private abort = new AbortController();
  private cinematic = false;
  private disposed = false;
  private lastEffect = new Map<Effect, number>();
  muted = true;

  private visibility = () => {
    if (!this.context || this.disposed) return;
    if (document.hidden) void this.context.suspend().catch(() => {});
    else if (!this.muted) void this.context.resume().catch(() => {});
  };

  setCinematic(value: boolean) {
    this.cinematic = value;
    if (!this.context) return;
    this.musicGain?.gain.setTargetAtTime(
      value ? 0 : 0.32,
      this.context.currentTime,
      0.3,
    );
    this.effectsGain?.gain.setTargetAtTime(
      value ? 0 : 0.68,
      this.context.currentTime,
      0.15,
    );
  }

  toggle() {
    if (this.disposed) return true;
    try {
      if (!this.context) {
        const context = new AudioContext();
        this.context = context;
        this.master = context.createGain();
        this.master.gain.value = 0;
        this.musicGain = context.createGain();
        this.effectsGain = context.createGain();
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -12;
        limiter.knee.value = 12;
        limiter.ratio.value = 4;
        limiter.attack.value = 0.005;
        limiter.release.value = 0.2;
        this.musicGain.connect(this.master);
        this.effectsGain.connect(this.master);
        this.master.connect(limiter);
        limiter.connect(context.destination);
        this.setCinematic(this.cinematic);
        document.addEventListener("visibilitychange", this.visibility);
      }
      this.muted = !this.muted;
      if (!this.muted) void this.context.resume().catch(() => {});
      this.master!.gain.setTargetAtTime(
        this.muted ? 0 : 0.7,
        this.context.currentTime,
        0.12,
      );
      void this.load();
    } catch {
      // An unavailable audio device must never prevent opening a park.
      this.muted = true;
    }
    return this.muted;
  }

  private load() {
    if (this.loading || !this.context) return this.loading;
    const context = this.context;
    this.loading = Promise.allSettled(
      TRACKS.map(async (name) => {
        const response = await fetch(`/audio/${name}-v1.mp3`, {
          signal: this.abort.signal,
        });
        if (!response.ok) return;
        const buffer = await context.decodeAudioData(
          await response.arrayBuffer(),
        );
        if (this.disposed) return;
        this.buffers.set(name, buffer);
        if (name === "lunar-day") {
          this.music = context.createBufferSource();
          this.music.buffer = buffer;
          this.music.loop = true;
          this.music.connect(this.musicGain!);
          this.music.start();
        }
      }),
    ).then(() => {});
    return this.loading;
  }

  effect(kind: Effect) {
    const context = this.context;
    const buffer = this.buffers.get(kind);
    if (
      !context ||
      !buffer ||
      !this.effectsGain ||
      this.muted ||
      this.cinematic ||
      this.disposed ||
      document.hidden
    )
      return;
    const now = context.currentTime;
    if (
      now - (this.lastEffect.get(kind) ?? -10) <
      (kind === "cash" ? 0.32 : 0.09)
    )
      return;
    if (this.voices.size >= 12) return;
    this.lastEffect.set(kind, now);
    const voice = context.createBufferSource();
    voice.buffer = buffer;
    // Subtle variations keep repeated receipts and construction tactile.
    voice.playbackRate.value =
      kind === "cash" || kind === "build" ? 0.97 + Math.random() * 0.06 : 1;
    const gain = context.createGain();
    gain.gain.value = kind === "rocket" ? 0.48 : kind === "cash" ? 0.5 : 0.75;
    voice.connect(gain);
    gain.connect(this.effectsGain);
    this.voices.add(voice);
    voice.onended = () => {
      this.voices.delete(voice);
      voice.disconnect();
      gain.disconnect();
    };
    voice.start();
  }

  dispose() {
    this.disposed = true;
    this.abort.abort();
    document.removeEventListener("visibilitychange", this.visibility);
    this.music?.stop();
    for (const voice of this.voices) voice.stop();
    this.voices.clear();
    this.buffers.clear();
    void this.context?.close().catch(() => {});
  }
}
