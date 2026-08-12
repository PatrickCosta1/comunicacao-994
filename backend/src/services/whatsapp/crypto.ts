import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const BYTES_MARKER = "__b64_bytes__";

function getKey() {
  const raw = process.env.WHATSAPP_AUTH_ENC_KEY;
  if (!raw) {
    throw new Error("WHATSAPP_AUTH_ENC_KEY não definido");
  }

  return crypto.createHash("sha256").update(raw).digest();
}

// Converte Uint8Array/Buffer para um objeto com marcador, preservando o tipo
function replacer(_key: string, value: unknown) {
  if (value instanceof Uint8Array) {
    return { [BYTES_MARKER]: Buffer.from(value).toString("base64") };
  }
  return value;
}

// Restaura Uint8Array a partir do marcador
function reviver(_key: string, value: unknown) {
  if (value && typeof value === "object" && BYTES_MARKER in (value as any)) {
    return new Uint8Array(Buffer.from((value as any)[BYTES_MARKER], "base64"));
  }
  return value;
}

export function encryptJson(value: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(value, replacer), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptJson<T>(payload: string): T {
  const buffer = Buffer.from(payload, "base64");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  return JSON.parse(decrypted, reviver) as T;
}
