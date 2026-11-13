import {
  verifyTokenSignature,
  signTokenMessage,
} from "../services/enrichment-token";

export const TOKEN_TTL_MS = 5 * 60 * 1000;
export type EnrichmentToken = { id: string; expires: number; sig: string };
export type EnrichmentPayload = EnrichmentToken & { w: number; h: number };

export async function createEnrichmentToken(
  secret: string,
  hitId: string,
): Promise<EnrichmentToken> {
  const expires = Date.now() + TOKEN_TTL_MS;
  return {
    id: hitId,
    expires,
    sig: await signTokenMessage(secret, `${hitId}.${expires}`),
  };
}

export async function isValidEnrichmentToken(
  value: unknown,
  secret?: string,
): Promise<boolean> {
  if (!value || typeof value !== "object" || !secret) return false;
  const token = value as Partial<EnrichmentToken>;
  const now = Date.now();
  if (typeof token.id !== "string" || !/^\w{8}-[\w-]{27}$/.test(token.id))
    return false;
  if (typeof token.expires !== "number" || !Number.isInteger(token.expires))
    return false;
  if (token.expires < now || token.expires > now + TOKEN_TTL_MS) return false;
  if (typeof token.sig !== "string") return false;
  return verifyTokenSignature(
    secret,
    `${token.id}.${token.expires}`,
    token.sig,
  );
}

export function hasValidScreenSize(payload: EnrichmentPayload): boolean {
  return [payload.w, payload.h].every(
    (size) => Number.isInteger(size) && size >= 1 && size <= 20000,
  );
}
