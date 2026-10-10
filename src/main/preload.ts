import { contextBridge, ipcRenderer } from "electron";

const channels = [
  "accounts:list", "accounts:add", "accounts:remove", "conversations:list", "messages:list",
  "messages:send", "contacts:list", "contacts:sync", "contacts:save", "contacts:delete",
] as const;

contextBridge.exposeInMainWorld("api", {
  invoke: (channel: (typeof channels)[number], ...args: unknown[]) => {
    if (!channels.includes(channel)) throw new Error("Blocked channel");
    return ipcRenderer.invoke(channel, ...args);
  },
});
