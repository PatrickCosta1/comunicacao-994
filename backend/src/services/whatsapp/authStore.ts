import { supabase } from "../../lib/supabase";
import { decryptJson, encryptJson } from "./crypto";

const TABLE = "whatsapp_auth_state";
const SESSION_ID = "default";

export type PersistedAuthState = {
  creds: any;
  keys: Record<string, Record<string, any>>;
};

export type PersistableKeyStore = {
  get: (type: string, ids: string[]) => Promise<Record<string, any>>;
  set: (data: Record<string, Record<string, any>>) => Promise<void>;
  clear: () => Promise<void>;
  isInTransaction: () => boolean;
  transaction: <T>(exec: () => Promise<T>, _key: string) => Promise<T>;
};

async function ensureRow() {
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      {
        id: SESSION_ID,
        creds_payload: encryptJson({}),
        keys_payload: encryptJson({}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) {
    throw error;
  }
}

export async function loadAuthState(): Promise<PersistedAuthState | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("creds_payload, keys_payload")
    .eq("id", SESSION_ID)
    .single();

  if (error || !data) {
    return null;
  }

  try {
    const creds = decryptJson<any>(data.creds_payload);
    const keys = decryptJson<Record<string, Record<string, any>>>(data.keys_payload);

    // Valida que os campos binários vieram como Uint8Array/Buffer.
    // Credenciais gravadas antes da correção de serialização ficam corrompidas
    // (buffers como objetos comuns) e quebram o handshake do Baileys.
    const noiseKey = creds?.noiseKey;
    const identityKey = creds?.signedIdentityKey;
    const hasCorruptBytes =
      (noiseKey?.public && !(noiseKey.public instanceof Uint8Array)) ||
      (noiseKey?.private && !(noiseKey.private instanceof Uint8Array)) ||
      (identityKey?.public && !(identityKey.public instanceof Uint8Array));

    if (hasCorruptBytes) {
      console.warn("⚠️ WhatsApp: credenciais corrompidas detetadas, a iniciar nova sessão");
      return null;
    }

    return { creds, keys };
  } catch (err) {
    console.warn("⚠️ WhatsApp: falha ao ler credenciais, a iniciar nova sessão:", err);
    return null;
  }
}

export async function saveAuthState(state: PersistedAuthState) {
  if (!state?.creds) {
    throw new Error("credenciais WhatsApp ausentes");
  }

  await ensureRow();

  const { error } = await supabase.from(TABLE).upsert(
    {
      id: SESSION_ID,
      creds_payload: encryptJson(state.creds),
      keys_payload: encryptJson(state.keys),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    throw error;
  }
}

export function createPersistableKeyStore(
  initialKeys: Record<string, Record<string, any>>,
  persist: () => Promise<void>
): PersistableKeyStore {
  const keys = initialKeys;

  return {
    get: async (type, ids) => {
      const bucket = keys[type] || {};
      const result: Record<string, any> = {};

      for (const id of ids) {
        const value = bucket[id];
        if (value !== undefined) {
          result[id] = value;
        }
      }

      return result;
    },
    set: async (data) => {
      for (const [type, records] of Object.entries(data)) {
        keys[type] = {
          ...(keys[type] || {}),
          ...records,
        };
      }

      await persist();
    },
    clear: async () => {
      for (const key of Object.keys(keys)) {
        delete keys[key];
      }

      await persist();
    },
    isInTransaction: () => false,
    transaction: async <T>(exec: () => Promise<T>) => exec(),
  };
}
