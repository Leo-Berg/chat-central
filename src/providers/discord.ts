import type { Provider, ProviderCredentials } from "../core/types";

const API = "https://discord.com/api/v10";

/** Discord via a bot token (user-account automation violates Discord's ToS). */
export class DiscordProvider implements Provider {
  readonly id = "discord" as const;
  readonly capabilities = { contactsRead: false, contactsWrite: false };
  private token = "";
  private selfId = "";

  private async api(method: string, p: string, body?: unknown): Promise<any> {
    const res = await fetch(API + p, {
      method,
      headers: { Authorization: `Bot ${this.token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`Discord ${method} ${p}: ${res.status}`);
    return res.json();
  }

  async connect(creds: ProviderCredentials) {
    this.token = creds.botToken;
    const me = await this.api("GET", "/users/@me");
    this.selfId = me.id;
    return { label: `${me.username} (bot)` };
  }

  async listConversations() {
    const out: { externalId: string; title: string; lastMessageAt: number }[] = [];
    for (const g of await this.api("GET", "/users/@me/guilds")) {
      for (const c of await this.api("GET", `/guilds/${g.id}/channels`)) {
        if (c.type === 0) out.push({ externalId: c.id, title: `${g.name} #${c.name}`, lastMessageAt: 0 });
      }
    }
    for (const c of await this.api("GET", "/users/@me/channels")) {
      out.push({ externalId: c.id, title: c.recipients?.map((r: any) => r.username).join(", ") ?? c.id, lastMessageAt: 0 });
    }
    return out;
  }

  async fetchMessages(channel: string) {
    const msgs: any[] = await this.api("GET", `/channels/${channel}/messages?limit=50`);
    return msgs.reverse().map((m) => ({
      sender: m.author.username as string,
      text: (m.content as string) || "[attachment]",
      timestamp: Date.parse(m.timestamp),
      outgoing: m.author.id === this.selfId,
    }));
  }

  async sendMessage(channel: string, text: string) {
    await this.api("POST", `/channels/${channel}/messages`, { content: text });
  }

  async listContacts() { return []; }
}
