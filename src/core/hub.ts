import type { Account, Contact, Conversation, Message, Provider, ProviderCredentials, ProviderId } from "./types";
import type { Store } from "./store";
import type { SecretStore } from "./secrets";

type Factory = (id: ProviderId) => Provider;

/** Owns connected providers and unifies conversations/contacts across accounts. */
export class Hub {
  private providers = new Map<string, Provider>();
  constructor(private store: Store, private secrets: SecretStore, private factory: Factory) {}

  async addAccount(provider: ProviderId, creds: ProviderCredentials): Promise<Account> {
    const p = this.factory(provider);
    const { label } = await p.connect(creds);
    const acc = this.store.addAccount({ provider, label });
    this.secrets.set(acc.id, creds);
    this.providers.set(acc.id, p);
    return acc;
  }

  removeAccount(id: string) {
    this.providers.delete(id);
    this.secrets.delete(id);
    this.store.removeAccount(id);
  }

  listAccounts() { return this.store.accounts(); }

  private async get(accountId: string): Promise<Provider> {
    let p = this.providers.get(accountId);
    if (!p) {
      const acc = this.store.accounts().find((a) => a.id === accountId);
      const creds = this.secrets.get(accountId);
      if (!acc || !creds) throw new Error("Unknown account");
      p = this.factory(acc.provider);
      await p.connect(creds);
      this.providers.set(accountId, p);
    }
    return p;
  }

  async conversations(): Promise<Conversation[]> {
    const out: Conversation[] = [];
    for (const acc of this.store.accounts()) {
      try {
        const p = await this.get(acc.id);
        for (const c of await p.listConversations())
          out.push({ ...c, id: `${acc.id}|${c.externalId}`, accountId: acc.id });
      } catch (e) { console.error(`account ${acc.label}:`, e); }
    }
    return out.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  }

  async messages(conversationId: string): Promise<Message[]> {
    const [accountId, ext] = split(conversationId);
    const msgs = await (await this.get(accountId)).fetchMessages(ext);
    return msgs.map((m, i) => ({ ...m, id: `${conversationId}|${m.timestamp}|${i}`, conversationId }));
  }

  async send(conversationId: string, text: string) {
    const [accountId, ext] = split(conversationId);
    await (await this.get(accountId)).sendMessage(ext, text);
  }

  contacts(): Contact[] { return this.store.contacts(); }

  async syncContacts(accountId: string) {
    const p = await this.get(accountId);
    for (const c of await p.listContacts()) {
      const ex = this.store.contacts().find((x) => x.accountId === accountId && x.externalId === c.externalId);
      this.store.upsertContact({ ...c, accountId, id: ex?.id });
    }
  }

  /** Saves locally and writes through to the provider when it supports it. */
  async saveContact(c: Omit<Contact, "id"> & { id?: string }): Promise<Contact> {
    if (c.accountId) {
      const p = await this.get(c.accountId);
      if (p.capabilities.contactsWrite && p.saveContact) await p.saveContact(c);
    }
    return this.store.upsertContact(c);
  }

  async deleteContact(id: string) {
    const c = this.store.contacts().find((x) => x.id === id);
    if (c?.accountId && c.externalId) {
      const p = await this.get(c.accountId);
      if (p.capabilities.contactsWrite && p.deleteContact) await p.deleteContact(c.externalId);
    }
    this.store.deleteContact(id);
  }
}

function split(id: string): [string, string] {
  const i = id.indexOf("|");
  return [id.slice(0, i), id.slice(i + 1)];
}
