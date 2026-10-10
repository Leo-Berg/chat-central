export type ProviderId = "matrix" | "telegram" | "discord";

export interface Account {
  id: string;
  provider: ProviderId;
  label: string;
}

export interface Contact {
  id: string;
  accountId: string | null; // null = local-only contact
  externalId?: string;
  name: string;
  phone?: string;
  email?: string;
}

export interface Conversation {
  id: string;
  accountId: string;
  externalId: string;
  title: string;
  lastMessageAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: string;
  text: string;
  timestamp: number;
  outgoing: boolean;
}

export interface ProviderCapabilities {
  contactsRead: boolean;
  contactsWrite: boolean;
}

export interface ProviderCredentials {
  [key: string]: string;
}

export interface Provider {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;
  connect(creds: ProviderCredentials): Promise<{ label: string }>;
  listConversations(): Promise<Omit<Conversation, "id" | "accountId">[]>;
  fetchMessages(externalConversationId: string): Promise<Omit<Message, "id" | "conversationId">[]>;
  sendMessage(externalConversationId: string, text: string): Promise<void>;
  listContacts(): Promise<Omit<Contact, "id" | "accountId">[]>;
  saveContact?(contact: Omit<Contact, "id" | "accountId">): Promise<void>;
  deleteContact?(externalId: string): Promise<void>;
}
