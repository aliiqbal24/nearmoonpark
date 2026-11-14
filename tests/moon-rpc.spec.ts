import { test, expect } from "@playwright/test";
import * as near from "near-api-js";
import {
  AccessKeyNotEnoughAllowanceActionError,
  InvalidNonceError,
  NotEnoughBalanceError,
} from "near-api-js/rpc-errors";
import { failoverRpc } from "../lib/moon/rpc";

test("transaction nonce and gas failures reach recovery without network failover", async () => {
  const publicKey = near.KeyPair.fromRandom("ed25519").getPublicKey();
  const errors = [
    new InvalidNonceError(2, 1, "transaction", "block"),
    new AccessKeyNotEnoughAllowanceActionError(
      "park.testnet",
      1n,
      2n,
      publicKey,
      null,
      "transaction",
      "block",
    ),
    new NotEnoughBalanceError(1n, 2n, "park.testnet", "transaction", "block"),
  ];
  for (const error of errors) {
    const provider = failoverRpc(near, [
      "https://first.invalid",
      "https://second.invalid",
    ]);
    let fallbackCalls = 0;
    provider.providers[0].sendTransactionUntil = async () => {
      throw error;
    };
    provider.providers[1].sendTransactionUntil = async () => {
      fallbackCalls++;
      throw Error("The same rejected signature reached the fallback");
    };
    await expect(
      provider.sendTransactionUntil({} as near.SignedTransaction, "EXECUTED"),
    ).rejects.toBe(error);
    expect(fallbackCalls).toBe(0);
  }
});

test("transaction transport failures retain endpoint failover", async () => {
  const provider = failoverRpc(near, [
    "https://first.invalid",
    "https://second.invalid",
  ]);
  const accepted = { transaction: { hash: "accepted" } };
  provider.providers[0].sendTransactionUntil = async () => {
    throw TypeError("Network unavailable");
  };
  provider.providers[1].sendTransactionUntil = async () => accepted as never;
  await expect(
    provider.sendTransactionUntil({} as near.SignedTransaction, "EXECUTED"),
  ).resolves.toBe(accepted);
});
