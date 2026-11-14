export type RenewalProof = {
  accountId: string;
  publicKey: string;
  issuedAt: number;
  signature: string;
};

export function renewalMessage(
  contractId: string,
  accountId: string,
  recoveryPublicKey: string,
  sessionPublicKey: string,
  issuedAt: number,
) {
  return new TextEncoder().encode(
    JSON.stringify([
      "moonpark-sponsored-renewal-v1",
      contractId,
      accountId,
      recoveryPublicKey,
      sessionPublicKey,
      issuedAt,
    ]),
  );
}
