import { simulate } from "./engine";
import { create, settle, view, type Config, type Credentials } from "./near";
import type { Run, RecordState, Command } from "./model";
type Op = { commands: Command[]; ticks: number; id: string };
export type Snapshot = {
  run: Run;
  mode: "practice" | "near";
  record: RecordState | null;
  pending: number;
  error: string | null;
  txs: string[];
  deadline: number;
  notice?: string;
};
export class ParkSession {
  state: Snapshot;
  private ops: Op[] = [];
  private active: Op | null = null;
  private working = false;
  private serial: Promise<unknown> = Promise.resolve();
  private disposed = false;
  private desired = 0;
  constructor(
    run: Run,
    private onChange: (s: Snapshot) => void,
    private credentials: Credentials | null = null,
    private config: Config | null = null,
    record: RecordState | null = null,
    deadline?: number,
  ) {
    this.state = {
      run,
      mode: record ? "near" : "practice",
      record,
      pending: 0,
      error: null,
      txs: [],
      deadline: deadline ?? Date.now() + 540000,
    };
    this.desired = run.tick;
    this.emit();
  }
  static async start(
    onChange: (s: Snapshot) => void,
    credentials?: Credentials,
    cfg?: Config,
  ) {
    if (credentials && cfg) {
      const requestKey = `moonpark-start:${cfg.contractId}:${credentials.accountId}`;
      const requestId = localStorage.getItem(requestKey) || crypto.randomUUID();
      localStorage.setItem(requestKey, requestId);
      const record = await create(credentials, cfg, requestId);
      localStorage.removeItem(requestKey);
      return new ParkSession(
        record.run,
        onChange,
        credentials,
        cfg,
        record,
        Number(BigInt(record.deadline) / 1000000n),
      );
    }
    return new ParkSession(await simulate({ op: "new" }), onChange);
  }
  static async resume(onChange: (s: Snapshot) => void) {
    const saved = JSON.parse(
      localStorage.getItem("moonpark-current") || "null",
    ) as {
      state: Snapshot;
      ops: Op[];
      credentials: Credentials | null;
      config: Config | null;
    } | null;
    if (!saved) return null;
    let record = saved.state.record;
    if (record && saved.config)
      record = await view<RecordState>(saved.config, "get_run", {
        run_id: record.run_id,
      });
    const s = new ParkSession(
      record?.run ?? saved.state.run,
      onChange,
      saved.credentials,
      saved.config,
      record,
      saved.state.deadline,
    );
    s.state.txs = saved.state.txs;
    let ops = saved.ops;
    if (record?.run.finished) ops = [];
    if (record?.last_request) {
      const i = ops.findIndex((o) => o.id === record!.last_request);
      if (i >= 0) ops = ops.slice(i + 1);
    }
    s.ops = ops;
    await s.rebase();
    s.desired = s.state.run.tick;
    s.emit();
    void s.flush();
    return s;
  }
  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const task = this.serial.then(fn);
    this.serial = task.catch(() => {});
    return task;
  }
  async action(command: Command) {
    return this.enqueue(async () => {
      if (Date.now() > this.state.deadline)
        throw Error("Opening day has ended.");
      const run = await simulate({
        op: "step",
        run: this.state.run,
        commands: [command],
        ticks: 0,
      });
      this.state.run = run;
      if (this.state.mode === "near") {
        const last = this.ops.at(-1);
        if (
          last &&
          last.ticks === 0 &&
          last.commands.length === 1 &&
          ["price", "rent", "launch"].includes(command.kind) &&
          last.commands[0].kind === command.kind &&
          last.commands[0].building === command.building
        )
          last.commands = [command];
        else
          this.ops.push({
            commands: [command],
            ticks: 0,
            id: crypto.randomUUID(),
          });
      }
      this.emit();
      void this.flush();
    });
  }
  async update(dt: number, speed: number) {
    if (this.disposed || this.state.run.finished) return;
    this.desired = Math.min(540, this.desired + dt * speed);
    const closing = Date.now() >= this.state.deadline;
    if (closing) this.desired = 540;
    return this.enqueue(async () => {
      if (this.disposed || this.state.run.finished) return;
      const lag =
        this.ops.reduce((n, o) => n + o.ticks, 0) + (this.active?.ticks ?? 0);
      if (this.state.mode === "near" && lag >= 40 && !closing) return;
      const ticks = Math.min(
        10,
        Math.max(0, Math.floor(this.desired) - this.state.run.tick),
      );
      if (!ticks) return;
      this.state.run = await simulate({
        op: "step",
        run: this.state.run,
        ticks,
      });
      if (this.state.mode === "near") {
        const last = this.ops.at(-1);
        if (last && last.commands.length === 0 && last.ticks + ticks <= 20)
          last.ticks += ticks;
        else this.ops.push({ commands: [], ticks, id: crypto.randomUUID() });
      }
      this.emit();
      void this.flush();
    });
  }
  private async rebase() {
    if (!this.state.record) return;
    let run = this.state.record.run;
    for (const op of this.ops)
      run = await simulate({
        op: "step",
        run,
        commands: op.commands,
        ticks: op.ticks,
      });
    this.state.run = run;
  }
  private async flush() {
    if (
      this.working ||
      this.disposed ||
      !this.credentials ||
      !this.config ||
      !this.state.record ||
      !this.ops.length
    )
      return;
    const head = this.ops[0];
    if (
      head.commands.length === 0 &&
      head.ticks < 20 &&
      this.ops.length === 1 &&
      !this.state.run.finished
    )
      return;
    this.working = true;
    this.active = this.ops.shift()!;
    this.emit();
    try {
      let result;
      try {
        result = await settle(
          this.credentials,
          this.config,
          this.state.record,
          this.active.commands,
          this.active.ticks,
          this.active.id,
        );
      } catch {
        const read = await view<RecordState>(this.config, "get_run", {
          run_id: this.state.record.run_id,
        });
        if (read.last_request === this.active.id)
          result = { record: read, tx: "" };
        else {
          this.state.record = read;
          result = await settle(
            this.credentials,
            this.config,
            read,
            this.active.commands,
            this.active.ticks,
            this.active.id,
          );
        }
      }
      await this.enqueue(async () => {
        this.state.record = result.record;
        if (result.tx)
          this.state.txs = [...this.state.txs, result.tx].slice(-120);
        this.state.error = null;
        this.active = null;
        await this.rebase();
        this.emit();
      });
    } catch (e) {
      const error = e instanceof Error ? e.message : "Reconnecting to NEAR.";
      await this.enqueue(async () => {
        if (this.active) this.ops.unshift(this.active);
        this.active = null;
        if (
          /Opening day time limit reached|Opening day has ended/.test(error)
        ) {
          const record = await view<RecordState>(this.config!, "get_run", {
            run_id: this.state.record!.run_id,
          });
          this.state.record = record;
          this.ops = this.ops
            .map((o) => ({ ...o, commands: [] }))
            .filter((o) => o.ticks > 0);
          if (record.run.finished) this.ops = [];
          await this.rebase();
          this.state.error = null;
          this.state.notice =
            "An unconfirmed action arrived after closing and was not counted. Finishing the confirmed round.";
        } else this.state.error = error;
        this.emit();
      }).catch(() => {
        this.state.error = error;
        this.emit();
      });
    } finally {
      this.working = false;
      if (!this.disposed)
        setTimeout(() => void this.flush(), this.state.error ? 3000 : 0);
    }
  }
  private emit() {
    if (this.disposed) return;
    this.state = {
      ...this.state,
      pending: this.ops.length + (this.active ? 1 : 0),
    };
    this.onChange(this.state);
    try {
      localStorage.setItem(
        "moonpark-current",
        JSON.stringify({
          state: this.state,
          ops: [...(this.active ? [this.active] : []), ...this.ops],
          credentials: this.credentials,
          config: this.config,
        }),
      );
    } catch {}
  }
  export() {
    return JSON.stringify(
      {
        state: this.state,
        credentials: this.credentials,
        config: this.config,
        ops: [...(this.active ? [this.active] : []), ...this.ops],
      },
      null,
      2,
    );
  }
  dispose() {
    this.disposed = true;
  }
}
