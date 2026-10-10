import { app, BrowserWindow, ipcMain, safeStorage } from "electron";
import * as path from "node:path";
import { Hub } from "../core/hub";
import { Store } from "../core/store";
import { SecretStore } from "../core/secrets";
import { createProvider } from "../providers/registry";

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const dev = process.env.VITE_DEV_URL;
  if (dev) win.loadURL(dev);
  else win.loadFile(path.join(__dirname, "../../renderer/index.html"));
}

app.whenReady().then(() => {
  const dir = app.getPath("userData");
  const hub = new Hub(
    new Store(path.join(dir, "data.json")),
    new SecretStore(path.join(dir, "secrets.json"), {
      encrypt: (s) => safeStorage.encryptString(s),
      decrypt: (b) => safeStorage.decryptString(b),
    }),
    createProvider,
  );
  const h = (name: string, fn: (...a: any[]) => unknown) => ipcMain.handle(name, (_e, ...a) => fn(...a));
  h("accounts:list", () => hub.listAccounts());
  h("accounts:add", (p, creds) => hub.addAccount(p, creds));
  h("accounts:remove", (id) => hub.removeAccount(id));
  h("conversations:list", () => hub.conversations());
  h("messages:list", (id) => hub.messages(id));
  h("messages:send", (id, text) => hub.send(id, text));
  h("contacts:list", () => hub.contacts());
  h("contacts:sync", (id) => hub.syncContacts(id));
  h("contacts:save", (c) => hub.saveContact(c));
  h("contacts:delete", (id) => hub.deleteContact(id));
  createWindow();
});

app.on("window-all-closed", () => app.quit());
