import { preserveLocalPark } from "./cloud";
import { credentialsFor, type Park } from "./parks";
import { simulate } from "./engine";
import {
  create,
  settle,
  view,
  provision,
  type Config,
  type Credentials,
} from "./near";
import type { Run, RecordState, Command } from "./model";
import {
  VERSION,
  END,
  isCosmeticCommand,
  isPersistent,
  parkClosed,
} from "./model";
type Op = { commands: Command[]; ticks: number; id: string };
export type Snapshot = {
  localId?: string;
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
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
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
      localId: crypto.randomUUID(),
      run,
      mode: record ? "near" : "practice",
      record,
      pending: 0,
      error: null,
      txs: [],
      deadline: isPersistent(run)
        ? Number.MAX_SAFE_INTEGER
        : (deadline ?? Date.now() + (END + 15) * 1000),
    };
    this.desired = run.tick;
    this.flushTimer = setInterval(() => void this.flush(true), 5000);
  }
  static async start(
    onChange: (s: Snapshot) => void,
    credentials?: Credentials,
    cfg?: Config,
  ) {
    preserveLocalPark();
    const saved = localStorage.getItem("moonpark-current");
    if (saved) {
      try {
        const old = JSON.parse(saved);
        if (old.config?.contractId && old.state?.record?.run_id)
          localStorage.setItem(
            `moonpark-history:${old.config.contractId}:${old.state.record.run_id}`,
            saved,
          );
      } catch {
        /* Ignore incomplete local saves. */
      }
    }
    if (credentials && cfg) {
      const requestKey = `moonpark-start:${cfg.contractId}:${credentials.accountId}`;
      const requestId = localStorage.getItem(requestKey) || crypto.randomUUID();
      localStorage.setItem(requestKey, requestId);
      const record = await create(credentials, cfg, requestId);
      localStorage.removeItem(requestKey);
      let local;
      try {
        local = JSON.parse(localStorage.getItem("moonpark-current") || "null");
      } catch {
        local = null;
      }
      if (
        local?.config?.contractId === cfg.contractId &&
        local.state?.record?.run_id === record.run_id
      ) {
        local.credentials = credentials;
        local.config = cfg;
        localStorage.setItem("moonpark-current", JSON.stringify(local));
        const resumed = await ParkSession.resume(
          onChange,
          () => true,
          undefined,
          record,
        );
        if (resumed) return resumed;
      }
      const session = new ParkSession(
        record.run,
        onChange,
        credentials,
        cfg,
        record,
        Number(BigInt(record.deadline) / 1000000n),
      );
      session.emit();
      return session;
    }
    const session = new ParkSession(await simulate({ op: "new" }), onChange);
    session.emit();
    return session;
  }
  static async resume(
    onChange: (s: Snapshot) => void,
    isCurrent: () => boolean = () => true,
    version?: string,
    confirmedRecord?: RecordState,
  ) {
    if (version) {
      let current;
      try {
        current = JSON.parse(
          localStorage.getItem("moonpark-current") || "null",
        );
      } catch {
        current = null;
      }
      if (current?.state?.run?.version !== version) {
        const raw = localStorage.getItem(`moonpark-save:${version}`);
        if (!raw) return null;
        preserveLocalPark();
        localStorage.setItem("moonpark-current", raw);
      }
    }
    const saved = JSON.parse(
      localStorage.getItem("moonpark-current") || "null",
    ) as {
      state: Snapshot;
      ops: Op[];
      credentials: Credentials | null;
      config: Config | null;
    } | null;
    if (!saved) return null;
    if (
      ![
        VERSION,
        "moonpark-v7",
        "moonpark-v6",
        "moonpark-v5",
        "moonpark-v4",
      ].includes(saved.state.run.version)
    )
      throw Error(
        "This saved park uses the previous rules. Start a new opening day for the automatic vendor wallets. Earlier parks remain available in the archive.",
      );
    let record = saved.state.record;
    if (record && saved.config)
      record =
        confirmedRecord ??
        (await view<RecordState>(saved.config, "get_run", {
          run_id: record.run_id,
        }));
    if (!isCurrent()) return null;
    const s = new ParkSession(
      record?.run ?? saved.state.run,
      onChange,
      saved.credentials,
      saved.config,
      record,
      record
        ? Number(BigInt(record.deadline) / 1000000n)
        : Date.now() + (END - saved.state.run.tick + 15) * 1000,
    );
    s.state.localId = saved.state.localId ?? s.state.localId;
    s.state.txs = saved.state.txs;
    let ops = saved.ops;
    if (record && parkClosed(record.run))
      ops = ops.filter(
        (o) =>
          o.ticks === 0 &&
          o.commands.every((c) => isCosmeticCommand(record!.run, c)),
      );
    if (record?.last_request) {
      const i = ops.findIndex((o) => o.id === record!.last_request);
      if (i >= 0) ops = ops.slice(i + 1);
    }
    s.ops = ops;
    await s.rebase(true, saved.state.run.tick);
    if (!isCurrent()) {
      s.dispose();
      return null;
    }
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
      if (
        Date.now() > this.state.deadline &&
        !isCosmeticCommand(this.state.run, command)
      )
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
          ["price", "launch"].includes(command.kind) &&
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
    if (
      this.disposed ||
      parkClosed(this.state.run) ||
      (this.state.run.opening_stage ?? 3) < 2
    )
      return;
    this.desired = Math.min(
      isPersistent(this.state.run) ? 4_000_000_000 : END,
      this.desired + dt * Math.min(1, speed),
    );
    const closing =
      !isPersistent(this.state.run) && Date.now() >= this.state.deadline;
    if (closing) this.desired = END;
    return this.enqueue(async () => {
      if (this.disposed || parkClosed(this.state.run)) return;
      // Keep prediction responsive while bounded batches confirm on NEAR.
      const ticks = Math.min(
        Math.min(10, this.batchTicks()),
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
        if (
          last &&
          last.commands.length === 0 &&
          last.ticks + ticks <= this.batchTicks()
        )
          last.ticks += ticks;
        else this.ops.push({ commands: [], ticks, id: crypto.randomUUID() });
      }
      this.emit();
      void this.flush();
    });
  }
  private async rebase(
    discardConflicts = false,
    targetTick = this.state.run.tick,
  ) {
    if (!this.state.record) return;
    let run = this.state.record.run;
    const retained: Op[] = [];
    let conflict = false;
    for (const original of this.ops) {
      const op = discardConflicts
        ? {
            ...original,
            ticks: Math.min(original.ticks, Math.max(0, targetTick - run.tick)),
          }
        : original;
      if (!op.commands.length && !op.ticks) continue;
      try {
        run = await simulate({
          op: "step",
          run,
          commands: op.commands,
          ticks: op.ticks,
        });
        retained.push(op);
      } catch (error) {
        if (!discardConflicts) throw error;
        conflict = true;
      }
    }
    this.ops = retained;
    this.state.run = run;
    if (conflict)
      this.state.notice =
        "Your park was updated elsewhere. Loaded its confirmed state and kept compatible pending changes.";
  }
  private batchTicks() {
    const buildings = this.state.run.buildings.filter((b) => !b.sold).length;
    return buildings > 48 ? 5 : buildings > 24 ? 10 : 20;
  }
  private async flush(force = false) {
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
      !force &&
      head.commands.length === 0 &&
      head.ticks < this.batchTicks() &&
      this.ops.length === 1 &&
      !parkClosed(this.state.run)
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
          if (read.run.revision > this.state.record.run.revision) {
            const targetTick = this.state.run.tick;
            await this.enqueue(async () => {
              this.state.record = read;
              if (this.active) this.ops.unshift(this.active);
              this.active = null;
              await this.rebase(true, targetTick);
              this.desired = Math.max(this.desired, this.state.run.tick);
              this.state.error = null;
              this.emit();
            });
            return;
          }
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
        const predicted = await simulate({
          op: "step",
          run: this.state.record!.run,
          commands: this.active!.commands,
          ticks: this.active!.ticks,
        });
        const predictionConfirmed =
          this.state.run.revision ===
            result.record.run.revision + this.ops.length &&
          JSON.stringify(predicted) === JSON.stringify(result.record.run);
        this.state.record = result.record;
        if (result.tx)
          this.state.txs = [...this.state.txs, result.tx].slice(-120);
        this.state.error = null;
        this.active = null;
        // The pending prediction already includes this confirmed prefix.
        // Replaying a long offline journal on every receipt can stall the UI.
        if (!predictionConfirmed) await this.rebase();
        else if (!this.ops.length) this.state.run = result.record.run;
        this.emit();
      });
    } catch (e) {
      let error = e instanceof Error ? e.message : "Reconnecting to NEAR.";
      if (
        isPersistent(this.state.run) &&
        /allowance|not\s*enough\s*balance|insufficient.*gas/i.test(error) &&
        this.config &&
        this.credentials
      ) {
        try {
          const next = await provision(
            this.config,
            this.credentials.identity,
            !!this.state.record?.ranked,
            this.credentials.displayName,
          );
          this.credentials = next;
          const record = await view<RecordState>(this.config, "get_run", {
            run_id: this.state.record!.run_id,
          });
          await this.enqueue(async () => {
            if (this.active && record.last_request !== this.active.id)
              this.ops.unshift(this.active);
            this.active = null;
            this.state.record = record;
            this.state.error = null;
            this.state.notice =
              "Sponsored NEAR access refreshed. Your park and sealed score are preserved.";
            await this.rebase();
            this.emit();
          });
          return;
        } catch (renewal) {
          error = renewal instanceof Error ? renewal.message : error;
        }
      }
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
            .map((o) => ({
              ...o,
              commands: o.commands.filter((c) =>
                isCosmeticCommand(record.run, c),
              ),
            }))
            .filter((o) => o.ticks > 0 || o.commands.length > 0);
          if (record.run.finished)
            this.ops = this.ops.filter((o) => o.ticks === 0);
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
  async cloudRecovery(identity: { name: string; emblem: number }) {
    if (!this.credentials || !this.config || !this.state.record) return null;
    const park = await view<Park>(this.config, "get_park", {
      park_id: this.state.record.park_id,
    });
    const owner = credentialsFor(this.config, park.owner);
    return {
      credentials: this.credentials,
      accounts: owner ? [owner] : [],
      config: this.config,
      runId: this.state.record.run_id,
      identity,
    };
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
  async confirm() {
    await this.serial;
    while (!this.disposed && (this.working || this.ops.length)) {
      if (this.state.error) throw Error(this.state.error);
      await this.flush(true);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  dispose() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.disposed = true;
  }
}
