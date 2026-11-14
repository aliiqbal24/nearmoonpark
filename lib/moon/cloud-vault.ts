import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key() {
  const value = process.env.MOON_CLOUD_SAVE_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value))
    throw Error("Park recovery is awaiting server configuration.");
  return Buffer.from(value, "hex");
}
export function sealRecovery(
  value: unknown,
  userId: string,
  contractId: string,
) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(`moonpark-recovery-v1:${userId}:${contractId}`));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}
export function openRecovery(
  value: string,
  userId: string,
  contractId: string,
): unknown {
  const bytes = Buffer.from(value, "base64"),
    decipher = createDecipheriv("aes-256-gcm", key(), bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(`moonpark-recovery-v1:${userId}:${contractId}`));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([
      decipher.update(bytes.subarray(28)),
      decipher.final(),
    ]).toString("utf8"),
  );
}
