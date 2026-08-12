/**
 * Pareamento local do WhatsApp (fora do Render).
 *
 * Como o Render free hiberna (spin-down) e o handshake do Baileys tem timeout curto,
 * fazer o pareamento dentro do Render é frágil. Este script corre na tua máquina,
 * grava a sessão no Supabase, e o Render só reutiliza as credenciais no envio.
 *
 * Uso:
 *   Set-Location backend
 *   $env:SUPABASE_URL="..."; $env:SUPABASE_KEY="..."; $env:WHATSAPP_AUTH_ENC_KEY="..."
 *   npx tsx src/scripts/pairWhatsApp.ts 351939287873
 *
 * Depois de veres o código no terminal, abre o WhatsApp no telemóvel:
 *   Definições -> Dispositivos ligados -> Ligar um dispositivo -> Ligar com código
 */
import makeWASocket, { Browsers, DisconnectReason, fetchLatestBaileysVersion, initAuthCreds } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { loadAuthState, saveAuthState, createPersistableKeyStore } from "../services/whatsapp/authStore";

const phoneNumber = process.argv[2];

if (!phoneNumber) {
  console.error("Uso: npx tsx src/scripts/pairWhatsApp.ts <numeroComCodigoDoPais>");
  console.error("Exemplo: npx tsx src/scripts/pairWhatsApp.ts 351939287873");
  process.exit(1);
}

const normalized = phoneNumber.replace(/\D/g, "");

async function main() {
  const persisted = await loadAuthState();
  const { version } = await fetchLatestBaileysVersion();

  let creds = persisted?.creds || initAuthCreds();
  const keyState = persisted?.keys || {};

  const persist = async () => {
    await saveAuthState({ creds, keys: keyState });
    console.log("💾 Sessão gravada no Supabase");
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

  sock.ev.on("creds.update", async (updatedCreds) => {
    try {
      const currentCreds = updatedCreds || sock.authState?.creds;
      if (!currentCreds) return;
      creds = currentCreds;
      await saveAuthState({ creds, keys: keyState });
    } catch (err) {
      console.error("Falha ao persistir credenciais:", err);
    }
  });

  sock.ev.on("connection.update", (update) => {
    if (update.connection === "close") {
      const code = (update.lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.error("Sessão terminada (logged out).");
        process.exit(1);
      }
      console.error("Ligação fechada:", code);
    }
  });

  // Espera o WebSocket físico abrir antes de pedir o código
  await sock.waitForSocketOpen();

  const code = await sock.requestPairingCode(normalized);
  console.log("═══════════════════════════════════════════");
  console.log("📱 Abre o WhatsApp no telemóvel:");
  console.log("   Definições -> Dispositivos ligados");
  console.log("   -> Ligar um dispositivo");
  console.log("   -> Ligar com código / número de telefone");
  console.log("");
  console.log(`🔢 Código de pareamento: ${code}`);
  console.log("");
  console.log("Este código expira em alguns minutos.");
  console.log("═══════════════════════════════════════════");

  // Mantém o processo vivo até a sessão ser gravada
  const timeout = setTimeout(() => {
    console.error("Timeout de 3 minutos sem pareamento concluído.");
    sock.end(undefined);
    process.exit(1);
  }, 3 * 60 * 1000);

  const saveTimer = setInterval(async () => {
    try {
      await persist();
    } catch (err) {
      console.error("Falha ao persistir:", err);
    }
  }, 30 * 1000);

  sock.ev.on("connection.update", (update) => {
    if (update.connection === "open") {
      clearTimeout(timeout);
      clearInterval(saveTimer);
      console.log("✅ Pareamento concluído com sucesso!");
      sock.end(undefined);
      process.exit(0);
    }
  });
}

main().catch((err) => {
  console.error("Erro no pareamento:", err);
  process.exit(1);
});
