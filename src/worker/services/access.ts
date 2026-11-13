import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Env } from "../types";
const jwksByIssuer = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
export async function authorized(request: Request, env: Env) {
  const host = new URL(request.url).hostname;
  if (
    env.DEV_AUTH_BYPASS === "true" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(host)
  )
    return true;
  if (
    !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN) ||
    !env.ACCESS_AUD
  )
    return false;
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return false;
  try {
    const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
    let jwks = jwksByIssuer.get(issuer);
    if (!jwks) {
      jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
      jwksByIssuer.set(issuer, jwks);
    }
    await jwtVerify(token, jwks, {
      issuer,
      audience: env.ACCESS_AUD,
      algorithms: ["RS256"],
    });
    return true;
  } catch {
    return false;
  }
}
