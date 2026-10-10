import type { Provider, ProviderCredentials } from "../core/types";

interface Msg { sender: string; text: string; timestamp: number; outgoing: boolean }

/**
 * Telegram via the Bot API. A bot only sees chats where users have messaged it
 * (or it was added), and history is collected from updates while the app runs.
 */
export class TelegramProvider implements Provider {
  readonly id = "telegram" as const;
  readonly capabilities = { contactsRead: true, contactsWrite: false };
  private base = "";
  private offset = 0;
  private chats = new Map<string, { title: string; last: number; user?: { id: string; name: string } }>();
  private history = new Map<string, Msg[]>();

  private async call(method: string, params: Record<string, unknown> = {}): Promise<any> {
    const res = await fetch(`${this.base}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const json: any = await res.json();
    if (!json.ok) throw new Error(`Telegram ${method}: ${json.description}`);
    return json.result;
  }

  async connect(creds: ProviderCredentials) {
    this.base = `https://api.telegram.org/bot${creds.botToken}`;
    const me = await this.call("getMe");
    return { label: `@${me.username} (bot)` };
  }

  private async poll() {
    const updates: any[] = await this.call("getUpdates", { offset: this.offset, timeout: 0 });
    for (const u of updates) {
      this.offset = u.update_id + 1;
      const m = u.message;
      if (!m) continue;
      const id = String(m.chat.id);
      const name = [m.from?.first_name, m.from?.last_name].filter(Boolean).join(" ") || m.from?.username || id;
      const title = m.chat.title ?? ([m.chat.first_name, m.chat.last_name].filter(Boolean).join(" ") || id);
      this.chats.set(id, {
        title,
        last: m.date * 1000,
        user: m.chat.type === "private" ? { id: String(m.from.id), name } : this.chats.get(id)?.user,
      });
      this.push(id, { sender: name, text: m.text ?? "[unsupported message]", timestamp: m.date * 1000, outgoing: false });
    }
  }

  private push(chat: string, m: Msg) {
    const list = this.history.get(chat) ?? [];
    list.push(m);
    this.history.set(chat, list);
  }

  async listConversations() {
    await this.poll();
    return [...this.chats].map(([externalId, c]) => ({ externalId, title: c.title, lastMessageAt: c.last }));
  }

  async fetchMessages(chat: string) {
    await this.poll();
    return this.history.get(chat) ?? [];
  }

  async sendMessage(chat: string, text: string) {
    const m = await this.call("sendMessage", { chat_id: chat, text });
    this.push(chat, { sender: "me", text, timestamp: m.date * 1000, outgoing: true });
  }

  async listContacts() {
    await this.poll();
    return [...this.chats.values()].filter((c) => c.user).map((c) => ({ externalId: c.user!.id, name: c.user!.name }));
  }
}
