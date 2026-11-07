"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Coins,
  ExternalLink,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { view, checkRecipient, type Config } from "@/lib/moon/near";
import { money, type Concession, type PrizeStatus } from "@/lib/moon/model";
import type { Snapshot } from "@/lib/moon/session";

export const testNear = (amount: string) =>
  (Number(amount) / 1e24).toLocaleString("en-US", { maximumFractionDigits: 6 });
export function NearMark({ word = false }: { word?: boolean }) {
  return (
    <span className="mp-near-mark" aria-hidden="true">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M13.9017 0.646973C13.3462 0.646973 12.8304 0.929357 12.5394 1.39357L9.40403 5.95741C9.30186 6.10784 9.34331 6.31059 9.49675 6.41075C9.6211 6.49202 9.78561 6.48196 9.89889 6.38645L12.9851 3.76201C13.0364 3.71677 13.1154 3.72137 13.1616 3.77165C13.1825 3.79469 13.1937 3.82444 13.1937 3.85502V12.0719C13.1937 12.1397 13.1377 12.1942 13.0684 12.1942C13.0312 12.1942 12.9962 12.1783 12.9727 12.1502L3.6435 1.20169C3.33966 0.850174 2.89352 0.647392 2.42388 0.646973H2.09782C1.21536 0.646973 0.5 1.34833 0.5 2.2135V13.7863C0.5 14.6515 1.21536 15.3528 2.09782 15.3528C2.65336 15.3528 3.16915 15.0704 3.46017 14.6062L6.59558 10.0424C6.69769 9.89194 6.65624 9.68919 6.50279 9.58903C6.37845 9.50776 6.21394 9.51782 6.10071 9.61334L3.01446 12.2378C2.96318 12.283 2.88412 12.2784 2.83797 12.2281C2.81703 12.2051 2.80592 12.1753 2.80634 12.1447V3.92583C2.80634 3.85796 2.86232 3.80349 2.93155 3.80349C2.96831 3.80349 3.00377 3.81941 3.02728 3.84748L12.3552 14.7981C12.659 15.1496 13.1052 15.3524 13.5749 15.3528H13.9009C14.7833 15.3532 15.4992 14.6523 15.5 13.7871V2.2135C15.5 1.34833 14.7842 0.646973 13.9017 0.646973Z"
          fill="currentColor"
        />
      </svg>
      {word && <b>NEAR</b>}
    </span>
  );
}
type Method = "claim_business_reward" | "claim_prize" | "nft_transfer";
export function NearEconomy({
  state,
  cfg,
  owner,
  owners,
  onAction,
  onPlay,
}: {
  state: Snapshot | null;
  cfg: Config | null;
  owner: string | null;
  owners: string[];
  onAction: (method: Method, args: Record<string, unknown>) => Promise<string>;
  onPlay: () => void;
}) {
  const [assets, setAssets] = useState<Concession[]>([]),
    [prizes, setPrizes] = useState<PrizeStatus | null>(null),
    [pool, setPool] = useState<string | null>(null),
    [prizeClaim, setPrizeClaim] = useState<{
      account_id: string;
      claimable_yocto: string;
      paid_yocto: string;
    } | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [receipt, setReceipt] = useState(""),
    [actionMessage, setActionMessage] = useState(""),
    [recipient, setRecipient] = useState(""),
    [transfer, setTransfer] = useState<string | null>(null),
    [review, setReview] = useState(false);
  const runId = state?.record?.run_id,
    finished = !!state?.record?.run.finished && !state?.pending;
  const ownerKey = owners.join("|");
  const read = useCallback(async () => {
    if (!cfg) {
      setLoading(false);
      return;
    }
    const [p, f, current, owned, claim] = await Promise.all([
      view<PrizeStatus>(cfg, "get_prize_snapshot"),
      view<{ available_yocto: string }>(cfg, "get_business_fund"),
      runId
        ? view<Concession[]>(cfg, "get_concessions", { run_id: runId })
        : Promise.resolve([]),
      Promise.all(
        ownerKey
          .split("|")
          .filter(Boolean)
          .map((account_id) =>
            view<{ token_id: string }[]>(cfg, "nft_tokens_for_owner", {
              account_id,
              limit: 12,
            }),
          ),
      ).then((rows) => rows.flat()),
      Promise.all(
        ownerKey
          .split("|")
          .filter(Boolean)
          .map((account_id) =>
            view<{
              account_id: string;
              claimable_yocto: string;
              paid_yocto: string;
            }>(cfg, "get_prize_claim", { account_id }),
          ),
      ),
    ]);
    const ids = new Set(current.map((a) => a.token_id));
    const extra = await Promise.all(
      owned
        .filter((a) => !ids.has(a.token_id))
        .map((a) =>
          view<Concession>(cfg, "get_business_share", { token_id: a.token_id }),
        ),
    );
    return {
      prizes: p,
      pool: f.available_yocto,
      assets: [...current, ...extra],
      claim:
        claim.find((c) => BigInt(c.claimable_yocto) > 0n) ?? claim[0] ?? null,
    };
  }, [cfg, runId, ownerKey]);
  useEffect(() => {
    let active = true;
    const load = () =>
      void read()
        .then((v) => {
          if (active && v) {
            setPrizes(v.prizes);
            setPool(v.pool);
            setAssets(v.assets);
            setPrizeClaim(v.claim);
            setError("");
          }
        })
        .catch(() => {
          if (active)
            setError(
              "NEAR is taking a moment. Your ownership stays safe onchain.",
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    load();
    const timer = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [read, finished]);
  const act = async (
    method: Method,
    args: Record<string, unknown>,
    key: string,
  ) => {
    if (busy) return;
    setBusy(key);
    setError("");
    setReceipt("");
    setActionMessage("");
    try {
      const tx = await onAction(method, args);
      setReceipt(tx);
      setActionMessage(
        method === "nft_transfer"
          ? `Ownership transferred to ${String(args.receiver_id)}`
          : method === "claim_prize"
            ? "Competition prize collected in your NEAR account"
            : "Reward collected in your NEAR account",
      );
      setTransfer(null);
      setReview(false);
      setRecipient("");
      const v = await read();
      if (v) {
        setAssets(v.assets);
        setPrizeClaim(v.claim);
        setPrizes(v.prizes);
        setPool(v.pool);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not complete the action.",
      );
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="mp-near-economy">
      <div className="mp-near-intro">
        <NearMark word />
        <span>LIVE ON TESTNET · NO CASH VALUE</span>
      </div>
      <p className="mp-subtle">
        You run the park. Your neighbours run their businesses. NEAR records who
        owns each concession, enforces the agreements and pays funded rewards.
      </p>
      <details className="mp-near-explainer" open={state?.mode !== "near"}>
        <summary>How NEAR powers your economy</summary>
        <div className="mp-near-story">
          <div>
            <ShieldCheck size={19} />
            <strong>Own your share</strong>
            <p>
              Backing a merchant creates a transferable ownership certificate.
              It earns a fixed 20% of that shop’s sales in park credits.
            </p>
          </div>
          <div>
            <Coins size={19} />
            <strong>Collect a real chain transfer</strong>
            <p>
              A separate, funded testnet pool rewards those earnings. Collect
              after opening day; the current certificate owner holds the claim.
            </p>
          </div>
          <div>
            <Trophy size={19} />
            <strong>Compete under public rules</strong>
            <p>
              The same starting park and scoring rules for everyone. Prize
              standings freeze at the cutoff; funded payouts follow the frozen
              order.
            </p>
          </div>
        </div>
      </details>
      {state?.mode !== "near" && (
        <div className="mp-callout">
          <div>
            <strong>Try the economy on NEAR</strong>
            <p>
              We create your account and cover testnet gas. Your park needs no
              crypto purchase.
            </p>
          </div>
          <button className="mp-primary" onClick={onPlay}>
            Open a NEAR park <ArrowUpRight size={14} />
          </button>
        </div>
      )}
      <h3>Your business shares</h3>
      {loading ? (
        <p className="mp-subtle">
          Reading ownership and funded rewards from NEAR…
        </p>
      ) : assets.length === 0 ? (
        <p className="mp-subtle">
          Back Omar, Mina or Nia during your opening day. Their concession and
          earnings will appear here.
        </p>
      ) : (
        <div className="mp-owned-shares">
          {assets.map((a) => {
            const mine = owners.includes(a.owner_id),
              usable = a.closed && (a.owner_id !== owner || finished),
              claimable = BigInt(a.claimable_yocto) > 0n;
            return (
              <article key={a.token_id} className="mp-owned-share">
                <header>
                  <NearMark />
                  <div>
                    <strong>{a.merchant}’s concession</strong>
                    <small>
                      {a.share_percent}% sales share · certificate #{a.token_id}
                    </small>
                  </div>
                  <span>{mine ? "YOURS" : "TRANSFERRED"}</span>
                </header>
                <div className="mp-share-numbers">
                  <span>
                    Park income
                    <strong>{money(a.earned_credits_cents)} credits</strong>
                  </span>
                  <span>
                    Ready to collect
                    <strong>{testNear(a.claimable_yocto)} tNEAR</strong>
                  </span>
                </div>
                <p className="mp-fine">
                  {testNear(a.paid_yocto)} tNEAR collected ·{" "}
                  {a.closed
                    ? "Opening day settled"
                    : `Reward backing: up to ${testNear(a.reserved_yocto)} tNEAR`}
                  . Owner:{" "}
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://testnet.nearblocks.io/address/${a.owner_id}`}
                  >
                    {a.owner_id.slice(0, 18)}…
                  </a>
                </p>
                {mine && (
                  <div className="mp-share-actions">
                    <button
                      className="mp-primary"
                      disabled={
                        !usable || !claimable || !!busy || a.transfer_pending
                      }
                      onClick={() =>
                        void act(
                          "claim_business_reward",
                          { token_id: a.token_id },
                          a.token_id,
                        )
                      }
                    >
                      {busy === a.token_id ? (
                        "Confirming on NEAR…"
                      ) : BigInt(a.paid_yocto) > 0n && !claimable ? (
                        <>
                          <Check size={14} /> Collected
                        </>
                      ) : (
                        <>
                          Collect reward <Coins size={14} />
                        </>
                      )}
                    </button>
                    <button
                      disabled={!usable || !!busy || a.transfer_pending}
                      onClick={() => {
                        setTransfer(
                          transfer === a.token_id ? null : a.token_id,
                        );
                        setReview(false);
                      }}
                    >
                      Transfer ownership
                    </button>
                  </div>
                )}
                {mine && !usable && (
                  <p className="mp-fine">
                    Finish and confirm your opening day to collect or transfer
                    here. Your certificate already exists on NEAR.
                  </p>
                )}
                {transfer === a.token_id && (
                  <form
                    className="mp-share-transfer"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!review) {
                        if (!cfg) return;
                        if (recipient.trim() === a.owner_id) {
                          setError("You already own this concession.");
                          return;
                        }
                        setBusy("review");
                        setError("");
                        void checkRecipient(cfg, recipient.trim())
                          .then(() => setReview(true))
                          .catch((e) => setError(e.message))
                          .finally(() => setBusy(""));
                        return;
                      }
                      void act(
                        "nft_transfer",
                        {
                          token_id: a.token_id,
                          receiver_id: recipient.trim(),
                          approval_id: null,
                          memo: "Moonpark concession ownership transfer",
                        },
                        a.token_id,
                      );
                    }}
                  >
                    <label htmlFor={`recipient-${a.token_id}`}>
                      New owner’s NEAR testnet account
                    </label>
                    <input
                      id={`recipient-${a.token_id}`}
                      value={recipient}
                      onChange={(e) => {
                        setRecipient(e.target.value);
                        setReview(false);
                      }}
                      required
                      pattern="[a-z0-9]+([._-][a-z0-9]+)*"
                      minLength={2}
                      maxLength={64}
                      placeholder="their-account.testnet"
                      autoComplete="off"
                    />
                    <p className="mp-fine">
                      This gives the recipient the certificate and its
                      uncollected reward. Your park score stays with you.
                      Ownership transfers cannot be undone by Moonpark.
                    </p>
                    {review && (
                      <p>
                        Send certificate <strong>#{a.token_id}</strong> and its{" "}
                        <strong>{testNear(a.claimable_yocto)} tNEAR</strong>{" "}
                        claim to <strong>{recipient.trim()}</strong>?
                      </p>
                    )}
                    <button className="mp-secondary" disabled={!!busy}>
                      {review
                        ? "Confirm ownership transfer"
                        : "Review transfer"}
                    </button>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}
      {prizes && (
        <div className="mp-near-pools">
          <div>
            <strong>Merchant reward pool</strong>
            <span>{pool === null ? "—" : testNear(pool)} tNEAR available</span>
            <small>
              Separate from the park’s lunar credits. Up to 0.02 tNEAR is
              reserved per certificate, subject to available backing.
            </small>
          </div>
          <div>
            <strong>Competition escrow</strong>
            <span>{testNear(prizes.escrow_yocto)} tNEAR deposited</span>
            <small>
              {prizes.award_tier === "pending"
                ? "Awaiting the award condition and frozen eligible standings."
                : `${prizes.award_tier} tier allocated by the contract.`}{" "}
              The conditional US$1K/US$5K pledge is not funded by these testnet
              tokens.
            </small>
          </div>
        </div>
      )}
      {prizeClaim && BigInt(prizeClaim.claimable_yocto) > 0n && (
        <button
          className="mp-primary"
          disabled={(prizeClaim.account_id === owner && !finished) || !!busy}
          onClick={() =>
            void act(
              "claim_prize",
              { account_id: prizeClaim.account_id },
              "prize",
            )
          }
        >
          Collect competition prize · {testNear(prizeClaim.claimable_yocto)}{" "}
          tNEAR
        </button>
      )}
      {actionMessage && (
        <p className="mp-action-success" role="status">
          <Check size={15} />
          {actionMessage}
        </p>
      )}
      {receipt && (
        <a
          className="mp-settlement-link"
          target="_blank"
          rel="noreferrer"
          href={`https://testnet.nearblocks.io/txns/${receipt}`}
        >
          <Check size={14} /> Confirmed on NEAR · view receipt{" "}
          <ExternalLink size={12} />
        </a>
      )}
      {error && (
        <p role="status" className="mp-near-error">
          {error}
        </p>
      )}
      {cfg && (
        <a
          className="mp-settlement-link"
          href={`https://testnet.nearblocks.io/address/${cfg.contractId}`}
          target="_blank"
          rel="noreferrer"
        >
          Inspect the economy contract <ExternalLink size={12} />
        </a>
      )}
      <p className="mp-fine">
        The economy contract is deployed without access keys or an upgrade
        method. NPC wallets are contract-managed game balances, not independent
        signing wallets. Testnet rewards have no cash value and never increase
        your ranked starting resources. Account keys stay in this browser;
        transfer to a testnet wallet you control to keep ownership elsewhere.
      </p>
    </div>
  );
}
