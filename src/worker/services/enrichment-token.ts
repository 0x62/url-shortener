/** Sign only the event ID and expiry; screen size is untrusted visitor metadata. */
export async function signTokenMessage(
  secret: string,
  message: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message),
  );
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function verifyTokenSignature(
  secret: string,
  message: string,
  signature: string,
): Promise<boolean> {
  const expected = await signTokenMessage(secret, message);
  if (signature.length !== expected.length) {
    return false;
  }
  // Compare every byte rather than stopping at the first mismatch.
  let difference = 0;
  for (let index = 0; index < signature.length; index++) {
    difference |= signature.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}
