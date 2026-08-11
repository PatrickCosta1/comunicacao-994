import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  initAuthCreds,
  AnyMessageContent,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { createPersistableKeyStore, loadAuthState, saveAuthState } from "./authStore";

type SendResult = {
  success: boolean;
  messageId?: string;
  qr?: string;
};

export async function sendWhatsAppText(jid: string, text: string): Promise<SendResult> {
  const persisted = await loadAuthState();
  const { version } = await fetchLatestBaileysVersion();

  const creds = persisted?.creds || initAuthCreds();
  const keyState = persisted?.keys || {};
  const persist = async () => {
    await saveAuthState({ creds, keys: keyState });
  };
  const keyStore = createPersistableKeyStore(keyState, persist);

  const sock = makeWASocket({
    version,
    browser: Browsers.macOS("Chrome"),
    auth: {
      creds,
      keys: keyStore as any,
    } as any,
    printQRInTerminal: true,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    getMessage: async () => undefined,
    cachedGroupMetadata: async () => undefined,
    shouldIgnoreJid: () => false,
    logger: undefined,
  });

  sock.ev.on("creds.update", async () => {
    await saveAuthState({
      creds: sock.authState.creds,
      keys: sock.authState.keys as any,
    });
  });

  const connectionResult = await new Promise<SendResult>((resolve, reject) => {
    sock.ev.on("connection.update", async (update) => {
      if (update.connection === "open") {
        try {
          const message = await sock.sendMessage(jid, { text } as AnyMessageContent);
          resolve({ success: true, messageId: message?.key?.id || undefined });
        } catch (error) {
          reject(error);
        } finally {
          sock.end(undefined);
        }
      }

      if (update.connection === "close") {
        const statusCode = (update.lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        if (statusCode === DisconnectReason.loggedOut) {
          reject(new Error("WhatsApp session logged out"));
          return;
        }

        reject(new Error(`WhatsApp disconnected: ${String(statusCode || "unknown")}`));
      }
    });
  });

  await persist();
  return connectionResult;
}
