import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Hub } from "./hub";
import { Store } from "./store";
import { SecretStore } from "./secrets";
import type { Provider } from "./types";

const fake = (): Provider => {
  const sent: string[] = [];
  return {
    id: "matrix",
    capabilities: { contactsRead: true, contactsWrite: true },
    connect: async () => ({ label: "me" }),
    listConversations: async () => [{ externalId: "r1", title: "Room", lastMessageAt: 1 }],
    fetchMessages: async () => [{ sender: "a", text: sent.join(",") || "hi", timestamp: 1, outgoing: false }],
    sendMessage: async (_c, t) => { sent.push(t); },
    listContacts: async () => [{ externalId: "u1", name: "Ann" }],
    saveContact: async () => {},
  };
};

describe("Hub", () => {
  it("adds accounts, sends, syncs and edits contacts", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-"));
    const hub = new Hub(
      new Store(path.join(dir, "d.json")),
      new SecretStore(path.join(dir, "s.json"), { encrypt: (s) => Buffer.from(s), decrypt: (b) => b.toString() }),
      fake,
    );
    const acc = await hub.addAccount("matrix", { token: "x" });
    const [conv] = await hub.conversations();
    expect(conv.id).toBe(`${acc.id}|r1`);
    await hub.send(conv.id, "yo");
    expect((await hub.messages(conv.id))[0].text).toBe("yo");
    await hub.syncContacts(acc.id);
    expect(hub.contacts()[0].name).toBe("Ann");
    const c = await hub.saveContact({ ...hub.contacts()[0], name: "Anna" });
    expect(hub.contacts()).toHaveLength(1);
    expect(c.name).toBe("Anna");
    await hub.deleteContact(c.id);
    expect(hub.contacts()).toHaveLength(0);
  });
});
