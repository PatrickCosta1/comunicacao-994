import makeWASocket, { Browsers, fetchLatestBaileysVersion, initAuthCreds } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { DisconnectReason } from "@whiskeysockets/baileys";
import { createPersistableKeyStore, loadAuthState, saveAuthState } from "./authStore";

export type WhatsAppPairingState = {
  status: "idle" | "pairing" | "paired" | "error";
  phoneNumber?: string;
  code?: string;
  error?: string;
  updatedAt: string;
};

type PairingSession = {
  sock: ReturnType<typeof makeWASocket>;
  state: WhatsAppPairingState;
};

let currentSession: PairingSession | null = null;

function normalizePhoneNumber(phoneNumber: string) {
  return phoneNumber.replace(/\D/g, "");
}

function getInitialState(): WhatsAppPairingState {
  return {
    status: "idle",
    updatedAt: new Date().toISOString(),
  };
}

export function getWhatsAppPairingState() {
  return currentSession?.state || getInitialState();
}

export async function startWhatsAppPairing(phoneNumber: string) {
  if (currentSession?.state.status === "pairing") {
    return currentSession.state;
  }

  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) {
    throw new Error("phoneNumber inválido");
  }

  const persisted = await loadAuthState();
  const { version } = await fetchLatestBaileysVersion();
  const creds = persisted?.creds || initAuthCreds();
  const keyState = persisted?.keys || {};
  const persist = async () => {
    await saveAuthState({ creds, keys: keyState });
  };
  const keys = createPersistableKeyStore(keyState, persist);

  const sock = makeWASocket({
    version,
    browser: Browsers.macOS("Chrome"),
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    getMessage: async () => undefined,
    cachedGroupMetadata: async () => undefined,
    shouldIgnoreJid: () => false,
    auth: {
      creds,
      keys: keys as any,
    } as any,
  });

  const sessionState: WhatsAppPairingState = {
    status: "pairing",
    phoneNumber: normalized,
    updatedAt: new Date().toISOString(),
  };

  currentSession = { sock, state: sessionState };

  sock.ev.on("creds.update", async () => {
    await saveAuthState({
      creds: sock.authState.creds,
      keys: sock.authState.keys as any,
    });
  });

  sock.ev.on("connection.update", async (update) => {
    if (update.connection === "open") {
      currentSession = {
        sock,
        state: {
          status: "paired",
          phoneNumber: normalized,
          updatedAt: new Date().toISOString(),
        },
      };
      await persist();
      return;
    }

    if (update.connection === "close") {
      const statusCode = (update.lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      if (statusCode === DisconnectReason.loggedOut) {
        currentSession = {
          sock,
          state: {
            status: "error",
            phoneNumber: normalized,
            error: "WhatsApp session logged out",
            updatedAt: new Date().toISOString(),
          },
        };
        return;
      }

      currentSession = {
        sock,
        state: {
          status: "error",
          phoneNumber: normalized,
          error: `WhatsApp disconnected: ${String(statusCode || "unknown")}`,
          updatedAt: new Date().toISOString(),
        },
      };
    }
  });

  const code = await sock.requestPairingCode(normalized);
  sessionState.code = code;
  sessionState.updatedAt = new Date().toISOString();

  return sessionState;
}
