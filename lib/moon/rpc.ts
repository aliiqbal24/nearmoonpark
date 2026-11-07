import { InvalidNonceError } from "near-api-js/rpc-errors";
import type { FailoverRpcProvider } from "near-api-js";

// near-api-js refreshes its nonce cache for InvalidNonceError. Its failover
// provider wraps that error, hiding it from Account's built-in retry. Preserve
// the actual SDK error so concurrent tabs / sponsor workers can recover.
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
      try {
        return await super.sendTransactionUntil(...args);
      } catch (error) {
        const nonce = (error as { errors?: unknown[] })?.errors?.find(
          (e) => e instanceof InvalidNonceError,
        );
        if (nonce) throw nonce;
        throw error;
      }
    }
  }
  return new Provider(urls.map((url) => new api.JsonRpcProvider({ url })));
}
