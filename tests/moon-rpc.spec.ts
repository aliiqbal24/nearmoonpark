import { test, expect } from "@playwright/test";
import * as near from "near-api-js";
import {
  AccessKeyNotEnoughAllowanceActionError,
  InvalidNonceError,
  NotEnoughBalanceError,
} from "near-api-js/rpc-errors";
import { failoverRpc, reducedPrepaidGas } from "../lib/moon/rpc";
import { renewalMessage } from "../lib/moon/sponsorship";

test("renewal signatures bind the park contract and both replacement keys", async () => {
  const signer = near.KeyPair.fromRandom("ed25519");
  const issuedAt = Date.now();
  const message = renewalMessage(
    "park.testnet",
    "operator.testnet",
    "recovery",
    "session",
    issuedAt,
  );
  const signature = signer.sign(message).signature;
  const publicKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(signer.getPublicKey().data),
    "Ed25519",
    false,
    ["verify"],
  );
  expect(
    await crypto.subtle.verify(
      "Ed25519",
      publicKey,
      new Uint8Array(signature),
      message,
    ),
  ).toBe(true);
  for (const changed of [
    renewalMessage(
      "other.testnet",
      "operator.testnet",
      "recovery",
      "session",
      issuedAt,
    ),
    renewalMessage(
      "park.testnet",
      "other.testnet",
      "recovery",
      "session",
      issuedAt,
    ),
    renewalMessage(
      "park.testnet",
      "operator.testnet",
      "different",
      "session",
      issuedAt,
    ),
    renewalMessage(
      "park.testnet",
      "operator.testnet",
      "recovery",
      "different",
      issuedAt,
    ),
    renewalMessage(
      "park.testnet",
      "operator.testnet",
      "recovery",
      "session",
      issuedAt + 1,
    ),
  ])
    expect(
      await crypto.subtle.verify(
        "Ed25519",
        publicKey,
        new Uint8Array(signature),
        changed,
      ),
    ).toBe(false);
});

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

test("settlement reservations fit both session allowances and account balances", () => {
  const publicKey = near.KeyPair.fromRandom("ed25519").getPublicKey();
  const available = 244000000000000000000000n;
  const cost = 251000000000000000000000n;
  const failures = [
    new AccessKeyNotEnoughAllowanceActionError(
      "park.testnet",
      available,
      cost,
      publicKey,
      null,
      "transaction",
      "block",
    ),
    new NotEnoughBalanceError(
      available,
      cost,
      "park.testnet",
      "transaction",
      "block",
    ),
  ];
  for (const error of failures) {
    const gas = reducedPrepaidGas(error, 250000000000000n);
    expect(gas).toBe(218725099601593n);
    expect(gas).toBeGreaterThanOrEqual(110000000000000n);
    expect((cost * gas) / 250000000000000n).toBeLessThan(available);
  }
  const depleted = new NotEnoughBalanceError(
    1n,
    cost,
    "park.testnet",
    "transaction",
    "block",
  );
  expect(() => reducedPrepaidGas(depleted, 250000000000000n)).toThrow(depleted);
  const unrelated = new InvalidNonceError(2, 1, "transaction", "block");
  expect(() => reducedPrepaidGas(unrelated, 250000000000000n)).toThrow(unrelated);
});
