import type { Account, Contact, Conversation, Message, ProviderCredentials, ProviderId } from "../core/types";

declare global {
  interface Window { api: { invoke(channel: string, ...args: unknown[]): Promise<any> } }
}
const call = <T,>(c: string, ...a: unknown[]) => window.api.invoke(c, ...a) as Promise<T>;

export const api = {
  accounts: () => call<Account[]>("accounts:list"),
  addAccount: (p: ProviderId, creds: ProviderCredentials) => call<Account>("accounts:add", p, creds),
  removeAccount: (id: string) => call<void>("accounts:remove", id),
  conversations: () => call<Conversation[]>("conversations:list"),
  messages: (id: string) => call<Message[]>("messages:list", id),
  send: (id: string, text: string) => call<void>("messages:send", id, text),
  contacts: () => call<Contact[]>("contacts:list"),
  syncContacts: (accountId: string) => call<void>("contacts:sync", accountId),
  saveContact: (c: Partial<Contact>) => call<Contact>("contacts:save", c),
  deleteContact: (id: string) => call<void>("contacts:delete", id),
};
