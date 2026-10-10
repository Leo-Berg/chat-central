import type { Provider, ProviderCredentials } from "../core/types";

/** Matrix client-server API using an access token. */
export class MatrixProvider implements Provider {
  readonly id = "matrix" as const;
  readonly capabilities = { contactsRead: true, contactsWrite: false };
  private base = "";
  private token = "";
  private userId = "";

  private async api(method: string, p: string, body?: unknown): Promise<any> {
    const res = await fetch(`${this.base}/_matrix/client/v3${p}`, {
      method,
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`Matrix ${method} ${p}: ${res.status}`);
    return res.json();
  }

  async connect(creds: ProviderCredentials) {
    this.base = creds.homeserver.replace(/\/$/, "");
    this.token = creds.accessToken;
    const who = await this.api("GET", "/account/whoami");
    this.userId = who.user_id;
    return { label: this.userId };
  }

  async listConversations() {
    const { joined_rooms } = await this.api("GET", "/joined_rooms");
    return Promise.all(
      (joined_rooms as string[]).map(async (room) => {
        let title = room;
        try {
          title = (await this.api("GET", `/rooms/${encodeURIComponent(room)}/state/m.room.name`)).name || room;
        } catch { /* unnamed room */ }
        return { externalId: room, title, lastMessageAt: 0 };
      }),
    );
  }

  async fetchMessages(room: string) {
    const r = await this.api("GET", `/rooms/${encodeURIComponent(room)}/messages?dir=b&limit=50`);
    return (r.chunk as any[])
      .filter((e) => e.type === "m.room.message" && e.content?.body)
      .reverse()
      .map((e) => ({
        sender: e.sender,
        text: e.content.body as string,
        timestamp: e.origin_server_ts as number,
        outgoing: e.sender === this.userId,
      }));
  }

  async sendMessage(room: string, text: string) {
    await this.api("PUT", `/rooms/${encodeURIComponent(room)}/send/m.room.message/${Date.now()}`, {
      msgtype: "m.text",
      body: text,
    });
  }

  async listContacts() {
    const { joined_rooms } = await this.api("GET", "/joined_rooms");
    const seen = new Map<string, string>();
    for (const room of joined_rooms as string[]) {
      const m = await this.api("GET", `/rooms/${encodeURIComponent(room)}/joined_members`);
      for (const [id, info] of Object.entries<any>(m.joined)) {
        if (id !== this.userId) seen.set(id, info.display_name || id);
      }
    }
    return [...seen].map(([externalId, name]) => ({ externalId, name }));
  }
}
