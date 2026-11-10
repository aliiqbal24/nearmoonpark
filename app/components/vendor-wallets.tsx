"use client";
import { useEffect, useState } from "react";
import { ExternalLink, Wallet } from "lucide-react";
import { view, type Config } from "@/lib/moon/near";
import { money } from "@/lib/moon/model";
import { NearMark } from "./near-economy";

type Economy = {
  revision: number;
  tick: number;
  locked: boolean;
  wallets: { role: string; account_id: string; balances: string[] }[];
};
const names: Record<string, string> = {
  park: "Your park",
  passengers: "Visitor budgets",
  omar: "Omar · Moon Pie Kitchen",
  mina: "Mina · Crater Coolers",
  logistics: "Lunar Logistics",
};

export function VendorWallets({ cfg, runId }: { cfg: Config; runId: string }) {
  const [open, setOpen] = useState(false);
  const [economy, setEconomy] = useState<Economy | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    const refresh = async () => {
      try {
        const value = await view<Economy>(cfg, "get_run_economy", {
          run_id: runId,
        });
        if (active) {
          setEconomy(value);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [cfg, runId, open]);
  return (
    <details
      className="mp-vendor-wallets"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <NearMark /> View testnet wallets
      </summary>
      <p className="mp-fine">
        Omar and Mina receive payments, buy stock and pay your park a fixed 10%
        share automatically. Each owner has a separate NEAR account and a signed
        spending policy. Each opening day has its own finite credits and stock.
      </p>
      {error && (
        <p role="status">
          Wallet updates are taking a moment. The park keeps running.
        </p>
      )}
      {!economy && !error && open && (
        <p role="status">Reading confirmed balances…</p>
      )}
      {economy && (
        <>
          <p className="mp-fine">
            Confirmed at {economy.tick}s · revision {economy.revision}
          </p>
          <div className="mp-wallet-list">
            {economy.wallets.map((wallet) => (
              <div key={wallet.role}>
                <a
                  href={`https://testnet.nearblocks.io/address/${wallet.account_id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Wallet size={15} /> {names[wallet.role]}{" "}
                  <ExternalLink size={12} />
                </a>
                <strong>{money(Number(wallet.balances[0]))} credits</strong>
                {(wallet.role === "omar" || wallet.role === "mina") && (
                  <small>
                    {wallet.balances[wallet.role === "omar" ? 1 : 2]} units
                    owned, including paid deliveries
                  </small>
                )}
              </div>
            ))}
          </div>
          <p className="mp-fine">
            {economy.locked
              ? "Assets are committed to this opening day until closing."
              : "Opening-day assets are unlocked. Transfers use the multi-token contract."}{" "}
            Guest budgets share a passenger escrow. Multiple shops owned by the
            same vendor share that owner’s wallet. All amounts are testnet game
            assets with no cash value.
          </p>
        </>
      )}
    </details>
  );
}
