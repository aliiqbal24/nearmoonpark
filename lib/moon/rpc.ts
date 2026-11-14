import {
  AccessKeyNotEnoughAllowanceActionError,
  InvalidNonceError,
  NotEnoughBalanceError,
} from "near-api-js/rpc-errors";
import type { FailoverRpcProvider } from "near-api-js";

// Nonce and gas-budget errors need a new signature or reservation. Retrying
// that same transaction at another endpoint delays the account's recovery.
export function failoverRpc(
  api: Pick<
    typeof import("near-api-js"),
    "FailoverRpcProvider" | "JsonRpcProvider"
  >,
  urls: string[],
) {
  class Provider extends api.FailoverRpcProvider {
    override async sendTransactionUntil(
      ...args: Parameters<FailoverRpcProvider["sendTransactionUntil"]>
    ) {
      let last;
      for (const provider of this.providers) {
        try {
          return await provider.sendTransactionUntil(...args);
        } catch (error) {
          if (
            error instanceof InvalidNonceError ||
            error instanceof AccessKeyNotEnoughAllowanceActionError ||
            error instanceof NotEnoughBalanceError
          )
            throw error;
          last = error;
        }
      }
      throw last;
    }
  }
  return new Provider(
    urls.map(
      (url) =>
        new api.JsonRpcProvider(
          { url },
          { retries: 2, wait: 300, backoff: 1.5 },
        ),
    ),
  );
}
